import { and, asc, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb, type DbOderTx } from '../db/index.ts';
import {
	aenderung,
	anmeldung,
	anmeldungSpieler,
	konto,
	mitglied,
	partnerAnfrage
} from '../db/schema.ts';
import type { KategorieWerte } from '../turnier/angaben.ts';
import { legeKategorieAn, legeTurnierAn, setzeStatus } from '../turnier/turniere.ts';
import { nimmAnfrageAn } from './doppel.ts';
import {
	anfrageGeloeschtText,
	hinfaelligMeldung,
	vonHandAlleinText,
	vonHandPaarText
} from './doppel-meldung.ts';
import {
	ladeDoppel,
	legeZusammen,
	loescheAnfrage,
	meldeAnfrageAlsPaarAn,
	meldeDoppelVonHandAn
} from './verwaltung-doppel.ts';
import type { CmUrheber } from './verwaltung.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

// Der handelnde CM-Admin, ein erfundenes Mitglied; der Verlauf des Spielers nennt ihn (FR-26).
let admin: CmUrheber;
beforeAll(async () => {
	admin = { art: 'admin', mitgliedId: (await legeMitgliedAn(db)).mitgliedId };
});

afterAll(async () => {
	await db.$client.end();
});

// Die gemeinsame Test-Datenbank hat Turniere anderer Tests: jedes Turnier bekommt ein eigenes Jahr.
const zufallsJahr = () => 3000 + Math.floor(Math.random() * 6000);
// Anfang Mai, vor dem Anmeldeschluss am 31. Mai; `spaet` danach.
const jetztIn = (jahr: number) => new Date(`${jahr}-05-01T10:00:00Z`);
const spaetIn = (jahr: number) => new Date(`${jahr}-06-15T10:00:00Z`);

/**
 * Turnier mit Doppel (Mindestsumme 9: offen, Herren, Mixed), drei offenen Einzel und einem
 * Herren-Einzel; offen oder noch in Vorbereitung.
 */
async function turnier(offen = true) {
	for (;;) {
		const jahr = zufallsJahr();
		const t = await legeTurnierAn(db, {
			jahr,
			name: `Clubmeisterschaft ${jahr}`,
			anmeldeschluss: `${jahr}-05-31`,
			nummern: []
		});
		if (t.ergebnis !== 'ok') continue;
		const lege = async (name: string, teil: Partial<KategorieWerte>) => {
			const k = await legeKategorieAn(db, t.id, {
				name,
				geschlecht: 'offen',
				art: 'doppel',
				jahrgangVon: null,
				jahrgangBis: null,
				klassierungVon: null,
				klassierungBis: null,
				mindestsumme: 9,
				...teil
			});
			if (k.ergebnis !== 'ok') throw new Error(`Kategorie ${name}: ${k.ergebnis}`);
			return k.id;
		};
		const einzelWerte: Partial<KategorieWerte> = {
			art: 'einzel',
			klassierungVon: 'N1',
			klassierungBis: 'R9',
			mindestsumme: null
		};
		const doppel = await lege('Offenes Doppel', {});
		const herren = await lege('Herren Doppel', { geschlecht: 'herren' });
		const mixed = await lege('Mixed Doppel', { geschlecht: 'mixed' });
		const einzel = [];
		for (const n of ['A', 'B', 'C']) einzel.push(await lege(`Einzel ${n}`, einzelWerte));
		if (offen) expect(await setzeStatus(db, t.id, 'offen', jetztIn(jahr))).toBe('ok');
		return {
			id: t.id,
			jahr,
			jetzt: jetztIn(jahr),
			spaet: spaetIn(jahr),
			doppel,
			herren,
			mixed,
			einzel
		};
	}
}

type Angaben = Partial<{
	geschlecht: 'w' | 'm' | null;
	klassierung: string | null;
	telefon: string | null;
	login: boolean;
}>;

/** Erfundener Spieler; ohne Angaben ein Herr R5 mit Login. */
async function spieler(vorname: string, nachname: string, teil: Angaben = {}) {
	const { login = true, ...angaben } = teil;
	const m = await legeMitgliedAn(db, { vorname, nachname });
	await db
		.update(mitglied)
		.set({ geschlecht: 'm', jahrgang: 1990, klassierung: 'R5', ...angaben })
		.where(eq(mitglied.id, m.mitgliedId));
	if (login) {
		await db
			.update(konto)
			.set({ briefCodeBenutztAm: new Date('2026-01-05T10:00:00Z') })
			.where(eq(konto.mitgliedId, m.mitgliedId));
	}
	return m.mitgliedId;
}

/** Aktive Anmeldung direkt in der Datenbank. */
async function anmeldungMit(
	kategorieId: number,
	spielerIds: number[],
	jetzt: Date,
	suchtext: string | null = null
) {
	const [a] = await db
		.insert(anmeldung)
		.values({ kategorieId, suchtext, angemeldetAm: jetzt, geaendertAm: jetzt })
		.returning({ id: anmeldung.id });
	await db
		.insert(anmeldungSpieler)
		.values(spielerIds.map((mitgliedId) => ({ anmeldungId: a.id, mitgliedId })));
	return a.id;
}

/** Anfrage direkt in der Datenbank, ohne die Prüfungen von `stelleAnfrage`. */
async function anfrageMit(kategorieId: number, vonId: number, anId: number, gestelltAm: Date) {
	const [a] = await db
		.insert(partnerAnfrage)
		.values({ kategorieId, vonId, anId, gestelltAm })
		.returning({ id: partnerAnfrage.id });
	return a.id;
}

/** Anmeldungen einer Kategorie mit Status, Suchtext und Spielern (aufsteigend). */
async function anmeldungenIn(kategorieId: number) {
	const zeilen = await db
		.select({
			id: anmeldung.id,
			status: anmeldung.status,
			suchtext: anmeldung.suchtext,
			mitgliedId: anmeldungSpieler.mitgliedId
		})
		.from(anmeldung)
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.where(eq(anmeldung.kategorieId, kategorieId))
		.orderBy(asc(anmeldung.id), asc(anmeldungSpieler.mitgliedId));
	const nachId = new Map<
		number,
		{ id: number; status: string; suchtext: string | null; spieler: number[] }
	>();
	for (const z of zeilen) {
		const a = nachId.get(z.id) ?? { id: z.id, status: z.status, suchtext: z.suchtext, spieler: [] };
		a.spieler.push(z.mitgliedId);
		nachId.set(z.id, a);
	}
	return [...nachId.values()];
}

const aktiveIn = async (kategorieId: number) =>
	(await anmeldungenIn(kategorieId)).filter((a) => a.status === 'bestaetigt');

async function anfragenIn(kategorieId: number) {
	return db
		.select({ id: partnerAnfrage.id, vonId: partnerAnfrage.vonId, anId: partnerAnfrage.anId })
		.from(partnerAnfrage)
		.where(eq(partnerAnfrage.kategorieId, kategorieId))
		.orderBy(asc(partnerAnfrage.id));
}

const verlaufVon = (mitgliedId: number) =>
	db
		.select({
			urheberArt: aenderung.urheberArt,
			urheberMitgliedId: aenderung.urheberMitgliedId,
			aktion: aenderung.aktion
		})
		.from(aenderung)
		.where(
			and(eq(aenderung.mitgliedId, mitgliedId), eq(aenderung.aktion, 'cm-anmeldung-geaendert'))
		);

const paarIds = (a: number, b: number) => [a, b].sort((x, y) => x - y);

/** Meldungen nach Empfänger, damit die Reihenfolge nicht zählt. */
const sortiert = (m: { mitgliedId: number; text: string }[]) =>
	[...m].sort((a, b) => a.mitgliedId - b.mitgliedId || a.text.localeCompare(b.text));

/** Wartet (höchstens 3 s), bis `n` Verbindungen dieser Datenbank auf eine Sperre warten. */
async function bisWartend(n: number) {
	const ende = Date.now() + 3000;
	while (Date.now() < ende) {
		const { rows } = await db.execute<{ n: number }>(
			sql`select count(*)::int as n from pg_stat_activity
				where datname = current_database() and wait_event_type = 'Lock'`
		);
		if (rows[0].n >= n) return;
		await new Promise((r) => setTimeout(r, 20));
	}
	throw new Error(`nach 3 s warten nicht ${n} Anfragen auf eine Sperre`);
}

/**
 * Startet `beide`, während eine dritte Transaktion das Mitglied gesperrt hält, und gibt es frei,
 * sobald beide auf eine Sperre warten: so überschneiden sich die beiden Anfragen sicher.
 */
async function gleichzeitig<A, B>(mitgliedId: number, beide: () => [Promise<A>, Promise<B>]) {
	const laufend = await db.transaction(async (tx: DbOderTx) => {
		await tx
			.select({ id: mitglied.id })
			.from(mitglied)
			.where(eq(mitglied.id, mitgliedId))
			.for('update');
		const alle = Promise.all(beide());
		await bisWartend(2);
		return { alle };
	});
	return laufend.alle;
}

describe('A-ANMELDUNG-06, FR-46: Doppel in der Verwaltung', () => {
	test('A-ANMELDUNG-06: ladeDoppel zeigt Paare mit Summe, Suchende mit Kommentar und offene Anfragen', async () => {
		const t = await turnier();
		const lena = await spieler('Lena', 'Aebi', {
			geschlecht: 'w',
			klassierung: 'R4',
			telefon: '079 111 22 33'
		});
		const max = await spieler('Max', 'Zaugg', { telefon: '079 444 55 66' });
		const paul = await spieler('Paul', 'Brunner');
		const urs = await spieler('Urs', 'Christen', { klassierung: null });
		const paar = await anmeldungMit(t.doppel, [max, lena], t.jetzt);
		const sucht = await anmeldungMit(t.doppel, [paul], t.jetzt, 'Eher abends');
		const anfrage = await anfrageMit(t.doppel, urs, paul, t.jetzt);

		const liste = await ladeDoppel(db, t.doppel);
		const name = (vorname: string, nachname: string) => ({ rufname: null, vorname, nachname });
		expect(liste).toEqual({
			paare: [
				{
					anmeldungId: paar,
					spieler: [
						{
							mitgliedId: lena,
							name: name('Lena', 'Aebi'),
							mitgliedStatus: 'aktiv',
							geschlecht: 'w',
							klassierung: 'R4'
						},
						{
							mitgliedId: max,
							name: name('Max', 'Zaugg'),
							mitgliedStatus: 'aktiv',
							geschlecht: 'm',
							klassierung: 'R5'
						}
					],
					summe: 9
				}
			],
			suchende: [
				{
					anmeldungId: sucht,
					spieler: {
						mitgliedId: paul,
						name: name('Paul', 'Brunner'),
						mitgliedStatus: 'aktiv',
						geschlecht: 'm',
						klassierung: 'R5'
					},
					kommentar: 'Eher abends'
				}
			],
			anfragen: [
				{
					anfrageId: anfrage,
					von: {
						mitgliedId: urs,
						name: name('Urs', 'Christen'),
						mitgliedStatus: 'aktiv',
						geschlecht: 'm',
						klassierung: null
					},
					an: expect.objectContaining({ mitgliedId: paul }),
					gestelltAm: t.jetzt
				}
			]
		});
		// Review Focus 5: weder Telefon noch E-Mail in der Liste.
		const json = JSON.stringify(liste);
		expect(json).not.toContain('079');
		expect(json).not.toContain('@example.org');

		expect(await ladeDoppel(db, t.einzel[0])).toBeNull();
		expect(await ladeDoppel(db, -1)).toBeNull();
	});

	test('A-ANMELDUNG-06: ladeDoppel: Summe null ohne Klassierung, ausgetretener Spieler mit Status, Anfragen älteste zuerst', async () => {
		const t = await turnier();
		const anna = await spieler('Anna', 'Graf', { geschlecht: 'w', klassierung: null });
		const beat = await spieler('Beat', 'Huber');
		const cla = await spieler('Claudio', 'Iten');
		const dora = await spieler('Dora', 'Jost', { geschlecht: 'w' });
		await anmeldungMit(t.doppel, [anna, beat], t.jetzt);
		await anmeldungMit(t.doppel, [cla], t.jetzt);
		await db
			.update(mitglied)
			.set({ status: 'ausgetreten', austrittAm: t.jetzt })
			.where(eq(mitglied.id, beat));
		const spaeter = await anfrageMit(t.doppel, dora, cla, new Date(t.jetzt.getTime() + 60_000));
		const frueher = await anfrageMit(t.doppel, cla, dora, t.jetzt);

		const liste = (await ladeDoppel(db, t.doppel))!;
		expect(liste.paare).toHaveLength(1);
		expect(liste.paare[0].summe).toBeNull();
		expect(liste.paare[0].spieler.map((s) => [s.mitgliedId, s.mitgliedStatus])).toEqual([
			[anna, 'aktiv'],
			[beat, 'ausgetreten']
		]);
		expect(liste.anfragen.map((a) => a.anfrageId)).toEqual([frueher, spaeter]);
	});

	test('FR-46: von Hand als Paar: eine bestätigte Anmeldung mit beiden, Meldung mit dem Namen des anderen, Verlauf bei beiden', async () => {
		const t = await turnier();
		const lena = await spieler('Lena', 'Aebi', { geschlecht: 'w', klassierung: 'R4' });
		const max = await spieler('Max', 'Zaugg');

		const r = await meldeDoppelVonHandAn(db, admin, t.mixed, [lena, max], t.jetzt, false);
		expect(r).toEqual({
			ergebnis: 'ok',
			turnierId: t.id,
			meldungen: sortiert([
				{ mitgliedId: lena, text: vonHandPaarText('Max Zaugg', 'Mixed Doppel') },
				{ mitgliedId: max, text: vonHandPaarText('Lena Aebi', 'Mixed Doppel') }
			])
		});
		expect(await anmeldungenIn(t.mixed)).toEqual([
			{ id: expect.any(Number), status: 'bestaetigt', suchtext: null, spieler: paarIds(lena, max) }
		]);
		const eintrag = [
			{ urheberArt: 'admin', urheberMitgliedId: admin.mitgliedId, aktion: 'cm-anmeldung-geaendert' }
		];
		expect(await verlaufVon(lena)).toEqual(eintrag);
		expect(await verlaufVon(max)).toEqual(eintrag);
	});

	test('FR-46: von Hand allein: sucht Partner, Meldung mit Hinweis', async () => {
		const t = await turnier();
		const max = await spieler('Max', 'Zaugg');
		expect(await meldeDoppelVonHandAn(db, admin, t.herren, [max], t.jetzt, false)).toEqual({
			ergebnis: 'ok',
			turnierId: t.id,
			meldungen: [{ mitgliedId: max, text: vonHandAlleinText('Herren Doppel') }]
		});
		expect(await anmeldungenIn(t.herren)).toEqual([
			{ id: expect.any(Number), status: 'bestaetigt', suchtext: null, spieler: [max] }
		]);
		expect(await verlaufVon(max)).toHaveLength(1);
		// Er steht hier schon: allein nochmals geht nicht.
		expect(await meldeDoppelVonHandAn(db, admin, t.herren, [max], t.jetzt, false)).toBe(
			'schon-angemeldet'
		);
	});

	test('FR-46: von Hand zu einem Suchenden: kommt in seine Anmeldung, Kommentar weg, Anfragen der beiden verfallen', async () => {
		const t = await turnier();
		const paul = await spieler('Paul', 'Brunner');
		const urs = await spieler('Urs', 'Christen');
		const dritter = await spieler('Dario', 'Dritter');
		const sucht = await anmeldungMit(t.herren, [paul], t.jetzt, 'Eher abends');
		await anfrageMit(t.herren, urs, paul, t.jetzt);
		await anfrageMit(t.herren, dritter, paul, t.jetzt);

		const r = await meldeDoppelVonHandAn(db, admin, t.herren, [urs, paul], t.jetzt, false);
		expect(r).toEqual({
			ergebnis: 'ok',
			turnierId: t.id,
			meldungen: sortiert([
				{ mitgliedId: paul, text: vonHandPaarText('Urs Christen', 'Herren Doppel') },
				{ mitgliedId: urs, text: vonHandPaarText('Paul Brunner', 'Herren Doppel') },
				{
					mitgliedId: dritter,
					text: hinfaelligMeldung('Paul Brunner', 'Herren Doppel', t.id).text
				}
			])
		});
		expect(await anmeldungenIn(t.herren)).toEqual([
			{ id: sucht, status: 'bestaetigt', suchtext: null, spieler: paarIds(paul, urs) }
		]);
		expect(await anfragenIn(t.herren)).toEqual([]);
	});

	test('FR-46: Warnungen: unpassend speichert nichts, trotzdem schon; voll, geschlossen; ohne Login geht', async () => {
		const t = await turnier();
		const lena = await spieler('Lena', 'Aebi', { geschlecht: 'w' });
		const max = await spieler('Max', 'Zaugg');
		expect(await meldeDoppelVonHandAn(db, admin, t.herren, [lena, max], t.jetzt, false)).toEqual({
			warnungen: ['passt-nicht']
		});
		expect(await anmeldungenIn(t.herren)).toEqual([]);
		expect(await verlaufVon(lena)).toEqual([]);
		expect(await meldeDoppelVonHandAn(db, admin, t.herren, [lena, max], t.jetzt, true)).toEqual(
			expect.objectContaining({ ergebnis: 'ok' })
		);
		expect(await aktiveIn(t.herren)).toEqual([
			expect.objectContaining({ spieler: paarIds(lena, max) })
		]);

		// Drei aktive Anmeldungen: voll; mit trotzdem die vierte.
		const voll = await spieler('Vinzenz', 'Voll');
		for (const k of t.einzel) await anmeldungMit(k, [voll], t.jetzt);
		const partner = await spieler('Peter', 'Partner');
		expect(
			await meldeDoppelVonHandAn(db, admin, t.doppel, [voll, partner], t.jetzt, false)
		).toEqual({ warnungen: ['voll'] });
		expect(await meldeDoppelVonHandAn(db, admin, t.doppel, [voll, partner], t.jetzt, true)).toEqual(
			expect.objectContaining({ ergebnis: 'ok' })
		);

		// Nach dem Anmeldeschluss, ohne Login und R3+R5 unter der Mindestsumme.
		const ohne = await spieler('Oskar', 'Ohnelogin', { login: false, klassierung: 'R3' });
		const zweiter = await spieler('Zeno', 'Zweiter', { login: false });
		expect(await meldeDoppelVonHandAn(db, admin, t.mixed, [ohne], t.spaet, false)).toEqual({
			warnungen: ['geschlossen']
		});
		expect(
			await meldeDoppelVonHandAn(db, admin, t.doppel, [ohne, zweiter], t.spaet, false)
		).toEqual({ warnungen: ['passt-nicht', 'geschlossen'] });
		expect(await meldeDoppelVonHandAn(db, admin, t.doppel, [ohne, zweiter], t.spaet, true)).toEqual(
			expect.objectContaining({ ergebnis: 'ok' })
		);
		expect(await aktiveIn(t.doppel)).toEqual([
			expect.objectContaining({ spieler: paarIds(voll, partner) }),
			expect.objectContaining({ spieler: paarIds(ohne, zweiter) })
		]);

		// Fehlende Klassierung des Partners.
		const ohneKlassierung = await spieler('Kurt', 'Keine', { klassierung: null });
		expect(
			await meldeDoppelVonHandAn(db, admin, t.mixed, [lena, ohneKlassierung], t.jetzt, false)
		).toEqual({ warnungen: ['angaben-fehlen'] });
	});

	test('FR-46: von Hand nie in Vorbereitung, nie zu einem Paar, nie zwei Suchende, nie nicht aktive Mitglieder', async () => {
		const vorbereitung = await turnier(false);
		const a = await spieler('Andreas', 'Ammann');
		const b = await spieler('Bruno', 'Bauer');
		expect(
			await meldeDoppelVonHandAn(db, admin, vorbereitung.doppel, [a, b], vorbereitung.jetzt, true)
		).toBe('vorbereitung');
		expect(await anmeldungenIn(vorbereitung.doppel)).toEqual([]);

		const t = await turnier();
		const c = await spieler('Cyrill', 'Caduff');
		await anmeldungMit(t.herren, [a, b], t.jetzt);
		expect(await meldeDoppelVonHandAn(db, admin, t.herren, [a, c], t.jetzt, true)).toBe(
			'schon-angemeldet'
		);
		expect(await meldeDoppelVonHandAn(db, admin, t.herren, [c, b], t.jetzt, true)).toBe(
			'schon-angemeldet'
		);
		const d = await spieler('Dominik', 'Dürr');
		await anmeldungMit(t.doppel, [c], t.jetzt);
		await anmeldungMit(t.doppel, [d], t.jetzt);
		// Zwei, die beide allein suchen, legt der CM-Admin zusammen.
		expect(await meldeDoppelVonHandAn(db, admin, t.doppel, [c, d], t.jetzt, true)).toBe(
			'schon-angemeldet'
		);

		const weg = await spieler('Emil', 'Ausgetreten');
		await db
			.update(mitglied)
			.set({ status: 'ausgetreten', austrittAm: t.jetzt })
			.where(eq(mitglied.id, weg));
		expect(await meldeDoppelVonHandAn(db, admin, t.mixed, [weg], t.jetzt, true)).toBe(
			'nicht-gefunden'
		);
		expect(await meldeDoppelVonHandAn(db, admin, t.mixed, [c, c], t.jetzt, true)).toBe(
			'nicht-gefunden'
		);
		expect(await meldeDoppelVonHandAn(db, admin, t.einzel[0], [c], t.jetzt, true)).toBe(
			'nicht-gefunden'
		);
		expect(await anmeldungenIn(t.mixed)).toEqual([]);
	});

	test('FR-46: zusammenlegen: zwei Suchende ergeben ein Paar, die zweite Anmeldung ist zurückgezogen, Kommentare weg', async () => {
		const t = await turnier();
		const paul = await spieler('Paul', 'Brunner');
		const urs = await spieler('Urs', 'Christen');
		const dritter = await spieler('Dario', 'Dritter');
		const erste = await anmeldungMit(t.herren, [paul], t.jetzt, 'Eher abends');
		const zweite = await anmeldungMit(t.herren, [urs], t.jetzt, 'Nur am Wochenende');
		await anfrageMit(t.herren, dritter, urs, t.jetzt);

		expect(await legeZusammen(db, admin, erste, zweite, t.spaet, true)).toEqual({
			ergebnis: 'ok',
			turnierId: t.id,
			meldungen: sortiert([
				{ mitgliedId: paul, text: vonHandPaarText('Urs Christen', 'Herren Doppel') },
				{ mitgliedId: urs, text: vonHandPaarText('Paul Brunner', 'Herren Doppel') },
				{
					mitgliedId: dritter,
					text: hinfaelligMeldung('Urs Christen', 'Herren Doppel', t.id).text
				}
			])
		});
		expect(await anmeldungenIn(t.herren)).toEqual([
			{ id: erste, status: 'bestaetigt', suchtext: null, spieler: paarIds(paul, urs) },
			{ id: zweite, status: 'zurueckgezogen', suchtext: null, spieler: [urs] }
		]);
		expect(await anfragenIn(t.herren)).toEqual([]);
		expect(await verlaufVon(paul)).toHaveLength(1);
		expect(await verlaufVon(urs)).toHaveLength(1);
	});

	test('FR-46, Review Focus 4: zusammenlegen warnt; ein Paar, eine zurückgezogene oder fremde Kategorie ergibt nicht-gefunden', async () => {
		const t = await turnier();
		const lena = await spieler('Lena', 'Aebi', { geschlecht: 'w' });
		const max = await spieler('Max', 'Zaugg');
		const erste = await anmeldungMit(t.herren, [lena], t.jetzt);
		const zweite = await anmeldungMit(t.herren, [max], t.jetzt);
		expect(await legeZusammen(db, admin, erste, zweite, t.spaet, false)).toEqual({
			warnungen: ['passt-nicht', 'geschlossen']
		});
		expect(await aktiveIn(t.herren)).toHaveLength(2);

		const paar = await anmeldungMit(
			t.doppel,
			[await spieler('Pius', 'Paar'), await spieler('Quirin', 'Paar')],
			t.jetzt
		);
		const allein = await anmeldungMit(t.doppel, [await spieler('Rolf', 'Allein')], t.jetzt);
		expect(await legeZusammen(db, admin, paar, allein, t.jetzt, true)).toBe('nicht-gefunden');
		expect(await legeZusammen(db, admin, allein, allein, t.jetzt, true)).toBe('nicht-gefunden');
		expect(await legeZusammen(db, admin, allein, erste, t.jetzt, true)).toBe('nicht-gefunden');

		// Inzwischen abgemeldet.
		await db.update(anmeldung).set({ status: 'zurueckgezogen' }).where(eq(anmeldung.id, zweite));
		expect(await legeZusammen(db, admin, erste, zweite, t.jetzt, true)).toBe('nicht-gefunden');
		expect(await anmeldungenIn(t.herren)).toEqual([
			{ id: erste, status: 'bestaetigt', suchtext: null, spieler: [lena] },
			{ id: zweite, status: 'zurueckgezogen', suchtext: null, spieler: [max] }
		]);
	});

	test('FR-46: Anfrage als Paar anmelden wie Annehmen, auch nach Schluss und ohne Login', async () => {
		const t = await turnier();
		const lena = await spieler('Lena', 'Aebi', { geschlecht: 'w', login: false });
		const max = await spieler('Max', 'Zaugg', { login: false });
		const dritte = await spieler('Dora', 'Dritte', { geschlecht: 'w' });
		const sucht = await anmeldungMit(t.mixed, [max], t.jetzt, 'Eher abends');
		const id = await anfrageMit(t.mixed, lena, max, t.jetzt);
		await anfrageMit(t.mixed, dritte, max, t.jetzt);

		expect(await meldeAnfrageAlsPaarAn(db, admin, id, t.spaet, false)).toEqual({
			warnungen: ['geschlossen']
		});
		expect(await meldeAnfrageAlsPaarAn(db, admin, id, t.spaet, true)).toEqual({
			ergebnis: 'ok',
			turnierId: t.id,
			meldungen: sortiert([
				{ mitgliedId: lena, text: vonHandPaarText('Max Zaugg', 'Mixed Doppel') },
				{ mitgliedId: max, text: vonHandPaarText('Lena Aebi', 'Mixed Doppel') },
				{ mitgliedId: dritte, text: hinfaelligMeldung('Max Zaugg', 'Mixed Doppel', t.id).text }
			])
		});
		expect(await anmeldungenIn(t.mixed)).toEqual([
			{ id: sucht, status: 'bestaetigt', suchtext: null, spieler: paarIds(lena, max) }
		]);
		expect(await anfragenIn(t.mixed)).toEqual([]);
		expect(await verlaufVon(lena)).toHaveLength(1);
		expect(await verlaufVon(max)).toHaveLength(1);
		// Review Focus 4: schon angenommen.
		expect(await meldeAnfrageAlsPaarAn(db, admin, id, t.jetzt, true)).toBe('nicht-gefunden');
	});

	test('FR-46: Anfrage als Paar: neue Anmeldung ohne Suchende; einer schon zu zweit ergibt schon-angemeldet', async () => {
		const t = await turnier();
		const a = await spieler('Andreas', 'Ammann');
		const b = await spieler('Bruno', 'Bauer');
		const c = await spieler('Cyrill', 'Caduff');
		const ab = await anfrageMit(t.herren, a, b, t.jetzt);
		expect(await meldeAnfrageAlsPaarAn(db, admin, ab, t.jetzt, false)).toEqual(
			expect.objectContaining({ ergebnis: 'ok' })
		);
		expect(await aktiveIn(t.herren)).toEqual([
			expect.objectContaining({ suchtext: null, spieler: paarIds(a, b) })
		]);
		// Eine Anfrage an einen, der schon zu zweit steht (direkt in der Datenbank).
		const ca = await anfrageMit(t.herren, c, a, t.jetzt);
		expect(await meldeAnfrageAlsPaarAn(db, admin, ca, t.jetzt, true)).toBe('schon-angemeldet');
		expect(await aktiveIn(t.herren)).toHaveLength(1);
		expect(await meldeAnfrageAlsPaarAn(db, admin, -1, t.jetzt, true)).toBe('nicht-gefunden');
	});

	test('FR-46: Anfrage löschen: weg, Meldung an den Anfragenden; gelöschte ergibt nicht-gefunden', async () => {
		const t = await turnier();
		const lena = await spieler('Lena', 'Aebi', { geschlecht: 'w' });
		const max = await spieler('Max', 'Zaugg');
		const id = await anfrageMit(t.mixed, lena, max, t.jetzt);
		expect(await loescheAnfrage(db, id)).toEqual({
			ergebnis: 'ok',
			turnierId: t.id,
			meldungen: [{ mitgliedId: lena, text: anfrageGeloeschtText('Max Zaugg', 'Mixed Doppel') }]
		});
		expect(anfrageGeloeschtText('Max Zaugg', 'Mixed Doppel')).toBe(
			'Deine Anfrage an Max Zaugg für «Mixed Doppel» ist hinfällig.'
		);
		expect(await anfragenIn(t.mixed)).toEqual([]);
		expect(await loescheAnfrage(db, id)).toBe('nicht-gefunden');
		// Review Focus 4: als Paar anmelden nach dem Löschen.
		expect(await meldeAnfrageAlsPaarAn(db, admin, id, t.jetzt, true)).toBe('nicht-gefunden');
	});

	test('Review Focus 1: Mitglied nimmt an, während der CM-Admin ihn mit einer anderen anmeldet: genau eine Anmeldung', async () => {
		const t = await turnier();
		const lea = await spieler('Lea', 'Marbach', { geschlecht: 'w', klassierung: 'R6' });
		const marco = await spieler('Marco', 'Beispiel');
		const nina = await spieler('Nina', 'Neuhaus', { geschlecht: 'w', klassierung: 'R6' });
		const id = await anfrageMit(t.mixed, lea, marco, t.jetzt);

		const [angenommen, vonHand] = await gleichzeitig(marco, () => [
			nimmAnfrageAn(db, id, marco, t.jetzt),
			meldeDoppelVonHandAn(db, admin, t.mixed, [marco, nina], t.jetzt, false)
		]);
		const aktive = await aktiveIn(t.mixed);
		expect(aktive).toHaveLength(1);
		if (typeof angenommen === 'object') {
			// Das Annehmen kam zuerst: der CM-Admin trifft auf das Paar.
			expect(vonHand).toBe('schon-angemeldet');
			expect(aktive[0].spieler).toEqual(paarIds(lea, marco));
		} else {
			// Der CM-Admin kam zuerst: Leas Anfrage ist verfallen, mit Meldung an sie.
			expect(angenommen).toBe('nicht-gefunden');
			expect(vonHand).toEqual(
				expect.objectContaining({
					meldungen: expect.arrayContaining([
						{
							mitgliedId: lea,
							text: hinfaelligMeldung('Marco Beispiel', 'Mixed Doppel', t.id).text
						}
					])
				})
			);
			expect(aktive[0].spieler).toEqual(paarIds(marco, nina));
		}
		expect(await anfragenIn(t.mixed)).toEqual([]);
	});
});
