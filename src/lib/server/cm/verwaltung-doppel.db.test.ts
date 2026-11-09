import { and, asc, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb, type DbOderTx } from '../db/index.ts';
import {
	aenderung,
	anmeldung,
	anmeldungSpieler,
	kategorie,
	konto,
	mitglied,
	partnerAnfrage
} from '../db/schema.ts';
import type { KategorieWerte } from '../turnier/angaben.ts';
import { legeKategorieAn, legeTurnierAn, setzeStatus } from '../turnier/turniere.ts';
import { meldeAb } from './anmeldungen.ts';
import { nimmAnfrageAn } from './doppel.ts';
import {
	anfrageGeloeschtText,
	anfrageHinfaelligText,
	geloeschtDoppelText,
	herausgenommenText,
	hinfaelligMeldung,
	neuerPartnerText,
	ohneErsatzText,
	verschobenDoppelText,
	vonHandAlleinText,
	vonHandPaarText
} from './doppel-meldung.ts';
import {
	aenderePartner,
	artDerAnmeldung,
	ladeDoppel,
	legeZusammen,
	loescheAnfrage,
	loescheDoppel,
	meldeAnfrageAlsPaarAn,
	meldeDoppelVonHandAn,
	verschiebeDoppel
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

/**
 * Wartet (höchstens 3 s), bis `n` Verbindungen auf die Sperre von `halter` warten, direkt oder
 * hinter einer anderen Wartenden (Zeilensperren reihen sich ein). Parallele DB-Tests zählen nicht.
 */
async function bisWartend(halter: number, n: number) {
	const ende = Date.now() + 3000;
	while (Date.now() < ende) {
		const { rows } = await db.execute<{ n: number }>(
			sql`with recursive kette(pid) as (
					select ${halter}::int
					union
					select a.pid from pg_stat_activity a
					join kette k on k.pid = any(pg_blocking_pids(a.pid))
				)
				select (count(*) - 1)::int as n from kette`
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
		const { rows } = await tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`);
		const alle = Promise.all(beide());
		await bisWartend(rows[0].pid, 2);
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

		const liste = await ladeDoppel(db, t.doppel, t.jetzt);
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
							klassierung: 'R4',
							email: expect.stringMatching(/@example\.org$/),
							telefon: '079 111 22 33'
						},
						{
							mitgliedId: max,
							name: name('Max', 'Zaugg'),
							mitgliedStatus: 'aktiv',
							geschlecht: 'm',
							klassierung: 'R5',
							email: expect.stringMatching(/@example\.org$/),
							telefon: '079 444 55 66'
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
						klassierung: 'R5',
						email: expect.stringMatching(/@example\.org$/),
						telefon: null
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
						klassierung: null,
						email: expect.stringMatching(/@example\.org$/),
						telefon: null
					},
					an: expect.objectContaining({ mitgliedId: paul }),
					gestelltAm: t.jetzt
				}
			]
		});
		// K-42: Ab dem 1.1. nach dem Turnierjahr (Zürich) weder Telefon noch E-Mail in der Liste.
		const imJahr = JSON.stringify(
			await ladeDoppel(db, t.doppel, new Date(`${t.jahr}-12-31T22:59:00Z`))
		);
		expect(imJahr).toContain('079 111 22 33');
		const danach = JSON.stringify(
			await ladeDoppel(db, t.doppel, new Date(`${t.jahr}-12-31T23:00:00Z`))
		);
		expect(danach).not.toContain('079');
		expect(danach).not.toContain('@example.org');
		expect(danach).toContain('Aebi');

		expect(await ladeDoppel(db, t.einzel[0], t.jetzt)).toBeNull();
		expect(await ladeDoppel(db, -1, t.jetzt)).toBeNull();
	});

	test('A-ANMELDUNG-06: ladeDoppel: Summe null ohne Klassierung, ausgetretener Spieler mit Status, Anfragen älteste zuerst', async () => {
		const t = await turnier();
		const anna = await spieler('Anna', 'Graf', { geschlecht: 'w', klassierung: null });
		const beat = await spieler('Beat', 'Huber', { telefon: '079 123 45 67' });
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

		const liste = (await ladeDoppel(db, t.doppel, t.jetzt))!;
		expect(liste.paare).toHaveLength(1);
		expect(liste.paare[0].summe).toBeNull();
		expect(liste.paare[0].spieler.map((s) => [s.mitgliedId, s.mitgliedStatus])).toEqual([
			[anna, 'aktiv'],
			[beat, 'ausgetreten']
		]);
		// K-42: Der CM-Admin erreicht auch Ausgetretene bis zur Löschung.
		expect(liste.paare[0].spieler[1].telefon).toBe('079 123 45 67');
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

	test('FR-46, FR-06: Suchender mit drei Anmeldungen (eine davon hier) bekommt von Hand einen Partner ohne Warnung voll', async () => {
		const t = await turnier();
		const paul = await spieler('Paul', 'Brunner');
		const urs = await spieler('Urs', 'Christen');
		await anmeldungMit(t.einzel[0], [paul], t.jetzt);
		await anmeldungMit(t.einzel[1], [paul], t.jetzt);
		const sucht = await anmeldungMit(t.doppel, [paul], t.jetzt);
		expect(await meldeDoppelVonHandAn(db, admin, t.doppel, [paul, urs], t.jetzt, false)).toEqual(
			expect.objectContaining({ ergebnis: 'ok' })
		);
		expect(await aktiveIn(t.doppel)).toEqual([
			{ id: sucht, status: 'bestaetigt', suchtext: null, spieler: paarIds(paul, urs) }
		]);
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

	test('FR-46: Anfrage als Paar: neue Anmeldung ohne Suchende; einer schon zu zweit ergibt schon-angemeldet, die Anfrage ist weg', async () => {
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
		// Wie beim Annehmen (`nimmAnfrageAn`): die Anfrage ist weg.
		expect(await anfragenIn(t.herren)).toEqual([]);
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

	test('FR-46: Partner ändern mit Ersatz: alte zurückgezogen, neue mit Bleibendem und Neuem; suchte der Neue allein, ist seine zurückgezogen und seine Anfragen verfallen', async () => {
		const t = await turnier();
		const lena = await spieler('Lena', 'Aebi', { geschlecht: 'w', klassierung: 'R4' });
		const max = await spieler('Max', 'Zaugg');
		const nico = await spieler('Nico', 'Neuhaus');
		const dora = await spieler('Dora', 'Dritte', { geschlecht: 'w' });
		const erna = await spieler('Erna', 'Egli', { geschlecht: 'w' });
		const paar = await anmeldungMit(t.mixed, [lena, max], t.jetzt);
		const sucht = await anmeldungMit(t.mixed, [nico], t.jetzt, 'Eher abends');
		await anfrageMit(t.mixed, dora, nico, t.jetzt);
		await anfrageMit(t.mixed, nico, erna, t.jetzt);

		expect(await aenderePartner(db, admin, paar, lena, nico, t.jetzt, false)).toEqual({
			ergebnis: 'ok',
			turnierId: t.id,
			meldungen: sortiert([
				{ mitgliedId: max, text: herausgenommenText('Lena Aebi', 'Mixed Doppel') },
				{ mitgliedId: lena, text: neuerPartnerText('Nico Neuhaus', 'Mixed Doppel') },
				{ mitgliedId: nico, text: vonHandPaarText('Lena Aebi', 'Mixed Doppel') },
				{ mitgliedId: dora, text: hinfaelligMeldung('Nico Neuhaus', 'Mixed Doppel', t.id).text },
				{ mitgliedId: erna, text: hinfaelligMeldung('Nico Neuhaus', 'Mixed Doppel', t.id).text }
			])
		});
		expect(await anmeldungenIn(t.mixed)).toEqual([
			{ id: paar, status: 'zurueckgezogen', suchtext: null, spieler: paarIds(lena, max) },
			{ id: sucht, status: 'zurueckgezogen', suchtext: null, spieler: [nico] },
			{
				id: expect.any(Number),
				status: 'bestaetigt',
				suchtext: null,
				spieler: paarIds(lena, nico)
			}
		]);
		expect(await anfragenIn(t.mixed)).toEqual([]);
		for (const id of [lena, max, nico]) expect(await verlaufVon(id)).toHaveLength(1);
		// Die alte Anmeldung ist nicht mehr aktiv.
		expect(await aenderePartner(db, admin, paar, lena, null, t.jetzt, true)).toBe('nicht-gefunden');
	});

	test('FR-46: Partner ändern ohne Ersatz: neue Anmeldung nur mit dem Bleibenden, er sucht Partner; nach Schluss nur mit trotzdem; der Herausfallende darf ausgetreten sein', async () => {
		const t = await turnier();
		const lena = await spieler('Lena', 'Aebi', { geschlecht: 'w', klassierung: 'R4' });
		const max = await spieler('Max', 'Zaugg');
		const paar = await anmeldungMit(t.mixed, [lena, max], t.jetzt);
		// Nach dem Schluss bleibt die Anmeldung trotz Austritt stehen, bis der CM-Admin entscheidet.
		await db
			.update(mitglied)
			.set({ status: 'ausgetreten', austrittAm: t.spaet })
			.where(eq(mitglied.id, lena));

		expect(await aenderePartner(db, admin, paar, max, null, t.spaet, false)).toEqual({
			warnungen: ['geschlossen']
		});
		expect(await aktiveIn(t.mixed)).toEqual([expect.objectContaining({ id: paar })]);
		expect(await aenderePartner(db, admin, paar, max, null, t.spaet, true)).toEqual({
			ergebnis: 'ok',
			turnierId: t.id,
			meldungen: sortiert([
				{ mitgliedId: lena, text: herausgenommenText('Max Zaugg', 'Mixed Doppel') },
				{ mitgliedId: max, text: ohneErsatzText('Mixed Doppel') }
			])
		});
		expect(await anmeldungenIn(t.mixed)).toEqual([
			{ id: paar, status: 'zurueckgezogen', suchtext: null, spieler: paarIds(lena, max) },
			{ id: expect.any(Number), status: 'bestaetigt', suchtext: null, spieler: [max] }
		]);
		expect(await verlaufVon(lena)).toHaveLength(1);
		expect(await verlaufVon(max)).toHaveLength(1);
	});

	test('FR-46, FR-06: Partner ändern warnt bei Passung und voll für den Neuen; der Bleibende zählt seine Anmeldung hier schon', async () => {
		const t = await turnier();
		const lena = await spieler('Lena', 'Aebi', { geschlecht: 'w', klassierung: 'R4' });
		const max = await spieler('Max', 'Zaugg');
		const nina = await spieler('Nina', 'Neuhaus', { geschlecht: 'w', klassierung: 'R5' });
		const voll = await spieler('Vinzenz', 'Voll');
		// Lena hat mit der Anmeldung hier drei: keine Warnung für sie.
		await anmeldungMit(t.einzel[0], [lena], t.jetzt);
		await anmeldungMit(t.einzel[1], [lena], t.jetzt);
		for (const k of t.einzel) await anmeldungMit(k, [voll], t.jetzt);
		const paar = await anmeldungMit(t.mixed, [lena, max], t.jetzt);

		expect(await aenderePartner(db, admin, paar, lena, nina, t.jetzt, false)).toEqual({
			warnungen: ['passt-nicht']
		});
		expect(await aenderePartner(db, admin, paar, lena, voll, t.spaet, false)).toEqual({
			warnungen: ['voll', 'geschlossen']
		});
		expect(await aktiveIn(t.mixed)).toEqual([expect.objectContaining({ id: paar })]);
		expect(await verlaufVon(lena)).toEqual([]);
		expect(await aenderePartner(db, admin, paar, lena, voll, t.jetzt, true)).toEqual(
			expect.objectContaining({ ergebnis: 'ok' })
		);
		expect(await aktiveIn(t.mixed)).toEqual([
			expect.objectContaining({ spieler: paarIds(lena, voll) })
		]);
	});

	test('FR-46, Review Focus 4: Partner ändern auf einer Anmeldung, die das Mitglied inzwischen abgemeldet hat, ergibt nicht-gefunden ohne Änderung', async () => {
		const t = await turnier();
		const lena = await spieler('Lena', 'Aebi', { geschlecht: 'w', klassierung: 'R4' });
		const max = await spieler('Max', 'Zaugg');
		const nico = await spieler('Nico', 'Neuhaus');
		const paar = await anmeldungMit(t.mixed, [lena, max], t.jetzt);
		// Die Liste des CM-Admins zeigt noch das Paar; Max meldet es vorher ab.
		expect(await meldeAb(db, paar, max, t.jetzt)).toEqual({ ergebnis: 'ok', partnerId: lena });
		const vorher = await anmeldungenIn(t.mixed);

		expect(await aenderePartner(db, admin, paar, lena, nico, t.jetzt, true)).toBe('nicht-gefunden');
		expect(await aenderePartner(db, admin, paar, lena, null, t.jetzt, true)).toBe('nicht-gefunden');
		expect(await anmeldungenIn(t.mixed)).toEqual(vorher);
		for (const id of [lena, max, nico]) expect(await verlaufVon(id)).toEqual([]);
	});

	test('FR-46, Review Focus 2: Partner ändern auf einen, der schon zu zweit ist, auf einen der beiden oder mit fremdem Bleibenden ändert nichts', async () => {
		const t = await turnier();
		const a = await spieler('Andreas', 'Ammann');
		const b = await spieler('Bruno', 'Bauer');
		const c = await spieler('Cyrill', 'Caduff');
		const d = await spieler('Dominik', 'Dürr');
		const fremd = await spieler('Fritz', 'Fremd');
		const paar = await anmeldungMit(t.herren, [a, b], t.jetzt);
		const anderes = await anmeldungMit(t.herren, [c, d], t.jetzt);
		const vorher = await anmeldungenIn(t.herren);

		expect(await aenderePartner(db, admin, paar, a, c, t.jetzt, true)).toBe('schon-angemeldet');
		expect(await aenderePartner(db, admin, paar, a, a, t.jetzt, true)).toBe('eingabe');
		expect(await aenderePartner(db, admin, paar, a, b, t.jetzt, true)).toBe('eingabe');
		expect(await aenderePartner(db, admin, paar, fremd, c, t.jetzt, true)).toBe('eingabe');
		expect(await aenderePartner(db, admin, paar, fremd, null, t.jetzt, true)).toBe('eingabe');
		expect(await anmeldungenIn(t.herren)).toEqual(vorher);
		expect(await verlaufVon(a)).toEqual([]);
		expect(await verlaufVon(c)).toEqual([]);

		// Kein Paar, unbekannt, ein Neuer, der nicht aktiv ist, oder ein Turnier in Vorbereitung.
		const allein = await anmeldungMit(t.doppel, [fremd], t.jetzt);
		expect(await aenderePartner(db, admin, allein, fremd, null, t.jetzt, true)).toBe(
			'nicht-gefunden'
		);
		expect(await aenderePartner(db, admin, -1, a, null, t.jetzt, true)).toBe('nicht-gefunden');
		const weg = await spieler('Emil', 'Ausgetreten');
		await db
			.update(mitglied)
			.set({ status: 'ausgetreten', austrittAm: t.jetzt })
			.where(eq(mitglied.id, weg));
		expect(await aenderePartner(db, admin, anderes, c, weg, t.jetzt, true)).toBe('nicht-gefunden');
		const vorbereitung = await turnier(false);
		const inVorbereitung = await anmeldungMit(vorbereitung.herren, [a, b], vorbereitung.jetzt);
		expect(await aenderePartner(db, admin, inVorbereitung, a, null, t.jetzt, true)).toBe(
			'vorbereitung'
		);
		expect(await anmeldungenIn(t.herren)).toEqual(vorher);
	});

	test('FR-46: verschieben: das Paar wechselt die Kategorie, Meldung an beide; im Ziel verfallen ihre Anfragen; voll zählt die verschobene nicht', async () => {
		const t = await turnier();
		const paul = await spieler('Paul', 'Brunner');
		const urs = await spieler('Urs', 'Christen');
		const dritter = await spieler('Dario', 'Dritter');
		// Paul hat mit dieser drei Anmeldungen: verschieben warnt nicht.
		await anmeldungMit(t.einzel[0], [paul], t.jetzt);
		await anmeldungMit(t.einzel[1], [paul], t.jetzt);
		const paar = await anmeldungMit(t.doppel, [paul, urs], t.jetzt);
		await anfrageMit(t.herren, urs, dritter, t.jetzt);
		// In der alten Kategorie verfällt sie ohne «hat inzwischen einen Partner».
		await anfrageMit(t.doppel, dritter, paul, t.jetzt);

		expect(await verschiebeDoppel(db, admin, paar, t.herren, t.jetzt, false)).toEqual({
			ergebnis: 'ok',
			turnierId: t.id,
			von: 'Offenes Doppel',
			nach: 'Herren Doppel',
			meldungen: sortiert([
				{
					mitgliedId: paul,
					text: verschobenDoppelText('Offenes Doppel', 'Herren Doppel', false)
				},
				{
					mitgliedId: urs,
					text: verschobenDoppelText('Offenes Doppel', 'Herren Doppel', false)
				},
				{
					mitgliedId: dritter,
					text: hinfaelligMeldung('Urs Christen', 'Herren Doppel', t.id).text
				},
				{ mitgliedId: dritter, text: anfrageHinfaelligText('Paul Brunner', 'Offenes Doppel') }
			])
		});
		expect(await anmeldungenIn(t.doppel)).toEqual([]);
		expect(await anmeldungenIn(t.herren)).toEqual([
			{ id: paar, status: 'bestaetigt', suchtext: null, spieler: paarIds(paul, urs) }
		]);
		expect(await anfragenIn(t.doppel)).toEqual([]);
		expect(await anfragenIn(t.herren)).toEqual([]);
		expect(await verlaufVon(paul)).toHaveLength(1);
		expect(await verlaufVon(urs)).toHaveLength(1);
	});

	test('FR-46: verschieben warnt bei Summe unter der Mindestsumme des Ziels und nach Schluss; trotzdem verschiebt', async () => {
		const t = await turnier();
		const lena = await spieler('Lena', 'Aebi', { geschlecht: 'w', klassierung: 'R4' });
		const max = await spieler('Max', 'Zaugg', { klassierung: 'R4' });
		const paar = await anmeldungMit(t.doppel, [lena, max], t.jetzt);
		// R4 + R4 = 8 liegt unter der Mindestsumme 9 des Ziels.

		expect(await verschiebeDoppel(db, admin, paar, t.mixed, t.spaet, false)).toEqual({
			warnungen: ['passt-nicht', 'geschlossen']
		});
		expect(await aktiveIn(t.doppel)).toEqual([expect.objectContaining({ id: paar })]);
		expect(await verlaufVon(lena)).toEqual([]);
		expect(await verschiebeDoppel(db, admin, paar, t.mixed, t.spaet, true)).toEqual(
			expect.objectContaining({ ergebnis: 'ok', von: 'Offenes Doppel', nach: 'Mixed Doppel' })
		);
		expect(await aktiveIn(t.mixed)).toEqual([expect.objectContaining({ id: paar })]);

		// Drei andere aktive und diese: voll, auch wenn die verschobene nicht mitzählt.
		const voll = await spieler('Vinzenz', 'Voll');
		for (const k of t.einzel) await anmeldungMit(k, [voll], t.jetzt);
		const sucht = await anmeldungMit(t.doppel, [voll], t.jetzt);
		expect(await verschiebeDoppel(db, admin, sucht, t.herren, t.jetzt, false)).toEqual({
			warnungen: ['voll']
		});
		expect(await aktiveIn(t.doppel)).toEqual([expect.objectContaining({ id: sucht })]);
	});

	test('FR-46, Review Focus 3: verschieben, wo einer schon steht, ergibt schon-angemeldet; Einzel, abgesagt oder anderes Turnier nicht-gefunden', async () => {
		const t = await turnier();
		const a = await spieler('Andreas', 'Ammann');
		const b = await spieler('Bruno', 'Bauer');
		const paar = await anmeldungMit(t.doppel, [a, b], t.jetzt);
		await anmeldungMit(t.herren, [b], t.jetzt);
		const vorher = [...(await anmeldungenIn(t.doppel)), ...(await anmeldungenIn(t.herren))];

		expect(await verschiebeDoppel(db, admin, paar, t.herren, t.jetzt, true)).toBe(
			'schon-angemeldet'
		);
		expect(await verschiebeDoppel(db, admin, paar, t.doppel, t.jetzt, true)).toBe(
			'schon-angemeldet'
		);
		expect(await verschiebeDoppel(db, admin, paar, t.einzel[0], t.jetzt, true)).toBe(
			'nicht-gefunden'
		);
		await db.update(kategorie).set({ status: 'abgesagt' }).where(eq(kategorie.id, t.mixed));
		expect(await verschiebeDoppel(db, admin, paar, t.mixed, t.jetzt, true)).toBe('nicht-gefunden');
		const anderes = await turnier();
		expect(await verschiebeDoppel(db, admin, paar, anderes.doppel, t.jetzt, true)).toBe(
			'nicht-gefunden'
		);
		expect(await verschiebeDoppel(db, admin, -1, t.herren, t.jetzt, true)).toBe('nicht-gefunden');
		expect([...(await anmeldungenIn(t.doppel)), ...(await anmeldungenIn(t.herren))]).toEqual(
			vorher
		);
		expect(await verlaufVon(a)).toEqual([]);

		// Ein ausgetretener Spieler kommt in keine neue Kategorie; eine Einzel-Anmeldung ist kein Doppel.
		await db.update(kategorie).set({ status: 'aktiv' }).where(eq(kategorie.id, t.mixed));
		await db
			.update(mitglied)
			.set({ status: 'ausgetreten', austrittAm: t.jetzt })
			.where(eq(mitglied.id, a));
		expect(await verschiebeDoppel(db, admin, paar, t.mixed, t.jetzt, true)).toBe('nicht-gefunden');
		expect(await aktiveIn(t.doppel)).toEqual([expect.objectContaining({ id: paar })]);
		const einzel = await anmeldungMit(t.einzel[0], [b], t.jetzt);
		expect(await verschiebeDoppel(db, admin, einzel, t.einzel[1], t.jetzt, true)).toBe(
			'nicht-gefunden'
		);
		const vorbereitung = await turnier(false);
		const c = await spieler('Cyrill', 'Caduff');
		const inVorbereitung = await anmeldungMit(vorbereitung.doppel, [c], vorbereitung.jetzt);
		expect(
			await verschiebeDoppel(db, admin, inVorbereitung, vorbereitung.herren, t.jetzt, true)
		).toBe('vorbereitung');
	});

	test('FR-46: verschieben eines Suchenden: seine Anfragen in der alten Kategorie verfallen mit Meldung, die im Ziel und sein Kommentar bleiben', async () => {
		const t = await turnier();
		const urs = await spieler('Urs', 'Christen');
		const dritter = await spieler('Dario', 'Dritter');
		const vierter = await spieler('Viktor', 'Vierter');
		const fuenfter = await spieler('Felix', 'Fünfter');
		const sucht = await anmeldungMit(t.doppel, [urs], t.jetzt, 'Eher abends');
		await anfrageMit(t.doppel, urs, dritter, t.jetzt);
		await anfrageMit(t.doppel, vierter, urs, t.jetzt);
		const bleibt = await anfrageMit(t.herren, urs, fuenfter, t.jetzt);

		expect(await verschiebeDoppel(db, admin, sucht, t.herren, t.jetzt, false)).toEqual({
			ergebnis: 'ok',
			turnierId: t.id,
			von: 'Offenes Doppel',
			nach: 'Herren Doppel',
			meldungen: sortiert([
				{
					mitgliedId: urs,
					text: 'Der CM-Admin hat deine Anmeldung von «Offenes Doppel» nach «Herren Doppel» verschoben.'
				},
				{
					mitgliedId: dritter,
					text: 'Die Anfrage mit Urs Christen für «Offenes Doppel» ist hinfällig.'
				},
				{
					mitgliedId: vierter,
					text: 'Die Anfrage mit Urs Christen für «Offenes Doppel» ist hinfällig.'
				}
			])
		});
		expect(await anmeldungenIn(t.herren)).toEqual([
			{ id: sucht, status: 'bestaetigt', suchtext: 'Eher abends', spieler: [urs] }
		]);
		expect(await anfragenIn(t.doppel)).toEqual([]);
		expect(await anfragenIn(t.herren)).toEqual([{ id: bleibt, vonId: urs, anId: fuenfter }]);
	});

	test('FR-46: Doppel löschen: zurückgezogen, Kommentar weg, Meldung an beide, auch nach Schluss', async () => {
		const t = await turnier();
		const lena = await spieler('Lena', 'Aebi', { geschlecht: 'w', klassierung: 'R4' });
		const max = await spieler('Max', 'Zaugg');
		const urs = await spieler('Urs', 'Christen');
		const paar = await anmeldungMit(t.mixed, [lena, max], t.jetzt);
		const sucht = await anmeldungMit(t.herren, [urs], t.jetzt, 'Eher abends');

		expect(await loescheDoppel(db, admin, paar, t.spaet)).toEqual({
			ergebnis: 'ok',
			turnierId: t.id,
			meldungen: sortiert([
				{ mitgliedId: lena, text: geloeschtDoppelText('Mixed Doppel', false) },
				{ mitgliedId: max, text: geloeschtDoppelText('Mixed Doppel', false) }
			])
		});
		expect(await loescheDoppel(db, admin, sucht, t.jetzt)).toEqual({
			ergebnis: 'ok',
			turnierId: t.id,
			meldungen: [
				{ mitgliedId: urs, text: 'Der CM-Admin hat deine Anmeldung für «Herren Doppel» gelöscht.' }
			]
		});
		expect(await anmeldungenIn(t.mixed)).toEqual([
			{ id: paar, status: 'zurueckgezogen', suchtext: null, spieler: paarIds(lena, max) }
		]);
		expect(await anmeldungenIn(t.herren)).toEqual([
			{ id: sucht, status: 'zurueckgezogen', suchtext: null, spieler: [urs] }
		]);
		for (const id of [lena, max, urs]) expect(await verlaufVon(id)).toHaveLength(1);
	});

	test('FR-46, Review Focus 4: Doppel löschen einer abgemeldeten, einer Einzel- oder unbekannten Anmeldung oder in Vorbereitung ergibt nicht-gefunden, ohne Meldung', async () => {
		const t = await turnier();
		const a = await spieler('Andreas', 'Ammann');
		const b = await spieler('Bruno', 'Bauer');
		const paar = await anmeldungMit(t.herren, [a, b], t.jetzt);
		await db.update(anmeldung).set({ status: 'zurueckgezogen' }).where(eq(anmeldung.id, paar));
		expect(await loescheDoppel(db, admin, paar, t.jetzt)).toBe('nicht-gefunden');
		const einzel = await anmeldungMit(t.einzel[0], [a], t.jetzt);
		expect(await loescheDoppel(db, admin, einzel, t.jetzt)).toBe('nicht-gefunden');
		expect(await loescheDoppel(db, admin, -1, t.jetzt)).toBe('nicht-gefunden');
		const vorbereitung = await turnier(false);
		const inVorbereitung = await anmeldungMit(vorbereitung.herren, [b], vorbereitung.jetzt);
		expect(await loescheDoppel(db, admin, inVorbereitung, t.jetzt)).toBe('nicht-gefunden');
		expect(await aktiveIn(t.einzel[0])).toHaveLength(1);
		expect(await verlaufVon(a)).toEqual([]);
	});

	test('FR-46: artDerAnmeldung unterscheidet Einzel und Doppel für die Weiche der Schnittstelle', async () => {
		const t = await turnier();
		const a = await spieler('Andreas', 'Ammann');
		expect(await artDerAnmeldung(db, await anmeldungMit(t.einzel[0], [a], t.jetzt))).toBe('einzel');
		expect(await artDerAnmeldung(db, await anmeldungMit(t.herren, [a], t.jetzt))).toBe('doppel');
		expect(await artDerAnmeldung(db, -1)).toBeNull();
	});
});
