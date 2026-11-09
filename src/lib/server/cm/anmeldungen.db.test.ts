import { and, eq, inArray, sql } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import {
	anmeldung,
	anmeldungSpieler,
	kategorie,
	konto,
	kontoRolle,
	mitglied,
	partnerAnfrage
} from '../db/schema.ts';
import type { KategorieWerte } from '../turnier/angaben.ts';
import {
	aendereTurnier,
	legeKategorieAn,
	legeTurnierAn,
	setzeStatus
} from '../turnier/turniere.ts';
import { setzeKlassierung } from './angaben.ts';
import {
	beantrageWildcard,
	eigeneKategorien,
	ladeCmAnsicht,
	laufendeTurniere,
	meldeAb,
	meldeAn,
	zaehleAktive,
	zaehleUnpassende
} from './anmeldungen.ts';
import { entscheide } from './verwaltung.ts';

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

/** Offenes Turnier in einem freien Jahr; `lege` legt die Kategorien vor dem Öffnen an. */
async function offenesTurnierMit<T>(lege: (turnierId: number) => Promise<T>) {
	for (;;) {
		const jahr = zufallsJahr();
		const id = await turnierIm(jahr);
		if (id === null) continue;
		const k = await lege(id);
		expect(await setzeStatus(db, id, 'offen', jetztIn(jahr))).toBe('ok');
		return { id, jahr, jetzt: jetztIn(jahr), k };
	}
}

type Angaben = Partial<{
	rufname: string | null;
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

/** Einzel-Kategorien kennen weder Paare noch Suchende noch Anfragen. */
const ohneDoppel = { paare: [], suchende: [], eigen: null, meineAnfragen: [] };

async function anmeldungId(kategorieId: number, mitgliedId: number, jetzt: Date) {
	expect(await meldeAn(db, kategorieId, mitgliedId, jetzt)).toBe('ok');
	const [a] = await aktiveVon(mitgliedId, [kategorieId]);
	return a.id;
}

describe('CM-Anmeldung', () => {
	test('A-ANMELDUNG-03, FR-07: Ansicht zeigt nur passende Kategorien, im Einzel mit Namen der bestätigten', async () => {
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
		const doppel = await kategorieIn(t.id, 'Doppel', {
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
		const alphaA = await spieler({ rufname: 'Addi', vorname: 'Adam', nachname: 'Alpha' });
		const weg = await spieler({ vorname: 'Weg', nachname: 'Gezogen' });
		const beantragt = await spieler({ vorname: 'Be', nachname: 'Antragt' });
		for (const s of [zeta, alphaB, alphaA])
			expect(await meldeAn(db, herren, s, t.jetzt)).toBe('ok');
		expect(await meldeAb(db, await anmeldungId(herren, weg, t.jetzt), weg, t.jetzt)).toEqual({
			ergebnis: 'ok',
			partnerId: null
		});
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
				anzahl: 0,
				anfragen: 0,
				neueAntwort: false
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
					mindestsumme: null,
					passt: true,
					anmeldungId: null,
					namen: [
						{ rufname: 'Addi', vorname: 'Adam', nachname: 'Alpha' },
						{ rufname: null, vorname: 'Bert', nachname: 'Alpha' },
						{ rufname: null, vorname: 'Anna', nachname: 'Zeta' }
					],
					...ohneDoppel
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
					mindestsumme: null,
					passt: true,
					anmeldungId: null,
					namen: [],
					...ohneDoppel
				},
				{
					id: doppel,
					name: 'Doppel',
					art: 'doppel',
					geschlecht: 'offen',
					jahrgangVon: null,
					jahrgangBis: null,
					klassierungVon: null,
					klassierungBis: null,
					mindestsumme: 10,
					passt: true,
					anmeldungId: null,
					namen: [],
					...ohneDoppel
				}
			],
			wildcard: [],
			eigene: [],
			anfragen: [],
			grenze: 3,
			kontakt: null,
			gespraech: { vorhanden: false, neueAntwort: false, schreiben: false }
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
			{ anmeldungId: idA, kategorie: 'Herren A', status: 'bestaetigt' },
			{ anmeldungId: idB, kategorie: 'Herren B', status: 'bestaetigt' }
		]);
		expect(ansicht?.kategorien.find((k) => k.id === b)).toMatchObject({
			passt: true,
			anmeldungId: idB,
			namen: [{ rufname: null, vorname: 'Ida', nachname: 'Ich' }]
		});
		const laufend = await laufendeTurniere(db, ich, t.jetzt);
		expect(laufend.find((z) => z.id === t.id)).toEqual({
			id: t.id,
			name: `Clubmeisterschaft ${t.jahr}`,
			anmeldeschluss: `${t.jahr}-05-31`,
			status: 'offen',
			anzahl: 2,
			anfragen: 0,
			neueAntwort: false
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
		expect(await meldeAb(db, erste, ich, t.jetzt)).toEqual({ ergebnis: 'ok', partnerId: null });
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
		expect(await meldeAb(db, erste, ich, t.jetzt)).toEqual({ ergebnis: 'ok', partnerId: null });
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
		expect(await meldeAb(db, id, ich, t.jetzt)).toEqual({ ergebnis: 'ok', partnerId: null });
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
		expect(await meldeAb(db, erste, ich, letzteMinute)).toEqual({
			ergebnis: 'ok',
			partnerId: null
		});
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
		expect(await meldeAb(db, id, ich, t.jetzt)).toEqual({ ergebnis: 'ok', partnerId: null });
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
				anzahl: 0,
				anfragen: 0,
				neueAntwort: false
			},
			{
				id: uebernaechstes,
				name: `Clubmeisterschaft ${jahr + 2}`,
				anmeldeschluss: `${jahr + 2}-05-31`,
				status: 'geschlossen',
				anzahl: 0,
				anfragen: 0,
				neueAntwort: false
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
		expect(await meldeAb(db, await anmeldungId(k, r5, t.jetzt), r5, t.jetzt)).toEqual({
			ergebnis: 'ok',
			partnerId: null
		});

		const regel = {
			art: 'einzel' as const,
			geschlecht: 'herren' as const,
			jahrgangVon: null,
			jahrgangBis: null,
			klassierungVon: 'R1',
			klassierungBis: 'R5',
			mindestsumme: null
		};
		expect(await zaehleAktive(db, k)).toBe(2);
		expect(await zaehleUnpassende(db, k, regel)).toBe(0);
		expect(await zaehleUnpassende(db, k, { ...regel, klassierungBis: 'R3' })).toBe(1);
		expect(await zaehleUnpassende(db, k, { ...regel, geschlecht: 'damen' })).toBe(2);
		expect(await zaehleUnpassende(db, k, { ...regel, jahrgangVon: 1991 })).toBe(2);
		expect(await zaehleUnpassende(db, -1, regel)).toBe(0);
	});

	test('A-ANMELDUNG-10, FR-08: Wildcard-Antrag R8 in R4–R6 ist beantragt, zählt bei der Grenze, Namen zeigen ihn nicht', async () => {
		const t = await offenesTurnierMit(async (id) => {
			const stark = await kategorieIn(id, 'Herren R4–R6', {
				klassierungVon: 'R4',
				klassierungBis: 'R6'
			});
			const passend = [];
			for (const n of ['Herren R7–R9 A', 'Herren R7–R9 B', 'Herren R7–R9 C']) {
				passend.push(await kategorieIn(id, n, { klassierungVon: 'R7', klassierungBis: 'R9' }));
			}
			await kategorieIn(id, 'Damen R4–R6', {
				geschlecht: 'damen',
				klassierungVon: 'R4',
				klassierungBis: 'R6'
			});
			return { stark, passend };
		});
		const { stark, passend } = t.k;
		const ich = await spieler({ vorname: 'Wim', nachname: 'Wildcard', klassierung: 'R8' });
		const r5 = await spieler({ vorname: 'Fünf', nachname: 'Passend', klassierung: 'R5' });
		expect(await meldeAn(db, stark, r5, t.jetzt)).toBe('ok');

		const vorher = await ladeCmAnsicht(db, t.id, ich, t.jetzt);
		expect(vorher?.wildcard).toEqual([
			expect.objectContaining({
				id: stark,
				name: 'Herren R4–R6',
				passt: false,
				anmeldungId: null,
				namen: [{ rufname: null, vorname: 'Fünf', nachname: 'Passend' }]
			})
		]);
		expect(vorher?.kategorien.map((k) => k.id)).toEqual(passend);
		// Wildcard nur über den Antrag, nicht über das normale Anmelden.
		expect(await meldeAn(db, stark, ich, t.jetzt)).toBe('passt-nicht');

		expect(
			await beantrageWildcard(db, stark, ich, 'Ich spiele seit Jahren R5-Gegner.', t.jetzt)
		).toBe('ok');
		const [zeile] = await db
			.select()
			.from(anmeldung)
			.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
			.where(and(eq(anmeldung.kategorieId, stark), eq(anmeldungSpieler.mitgliedId, ich)));
		expect(zeile.anmeldung).toMatchObject({
			status: 'beantragt',
			kommentar: 'Ich spiele seit Jahren R5-Gegner.',
			angemeldetAm: t.jetzt,
			geaendertAm: t.jetzt
		});
		const id = zeile.anmeldung.id;

		const nachher = await ladeCmAnsicht(db, t.id, ich, t.jetzt);
		expect(nachher?.turnier.anzahl).toBe(1);
		expect(nachher?.eigene).toEqual([
			{ anmeldungId: id, kategorie: 'Herren R4–R6', status: 'beantragt' }
		]);
		// Der Antrag steht im Wildcard-Bereich, nicht doppelt unter den Kategorien.
		expect(nachher?.wildcard).toEqual([
			expect.objectContaining({
				id: stark,
				anmeldungId: id,
				namen: [{ rufname: null, vorname: 'Fünf', nachname: 'Passend' }]
			})
		]);
		expect(nachher?.kategorien.map((k) => k.id)).toEqual(passend);
		// Andere sehen den Antrag nicht unter den Namen (nur bestätigte).
		const fremd = await ladeCmAnsicht(db, t.id, r5, t.jetzt);
		expect(fremd?.kategorien.find((k) => k.id === stark)?.namen).toEqual([
			{ rufname: null, vorname: 'Fünf', nachname: 'Passend' }
		]);

		expect(await beantrageWildcard(db, stark, ich, 'Nochmals.', t.jetzt)).toBe('schon-angemeldet');
		expect(await meldeAn(db, passend[0], ich, t.jetzt)).toBe('ok');
		expect(await meldeAn(db, passend[1], ich, t.jetzt)).toBe('ok');
		// FR-06: der Antrag zählt bei der Grenze von 3 mit.
		expect(await meldeAn(db, passend[2], ich, t.jetzt)).toBe('voll');
		expect(await eigeneKategorien(db, t.id, ich)).toEqual([
			'Herren R4–R6 (beantragt)',
			'Herren R7–R9 A',
			'Herren R7–R9 B'
		]);

		// Zurückziehen wie eine Abmeldung (FR-10).
		expect(await meldeAb(db, id, ich, t.jetzt)).toEqual({ ergebnis: 'ok', partnerId: null });
		expect((await ladeCmAnsicht(db, t.id, ich, t.jetzt))?.wildcard).toEqual([
			expect.objectContaining({ id: stark, anmeldungId: null })
		]);
	});

	test('A-ANMELDUNG-10, FR-08: ein laufender Antrag bleibt nach Klassierungsänderung unter wildcard', async () => {
		const t = await offenesTurnierMit(async (id) =>
			kategorieIn(id, 'Herren R4–R6', { klassierungVon: 'R4', klassierungBis: 'R6' })
		);
		const ich = await spieler({ klassierung: 'R8' });
		expect(await beantrageWildcard(db, t.k, ich, 'Bitte.', t.jetzt)).toBe('ok');
		const [{ id }] = await aktiveVon(ich, [t.k]);
		// R5 passt jetzt normal, R3 ist zu stark: der Antrag bleibt ein Antrag.
		for (const klassierung of ['R5', 'R3']) {
			expect(await setzeKlassierung(db, ich, klassierung, t.jetzt)).toBe('ok');
			const a = await ladeCmAnsicht(db, t.id, ich, t.jetzt);
			expect(a?.wildcard).toEqual([expect.objectContaining({ id: t.k, anmeldungId: id })]);
			expect(a?.kategorien).toEqual([]);
		}
		// Eine bestätigte Wildcard steht unter den Kategorien.
		expect(
			await entscheide(db, { art: 'admin', mitgliedId: ich }, id, true, t.jetzt)
		).toMatchObject({ mitgliedId: ich });
		const a = await ladeCmAnsicht(db, t.id, ich, t.jetzt);
		expect(a?.wildcard).toEqual([]);
		expect(a?.kategorien).toEqual([expect.objectContaining({ id: t.k, anmeldungId: id })]);
	});

	test('A-ANMELDUNG-10, FR-08: keine Wildcard nach unten, für andere Geschlechter oder passend; nach Ablehnung erneut', async () => {
		const t = await offenesTurnierMit(async (id) => ({
			schwach: await kategorieIn(id, 'Herren R7–R9', {
				klassierungVon: 'R7',
				klassierungBis: 'R9'
			}),
			stark: await kategorieIn(id, 'Herren R1–R3', {
				klassierungVon: 'R1',
				klassierungBis: 'R3'
			}),
			damen: await kategorieIn(id, 'Damen R1–R3', {
				geschlecht: 'damen',
				klassierungVon: 'R1',
				klassierungBis: 'R3'
			}),
			doppel: await kategorieIn(id, 'Doppel', {
				geschlecht: 'offen',
				art: 'doppel',
				klassierungVon: null,
				klassierungBis: null,
				mindestsumme: 10
			})
		}));
		const { schwach, stark, damen, doppel } = t.k;
		const r2 = await spieler({ klassierung: 'R2' });
		const ansicht = await ladeCmAnsicht(db, t.id, r2, t.jetzt);
		expect(ansicht?.wildcard).toEqual([]);
		for (const k of [schwach, stark, damen]) {
			expect(await beantrageWildcard(db, k, r2, 'Bitte.', t.jetzt)).toBe('keine-wildcard');
		}
		// Doppel bleiben für Mitglieder ausgeblendet, wie beim Anmelden.
		expect(await beantrageWildcard(db, doppel, r2, 'Bitte.', t.jetzt)).toBe('nicht-gefunden');
		const ohne = await spieler({ klassierung: 'R8', jahrgang: null });
		expect(await beantrageWildcard(db, stark, ohne, 'Bitte.', t.jetzt)).toBe('angaben-fehlen');
		expect((await ladeCmAnsicht(db, t.id, ohne, t.jetzt))?.wildcard).toEqual([]);
		expect(await beantrageWildcard(db, -1, r2, 'Bitte.', t.jetzt)).toBe('nicht-gefunden');
		expect(await beantrageWildcard(db, stark, -1, 'Bitte.', t.jetzt)).toBe('nicht-gefunden');

		const r8 = await spieler({ klassierung: 'R8' });
		const spaet = new Date(`${t.jahr}-06-01T10:00:00Z`);
		expect(await beantrageWildcard(db, stark, r8, 'Bitte.', spaet)).toBe('geschlossen');

		// Nach einer Ablehnung darf er erneut beantragen; die abgelehnte zählt nicht (FR-06).
		expect(await beantrageWildcard(db, stark, r8, 'Erster Versuch.', t.jetzt)).toBe('ok');
		const [erster] = await aktiveVon(r8, [stark]);
		expect(
			await entscheide(db, { art: 'admin', mitgliedId: r8 }, erster.id, false, t.jetzt)
		).toMatchObject({ mitgliedId: r8 });
		expect((await ladeCmAnsicht(db, t.id, r8, t.jetzt))?.turnier.anzahl).toBe(0);
		expect(await beantrageWildcard(db, stark, r8, 'Zweiter Versuch.', t.jetzt)).toBe('ok');
		const alle = await db
			.select({ id: anmeldung.id, status: anmeldung.status })
			.from(anmeldung)
			.where(eq(anmeldung.kategorieId, stark));
		expect(alle.map((z) => z.status).sort()).toEqual(['abgelehnt', 'beantragt']);
		expect(alle.find((z) => z.status === 'abgelehnt')?.id).toBe(erster.id);
	});

	test('A-ANMELDUNG-04, FR-19: Doppel auf der CM-Seite mit Paaren, Suchenden, Partner-Kontakt und Anfragen', async () => {
		const t = await offenesTurnierMit(async (id) => {
			const doppel = { art: 'doppel', klassierungVon: null, klassierungBis: null, mindestsumme: 9 };
			return {
				mixed: await kategorieIn(id, 'Mixed Doppel', { ...doppel, geschlecht: 'mixed' } as never),
				herren: await kategorieIn(id, 'Herren Doppel', {
					...doppel,
					geschlecht: 'herren'
				} as never),
				einzel: await kategorieIn(id, 'Herren A')
			};
		});
		const { mixed, herren, einzel } = t.k;
		const kontakt = (telefon: string | null, email: string | null) => ({ telefon, email });
		const setze = (id: number, k: { telefon: string | null; email: string | null }) =>
			db.update(mitglied).set(k).where(eq(mitglied.id, id));
		const doppelAnmeldung = async (kategorieId: number, ids: number[], suchtext: string | null) => {
			const [a] = await db
				.insert(anmeldung)
				.values({ kategorieId, suchtext, angemeldetAm: t.jetzt, geaendertAm: t.jetzt })
				.returning({ id: anmeldung.id });
			await db
				.insert(anmeldungSpieler)
				.values(ids.map((mitgliedId) => ({ anmeldungId: a.id, mitgliedId })));
			return a.id;
		};

		const rita = await spieler({
			vorname: 'Rita',
			nachname: 'Zumbach',
			geschlecht: 'w',
			klassierung: 'R4'
		});
		const sepp = await spieler({
			rufname: 'Joe',
			vorname: 'Sepp',
			nachname: 'Aebi',
			geschlecht: 'm',
			klassierung: 'R3'
		});
		const lea = await spieler({
			rufname: 'Lele',
			vorname: 'Lea',
			nachname: 'Marbach',
			geschlecht: 'w',
			klassierung: 'R6'
		});
		const marco = await spieler({
			vorname: 'Marco',
			nachname: 'Beispiel',
			geschlecht: 'm',
			klassierung: 'R5'
		});
		const nina = await spieler({
			vorname: 'Nina',
			nachname: 'Neutral',
			geschlecht: 'w',
			klassierung: 'R7'
		});
		// Namen kommen als Teile mit Rufname, wie die Namen der Einzel-Kategorien.
		const ritaName = { rufname: null, vorname: 'Rita', nachname: 'Zumbach' };
		const seppName = { rufname: 'Joe', vorname: 'Sepp', nachname: 'Aebi' };
		const leaName = { rufname: 'Lele', vorname: 'Lea', nachname: 'Marbach' };
		const marcoName = { rufname: null, vorname: 'Marco', nachname: 'Beispiel' };
		await setze(sepp, kontakt('079 111 22 33', 'sepp@example.org'));
		await setze(rita, kontakt(null, 'rita@example.org'));
		await setze(lea, kontakt('079 444 55 66', 'lea@example.org'));
		await setze(marco, kontakt('079 777 88 99', 'marco@example.org'));
		await setze(nina, kontakt('079 000 00 00', 'nina@example.org'));
		// Anfragen zählen nur von Mitgliedern mit Login.
		await db
			.update(konto)
			.set({ briefCodeBenutztAm: new Date('2026-01-05T10:00:00Z') })
			.where(inArray(konto.mitgliedId, [lea, nina]));

		const paarId = await doppelAnmeldung(mixed, [rita, sepp], null);
		const leaId = await doppelAnmeldung(mixed, [lea], 'Abends frei');
		const marcoId = await doppelAnmeldung(mixed, [marco], null);
		const anfrage = async (von: number, an: number) => {
			const [a] = await db
				.insert(partnerAnfrage)
				.values({ kategorieId: mixed, vonId: von, anId: an, gestelltAm: t.jetzt })
				.returning({ id: partnerAnfrage.id });
			return a.id;
		};
		const anfrageId = await anfrage(lea, marco);

		const kat = (a: Awaited<ReturnType<typeof ladeCmAnsicht>>, id: number) =>
			a?.kategorien.find((k) => k.id === id);

		// Marco: Herren Doppel und Mixed, Paar und Suchende ohne ihn, Anfrage von Lea mit Telefon.
		const m = await ladeCmAnsicht(db, t.id, marco, t.jetzt);
		expect(m?.kategorien.map((k) => k.name)).toEqual(['Mixed Doppel', 'Herren Doppel', 'Herren A']);
		expect(kat(m, mixed)).toMatchObject({
			art: 'doppel',
			mindestsumme: 9,
			passt: true,
			anmeldungId: marcoId,
			namen: [],
			paare: [[seppName, ritaName]],
			suchende: [{ name: leaName, kommentar: 'Abends frei' }],
			eigen: { art: 'sucht', kommentar: null },
			meineAnfragen: []
		});
		expect(kat(m, herren)).toMatchObject({
			anmeldungId: null,
			eigen: null,
			paare: [],
			suchende: []
		});
		expect(kat(m, einzel)).toMatchObject({ art: 'einzel', paare: [], suchende: [], eigen: null });
		expect(m?.anfragen).toEqual([
			{
				anfrageId,
				kategorieId: mixed,
				kategorie: 'Mixed Doppel',
				von: leaName,
				klassierung: 'R6',
				kontakt: { art: 'telefon', wert: '079 444 55 66' }
			}
		]);
		expect(m?.turnier.anzahl).toBe(1);

		// Ohne Telefon: die E-Mail-Adresse.
		await setze(lea, kontakt(null, 'lea@example.org'));
		expect((await ladeCmAnsicht(db, t.id, marco, t.jetzt))?.anfragen[0].kontakt).toEqual({
			art: 'email',
			wert: 'lea@example.org'
		});
		await setze(lea, kontakt('079 444 55 66', 'lea@example.org'));

		// Lea: Herren Doppel nicht für sie, die eigene Anfrage an Marco, ihr Suchtext.
		const l = await ladeCmAnsicht(db, t.id, lea, t.jetzt);
		expect(l?.kategorien.map((k) => k.name)).toEqual(['Mixed Doppel']);
		expect(kat(l, mixed)).toMatchObject({
			anmeldungId: leaId,
			suchende: [{ name: marcoName, kommentar: null }],
			eigen: { art: 'sucht', kommentar: 'Abends frei' },
			meineAnfragen: [{ anfrageId, an: marcoName }]
		});
		expect(l?.anfragen).toEqual([]);

		// Rita im Paar: Telefon und E-Mail des Partners (beides darf fehlen).
		const r = await ladeCmAnsicht(db, t.id, rita, t.jetzt);
		expect(kat(r, mixed)).toMatchObject({
			anmeldungId: paarId,
			paare: [[seppName, ritaName]],
			eigen: {
				art: 'paar',
				partner: { name: seppName, telefon: '079 111 22 33', email: 'sepp@example.org' }
			}
		});
		const s = await ladeCmAnsicht(db, t.id, sepp, t.jetzt);
		expect(kat(s, mixed)?.eigen).toEqual({
			art: 'paar',
			partner: { name: ritaName, telefon: null, email: 'rita@example.org' }
		});

		// Laufende Turniere zählen die offenen Anfragen an einen selbst.
		const stand = async (id: number) =>
			(await laufendeTurniere(db, id, t.jetzt)).find((x) => x.id === t.id);
		expect(await stand(marco)).toMatchObject({ anzahl: 1, anfragen: 1 });
		expect(await stand(lea)).toMatchObject({ anzahl: 1, anfragen: 0 });
		expect(await stand(nina)).toMatchObject({ anzahl: 0, anfragen: 0 });
		await anfrage(nina, marco);
		expect(await stand(marco)).toMatchObject({ anfragen: 2 });

		// Eine abgesagte Kategorie: Zählung und Liste lassen die Anfragen dort weg.
		await db.update(kategorie).set({ status: 'abgesagt' }).where(eq(kategorie.id, mixed));
		expect(await stand(marco)).toMatchObject({ anfragen: 0 });
		expect((await ladeCmAnsicht(db, t.id, marco, t.jetzt))?.anfragen).toEqual([]);
		await db.update(kategorie).set({ status: 'aktiv' }).where(eq(kategorie.id, mixed));

		// Wer die Anmeldung zurückzieht, verschwindet aus den Listen.
		await db.update(anmeldung).set({ status: 'zurueckgezogen' }).where(eq(anmeldung.id, leaId));
		expect(kat(await ladeCmAnsicht(db, t.id, marco, t.jetzt), mixed)?.suchende).toEqual([]);
		await db.update(anmeldung).set({ status: 'bestaetigt' }).where(eq(anmeldung.id, leaId));
	});

	test('A-ANMELDUNG-04, DS-08: die Ansicht eines Dritten enthält weder Kontakt noch Klassierung anderer', async () => {
		const t = await offenesTurnierMit((id) =>
			kategorieIn(id, 'Mixed Doppel', {
				art: 'doppel',
				geschlecht: 'mixed',
				klassierungVon: null,
				klassierungBis: null,
				mindestsumme: 9
			})
		);
		const lea = await spieler({
			vorname: 'Lea',
			nachname: 'Marbach',
			geschlecht: 'w',
			klassierung: 'R6'
		});
		const marco = await spieler({
			vorname: 'Marco',
			nachname: 'Beispiel',
			geschlecht: 'm',
			klassierung: 'R5'
		});
		const paula = await spieler({
			rufname: 'Pola',
			vorname: 'Paula',
			nachname: 'Paar',
			geschlecht: 'w',
			klassierung: 'R2'
		});
		const paul = await spieler({
			vorname: 'Paul',
			nachname: 'Paar',
			geschlecht: 'm',
			klassierung: 'N4'
		});
		const nina = await spieler({
			vorname: 'Nina',
			nachname: 'Neutral',
			geschlecht: 'w',
			klassierung: 'R7'
		});
		for (const [id, tel] of [
			[lea, '079 444 55 66'],
			[marco, '079 777 88 99'],
			[paula, '079 123 45 67'],
			[paul, '079 765 43 21']
		] as const) {
			await db
				.update(mitglied)
				.set({ telefon: tel, email: `m${id}@example.org` })
				.where(eq(mitglied.id, id));
		}
		for (const ids of [[lea], [marco], [paula, paul]]) {
			const [a] = await db
				.insert(anmeldung)
				.values({
					kategorieId: t.k,
					suchtext: 'Gern am Abend',
					angemeldetAm: t.jetzt,
					geaendertAm: t.jetzt
				})
				.returning({ id: anmeldung.id });
			await db
				.insert(anmeldungSpieler)
				.values(ids.map((mitgliedId) => ({ anmeldungId: a.id, mitgliedId })));
		}
		await db
			.insert(partnerAnfrage)
			.values({ kategorieId: t.k, vonId: lea, anId: marco, gestelltAm: t.jetzt });

		const ansicht = await ladeCmAnsicht(db, t.id, nina, t.jetzt);
		expect(ansicht?.kategorien[0]).toMatchObject({
			paare: [
				[
					{ rufname: null, vorname: 'Paul', nachname: 'Paar' },
					{ rufname: 'Pola', vorname: 'Paula', nachname: 'Paar' }
				]
			],
			suchende: [
				{
					name: { rufname: null, vorname: 'Marco', nachname: 'Beispiel' },
					kommentar: 'Gern am Abend'
				},
				{ name: { rufname: null, vorname: 'Lea', nachname: 'Marbach' }, kommentar: 'Gern am Abend' }
			]
		});
		const json = JSON.stringify(ansicht);
		for (const verboten of ['079', '@example.org', 'telefon', 'email', 'R6', 'R5', 'R2', 'N4']) {
			expect(json).not.toContain(verboten);
		}
		expect(ansicht?.anfragen).toEqual([]);
	});
});

describe('Kontaktperson der CM', () => {
	/** Offenes Turnier mit `kontakt` als Kontaktperson (vorher gültig CM-Admin). */
	async function mitKontakt() {
		const admin = await legeMitgliedAn(db, {
			vorname: 'Kontakta',
			nachname: 'Beispiel',
			rufname: 'Kati',
			rollen: ['cm']
		});
		const t = await offenesTurnier();
		const r = await aendereTurnier(db, t.id, {
			jahr: t.jahr,
			name: `Clubmeisterschaft ${t.jahr}`,
			anmeldeschluss: `${t.jahr}-05-31`,
			nummern: [],
			kontakt: admin.mitgliedId
		});
		expect(r).toBe('ok');
		return { t, admin };
	}
	const kontaktFuer = async (turnierId: number, jetzt: Date) =>
		(await ladeCmAnsicht(db, turnierId, await spieler(), jetzt))?.kontakt;

	test('zeigt den Namen der gewählten Kontaktperson', async () => {
		const { t } = await mitKontakt();
		expect(await kontaktFuer(t.id, t.jetzt)).toEqual({
			rufname: 'Kati',
			vorname: 'Kontakta',
			nachname: 'Beispiel'
		});
	});

	test('ohne gewählte Kontaktperson null', async () => {
		const t = await offenesTurnier();
		expect(await kontaktFuer(t.id, t.jetzt)).toBeNull();
	});

	test('null nach Entzug der Rolle cm', async () => {
		const { t, admin } = await mitKontakt();
		await db.delete(kontoRolle).where(eq(kontoRolle.kontoId, admin.kontoId));
		expect(await kontaktFuer(t.id, t.jetzt)).toBeNull();
	});

	test('null bei gesperrtem Konto', async () => {
		const { t, admin } = await mitKontakt();
		await db.update(konto).set({ gesperrt: true }).where(eq(konto.id, admin.kontoId));
		expect(await kontaktFuer(t.id, t.jetzt)).toBeNull();
	});

	test('null nach Austritt und bei Vormerkung zum Löschen', async () => {
		const a = await mitKontakt();
		await db
			.update(mitglied)
			.set({ status: 'ausgetreten', austrittAm: new Date() })
			.where(eq(mitglied.id, a.admin.mitgliedId));
		expect(await kontaktFuer(a.t.id, a.t.jetzt)).toBeNull();
		const b = await mitKontakt();
		await db
			.update(mitglied)
			.set({ status: 'vorgemerkt', vorgemerktAm: new Date(), statusVorher: 'aktiv' })
			.where(eq(mitglied.id, b.admin.mitgliedId));
		expect(await kontaktFuer(b.t.id, b.t.jetzt)).toBeNull();
	});

	test('auch wenn dem Spieler Angaben fehlen', async () => {
		const { t } = await mitKontakt();
		const ohneAngaben = await spieler({ klassierung: null, jahrgang: null });
		const a = await ladeCmAnsicht(db, t.id, ohneAngaben, t.jetzt);
		expect(a?.fehlt.length).toBeGreaterThan(0);
		expect(a?.kontakt).toMatchObject({ vorname: 'Kontakta' });
	});
});
