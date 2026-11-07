import { and, eq, inArray, sql } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { anmeldung, anmeldungSpieler, kategorie, mitglied } from '../db/schema.ts';
import type { KategorieWerte } from '../turnier/angaben.ts';
import { legeKategorieAn, legeTurnierAn, setzeStatus } from '../turnier/turniere.ts';
import { setzeKlassierung } from './angaben.ts';
import {
	eigeneKategorien,
	ladeCmAnsicht,
	laufendeTurniere,
	meldeAb,
	meldeAn,
	zaehleAktive,
	zaehleUnpassende
} from './anmeldungen.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

// Die gemeinsame Test-Datenbank hat Turniere anderer Tests: jedes Turnier bekommt ein eigenes Jahr.
const zufallsJahr = () => 3000 + Math.floor(Math.random() * 6000);
// Anfang Mai, vor dem Anmeldeschluss am 31. Mai.
const jetztIn = (jahr: number) => new Date(`${jahr}-05-01T10:00:00Z`);

async function turnierIm(jahr: number) {
	const r = await legeTurnierAn(db, {
		jahr,
		name: `Clubmeisterschaft ${jahr}`,
		anmeldeschluss: `${jahr}-05-31`,
		nummern: []
	});
	return r.ergebnis === 'ok' ? r.id : null;
}

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

/** Offenes Turnier in einem freien Jahr mit Einzel-Kategorien `namen` (Herren R1–R5). */
async function offenesTurnier(namen: string[] = ['Herren A']) {
	for (;;) {
		const jahr = zufallsJahr();
		const id = await turnierIm(jahr);
		if (id === null) continue;
		const kategorien = [];
		for (const n of namen) kategorien.push(await kategorieIn(id, n));
		expect(await setzeStatus(db, id, 'offen', jetztIn(jahr))).toBe('ok');
		return { id, jahr, jetzt: jetztIn(jahr), kategorien };
	}
}

type Angaben = Partial<{
	vorname: string;
	nachname: string;
	geschlecht: 'w' | 'm' | null;
	jahrgang: number | null;
	klassierung: string | null;
}>;

/** Erfundener Spieler; ohne Angaben ein Herr, Jahrgang 1990, R3. */
async function spieler(teil: Angaben = {}) {
	const m = await legeMitgliedAn(db, { vorname: teil.vorname, nachname: teil.nachname });
	await db
		.update(mitglied)
		.set({ geschlecht: 'm', jahrgang: 1990, klassierung: 'R3', ...teil })
		.where(eq(mitglied.id, m.mitgliedId));
	return m.mitgliedId;
}

async function aktiveVon(mitgliedId: number, kategorien: number[]) {
	return db
		.select({ id: anmeldung.id, status: anmeldung.status })
		.from(anmeldung)
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.where(
			and(
				eq(anmeldungSpieler.mitgliedId, mitgliedId),
				inArray(anmeldung.kategorieId, kategorien),
				inArray(anmeldung.status, ['bestaetigt', 'beantragt'])
			)
		);
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

async function anmeldungId(kategorieId: number, mitgliedId: number, jetzt: Date) {
	expect(await meldeAn(db, kategorieId, mitgliedId, jetzt)).toBe('ok');
	const [a] = await aktiveVon(mitgliedId, [kategorieId]);
	return a.id;
}

describe('CM-Anmeldung', () => {
	test('A-ANMELDUNG-03, FR-07: Ansicht zeigt nur passende Einzel-Kategorien mit Namen der bestätigten, Doppel nie', async () => {
		const t = await offenesTurnier();
		const [herren] = t.kategorien;
		const damen = await kategorieIn(t.id, 'Damen', { geschlecht: 'damen' });
		const schwach = await kategorieIn(t.id, 'Herren R6–R9', {
			klassierungVon: 'R6',
			klassierungBis: 'R9'
		});
		const senioren = await kategorieIn(t.id, 'Senioren', { jahrgangBis: 1980 });
		const offen = await kategorieIn(t.id, 'Offen', {
			geschlecht: 'offen',
			klassierungVon: 'N1',
			klassierungBis: 'R9'
		});
		await kategorieIn(t.id, 'Doppel', {
			geschlecht: 'offen',
			art: 'doppel',
			klassierungVon: null,
			klassierungBis: null,
			mindestsumme: 10
		});
		const abgesagt = await kategorieIn(t.id, 'Abgesagt');
		await db.update(kategorie).set({ status: 'abgesagt' }).where(eq(kategorie.id, abgesagt));

		const zeta = await spieler({ vorname: 'Anna', nachname: 'Zeta' });
		const alphaB = await spieler({ vorname: 'Bert', nachname: 'Alpha' });
		const alphaA = await spieler({ vorname: 'Adam', nachname: 'Alpha' });
		const weg = await spieler({ vorname: 'Weg', nachname: 'Gezogen' });
		const beantragt = await spieler({ vorname: 'Be', nachname: 'Antragt' });
		for (const s of [zeta, alphaB, alphaA])
			expect(await meldeAn(db, herren, s, t.jetzt)).toBe('ok');
		expect(await meldeAb(db, await anmeldungId(herren, weg, t.jetzt), weg, t.jetzt)).toBe('ok');
		const [b] = await db
			.insert(anmeldung)
			.values({
				kategorieId: herren,
				status: 'beantragt',
				angemeldetAm: t.jetzt,
				geaendertAm: t.jetzt
			})
			.returning({ id: anmeldung.id });
		await db.insert(anmeldungSpieler).values({ anmeldungId: b.id, mitgliedId: beantragt });

		const ich = await spieler();
		const a = await ladeCmAnsicht(db, t.id, ich, t.jetzt);
		expect(a).toEqual({
			turnier: {
				id: t.id,
				jahr: t.jahr,
				name: `Clubmeisterschaft ${t.jahr}`,
				anmeldeschluss: `${t.jahr}-05-31`,
				status: 'offen',
				anzahl: 0
			},
			fehlt: [],
			spieler: { geschlecht: 'm', jahrgang: 1990, klassierung: 'R3' },
			kategorien: [
				{
					id: herren,
					name: 'Herren A',
					art: 'einzel',
					geschlecht: 'herren',
					jahrgangVon: null,
					jahrgangBis: null,
					klassierungVon: 'R1',
					klassierungBis: 'R5',
					passt: true,
					anmeldungId: null,
					namen: ['Adam Alpha', 'Bert Alpha', 'Anna Zeta']
				},
				{
					id: offen,
					name: 'Offen',
					art: 'einzel',
					geschlecht: 'offen',
					jahrgangVon: null,
					jahrgangBis: null,
					klassierungVon: 'N1',
					klassierungBis: 'R9',
					passt: true,
					anmeldungId: null,
					namen: []
				}
			],
			eigene: [],
			grenze: 3
		});
		for (const k of [damen, schwach, senioren, abgesagt]) {
			expect(await meldeAn(db, k, ich, t.jetzt)).not.toBe('ok');
		}
	});

	test('FR-37: fehlt eine Angabe, sind die Kategorien leer und fehlt nennt sie', async () => {
		const t = await offenesTurnier();
		const ich = await spieler({ jahrgang: null, klassierung: null });
		const a = await ladeCmAnsicht(db, t.id, ich, t.jetzt);
		expect(a).toMatchObject({
			fehlt: ['klassierung', 'jahrgang'],
			spieler: { geschlecht: 'm', jahrgang: null, klassierung: null },
			kategorien: [],
			eigene: []
		});
		expect(await meldeAn(db, t.kategorien[0], ich, t.jetzt)).toBe('angaben-fehlen');
		expect(await ladeCmAnsicht(db, t.id, -1, t.jetzt)).toBeNull();
	});

	test('A-ANMELDUNG-01: anmelden gilt sofort als bestätigt und zählt', async () => {
		const t = await offenesTurnier(['Herren B', 'Herren A']);
		const [b, a] = t.kategorien;
		const ich = await spieler({ vorname: 'Ida', nachname: 'Ich' });
		expect(await meldeAn(db, b, ich, t.jetzt)).toBe('ok');
		expect(await meldeAn(db, a, ich, t.jetzt)).toBe('ok');

		const zeilen = await db
			.select()
			.from(anmeldung)
			.where(inArray(anmeldung.kategorieId, [a, b]));
		expect(zeilen).toHaveLength(2);
		for (const z of zeilen) {
			expect(z).toMatchObject({
				status: 'bestaetigt',
				angemeldetAm: t.jetzt,
				geaendertAm: t.jetzt
			});
		}

		const ansicht = await ladeCmAnsicht(db, t.id, ich, t.jetzt);
		expect(ansicht?.turnier.anzahl).toBe(2);
		const idB = zeilen.find((z) => z.kategorieId === b)!.id;
		const idA = zeilen.find((z) => z.kategorieId === a)!.id;
		expect(ansicht?.eigene).toEqual([
			{ anmeldungId: idA, kategorie: 'Herren A' },
			{ anmeldungId: idB, kategorie: 'Herren B' }
		]);
		expect(ansicht?.kategorien.find((k) => k.id === b)).toMatchObject({
			passt: true,
			anmeldungId: idB,
			namen: ['Ida Ich']
		});
		const laufend = await laufendeTurniere(db, ich, t.jetzt);
		expect(laufend.find((z) => z.id === t.id)).toEqual({
			id: t.id,
			name: `Clubmeisterschaft ${t.jahr}`,
			anmeldeschluss: `${t.jahr}-05-31`,
			status: 'offen',
			anzahl: 2
		});
		expect(await eigeneKategorien(db, t.id, ich)).toEqual(['Herren A', 'Herren B']);
		expect(await zaehleAktive(db, b)).toBe(1);
	});

	test('FR-06: die vierte Anmeldung ergibt voll, eine zurückgezogene zählt nicht', async () => {
		const t = await offenesTurnier(['K1', 'K2', 'K3', 'K4']);
		const [k1, k2, k3, k4] = t.kategorien;
		const ich = await spieler();
		const erste = await anmeldungId(k1, ich, t.jetzt);
		expect(await meldeAn(db, k2, ich, t.jetzt)).toBe('ok');
		expect(await meldeAn(db, k3, ich, t.jetzt)).toBe('ok');
		expect(await meldeAn(db, k4, ich, t.jetzt)).toBe('voll');
		expect(await meldeAb(db, erste, ich, t.jetzt)).toBe('ok');
		expect(await meldeAn(db, k4, ich, t.jetzt)).toBe('ok');
		expect(await aktiveVon(ich, t.kategorien)).toHaveLength(3);

		// Die Grenze gilt je Turnier: in einem anderen Turnier geht es weiter.
		const anderes = await offenesTurnier();
		expect(await meldeAn(db, anderes.kategorien[0], ich, anderes.jetzt)).toBe('ok');
	});

	test('FR-06: zwei gleichzeitige Anmeldungen bei zwei bestehenden ergeben genau eine dritte', async () => {
		const t = await offenesTurnier(['K1', 'K2', 'K3', 'K4']);
		const [k1, k2, k3, k4] = t.kategorien;
		const ich = await spieler();
		expect(await meldeAn(db, k1, ich, t.jetzt)).toBe('ok');
		expect(await meldeAn(db, k2, ich, t.jetzt)).toBe('ok');
		// Damit sich die beiden Anfragen sicher überschneiden, hält eine dritte Transaktion beide
		// Kategorien, bis beide Anfragen auf eine Sperre warten, und gibt sie dann gleichzeitig frei.
		const laufend = await db.transaction(async (tx) => {
			await tx
				.select({ id: kategorie.id })
				.from(kategorie)
				.where(inArray(kategorie.id, [k3, k4]))
				.for('update');
			const beide = Promise.all([meldeAn(db, k3, ich, t.jetzt), meldeAn(db, k4, ich, t.jetzt)]);
			await bisWartend(2);
			return { beide };
		});
		const ergebnisse = await laufend.beide;
		expect(ergebnisse.sort()).toEqual(['ok', 'voll']);
		expect(await aktiveVon(ich, t.kategorien)).toHaveLength(3);
	});

	test('FR-09: zweimal dieselbe Kategorie ergibt schon-angemeldet, nach Abmeldung wieder möglich', async () => {
		const t = await offenesTurnier();
		const [k] = t.kategorien;
		const ich = await spieler();
		const erste = await anmeldungId(k, ich, t.jetzt);
		expect(await meldeAn(db, k, ich, t.jetzt)).toBe('schon-angemeldet');
		expect(await meldeAb(db, erste, ich, t.jetzt)).toBe('ok');
		expect(await meldeAn(db, k, ich, t.jetzt)).toBe('ok');
		// Neu anmelden ist eine neue Zeile; die alte bleibt zurückgezogen.
		const alle = await db
			.select({ id: anmeldung.id, status: anmeldung.status })
			.from(anmeldung)
			.where(eq(anmeldung.kategorieId, k));
		expect(alle.map((z) => z.status).sort()).toEqual(['bestaetigt', 'zurueckgezogen']);
		expect(alle.find((z) => z.status === 'zurueckgezogen')?.id).toBe(erste);
		expect(await zaehleAktive(db, k)).toBe(1);
	});

	test('FR-07: unpassende Kategorie ergibt passt-nicht, bestehende bleibt nach Profiländerung abmeldbar', async () => {
		const t = await offenesTurnier();
		const [herren] = t.kategorien;
		const damen = await kategorieIn(t.id, 'Damen', { geschlecht: 'damen' });
		const ich = await spieler();
		expect(await meldeAn(db, damen, ich, t.jetzt)).toBe('passt-nicht');
		const id = await anmeldungId(herren, ich, t.jetzt);

		expect(await setzeKlassierung(db, ich, 'R7', t.jetzt)).toBe('ok');
		const a = await ladeCmAnsicht(db, t.id, ich, t.jetzt);
		expect(a?.kategorien).toEqual([
			expect.objectContaining({ id: herren, passt: false, anmeldungId: id })
		]);
		expect(await meldeAn(db, herren, ich, t.jetzt)).toBe('passt-nicht');
		expect(await meldeAb(db, id, ich, t.jetzt)).toBe('ok');
		expect((await ladeCmAnsicht(db, t.id, ich, t.jetzt))?.kategorien).toEqual([]);
	});

	test('FR-05, FR-10: am Schlusstag 23:59 an- und abmelden geht, 00:00 nicht; früh geschlossen sperrt beides', async () => {
		const t = await offenesTurnier(['K1', 'K2']);
		const [k1, k2] = t.kategorien;
		const ich = await spieler();
		const erste = await anmeldungId(k1, ich, t.jetzt);
		// Ende Mai gilt Sommerzeit: 23:59 in Zürich ist 21:59 UTC.
		const letzteMinute = new Date(`${t.jahr}-05-31T21:59:00Z`);
		const mitternacht = new Date(`${t.jahr}-05-31T22:00:00Z`);
		const zweite = await anmeldungId(k2, ich, letzteMinute);
		expect(await meldeAb(db, erste, ich, letzteMinute)).toBe('ok');
		expect(await meldeAn(db, k1, ich, mitternacht)).toBe('geschlossen');
		expect(await meldeAb(db, zweite, ich, mitternacht)).toBe('geschlossen');
		expect((await ladeCmAnsicht(db, t.id, ich, mitternacht))?.turnier.status).toBe('geschlossen');

		const frueh = await offenesTurnier(['K1', 'K2']);
		const id = await anmeldungId(frueh.kategorien[0], ich, frueh.jetzt);
		expect(await setzeStatus(db, frueh.id, 'geschlossen', frueh.jetzt)).toBe('ok');
		expect(await meldeAn(db, frueh.kategorien[1], ich, frueh.jetzt)).toBe('geschlossen');
		expect(await meldeAb(db, id, ich, frueh.jetzt)).toBe('geschlossen');
		expect(await aktiveVon(ich, frueh.kategorien)).toHaveLength(1);
	});

	test('FR-10: fremde Anmeldung abmelden ergibt nicht-gefunden', async () => {
		const t = await offenesTurnier();
		const [k] = t.kategorien;
		const ich = await spieler();
		const fremd = await spieler();
		const id = await anmeldungId(k, ich, t.jetzt);
		expect(await meldeAb(db, id, fremd, t.jetzt)).toBe('nicht-gefunden');
		expect(await meldeAb(db, -1, ich, t.jetzt)).toBe('nicht-gefunden');
		expect(await meldeAb(db, id, -1, t.jetzt)).toBe('nicht-gefunden');
		expect(await meldeAb(db, id, ich, t.jetzt)).toBe('ok');
		// Schon zurückgezogen: nichts mehr abzumelden.
		expect(await meldeAb(db, id, ich, t.jetzt)).toBe('nicht-gefunden');
		expect(await meldeAn(db, -1, ich, t.jetzt)).toBe('nicht-gefunden');
		expect(await meldeAn(db, k, -1, t.jetzt)).toBe('nicht-gefunden');
	});

	test('Austritt: ausgetretene oder vorgemerkte Mitglieder können sich nicht anmelden', async () => {
		const t = await offenesTurnier();
		const [k] = t.kategorien;
		const weg = await spieler();
		await db
			.update(mitglied)
			.set({ status: 'ausgetreten', austrittAm: t.jetzt })
			.where(eq(mitglied.id, weg));
		const vorgemerkt = await spieler();
		await db
			.update(mitglied)
			.set({ status: 'vorgemerkt', vorgemerktAm: t.jetzt, statusVorher: 'aktiv' })
			.where(eq(mitglied.id, vorgemerkt));
		expect(await meldeAn(db, k, weg, t.jetzt)).toBe('nicht-gefunden');
		expect(await meldeAn(db, k, vorgemerkt, t.jetzt)).toBe('nicht-gefunden');
		const zeilen = await db.select().from(anmeldung).where(eq(anmeldung.kategorieId, k));
		expect(zeilen).toHaveLength(0);
	});

	test('FR-33: Turnier in Vorbereitung ist für Mitglieder nicht sichtbar, laufende Turniere ab diesem Jahr', async () => {
		// Vier freie Jahre hintereinander: letztes Jahr, dieses (Vorbereitung), nächstes, übernächstes.
		let ids: (number | null)[];
		let jahr: number;
		do {
			jahr = zufallsJahr();
			ids = [];
			for (const j of [jahr - 1, jahr, jahr + 1, jahr + 2]) ids.push(await turnierIm(j));
		} while (ids.includes(null));
		const [letztes, vorbereitung, naechstes, uebernaechstes] = ids as number[];
		for (const [id, j] of [
			[letztes, jahr - 1],
			[naechstes, jahr + 1],
			[uebernaechstes, jahr + 2]
		]) {
			await kategorieIn(id, 'Herren A');
			expect(await setzeStatus(db, id, 'offen', jetztIn(j))).toBe('ok');
		}
		const vorbereitungKat = await kategorieIn(vorbereitung, 'Herren A');
		expect(await setzeStatus(db, uebernaechstes, 'geschlossen', jetztIn(jahr))).toBe('ok');

		// 31.12. 23:30 UTC ist in Zürich schon das Jahr `jahr`.
		const jetzt = new Date(`${jahr - 1}-12-31T23:30:00Z`);
		const ich = await spieler();
		const laufend = (await laufendeTurniere(db, ich, jetzt)).filter((z) => ids.includes(z.id));
		expect(laufend).toEqual([
			{
				id: naechstes,
				name: `Clubmeisterschaft ${jahr + 1}`,
				anmeldeschluss: `${jahr + 1}-05-31`,
				status: 'offen',
				anzahl: 0
			},
			{
				id: uebernaechstes,
				name: `Clubmeisterschaft ${jahr + 2}`,
				anmeldeschluss: `${jahr + 2}-05-31`,
				status: 'geschlossen',
				anzahl: 0
			}
		]);
		expect(await ladeCmAnsicht(db, vorbereitung, ich, jetzt)).toBeNull();
		expect(await ladeCmAnsicht(db, -1, ich, jetzt)).toBeNull();
		expect(await meldeAn(db, vorbereitungKat, ich, jetztIn(jahr))).toBe('nicht-gefunden');
	});

	test('FR-36: zaehleUnpassende zählt nur aktive, die nach den neuen Werten nicht passen', async () => {
		const t = await offenesTurnier();
		const [k] = t.kategorien;
		const r2 = await spieler({ klassierung: 'R2' });
		const r4 = await spieler({ klassierung: 'R4' });
		const r5 = await spieler({ klassierung: 'R5' });
		expect(await meldeAn(db, k, r2, t.jetzt)).toBe('ok');
		expect(await meldeAn(db, k, r4, t.jetzt)).toBe('ok');
		expect(await meldeAb(db, await anmeldungId(k, r5, t.jetzt), r5, t.jetzt)).toBe('ok');

		const regel = {
			art: 'einzel' as const,
			geschlecht: 'herren' as const,
			jahrgangVon: null,
			jahrgangBis: null,
			klassierungVon: 'R1',
			klassierungBis: 'R5'
		};
		expect(await zaehleAktive(db, k)).toBe(2);
		expect(await zaehleUnpassende(db, k, regel)).toBe(0);
		expect(await zaehleUnpassende(db, k, { ...regel, klassierungBis: 'R3' })).toBe(1);
		expect(await zaehleUnpassende(db, k, { ...regel, geschlecht: 'damen' })).toBe(2);
		expect(await zaehleUnpassende(db, k, { ...regel, jahrgangVon: 1991 })).toBe(2);
		expect(await zaehleUnpassende(db, -1, regel)).toBe(0);
	});
});
