import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { ladeCmAnsicht, laufendeTurniere, meldeAb, meldeAn } from '../cm/anmeldungen.ts';
import { erstelleDb } from '../db/index.ts';
import {
	anmeldung,
	anmeldungSpieler,
	konto,
	kontoRolle,
	mitglied,
	partnerAnfrage
} from '../db/schema.ts';
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
import { kontaktGueltig } from './kontakt.ts';

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

/** Turnier in einem freien Zufallsjahr: Ein schon vergebenes Jahr (anderer Test) wird neu gezogen. */
async function neuesTurnier(teil: Omit<Partial<TurnierWerte>, 'jahr'> = {}) {
	for (;;) {
		const w = werte(teil);
		const r = await legeTurnierAn(db, w);
		if (r.ergebnis === 'ok') return { id: r.id, w };
	}
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

describe('FR-55: Kontaktperson', () => {
	test('speichert einen CM-Admin als Kontakt, ladeTurnier zeigt ihn gültig', async () => {
		const admin = await legeMitgliedAn(db, {
			vorname: 'Kontakta',
			nachname: 'Beispiel',
			rollen: ['cm']
		});
		const { id, w } = await neuesTurnier();
		expect(await aendereTurnier(db, id, { ...w, kontakt: admin.mitgliedId })).toBe('ok');
		const d = await ladeTurnier(db, id, jetztVor(w));
		expect(d?.kontakt).toEqual({
			mitgliedId: admin.mitgliedId,
			name: { rufname: null, vorname: 'Kontakta', nachname: 'Beispiel' },
			gueltig: true
		});
		expect(d?.kontaktWahl).toContainEqual({
			mitgliedId: admin.mitgliedId,
			name: { rufname: null, vorname: 'Kontakta', nachname: 'Beispiel' }
		});
	});

	test('lehnt ein Mitglied ohne Rolle cm ab', async () => {
		const ohne = await legeMitgliedAn(db, { rollen: ['mitglieder'] });
		const { id, w } = await neuesTurnier();
		expect(await aendereTurnier(db, id, { ...w, kontakt: ohne.mitgliedId })).toBe(
			'kontakt-ungueltig'
		);
		expect((await ladeTurnier(db, id, jetztVor(w)))?.kontakt).toBeNull();
	});

	test('behält eine ungültig gewordene Kontaktperson beim Speichern ohne Änderung', async () => {
		const admin = await legeMitgliedAn(db, { rollen: ['cm'] });
		const { id, w } = await neuesTurnier();
		expect(await aendereTurnier(db, id, { ...w, kontakt: admin.mitgliedId })).toBe('ok');
		await db.delete(kontoRolle).where(eq(kontoRolle.kontoId, admin.kontoId));
		expect(
			await aendereTurnier(db, id, { ...w, name: `${w.name} neu`, kontakt: admin.mitgliedId })
		).toBe('ok');
		const d = await ladeTurnier(db, id, jetztVor(w));
		expect(d?.kontakt).toMatchObject({ mitgliedId: admin.mitgliedId, gueltig: false });
		expect(d?.kontaktWahl.map((k) => k.mitgliedId)).not.toContain(admin.mitgliedId);
	});

	test('kontaktWahl enthält nur aktive, nicht gesperrte CM-Admins', async () => {
		const gut = await legeMitgliedAn(db, { rollen: ['cm'] });
		const gesperrt = await legeMitgliedAn(db, { rollen: ['cm'], gesperrt: true });
		const ausgetreten = await legeMitgliedAn(db, { rollen: ['cm'], status: 'ausgetreten' });
		const vorgemerkt = await legeMitgliedAn(db, { rollen: ['cm'], status: 'vorgemerkt' });
		const { id, w } = await neuesTurnier();
		const ids = (await ladeTurnier(db, id, jetztVor(w)))?.kontaktWahl.map((k) => k.mitgliedId);
		expect(ids).toContain(gut.mitgliedId);
		for (const m of [gesperrt, ausgetreten, vorgemerkt]) expect(ids).not.toContain(m.mitgliedId);
		expect(await kontaktGueltig(db, gut.mitgliedId)).toBe(true);
		expect(await kontaktGueltig(db, vorgemerkt.mitgliedId)).toBe(false);
	});

	test('Speichern ohne Schlüssel kontakt lässt ihn stehen, null entfernt ihn', async () => {
		const admin = await legeMitgliedAn(db, { rollen: ['cm'] });
		const { id, w } = await neuesTurnier();
		await aendereTurnier(db, id, { ...w, kontakt: admin.mitgliedId });
		expect(await aendereTurnier(db, id, { ...w, name: `${w.name} x` })).toBe('ok');
		expect((await ladeTurnier(db, id, jetztVor(w)))?.kontakt?.mitgliedId).toBe(admin.mitgliedId);
		expect(await aendereTurnier(db, id, { ...w, kontakt: null })).toBe('ok');
		expect((await ladeTurnier(db, id, jetztVor(w)))?.kontakt).toBeNull();
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
		expect(await aendereKategorie(db, b.id, einzel('herren a'), false)).toBe('vergeben');
		const doppel = einzel('Herren A', {
			art: 'doppel',
			klassierungVon: null,
			klassierungBis: null,
			mindestsumme: 9,
			jahrgangVon: 1990
		});
		expect(await aendereKategorie(db, a.id, doppel, false)).toEqual({
			ergebnis: 'ok',
			hinfaellig: []
		});
		expect(await ladeKategorie(db, a.id)).toMatchObject({
			...doppel,
			id: a.id,
			status: 'aktiv',
			turnierId: id
		});
		expect(await aendereKategorie(db, -1, doppel, false)).toBe('nicht-gefunden');
		expect(await ladeKategorie(db, -1)).toBeNull();
		expect(await sageKategorieAb(db, a.id)).toEqual({ ergebnis: 'ok', hinfaellig: [] });
		expect(await legeKategorieAn(db, id, einzel('Herren A'))).toMatchObject({ ergebnis: 'ok' });
	});

	test('FR-35: absagen setzt abgesagt, zählt nicht mehr und lässt sich nicht mehr ändern', async () => {
		const { id, w } = await neuesTurnier();
		const k = await legeKategorieAn(db, id, einzel('Damen A', { geschlecht: 'damen' }));
		if (k.ergebnis !== 'ok') throw new Error('anlegen');
		expect((await listeTurniere(db, jetztVor(w))).find((z) => z.id === id)?.kategorien).toBe(1);
		expect(await sageKategorieAb(db, k.id)).toEqual({ ergebnis: 'ok', hinfaellig: [] });
		expect(await sageKategorieAb(db, k.id)).toEqual({ ergebnis: 'ok', hinfaellig: [] });
		expect(await sageKategorieAb(db, -1)).toBe('nicht-gefunden');
		expect(await ladeKategorie(db, k.id)).toMatchObject({
			status: 'abgesagt',
			turnierjahr: w.jahr
		});
		expect(await aendereKategorie(db, k.id, einzel('Damen A'), false)).toBe('abgesagt');
		expect((await listeTurniere(db, jetztVor(w))).find((z) => z.id === id)?.kategorien).toBe(0);
		expect(await setzeStatus(db, id, 'offen', jetztVor(w))).toBe('keine-kategorie');
		const d = await ladeTurnier(db, id, jetztVor(w));
		expect(d?.kategorien).toHaveLength(1);
		expect(d?.kategorien[0]).toMatchObject({ id: k.id, status: 'abgesagt' });
	});

	/** Offenes Turnier mit einer Herren-Kategorie R1–R5 und ein Herr mit Klassierung `klassierung`, angemeldet. */
	async function mitAnmeldung(klassierung = 'R3') {
		const { id, w } = await neuesTurnier();
		const k = await legeKategorieAn(db, id, einzel('Herren A'));
		if (k.ergebnis !== 'ok') throw new Error('anlegen');
		expect(await setzeStatus(db, id, 'offen', jetztVor(w))).toBe('ok');
		const m = await legeMitgliedAn(db, {});
		await db
			.update(mitglied)
			.set({ geschlecht: 'm', jahrgang: 1990, klassierung })
			.where(eq(mitglied.id, m.mitgliedId));
		expect(await meldeAn(db, k.id, m.mitgliedId, jetztVor(w))).toBe('ok');
		return { id, w, kid: k.id, mitgliedId: m.mitgliedId };
	}

	test('FR-36: Ändern mit unpassenden Anmeldungen ergibt unpassend mit Anzahl, mit trotzdem gespeichert, Anmeldungen bleiben', async () => {
		const t = await mitAnmeldung('R3');
		const enger = einzel('Herren A', { klassierungBis: 'R2' });
		expect(await aendereKategorie(db, t.kid, enger, false)).toEqual({ unpassend: 1 });
		expect((await ladeKategorie(db, t.kid))?.klassierungBis).toBe('R5');
		// Passt weiterhin: ohne Rückfrage gespeichert.
		const weiter = einzel('Herren A', { klassierungBis: 'R4' });
		expect(await aendereKategorie(db, t.kid, weiter, false)).toEqual({
			ergebnis: 'ok',
			hinfaellig: []
		});
		expect(await aendereKategorie(db, t.kid, enger, true)).toEqual({
			ergebnis: 'ok',
			hinfaellig: []
		});
		expect((await ladeKategorie(db, t.kid))?.klassierungBis).toBe('R2');
		const d = await ladeTurnier(db, t.id, jetztVor(t.w));
		expect(d?.kategorien[0].anmeldungen).toBe(1);
		// Ohne Anmeldungen ist alles ok.
		const leer = await legeKategorieAn(db, t.id, einzel('Herren B'));
		if (leer.ergebnis !== 'ok') throw new Error('anlegen');
		expect(
			await aendereKategorie(db, leer.id, einzel('Herren B', { klassierungBis: 'R1' }), false)
		).toEqual({ ergebnis: 'ok', hinfaellig: [] });
	});

	const alsDoppel = (name: string, teil: Partial<KategorieWerte> = {}): KategorieWerte =>
		einzel(name, {
			art: 'doppel',
			klassierungVon: null,
			klassierungBis: null,
			mindestsumme: 9,
			...teil
		});

	test('FR-36: Einzel/Doppel wechseln nur ohne Anmeldungen', async () => {
		const t = await mitAnmeldung();
		// Mit aktiver Anmeldung gesperrt, auch mit `trotzdem`; nichts gespeichert.
		expect(await aendereKategorie(db, t.kid, alsDoppel('Herren A'), false)).toBe('art-gesperrt');
		expect(await aendereKategorie(db, t.kid, alsDoppel('Herren A'), true)).toBe('art-gesperrt');
		expect((await ladeKategorie(db, t.kid))?.art).toBe('einzel');
		// Ohne aktive Anmeldung geht der Wechsel, hin und zurück.
		const leer = await legeKategorieAn(db, t.id, einzel('Herren B'));
		if (leer.ergebnis !== 'ok') throw new Error('anlegen');
		expect(await aendereKategorie(db, leer.id, alsDoppel('Herren B'), false)).toEqual({
			ergebnis: 'ok',
			hinfaellig: []
		});
		expect((await ladeKategorie(db, leer.id))?.art).toBe('doppel');
		expect(await aendereKategorie(db, leer.id, einzel('Herren B'), false)).toEqual({
			ergebnis: 'ok',
			hinfaellig: []
		});
	});

	/** Aktive Anmeldung mit diesen Spielern (ein Spieler: sucht Partner, zwei: Paar). */
	async function trageEin(kategorieId: number, spieler: number[], jetzt: Date) {
		const [a] = await db
			.insert(anmeldung)
			.values({ kategorieId, status: 'bestaetigt', angemeldetAm: jetzt, geaendertAm: jetzt })
			.returning({ id: anmeldung.id });
		await db
			.insert(anmeldungSpieler)
			.values(spieler.map((mitgliedId) => ({ anmeldungId: a.id, mitgliedId })));
	}

	async function herr(klassierung: string, mitLogin = false) {
		const m = await legeMitgliedAn(db, {});
		await db
			.update(mitglied)
			.set({ geschlecht: 'm', jahrgang: 1990, klassierung })
			.where(eq(mitglied.id, m.mitgliedId));
		// Anfragen zählen nur von Mitgliedern mit Login.
		if (mitLogin) {
			await db
				.update(konto)
				.set({ briefCodeBenutztAm: new Date('2026-01-05T10:00:00Z') })
				.where(eq(konto.mitgliedId, m.mitgliedId));
		}
		return m.mitgliedId;
	}

	test('FR-36: Warnung im Doppel zählt Paare nach Mindestsumme und Suchende nach Geschlecht', async () => {
		const { id, w } = await neuesTurnier();
		const k = await legeKategorieAn(db, id, alsDoppel('Herren Doppel'));
		if (k.ergebnis !== 'ok') throw new Error('anlegen');
		// R4 + R5 = 9 passt bei 9, nicht mehr bei 10; R7 + R8 = 15 passt bei beiden; dazu ein Suchender.
		await trageEin(k.id, [await herr('R4'), await herr('R5')], jetztVor(w));
		await trageEin(k.id, [await herr('R7'), await herr('R8')], jetztVor(w));
		await trageEin(k.id, [await herr('R6')], jetztVor(w));
		expect(await aendereKategorie(db, k.id, alsDoppel('Herren Doppel'), false)).toEqual({
			ergebnis: 'ok',
			hinfaellig: []
		});
		const hoeher = alsDoppel('Herren Doppel', { mindestsumme: 10 });
		expect(await aendereKategorie(db, k.id, hoeher, false)).toEqual({ unpassend: 1 });
		expect((await ladeKategorie(db, k.id))?.mindestsumme).toBe(9);
		// Auf Damen: beide Paare und der suchende Herr passen nicht mehr.
		const damen = alsDoppel('Herren Doppel', { geschlecht: 'damen' });
		expect(await aendereKategorie(db, k.id, damen, false)).toEqual({ unpassend: 3 });
	});

	test('FR-48: Absagen löscht die offenen Anfragen der Kategorie, andere bleiben', async () => {
		const { id, w } = await neuesTurnier();
		const k = await legeKategorieAn(db, id, alsDoppel('Herren Doppel'));
		const andere = await legeKategorieAn(db, id, alsDoppel('Offenes Doppel'));
		if (k.ergebnis !== 'ok' || andere.ergebnis !== 'ok') throw new Error('anlegen');
		const a = await herr('R4');
		const b = await herr('R5');
		for (const kategorieId of [k.id, andere.id]) {
			await db
				.insert(partnerAnfrage)
				.values({ kategorieId, vonId: a, anId: b, gestelltAm: jetztVor(w) });
		}
		expect(await sageKategorieAb(db, k.id)).toEqual({
			ergebnis: 'ok',
			hinfaellig: [expect.objectContaining({ vonId: a, kategorie: 'Herren Doppel' })]
		});
		const offen = await db
			.select({ kategorieId: partnerAnfrage.kategorieId })
			.from(partnerAnfrage)
			.where(eq(partnerAnfrage.vonId, a));
		expect(offen).toEqual([{ kategorieId: andere.id }]);
	});

	test('FR-36, FR-48: Wechsel Doppel → Einzel löscht die Anfragen; Zählung und Liste 0', async () => {
		const { id, w } = await neuesTurnier();
		const k = await legeKategorieAn(db, id, alsDoppel('Herren Doppel'));
		const andere = await legeKategorieAn(db, id, alsDoppel('Offenes Doppel'));
		if (k.ergebnis !== 'ok' || andere.ergebnis !== 'ok') throw new Error('anlegen');
		expect(await setzeStatus(db, id, 'offen', jetztVor(w))).toBe('ok');
		const a = await herr('R4', true);
		const b = await herr('R5');
		const c = await herr('R6', true);
		await db
			.insert(partnerAnfrage)
			.values({ kategorieId: k.id, vonId: a, anId: b, gestelltAm: jetztVor(w) });
		await db
			.insert(partnerAnfrage)
			.values({ kategorieId: andere.id, vonId: a, anId: c, gestelltAm: jetztVor(w) });
		const anfragenAn = async (mitgliedId: number) => ({
			zaehlung: (await laufendeTurniere(db, mitgliedId, jetztVor(w))).find((t) => t.id === id)
				?.anfragen,
			liste: (await ladeCmAnsicht(db, id, mitgliedId, jetztVor(w)))?.anfragen.length
		});
		expect(await anfragenAn(b)).toEqual({ zaehlung: 1, liste: 1 });

		expect(await aendereKategorie(db, k.id, einzel('Herren Doppel'), false)).toEqual({
			ergebnis: 'ok',
			hinfaellig: [expect.objectContaining({ vonId: a, kategorie: 'Herren Doppel' })]
		});
		expect(await anfragenAn(b)).toEqual({ zaehlung: 0, liste: 0 });
		const offen = await db
			.select({ kategorieId: partnerAnfrage.kategorieId })
			.from(partnerAnfrage)
			.where(eq(partnerAnfrage.vonId, a));
		expect(offen).toEqual([{ kategorieId: andere.id }]);
		// Eine Anfrage in einer Einzel-Kategorie zählt nie, auch wenn sie noch dastünde.
		await db
			.insert(partnerAnfrage)
			.values({ kategorieId: k.id, vonId: c, anId: b, gestelltAm: jetztVor(w) });
		expect(await anfragenAn(b)).toEqual({ zaehlung: 0, liste: 0 });
		expect(await anfragenAn(c)).toEqual({ zaehlung: 1, liste: 1 });
	});

	test('FR-35: Absagen mit aktiver Anmeldung ergibt hat-anmeldungen, nach Abmeldung geht es', async () => {
		const t = await mitAnmeldung();
		expect(await sageKategorieAb(db, t.kid)).toEqual({ aktiv: 1 });
		expect((await ladeKategorie(db, t.kid))?.status).toBe('aktiv');
		const [a] = await db
			.select({ id: anmeldung.id })
			.from(anmeldung)
			.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
			.where(eq(anmeldungSpieler.mitgliedId, t.mitgliedId));
		expect(await meldeAb(db, a.id, t.mitgliedId, jetztVor(t.w))).toEqual({
			ergebnis: 'ok',
			partnerId: null
		});
		expect(await sageKategorieAb(db, t.kid)).toEqual({ ergebnis: 'ok', hinfaellig: [] });
		expect((await ladeKategorie(db, t.kid))?.status).toBe('abgesagt');
		expect(await sageKategorieAb(db, -1)).toBe('nicht-gefunden');
	});

	test('FR-36: Turnierseite zählt aktive Anmeldungen je Kategorie', async () => {
		const t = await mitAnmeldung();
		const leer = await legeKategorieAn(db, t.id, einzel('Herren B'));
		if (leer.ergebnis !== 'ok') throw new Error('anlegen');
		const d = await ladeTurnier(db, t.id, jetztVor(t.w));
		expect(d?.kategorien.map((k) => [k.name, k.anmeldungen])).toEqual([
			['Herren A', 1],
			['Herren B', 0]
		]);
		expect((await ladeKategorie(db, t.kid))?.anmeldungen).toBe(1);
	});
});
