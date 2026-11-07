import { randomUUID } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { aenderung, anmeldung, anmeldungSpieler, mitglied } from '../db/schema.ts';
import type { KategorieWerte } from '../turnier/angaben.ts';
import {
	legeKategorieAn,
	legeTurnierAn,
	sageKategorieAb,
	setzeStatus
} from '../turnier/turniere.ts';
import { meldeAb, meldeAn, zaehleAktive } from './anmeldungen.ts';
import {
	entscheide,
	korrigiereKlassierung,
	ladeAnmeldungen,
	loescheAnmeldung,
	meldeVonHandAn,
	sucheSpieler,
	verschiebe
} from './verwaltung.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

// Die gemeinsame Test-Datenbank hat Turniere anderer Tests: jedes Turnier bekommt ein eigenes Jahr.
const zufallsJahr = () => 3000 + Math.floor(Math.random() * 6000);
// Anfang Mai, vor dem Anmeldeschluss am 31. Mai.
const jetztIn = (jahr: number) => new Date(`${jahr}-05-01T10:00:00Z`);
// Juni: nach dem Anmeldeschluss.
const spaeterIn = (jahr: number) => new Date(`${jahr}-06-15T10:00:00Z`);

async function kategorieIn(turnierId: number, name: string, teil: Partial<KategorieWerte> = {}) {
	const r = await legeKategorieAn(db, turnierId, {
		name,
		geschlecht: 'herren',
		art: 'einzel',
		jahrgangVon: null,
		jahrgangBis: null,
		klassierungVon: 'R1',
		klassierungBis: 'R5',
		mindestsumme: null,
		...teil
	});
	if (r.ergebnis !== 'ok') throw new Error(`Kategorie ${name}: ${r.ergebnis}`);
	return r.id;
}

/** Turnier in einem freien Jahr mit Einzel-Kategorien `namen` (Herren R1–R5), offen oder nicht. */
async function turnier(namen: string[] = ['Herren A'], offen = true) {
	for (;;) {
		const jahr = zufallsJahr();
		const r = await legeTurnierAn(db, {
			jahr,
			name: `Clubmeisterschaft ${jahr}`,
			anmeldeschluss: `${jahr}-05-31`,
			nummern: []
		});
		if (r.ergebnis !== 'ok') continue;
		const kategorien = [];
		for (const n of namen) kategorien.push(await kategorieIn(r.id, n));
		if (offen) expect(await setzeStatus(db, r.id, 'offen', jetztIn(jahr))).toBe('ok');
		return { id: r.id, jahr, jetzt: jetztIn(jahr), kategorien };
	}
}

type Angaben = Partial<{
	vorname: string;
	nachname: string;
	status: string;
	geschlecht: 'w' | 'm' | null;
	jahrgang: number | null;
	klassierung: string | null;
}>;

/** Erfundener Spieler; ohne Angaben ein Herr, Jahrgang 1990, R3. */
async function spieler(teil: Angaben = {}) {
	const { vorname, nachname, status, ...angaben } = teil;
	const m = await legeMitgliedAn(db, { vorname, nachname, status });
	await db
		.update(mitglied)
		.set({ geschlecht: 'm', jahrgang: 1990, klassierung: 'R3', ...angaben })
		.where(eq(mitglied.id, m.mitgliedId));
	return m.mitgliedId;
}

/** Alle Anmeldungen des Mitglieds in diesen Kategorien, gleich welcher Status. */
async function anmeldungenVon(mitgliedId: number, kategorien: number[]) {
	return db
		.select({ id: anmeldung.id, status: anmeldung.status, kategorieId: anmeldung.kategorieId })
		.from(anmeldung)
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.where(
			and(eq(anmeldungSpieler.mitgliedId, mitgliedId), inArray(anmeldung.kategorieId, kategorien))
		);
}

/** Anmeldung direkt in der Datenbank, z. B. ein Wildcard-Antrag oder ein Endzustand. */
async function anmeldungMit(
	kategorieId: number,
	mitgliedId: number,
	status: 'bestaetigt' | 'beantragt' | 'abgelehnt' | 'zurueckgezogen',
	jetzt: Date,
	kommentar: string | null = null
) {
	const [a] = await db
		.insert(anmeldung)
		.values({ kategorieId, status, kommentar, angemeldetAm: jetzt, geaendertAm: jetzt })
		.returning({ id: anmeldung.id });
	await db.insert(anmeldungSpieler).values({ anmeldungId: a.id, mitgliedId });
	return a.id;
}

async function statusVon(anmeldungId: number) {
	const [a] = await db
		.select({ status: anmeldung.status, kategorieId: anmeldung.kategorieId })
		.from(anmeldung)
		.where(eq(anmeldung.id, anmeldungId));
	return a;
}

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
 * Startet `beide`, während eine dritte Transaktion das Mitglied hält, und gibt es frei, sobald
 * beide auf die Sperre warten: so überschneiden sich die beiden Anfragen sicher.
 */
async function gleichzeitig<A, B>(mitgliedId: number, beide: () => [Promise<A>, Promise<B>]) {
	const laufend = await db.transaction(async (tx) => {
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

describe('A-ANMELDUNG-06, FR-46: Anmeldungen verwalten', () => {
	test('FR-46: von Hand anmelden ist bestätigt; unpassend warnt und legt nichts an, trotzdem geht', async () => {
		const t = await turnier(['Herren A']);
		const [a] = t.kategorien;
		const schwach = await kategorieIn(t.id, 'Herren R7–R9', {
			klassierungVon: 'R7',
			klassierungBis: 'R9'
		});
		const ich = await spieler();
		expect(await meldeVonHandAn(db, a, ich, t.jetzt, false)).toBe('ok');
		expect(await anmeldungenVon(ich, [a])).toEqual([
			expect.objectContaining({ status: 'bestaetigt', kategorieId: a })
		]);

		const r2 = await spieler({ klassierung: 'R2' });
		expect(await meldeVonHandAn(db, schwach, r2, t.jetzt, false)).toEqual({
			warnungen: ['passt-nicht']
		});
		expect(await anmeldungenVon(r2, [schwach])).toEqual([]);
		expect(await meldeVonHandAn(db, schwach, r2, t.jetzt, true)).toBe('ok');
		expect(await anmeldungenVon(r2, [schwach])).toEqual([
			expect.objectContaining({ status: 'bestaetigt' })
		]);
	});

	test('FR-05, FR-06, FR-37: Warnungen geschlossen, voll und angaben-fehlen; trotzdem geht', async () => {
		const t = await turnier(['K1', 'K2', 'K3', 'K4']);
		const [k1, k2, k3, k4] = t.kategorien;
		const ich = await spieler();
		const nachSchluss = spaeterIn(t.jahr);
		expect(await meldeVonHandAn(db, k1, ich, nachSchluss, false)).toEqual({
			warnungen: ['geschlossen']
		});
		expect(await meldeVonHandAn(db, k1, ich, nachSchluss, true)).toBe('ok');

		for (const k of [k2, k3]) expect(await meldeAn(db, k, ich, t.jetzt)).toBe('ok');
		expect(await meldeVonHandAn(db, k4, ich, t.jetzt, false)).toEqual({ warnungen: ['voll'] });
		expect(await meldeVonHandAn(db, k4, ich, t.jetzt, true)).toBe('ok');
		expect(await zaehleAktive(db, k4)).toBe(1);

		const ohne = await spieler({ klassierung: null });
		expect(await meldeVonHandAn(db, k1, ohne, nachSchluss, false)).toEqual({
			warnungen: ['angaben-fehlen', 'geschlossen']
		});
		expect(await meldeVonHandAn(db, k1, ohne, t.jetzt, true)).toBe('ok');
	});

	test('FR-46, FR-09: Vorbereitung, abgesagt, Doppel, Unbekannte und schon angemeldet', async () => {
		const vorbereitung = await turnier(['Herren A'], false);
		const ich = await spieler();
		expect(
			await meldeVonHandAn(db, vorbereitung.kategorien[0], ich, vorbereitung.jetzt, true)
		).toBe('vorbereitung');

		const t = await turnier(['Herren A', 'Abgesagt']);
		const [a, abgesagt] = t.kategorien;
		expect(await sageKategorieAb(db, abgesagt)).toBe('ok');
		const doppel = await kategorieIn(t.id, 'Doppel', {
			geschlecht: 'offen',
			art: 'doppel',
			klassierungVon: null,
			klassierungBis: null,
			mindestsumme: 9
		});
		for (const k of [abgesagt, doppel, -1]) {
			expect(await meldeVonHandAn(db, k, ich, t.jetzt, true)).toBe('nicht-gefunden');
		}
		expect(await meldeVonHandAn(db, a, -1, t.jetzt, true)).toBe('nicht-gefunden');
		const ausgetreten = await spieler({ status: 'ausgetreten' });
		expect(await meldeVonHandAn(db, a, ausgetreten, t.jetzt, true)).toBe('nicht-gefunden');

		expect(await meldeVonHandAn(db, a, ich, t.jetzt, false)).toBe('ok');
		expect(await meldeVonHandAn(db, a, ich, t.jetzt, true)).toBe('schon-angemeldet');
		const antrag = await spieler();
		await anmeldungMit(a, antrag, 'beantragt', t.jetzt, 'Bitte');
		expect(await meldeVonHandAn(db, a, antrag, t.jetzt, true)).toBe('schon-angemeldet');
		expect(await zaehleAktive(db, a)).toBe(2);
	});

	test('FR-46: verschieben nennt von und nach, ohne die verschobene zu zählen; ein Antrag wird bestätigt', async () => {
		const t = await turnier(['Herren A', 'Herren B', 'Herren C', 'Herren D']);
		const [a, b, c, d] = t.kategorien;
		const ich = await spieler();
		for (const k of [a, b, c]) expect(await meldeAn(db, k, ich, t.jetzt)).toBe('ok');
		const [inA] = (await anmeldungenVon(ich, [a])).map((z) => z.id);

		// Drei aktive: die verschobene zählt nicht, also keine Warnung «voll».
		expect(await verschiebe(db, inA, d, t.jetzt, false)).toEqual({
			ergebnis: 'ok',
			mitgliedId: ich,
			von: 'Herren A',
			nach: 'Herren D',
			turnierId: t.id
		});
		expect(await statusVon(inA)).toEqual({ status: 'bestaetigt', kategorieId: d });
		expect(await zaehleAktive(db, a)).toBe(0);

		const antrag = await spieler({ klassierung: 'R7' });
		const id = await anmeldungMit(a, antrag, 'beantragt', t.jetzt, 'Wildcard bitte');
		const schwach = await kategorieIn(t.id, 'Herren R6–R9', {
			klassierungVon: 'R6',
			klassierungBis: 'R9'
		});
		expect(await verschiebe(db, id, schwach, spaeterIn(t.jahr), false)).toEqual({
			warnungen: ['geschlossen']
		});
		expect(await statusVon(id)).toEqual({ status: 'beantragt', kategorieId: a });
		expect(await verschiebe(db, id, schwach, spaeterIn(t.jahr), true)).toMatchObject({
			ergebnis: 'ok',
			von: 'Herren A',
			nach: 'Herren R6–R9'
		});
		const [nachher] = await db.select().from(anmeldung).where(eq(anmeldung.id, id));
		expect(nachher).toMatchObject({
			status: 'bestaetigt',
			kategorieId: schwach,
			kommentar: 'Wildcard bitte',
			geaendertAm: spaeterIn(t.jahr)
		});
	});

	test('FR-46, FR-06, FR-07: verschieben warnt bei unpassend und voll', async () => {
		const t = await turnier(['K1', 'K2', 'K3', 'K4', 'K5']);
		const [k1, k2, k3, k4, k5] = t.kategorien;
		const damen = await kategorieIn(t.id, 'Damen', { geschlecht: 'damen' });
		const ich = await spieler();
		for (const k of [k1, k2, k3]) expect(await meldeAn(db, k, ich, t.jetzt)).toBe('ok');
		expect(await meldeVonHandAn(db, k4, ich, t.jetzt, true)).toBe('ok');
		const [inK1] = (await anmeldungenVon(ich, [k1])).map((z) => z.id);
		expect(await verschiebe(db, inK1, damen, t.jetzt, false)).toEqual({
			warnungen: ['passt-nicht', 'voll']
		});
		expect(await verschiebe(db, inK1, k5, t.jetzt, false)).toEqual({ warnungen: ['voll'] });
		expect(await statusVon(inK1)).toEqual({ status: 'bestaetigt', kategorieId: k1 });
		expect(await verschiebe(db, inK1, damen, t.jetzt, true)).toMatchObject({ ergebnis: 'ok' });
	});

	test('FR-09, FR-46: verschieben in die eigene oder eine belegte Kategorie, in ein anderes Turnier oder abgewiesene', async () => {
		const t = await turnier(['Herren A', 'Herren B']);
		const [a, b] = t.kategorien;
		const ich = await spieler();
		for (const k of [a, b]) expect(await meldeAn(db, k, ich, t.jetzt)).toBe('ok');
		const [inA] = (await anmeldungenVon(ich, [a])).map((z) => z.id);
		expect(await verschiebe(db, inA, a, t.jetzt, true)).toBe('schon-angemeldet');
		expect(await verschiebe(db, inA, b, t.jetzt, true)).toBe('schon-angemeldet');
		expect(await statusVon(inA)).toEqual({ status: 'bestaetigt', kategorieId: a });

		const anderes = await turnier(['Herren A']);
		expect(await verschiebe(db, inA, anderes.kategorien[0], t.jetzt, true)).toBe('nicht-gefunden');
		const abgesagt = await kategorieIn(t.id, 'Abgesagt');
		expect(await sageKategorieAb(db, abgesagt)).toBe('ok');
		const doppel = await kategorieIn(t.id, 'Doppel', {
			geschlecht: 'offen',
			art: 'doppel',
			klassierungVon: null,
			klassierungBis: null,
			mindestsumme: 9
		});
		for (const k of [abgesagt, doppel, -1]) {
			expect(await verschiebe(db, inA, k, t.jetzt, true)).toBe('nicht-gefunden');
		}
		expect(await verschiebe(db, -1, b, t.jetzt, true)).toBe('nicht-gefunden');
		const weg = await anmeldungMit(a, await spieler(), 'zurueckgezogen', t.jetzt);
		expect(await verschiebe(db, weg, b, t.jetzt, true)).toBe('nicht-gefunden');
		expect(await statusVon(inA)).toEqual({ status: 'bestaetigt', kategorieId: a });
	});

	test('FR-46: in Vorbereitung weisen verschieben, löschen und entscheiden ab', async () => {
		const t = await turnier(['Herren A', 'Herren B'], false);
		const [a, b] = t.kategorien;
		const ich = await spieler();
		const id = await anmeldungMit(a, ich, 'beantragt', t.jetzt, 'Bitte');
		expect(await verschiebe(db, id, b, t.jetzt, true)).toBe('vorbereitung');
		expect(await loescheAnmeldung(db, id, t.jetzt)).toBe('nicht-gefunden');
		expect(await entscheide(db, id, true, t.jetzt)).toBe('nicht-gefunden');
		expect(await statusVon(id)).toEqual({ status: 'beantragt', kategorieId: a });
	});

	test('FR-35, FR-06: löschen zieht zurück, zählt nicht mehr, danach lässt sich die Kategorie absagen', async () => {
		const t = await turnier(['Herren A']);
		const [a] = t.kategorien;
		const ich = await spieler();
		expect(await meldeAn(db, a, ich, t.jetzt)).toBe('ok');
		const [id] = (await anmeldungenVon(ich, [a])).map((z) => z.id);
		expect(await sageKategorieAb(db, a)).toEqual({ aktiv: 1 });

		// Auch nach dem Anmeldeschluss.
		const spaeter = spaeterIn(t.jahr);
		expect(await loescheAnmeldung(db, id, spaeter)).toEqual({
			mitgliedId: ich,
			kategorie: 'Herren A',
			turnierId: t.id
		});
		const [z] = await db.select().from(anmeldung).where(eq(anmeldung.id, id));
		expect(z).toMatchObject({ status: 'zurueckgezogen', geaendertAm: spaeter });
		expect(await zaehleAktive(db, a)).toBe(0);
		expect(await loescheAnmeldung(db, id, spaeter)).toBe('nicht-gefunden');
		expect(await loescheAnmeldung(db, -1, spaeter)).toBe('nicht-gefunden');
		expect(await sageKategorieAb(db, a)).toBe('ok');
	});

	test('FR-08: Wildcard-Antrag bestätigen oder ablehnen; zweiter Entscheid und Entscheid nach Rückzug ergeben nicht-beantragt', async () => {
		const t = await turnier(['Herren A']);
		const [a] = t.kategorien;
		const ja = await spieler();
		const nein = await spieler();
		const weg = await spieler();
		const idJa = await anmeldungMit(a, ja, 'beantragt', t.jetzt, 'Bitte');
		const idNein = await anmeldungMit(a, nein, 'beantragt', t.jetzt, 'Bitte');
		const idWeg = await anmeldungMit(a, weg, 'beantragt', t.jetzt, 'Bitte');
		const spaeter = spaeterIn(t.jahr);

		expect(await entscheide(db, idJa, true, spaeter)).toEqual({
			mitgliedId: ja,
			kategorie: 'Herren A',
			turnierId: t.id
		});
		expect(await entscheide(db, idNein, false, spaeter)).toEqual({
			mitgliedId: nein,
			kategorie: 'Herren A',
			turnierId: t.id
		});
		const zeilen = await db
			.select()
			.from(anmeldung)
			.where(inArray(anmeldung.id, [idJa, idNein]));
		expect(zeilen.find((z) => z.id === idJa)).toMatchObject({
			status: 'bestaetigt',
			kommentar: 'Bitte',
			geaendertAm: spaeter
		});
		expect(zeilen.find((z) => z.id === idNein)).toMatchObject({
			status: 'abgelehnt',
			geaendertAm: spaeter
		});
		expect(await zaehleAktive(db, a)).toBe(2);

		expect(await entscheide(db, idJa, false, spaeter)).toBe('nicht-beantragt');
		expect(await entscheide(db, idNein, true, spaeter)).toBe('nicht-beantragt');
		expect(await meldeAb(db, idWeg, weg, t.jetzt)).toBe('ok');
		expect(await entscheide(db, idWeg, true, t.jetzt)).toBe('nicht-beantragt');
		expect(await entscheide(db, -1, true, t.jetzt)).toBe('nicht-gefunden');
		expect(await statusVon(idJa)).toEqual({ status: 'bestaetigt', kategorieId: a });
	});

	test('FR-37, FR-26: Klassierung korrigieren schreibt einen Verlaufseintrag mit dem Admin als Urheber', async () => {
		const cm = await spieler();
		const ich = await spieler({ klassierung: 'R3' });
		const jetzt = new Date('2026-11-07T10:00:00Z');
		const urheber = { art: 'admin' as const, mitgliedId: cm };
		expect(await korrigiereKlassierung(db, urheber, ich, 'R5', jetzt)).toBe('ok');
		expect(await korrigiereKlassierung(db, urheber, ich, 'R5', jetzt)).toBe('ok');
		const [m] = await db
			.select({ klassierung: mitglied.klassierung })
			.from(mitglied)
			.where(eq(mitglied.id, ich));
		expect(m.klassierung).toBe('R5');
		const verlauf = await db
			.select({
				urheberArt: aenderung.urheberArt,
				urheberMitgliedId: aenderung.urheberMitgliedId,
				aktion: aenderung.aktion,
				detail: aenderung.detail
			})
			.from(aenderung)
			.where(eq(aenderung.mitgliedId, ich));
		expect(verlauf).toEqual([
			{
				urheberArt: 'admin',
				urheberMitgliedId: cm,
				aktion: 'feld-geaendert',
				detail: 'klassierung'
			}
		]);
		expect(await korrigiereKlassierung(db, urheber, -1, 'R5', jetzt)).toBe('nicht-gefunden');
	});

	test('A-ANMELDUNG-06: ladeAnmeldungen zeigt nur aktive, nach Nachname und Vorname', async () => {
		const t = await turnier(['Herren A', 'Herren B']);
		const [a, b] = t.kategorien;
		const zeta = await spieler({ vorname: 'Anna', nachname: 'Zeta' });
		const alphaB = await spieler({
			vorname: 'Bert',
			nachname: 'Alpha',
			klassierung: null,
			geschlecht: null,
			jahrgang: null
		});
		const alphaA = await spieler({ vorname: 'Adam', nachname: 'Alpha', klassierung: 'keine' });
		const idZeta = await anmeldungMit(a, zeta, 'bestaetigt', t.jetzt);
		const idAlphaB = await anmeldungMit(a, alphaB, 'beantragt', t.jetzt, 'Bin besser');
		const idAlphaA = await anmeldungMit(a, alphaA, 'bestaetigt', t.jetzt);
		await anmeldungMit(a, await spieler({ nachname: 'Weg' }), 'zurueckgezogen', t.jetzt);
		await anmeldungMit(a, await spieler({ nachname: 'Nein' }), 'abgelehnt', t.jetzt);
		await anmeldungMit(b, await spieler({ nachname: 'Anders' }), 'bestaetigt', t.jetzt);

		expect(await ladeAnmeldungen(db, a)).toEqual([
			{
				anmeldungId: idAlphaA,
				status: 'bestaetigt',
				kommentar: null,
				mitgliedId: alphaA,
				name: 'Alpha, Adam',
				geschlecht: 'm',
				jahrgang: 1990,
				klassierung: 'keine'
			},
			{
				anmeldungId: idAlphaB,
				status: 'beantragt',
				kommentar: 'Bin besser',
				mitgliedId: alphaB,
				name: 'Alpha, Bert',
				geschlecht: null,
				jahrgang: null,
				klassierung: null
			},
			{
				anmeldungId: idZeta,
				status: 'bestaetigt',
				kommentar: null,
				mitgliedId: zeta,
				name: 'Zeta, Anna',
				geschlecht: 'm',
				jahrgang: 1990,
				klassierung: 'R3'
			}
		]);
		expect(await ladeAnmeldungen(db, -1)).toEqual([]);
	});

	test('A-ANMELDUNG-06: sucheSpieler findet aktive nach Vor- oder Nachname, höchstens 20', async () => {
		const zeichen = randomUUID().slice(0, 8);
		const probe = await spieler({
			vorname: `Paul${zeichen}`,
			nachname: 'Probe',
			klassierung: null
		});
		await spieler({ vorname: `Paula${zeichen}`, nachname: 'Probe', status: 'ausgetreten' });
		const treffer = await sucheSpieler(db, 'pr');
		expect(treffer).toContainEqual({
			mitgliedId: probe,
			name: `Probe, Paul${zeichen}`,
			geschlecht: 'm',
			jahrgang: 1990,
			klassierung: null
		});
		expect(treffer.some((z) => z.name.includes(`Paula${zeichen}`))).toBe(false);
		expect((await sucheSpieler(db, `PAUL${zeichen}`)).map((z) => z.mitgliedId)).toEqual([probe]);

		const viele = `Viele${zeichen}`;
		for (let i = 0; i < 21; i++) await spieler({ vorname: `V${i}`, nachname: viele });
		expect(await sucheSpieler(db, viele.toLowerCase())).toHaveLength(20);
		expect(await sucheSpieler(db, ' p ')).toEqual([]);
		// Platzhalter der Suche gelten als Zeichen.
		expect(await sucheSpieler(db, '%%')).toEqual([]);
	});

	test('Review Focus 1: Rückzug des Mitglieds und Verschieben gleichzeitig ergeben einen Zustand ohne Fehler', async () => {
		const t = await turnier(['Herren A', 'Herren B']);
		const [a, b] = t.kategorien;
		const ich = await spieler();
		expect(await meldeAn(db, a, ich, t.jetzt)).toBe('ok');
		const [id] = (await anmeldungenVon(ich, [a])).map((z) => z.id);

		const [ab, verschoben] = await gleichzeitig(ich, () => [
			meldeAb(db, id, ich, t.jetzt),
			verschiebe(db, id, b, t.jetzt, false)
		]);
		expect(ab).toBe('ok');
		// Entweder zuerst verschoben und dann in B zurückgezogen, oder zuerst zurückgezogen in A.
		const zeilen = await anmeldungenVon(ich, [a, b]);
		if (verschoben === 'nicht-gefunden') {
			expect(zeilen).toEqual([{ id, status: 'zurueckgezogen', kategorieId: a }]);
		} else {
			expect(verschoben).toMatchObject({ ergebnis: 'ok', von: 'Herren A', nach: 'Herren B' });
			expect(zeilen).toEqual([{ id, status: 'zurueckgezogen', kategorieId: b }]);
		}
		expect((await zaehleAktive(db, a)) + (await zaehleAktive(db, b))).toBe(0);
	});

	test('Review Focus 1: Rückzug des Antrags und Entscheid gleichzeitig ergeben einen Zustand ohne Fehler', async () => {
		const t = await turnier(['Herren A']);
		const [a] = t.kategorien;
		const ich = await spieler();
		const id = await anmeldungMit(a, ich, 'beantragt', t.jetzt, 'Bitte');

		const [ab, entscheid] = await gleichzeitig(ich, () => [
			meldeAb(db, id, ich, t.jetzt),
			entscheide(db, id, true, t.jetzt)
		]);
		expect(ab).toBe('ok');
		if (entscheid !== 'nicht-beantragt') {
			expect(entscheid).toEqual({ mitgliedId: ich, kategorie: 'Herren A', turnierId: t.id });
		}
		expect(await statusVon(id)).toEqual({ status: 'zurueckgezogen', kategorieId: a });
	});
});
