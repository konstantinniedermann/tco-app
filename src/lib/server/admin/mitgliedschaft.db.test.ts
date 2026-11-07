import { createHash, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import {
	legeEigeneDatenbankAn,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import type { Db } from '../db/index.ts';
import {
	aenderung,
	anlass,
	anlassAnmeldung,
	anmeldung,
	anmeldungSpieler,
	kategorie,
	kontoRolle,
	mitglied,
	passkey,
	pushAbo,
	sitzung,
	turnier
} from '../db/schema.ts';
import { erstelleSitzung, pruefeSitzung } from '../login/sitzung.ts';
import { ladeMitglied, type MitgliedStatus } from './mitglieder.ts';
import {
	erfasseAustritt,
	erfasseWiedereintritt,
	loeschtAm,
	merkeZumLoeschenVor,
	nimmLoeschungZurueck
} from './mitgliedschaft.ts';
import { istMytcoAdmin, ladeRollen } from './rollen.ts';
import { utcZuZuerich } from '../../anlass/zeit.ts';

// «Letzter MyTCO-Admin» ist global; darum eine eigene Datenbank statt der gemeinsamen.
let eigene: EigeneDatenbank | undefined;
let db: Db;

beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('mitgliedschaft');
	db = eigene.db;
});

afterAll(async () => {
	await eigene?.abbauen();
});

const jetzt = new Date('2026-11-07T08:00:00Z');
const TAG = 24 * 60 * 60 * 1000;
const hash = (kennung: string) => createHash('sha256').update(kennung).digest('hex');

let admin: Awaited<ReturnType<typeof legeMitgliedAn>>;
let urheber: { art: 'admin'; mitgliedId: number };

// Jeder Test beginnt mit genau einem zählenden MyTCO-Admin, der die Schritte auslöst.
beforeEach(async () => {
	await db.delete(kontoRolle);
	admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
	urheber = { art: 'admin', mitgliedId: admin.mitgliedId };
});

const zeile = async (id: number) => {
	const [z] = await db.select().from(mitglied).where(eq(mitglied.id, id));
	return { ...z, status: z.status as MitgliedStatus };
};
const aktionen = async (id: number) =>
	(
		await db
			.select({ aktion: aenderung.aktion, urheber: aenderung.urheberMitgliedId })
			.from(aenderung)
			.where(eq(aenderung.mitgliedId, id))
			.orderBy(aenderung.id)
	).map((z) => [z.aktion, z.urheber]);

/** Sitzung mit Push-Abo und ein Passkey für das Konto. */
async function mitLogin(kontoId: number) {
	const kennung = await erstelleSitzung(db, kontoId, jetzt);
	await db.insert(pushAbo).values({
		endpunkt: `https://push.example.org/${randomUUID()}`,
		sitzungHash: hash(kennung),
		kontoId,
		p256dh: 'p',
		auth: 'a',
		eingerichtetAm: jetzt
	});
	await db.insert(passkey).values({
		kennung: randomUUID(),
		kontoId,
		oeffentlicherSchluessel: 'schluessel',
		rpId: 'mytco.example.org',
		geraet: 'iPhone',
		eingerichtetAm: jetzt
	});
	return kennung;
}

let naechstesJahr = 2030;

/** Turnier mit einer Einzel- und einer Doppel-Kategorie. */
async function turnierMit(anmeldeschluss: string) {
	const [t] = await db
		.insert(turnier)
		.values({ jahr: naechstesJahr++, name: 'Clubmeisterschaft', anmeldeschluss, status: 'offen' })
		.returning({ id: turnier.id });
	const [einzel] = await db
		.insert(kategorie)
		.values({
			turnierId: t.id,
			name: 'Herren A',
			geschlecht: 'herren',
			art: 'einzel',
			klassierungVon: 'R1',
			klassierungBis: 'R5'
		})
		.returning({ id: kategorie.id });
	const [doppel] = await db
		.insert(kategorie)
		.values({
			turnierId: t.id,
			name: 'Doppel',
			geschlecht: 'herren',
			art: 'doppel',
			mindestsumme: 10
		})
		.returning({ id: kategorie.id });
	return { einzel: einzel.id, doppel: doppel.id };
}

async function meldeAn(kategorieId: number, mitgliedIds: number[]) {
	const [a] = await db
		.insert(anmeldung)
		.values({ kategorieId, status: 'bestaetigt', angemeldetAm: jetzt, geaendertAm: jetzt })
		.returning({ id: anmeldung.id });
	await db
		.insert(anmeldungSpieler)
		.values(mitgliedIds.map((mitgliedId) => ({ anmeldungId: a.id, mitgliedId })));
	return a.id;
}

const statusVon = async (anmeldungId: number) =>
	(await db.select().from(anmeldung).where(eq(anmeldung.id, anmeldungId)))[0];

async function anlassAm(beginn: Date) {
	const [a] = await db
		.insert(anlass)
		.values({
			titel: 'Saisonstart',
			beginn,
			ort: 'Clubhaus',
			anmeldeschluss: beginn,
			kalenderKennung: randomUUID(),
			erstelltVon: admin.mitgliedId
		})
		.returning({ id: anlass.id });
	return a.id;
}

describe('Austritt', () => {
	test('FR-04: Status ausgetreten, Login weg, Passkeys und Rollen bleiben, Verlauf', async () => {
		const m = await legeMitgliedAn(db, { rollen: ['cm'] });
		await db
			.update(mitglied)
			.set({ fairgateOffenSeit: jetzt })
			.where(eq(mitglied.id, m.mitgliedId));
		const kennung = await mitLogin(m.kontoId);

		expect(await erfasseAustritt(db, urheber, m.mitgliedId, jetzt)).toBe('ok');

		const z = await zeile(m.mitgliedId);
		expect(z.status).toBe('ausgetreten');
		expect(z.austrittAm).toEqual(jetzt);
		expect(z.fairgateOffenSeit).toBeNull();
		expect(await db.select().from(sitzung).where(eq(sitzung.kontoId, m.kontoId))).toHaveLength(0);
		expect(await db.select().from(pushAbo).where(eq(pushAbo.kontoId, m.kontoId))).toHaveLength(0);
		expect(await pruefeSitzung(db, kennung, jetzt)).toBeNull();
		expect(await db.select().from(passkey).where(eq(passkey.kontoId, m.kontoId))).toHaveLength(1);
		expect(await ladeRollen(db, m.kontoId)).toEqual(['cm']);
		expect(await aktionen(m.mitgliedId)).toEqual([['ausgetreten', admin.mitgliedId]]);
	});

	test('zieht offene Einzel-Anmeldungen zurück, löscht kommende Antworten, Vergangenes bleibt', async () => {
		const m = await legeMitgliedAn(db);
		const partner = await legeMitgliedAn(db);
		const offen = await turnierMit('2026-12-31');
		const zu = await turnierMit('2026-11-01');
		const einzelOffen = await meldeAn(offen.einzel, [m.mitgliedId]);
		const einzelZu = await meldeAn(zu.einzel, [m.mitgliedId]);
		const doppel = await meldeAn(offen.doppel, [m.mitgliedId, partner.mitgliedId]);
		const kommend = await anlassAm(new Date(jetzt.getTime() + 10 * TAG));
		const vergangen = await anlassAm(new Date(jetzt.getTime() - 10 * TAG));
		for (const anlassId of [kommend, vergangen]) {
			await db
				.insert(anlassAnmeldung)
				.values({ anlassId, mitgliedId: m.mitgliedId, antwort: 'kommt', geaendertAm: jetzt });
		}
		const spaeter = new Date(jetzt.getTime() + 60_000);

		expect(await erfasseAustritt(db, urheber, m.mitgliedId, spaeter)).toBe('ok');

		expect(await statusVon(einzelOffen)).toMatchObject({
			status: 'zurueckgezogen',
			geaendertAm: spaeter
		});
		expect(await statusVon(einzelZu)).toMatchObject({ status: 'bestaetigt', geaendertAm: jetzt });
		expect((await statusVon(doppel)).status).toBe('bestaetigt');
		const antworten = await db
			.select({ anlassId: anlassAnmeldung.anlassId })
			.from(anlassAnmeldung)
			.where(eq(anlassAnmeldung.mitgliedId, m.mitgliedId));
		expect(antworten).toEqual([{ anlassId: vergangen }]);
	});

	test('nicht aus ausgetreten (veraltet), unbekannt → nicht-gefunden', async () => {
		const m = await legeMitgliedAn(db, { status: 'ausgetreten' });
		const vorher = await zeile(m.mitgliedId);
		expect(await erfasseAustritt(db, urheber, m.mitgliedId, jetzt)).toBe('veraltet');
		expect(await zeile(m.mitgliedId)).toEqual(vorher);
		expect(await aktionen(m.mitgliedId)).toEqual([]);
		expect(await erfasseAustritt(db, urheber, -1, jetzt)).toBe('nicht-gefunden');
	});

	test('RR-03: der letzte MyTCO-Admin kann nicht austreten, nichts geändert', async () => {
		const kennung = await erstelleSitzung(db, admin.kontoId, jetzt);
		expect(await erfasseAustritt(db, urheber, admin.mitgliedId, jetzt)).toBe('letzter-mytco');
		expect((await zeile(admin.mitgliedId)).status).toBe('aktiv');
		expect(await pruefeSitzung(db, kennung, jetzt)).not.toBeNull();
		expect(await aktionen(admin.mitgliedId)).toEqual([]);
	});

	test('RR-03: mit einem zweiten MyTCO-Admin geht der Austritt', async () => {
		await legeMitgliedAn(db, { rollen: ['mytco'] });
		expect(await erfasseAustritt(db, urheber, admin.mitgliedId, jetzt)).toBe('ok');
		expect(await istMytcoAdmin(db, admin.kontoId)).toBe(false);
	});
});

describe('Wiedereintritt', () => {
	test('FR-04: innert Frist wieder aktiv, Rollen wirken, Zurückgezogenes bleibt zurückgezogen', async () => {
		const m = await legeMitgliedAn(db, { rollen: ['mytco'] });
		const offen = await turnierMit('2026-12-31');
		const einzel = await meldeAn(offen.einzel, [m.mitgliedId]);
		expect(await erfasseAustritt(db, urheber, m.mitgliedId, jetzt)).toBe('ok');
		expect(await istMytcoAdmin(db, m.kontoId)).toBe(false);

		const spaeter = new Date(jetzt.getTime() + 30 * TAG);
		expect(await erfasseWiedereintritt(db, urheber, m.mitgliedId, spaeter)).toBe('ok');

		const z = await zeile(m.mitgliedId);
		expect(z).toMatchObject({
			status: 'aktiv',
			austrittAm: null,
			vorgemerktAm: null,
			statusVorher: null
		});
		expect(await istMytcoAdmin(db, m.kontoId)).toBe(true);
		expect((await statusVon(einzel)).status).toBe('zurueckgezogen');
		expect((await aktionen(m.mitgliedId)).map(([a]) => a)).toEqual([
			'ausgetreten',
			'wiedereingetreten'
		]);
	});

	test('Grenze: eine ms vor loeschtAm geht es, bei loeschtAm → frist-abgelaufen', async () => {
		const a = await legeMitgliedAn(db);
		const b = await legeMitgliedAn(db);
		await erfasseAustritt(db, urheber, a.mitgliedId, jetzt);
		await erfasseAustritt(db, urheber, b.mitgliedId, jetzt);
		const ende = loeschtAm(await zeile(a.mitgliedId))!;

		expect(await erfasseWiedereintritt(db, urheber, a.mitgliedId, ende)).toBe('frist-abgelaufen');
		expect((await zeile(a.mitgliedId)).status).toBe('ausgetreten');
		expect(
			await erfasseWiedereintritt(db, urheber, b.mitgliedId, new Date(ende.getTime() - 1))
		).toBe('ok');
	});

	test('nur aus ausgetreten: aktiv und vorgemerkt → veraltet; unbekannt → nicht-gefunden', async () => {
		const aktiv = await legeMitgliedAn(db);
		const vorgemerkt = await legeMitgliedAn(db, { status: 'vorgemerkt' });
		expect(await erfasseWiedereintritt(db, urheber, aktiv.mitgliedId, jetzt)).toBe('veraltet');
		expect(await erfasseWiedereintritt(db, urheber, vorgemerkt.mitgliedId, jetzt)).toBe('veraltet');
		expect(await erfasseWiedereintritt(db, urheber, -1, jetzt)).toBe('nicht-gefunden');
		expect(await aktionen(aktiv.mitgliedId)).toEqual([]);
	});
});

describe('Löschung vormerken und rückgängig', () => {
	test('aus ausgetreten vormerken, dann rückgängig → ausgetreten mit altem Austrittsdatum', async () => {
		const m = await legeMitgliedAn(db);
		await erfasseAustritt(db, urheber, m.mitgliedId, jetzt);
		const spaeter = new Date(jetzt.getTime() + 3 * TAG);

		expect(await merkeZumLoeschenVor(db, urheber, m.mitgliedId, spaeter)).toBe('ok');
		expect(await zeile(m.mitgliedId)).toMatchObject({
			status: 'vorgemerkt',
			vorgemerktAm: spaeter,
			statusVorher: 'ausgetreten',
			austrittAm: jetzt
		});

		expect(await nimmLoeschungZurueck(db, urheber, m.mitgliedId, spaeter)).toBe('ok');
		expect(await zeile(m.mitgliedId)).toMatchObject({
			status: 'ausgetreten',
			austrittAm: jetzt,
			vorgemerktAm: null,
			statusVorher: null
		});
		expect((await aktionen(m.mitgliedId)).map(([a]) => a)).toEqual([
			'ausgetreten',
			'loeschung-vorgemerkt',
			'loeschung-zurueckgenommen'
		]);
	});

	test('aus aktiv vormerken: Login weg, Anmeldungen zurückgezogen; rückgängig → aktiv, Rollen wirken', async () => {
		const m = await legeMitgliedAn(db, { rollen: ['mytco'] });
		const kennung = await mitLogin(m.kontoId);
		const offen = await turnierMit('2026-12-31');
		const einzel = await meldeAn(offen.einzel, [m.mitgliedId]);

		expect(await merkeZumLoeschenVor(db, urheber, m.mitgliedId, jetzt)).toBe('ok');
		expect(await zeile(m.mitgliedId)).toMatchObject({
			status: 'vorgemerkt',
			statusVorher: 'aktiv',
			austrittAm: null
		});
		expect(await pruefeSitzung(db, kennung, jetzt)).toBeNull();
		expect(await db.select().from(pushAbo).where(eq(pushAbo.kontoId, m.kontoId))).toHaveLength(0);
		expect(await db.select().from(passkey).where(eq(passkey.kontoId, m.kontoId))).toHaveLength(1);
		expect((await statusVon(einzel)).status).toBe('zurueckgezogen');
		expect(await istMytcoAdmin(db, m.kontoId)).toBe(false);

		expect(await nimmLoeschungZurueck(db, urheber, m.mitgliedId, jetzt)).toBe('ok');
		expect(await zeile(m.mitgliedId)).toMatchObject({
			status: 'aktiv',
			austrittAm: null,
			vorgemerktAm: null,
			statusVorher: null
		});
		expect(await istMytcoAdmin(db, m.kontoId)).toBe(true);
	});

	test('RR-03: den letzten MyTCO-Admin nicht vormerken; vorgemerkt → veraltet; rückgängig nur aus vorgemerkt', async () => {
		expect(await merkeZumLoeschenVor(db, urheber, admin.mitgliedId, jetzt)).toBe('letzter-mytco');
		expect((await zeile(admin.mitgliedId)).status).toBe('aktiv');

		const m = await legeMitgliedAn(db, { status: 'vorgemerkt' });
		expect(await merkeZumLoeschenVor(db, urheber, m.mitgliedId, jetzt)).toBe('veraltet');
		const aktiv = await legeMitgliedAn(db);
		expect(await nimmLoeschungZurueck(db, urheber, aktiv.mitgliedId, jetzt)).toBe('veraltet');
		expect(await merkeZumLoeschenVor(db, urheber, -1, jetzt)).toBe('nicht-gefunden');
		expect(await nimmLoeschungZurueck(db, urheber, -1, jetzt)).toBe('nicht-gefunden');
	});
});

describe('loeschtAm', () => {
	test('Austritt + 1 Kalenderjahr, Vormerken + 7 Tage, sonst null', async () => {
		const m = await legeMitgliedAn(db);
		await erfasseAustritt(db, urheber, m.mitgliedId, jetzt);
		expect(loeschtAm(await zeile(m.mitgliedId))).toEqual(new Date('2027-11-07T08:00:00Z'));

		await merkeZumLoeschenVor(db, urheber, m.mitgliedId, jetzt);
		expect(loeschtAm(await zeile(m.mitgliedId))).toEqual(new Date('2026-11-14T08:00:00Z'));

		expect(loeschtAm({ status: 'aktiv', austrittAm: null, vorgemerktAm: null })).toBeNull();
		expect(loeschtAm({ status: 'geloescht', austrittAm: jetzt, vorgemerktAm: null })).toBeNull();
	});

	// Schweizer Kalender: gleiche Uhrzeit in Zürich ein Jahr bzw. 7 Tage später.
	const austritt = (iso: string) =>
		loeschtAm({ status: 'ausgetreten', austrittAm: new Date(iso), vorgemerktAm: null });
	const vormerken = (iso: string) =>
		loeschtAm({ status: 'vorgemerkt', austrittAm: null, vorgemerktAm: new Date(iso) });

	test('Austritt über die Winterzeit: 31.10.2027 00:30 (Sommerzeit) → 31.10.2028 00:30 (Winterzeit)', () => {
		const ende = austritt('2027-10-30T22:30:00Z');
		expect(ende).toEqual(new Date('2028-10-30T23:30:00Z'));
		expect(utcZuZuerich(ende!)).toBe('2028-10-31T00:30');
		// Der alte UTC-Jahrestag läge in der Schweiz noch am 30.10.: dort nicht fällig.
		expect(utcZuZuerich(new Date(ende!.getTime() - 1))).toBe('2028-10-31T00:29');
	});

	test('Austritt über die Sommerzeit: 29.3.2026 00:30 (Winterzeit) → 29.3.2027 00:30 (Sommerzeit)', () => {
		const ende = austritt('2026-03-28T23:30:00Z');
		expect(ende).toEqual(new Date('2027-03-28T22:30:00Z'));
		expect(utcZuZuerich(ende!)).toBe('2027-03-29T00:30');
	});

	test('Austritt am 29. Februar → 1. März, nie früher; Sekunden bleiben', () => {
		expect(austritt('2028-02-29T07:15:42.123Z')).toEqual(new Date('2029-03-01T07:15:42.123Z'));
	});

	test('Bedenkzeit: 7 Kalendertage in Schweizer Zeit, über die Umstellung', () => {
		expect(vormerken('2026-03-25T23:30:00Z')).toEqual(new Date('2026-04-01T22:30:00Z'));
		expect(vormerken('2026-10-21T22:30:00Z')).toEqual(new Date('2026-10-28T23:30:00Z'));
	});

	test('Uhrzeit fehlt (Sommerzeit) oder doppelt (Winterzeit): der spätere Zeitpunkt', () => {
		// 22.3.2026 02:30 → 29.3.2026 02:30 gibt es nicht: 03:30 Sommerzeit.
		expect(vormerken('2026-03-22T01:30:00Z')).toEqual(new Date('2026-03-29T01:30:00Z'));
		// 18.10.2026 02:30 → 25.10.2026 02:30 gibt es zweimal: die zweite (Winterzeit).
		expect(vormerken('2026-10-18T00:30:00Z')).toEqual(new Date('2026-10-25T01:30:00Z'));
	});

	test('ladeMitglied liefert die Daten der Mitgliedschaft', async () => {
		const m = await legeMitgliedAn(db);
		expect((await ladeMitglied(db, m.mitgliedId, jetzt))?.mitgliedschaft).toEqual({
			austrittAm: null,
			vorgemerktAm: null,
			loeschtAm: null
		});
		await erfasseAustritt(db, urheber, m.mitgliedId, jetzt);
		expect((await ladeMitglied(db, m.mitgliedId, jetzt))?.mitgliedschaft).toEqual({
			austrittAm: jetzt,
			vorgemerktAm: null,
			loeschtAm: new Date('2027-11-07T08:00:00Z')
		});
	});
});

describe('Gleichzeitig (Review-Fokus 1)', () => {
	test('zweimal derselbe Übergang: genau ein ok, das andere veraltet, ein Verlaufseintrag', async () => {
		const m = await legeMitgliedAn(db);
		const austritte = await Promise.all([
			erfasseAustritt(db, urheber, m.mitgliedId, jetzt),
			erfasseAustritt(db, urheber, m.mitgliedId, jetzt)
		]);
		expect(austritte.sort()).toEqual(['ok', 'veraltet']);

		const vormerken = await Promise.all([
			merkeZumLoeschenVor(db, urheber, m.mitgliedId, jetzt),
			merkeZumLoeschenVor(db, urheber, m.mitgliedId, jetzt)
		]);
		expect(vormerken.sort()).toEqual(['ok', 'veraltet']);

		const zurueck = await Promise.all([
			nimmLoeschungZurueck(db, urheber, m.mitgliedId, jetzt),
			nimmLoeschungZurueck(db, urheber, m.mitgliedId, jetzt)
		]);
		expect(zurueck.sort()).toEqual(['ok', 'veraltet']);

		expect((await aktionen(m.mitgliedId)).map(([a]) => a)).toEqual([
			'ausgetreten',
			'loeschung-vorgemerkt',
			'loeschung-zurueckgenommen'
		]);
	});

	test('Vormerken vor dem Austritt: der Austritt ist veraltet', async () => {
		const m = await legeMitgliedAn(db);
		expect(await merkeZumLoeschenVor(db, urheber, m.mitgliedId, jetzt)).toBe('ok');
		expect(await erfasseAustritt(db, urheber, m.mitgliedId, jetzt)).toBe('veraltet');
		expect(await zeile(m.mitgliedId)).toMatchObject({
			status: 'vorgemerkt',
			statusVorher: 'aktiv'
		});
	});

	test('Austritt und Vormerken parallel: nie ein vermischter Zustand', async () => {
		for (let i = 0; i < 5; i++) {
			const m = await legeMitgliedAn(db);
			const [austritt, vormerken] = await Promise.all([
				erfasseAustritt(db, urheber, m.mitgliedId, jetzt),
				merkeZumLoeschenVor(db, urheber, m.mitgliedId, jetzt)
			]);
			const z = await zeile(m.mitgliedId);
			const verlauf = (await aktionen(m.mitgliedId)).map(([a]) => a);
			expect(vormerken).toBe('ok');
			expect(z.status).toBe('vorgemerkt');
			if (austritt === 'ok') {
				// Erst der Austritt, dann das Vormerken aus «ausgetreten».
				expect(z).toMatchObject({ statusVorher: 'ausgetreten', austrittAm: jetzt });
				expect(verlauf).toEqual(['ausgetreten', 'loeschung-vorgemerkt']);
			} else {
				expect(austritt).toBe('veraltet');
				expect(z).toMatchObject({ statusVorher: 'aktiv', austrittAm: null });
				expect(verlauf).toEqual(['loeschung-vorgemerkt']);
			}
		}
	});

	test('RR-03 parallel: zwei MyTCO-Admins treten gleichzeitig aus, einer bleibt', async () => {
		const zweiter = await legeMitgliedAn(db, { rollen: ['mytco'] });
		const ergebnisse = await Promise.all([
			erfasseAustritt(db, urheber, admin.mitgliedId, jetzt),
			merkeZumLoeschenVor(db, urheber, zweiter.mitgliedId, jetzt)
		]);
		expect([...ergebnisse].sort()).toEqual(['letzter-mytco', 'ok']);
		const zaehlend = [
			await istMytcoAdmin(db, admin.kontoId),
			await istMytcoAdmin(db, zweiter.kontoId)
		];
		expect(zaehlend.filter(Boolean)).toHaveLength(1);
	});
});
