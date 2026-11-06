import { afterAll, describe, expect, test } from 'vitest';
import { erstelleDb } from '../db/index.ts';
import type { KategorieWerte, TurnierWerte } from './angaben.ts';
import {
	aendereKategorie,
	aendereTurnier,
	ladeKategorie,
	ladeTurnier,
	legeKategorieAn,
	legeTurnierAn,
	listeTurniere,
	sageKategorieAb,
	setzeStatus
} from './turniere.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

// Die gemeinsame Test-Datenbank hat Turniere anderer Tests: jedes Turnier bekommt ein eigenes Jahr.
const zufallsJahr = () => 3000 + Math.floor(Math.random() * 6000);
const werte = (teil: Partial<TurnierWerte> = {}): TurnierWerte => {
	const jahr = teil.jahr ?? zufallsJahr();
	return {
		jahr,
		name: `Clubmeisterschaft ${jahr}`,
		anmeldeschluss: `${jahr}-05-31`,
		nummern: [],
		...teil
	};
};
const einzel = (name: string, teil: Partial<KategorieWerte> = {}): KategorieWerte => ({
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

async function neuesTurnier(teil: Partial<TurnierWerte> = {}) {
	const w = werte(teil);
	const r = await legeTurnierAn(db, w);
	if (r.ergebnis !== 'ok') throw new Error('Jahr schon vergeben');
	return { id: r.id, w };
}
const jetztVor = (w: TurnierWerte) => new Date(`${w.jahr}-05-01T10:00:00Z`);
const jetztNach = (w: TurnierWerte) => new Date(`${w.jahr}-06-15T10:00:00Z`);

describe('Turniere', () => {
	test('FR-33: anlegen, laden, Nummern in Reihenfolge, zweites Turnier im selben Jahr ist vergeben', async () => {
		const nummern = [
			{ bezeichnung: 'Herren', nummer: '2200' },
			{ bezeichnung: 'Damen', nummer: '2201' },
			{ bezeichnung: 'Doppel', nummer: '2202' }
		];
		const { id, w } = await neuesTurnier({ nummern });
		const d = await ladeTurnier(db, id, jetztVor(w));
		expect(d).toMatchObject({
			id,
			jahr: w.jahr,
			name: w.name,
			anmeldeschluss: w.anmeldeschluss,
			status: 'vorbereitung',
			gespeicherterStatus: 'vorbereitung',
			nummern,
			kategorien: []
		});
		expect(await legeTurnierAn(db, werte({ jahr: w.jahr }))).toEqual({ ergebnis: 'vergeben' });
		expect(await ladeTurnier(db, -1, jetztVor(w))).toBeNull();
		const liste = await listeTurniere(db, jetztVor(w));
		expect(liste.find((z) => z.id === id)).toMatchObject({ jahr: w.jahr, kategorien: 0 });
	});

	test('FR-33: Jahr ändern auf ein vergebenes Jahr ergibt vergeben, Nummern werden ersetzt', async () => {
		const a = await neuesTurnier({ nummern: [{ bezeichnung: 'Alt', nummer: '1' }] });
		const b = await neuesTurnier();
		expect(await aendereTurnier(db, a.id, werte({ jahr: b.w.jahr }))).toBe('vergeben');
		// Die fehlgeschlagene Änderung lässt das Turnier unverändert, auch die Nummern.
		const unveraendert = await ladeTurnier(db, a.id, jetztVor(a.w));
		expect(unveraendert).toMatchObject({
			jahr: a.w.jahr,
			nummern: [{ bezeichnung: 'Alt', nummer: '1' }]
		});
		const neu = werte({
			jahr: a.w.jahr,
			name: 'Umbenannt',
			nummern: [
				{ bezeichnung: 'Neu A', nummer: '10' },
				{ bezeichnung: 'Neu B', nummer: '11' }
			]
		});
		expect(await aendereTurnier(db, a.id, neu)).toBe('ok');
		const d = await ladeTurnier(db, a.id, jetztVor(a.w));
		expect(d).toMatchObject({ name: 'Umbenannt', nummern: neu.nummern });
		expect(await aendereTurnier(db, -1, neu)).toBe('nicht-gefunden');
	});

	test('FR-33: öffnen braucht eine aktive Kategorie und einen Anmeldeschluss in der Zukunft', async () => {
		const { id, w } = await neuesTurnier();
		expect(await setzeStatus(db, id, 'offen', jetztVor(w))).toBe('keine-kategorie');
		await legeKategorieAn(db, id, einzel('Herren A'));
		expect(await setzeStatus(db, id, 'offen', jetztNach(w))).toBe('schluss-vorbei');
		expect(await setzeStatus(db, id, 'offen', jetztVor(w))).toBe('ok');
		expect((await ladeTurnier(db, id, jetztVor(w)))?.status).toBe('offen');
		expect(await setzeStatus(db, id, 'offen', jetztVor(w))).toBe('unzulaessig');
		expect(await setzeStatus(db, -1, 'offen', jetztVor(w))).toBe('nicht-gefunden');
		// Ohne Kategorie und nach Schluss gilt zuerst die fehlende Kategorie.
		const leer = await neuesTurnier();
		expect(await setzeStatus(db, leer.id, 'offen', jetztNach(leer.w))).toBe('keine-kategorie');
	});

	test('FR-33: früher schliessen und wieder öffnen; nach Ablauf wirkt offen als geschlossen', async () => {
		const { id, w } = await neuesTurnier();
		await legeKategorieAn(db, id, einzel('Herren A'));
		expect(await setzeStatus(db, id, 'geschlossen', jetztVor(w))).toBe('unzulaessig');
		expect(await setzeStatus(db, id, 'offen', jetztVor(w))).toBe('ok');
		expect(await setzeStatus(db, id, 'geschlossen', jetztVor(w))).toBe('ok');
		expect((await ladeTurnier(db, id, jetztVor(w)))?.status).toBe('geschlossen');
		expect(await setzeStatus(db, id, 'offen', jetztVor(w))).toBe('ok');
		const nach = await ladeTurnier(db, id, jetztNach(w));
		expect(nach).toMatchObject({ status: 'geschlossen', gespeicherterStatus: 'offen' });
		const liste = await listeTurniere(db, jetztNach(w));
		expect(liste.find((z) => z.id === id)?.status).toBe('geschlossen');
		// Wirksam geschlossen: Schliessen ist unzulässig, Öffnen scheitert am Schluss.
		expect(await setzeStatus(db, id, 'geschlossen', jetztNach(w))).toBe('unzulaessig');
		expect(await setzeStatus(db, id, 'offen', jetztNach(w))).toBe('schluss-vorbei');
	});
});

describe('Kategorien', () => {
	test('FR-34: Kategorie anlegen und ändern, gleicher Name im selben Turnier ist vergeben, nach Absage wieder frei', async () => {
		const { id } = await neuesTurnier();
		const a = await legeKategorieAn(db, id, einzel('Herren A'));
		if (a.ergebnis !== 'ok') throw new Error('anlegen');
		expect(await legeKategorieAn(db, id, einzel('HERREN a'))).toEqual({ ergebnis: 'vergeben' });
		expect(await legeKategorieAn(db, -1, einzel('X'))).toEqual({ ergebnis: 'nicht-gefunden' });
		const b = await legeKategorieAn(db, id, einzel('Herren B'));
		if (b.ergebnis !== 'ok') throw new Error('anlegen');
		expect(await aendereKategorie(db, b.id, einzel('herren a'))).toBe('vergeben');
		const doppel = einzel('Herren A', {
			art: 'doppel',
			klassierungVon: null,
			klassierungBis: null,
			mindestsumme: 9,
			jahrgangVon: 1990
		});
		expect(await aendereKategorie(db, a.id, doppel)).toBe('ok');
		expect(await ladeKategorie(db, a.id)).toMatchObject({
			...doppel,
			id: a.id,
			status: 'aktiv',
			turnierId: id
		});
		expect(await aendereKategorie(db, -1, doppel)).toBe('nicht-gefunden');
		expect(await ladeKategorie(db, -1)).toBeNull();
		expect(await sageKategorieAb(db, a.id)).toBe('ok');
		expect(await legeKategorieAn(db, id, einzel('Herren A'))).toMatchObject({ ergebnis: 'ok' });
	});

	test('FR-35: absagen setzt abgesagt, zählt nicht mehr und lässt sich nicht mehr ändern', async () => {
		const { id, w } = await neuesTurnier();
		const k = await legeKategorieAn(db, id, einzel('Damen A', { geschlecht: 'damen' }));
		if (k.ergebnis !== 'ok') throw new Error('anlegen');
		expect((await listeTurniere(db, jetztVor(w))).find((z) => z.id === id)?.kategorien).toBe(1);
		expect(await sageKategorieAb(db, k.id)).toBe('ok');
		expect(await sageKategorieAb(db, k.id)).toBe('ok');
		expect(await sageKategorieAb(db, -1)).toBe('nicht-gefunden');
		expect(await ladeKategorie(db, k.id)).toMatchObject({
			status: 'abgesagt',
			turnierjahr: w.jahr
		});
		expect(await aendereKategorie(db, k.id, einzel('Damen A'))).toBe('abgesagt');
		expect((await listeTurniere(db, jetztVor(w))).find((z) => z.id === id)?.kategorien).toBe(0);
		expect(await setzeStatus(db, id, 'offen', jetztVor(w))).toBe('keine-kategorie');
		const d = await ladeTurnier(db, id, jetztVor(w));
		expect(d?.kategorien).toHaveLength(1);
		expect(d?.kategorien[0]).toMatchObject({ id: k.id, status: 'abgesagt' });
	});
});
