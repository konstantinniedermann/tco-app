import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import {
	legeEigeneDatenbankAn,
	ZEIT_EIGENE_DB
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { gespraech, nachricht, turnier, type TurnierStatus } from '../db/schema.ts';
import { legeTurnierAn } from '../turnier/turniere.ts';
import {
	antworte,
	gespraechStand,
	ladeEigenesGespraech,
	ladeGespraech,
	listeGespraeche,
	markiereGelesen,
	offeneGespraecheGesamt,
	offeneZahlen,
	schreibeAlsMitglied,
	setzeZustand
} from './gespraech.ts';

// `let`: Der Test der Gesamtzahl tauscht sie gegen eine eigene Datenbank (siehe dort).
let db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

// Die gemeinsame Test-Datenbank hat Turniere anderer Tests: jedes Turnier bekommt ein eigenes Jahr.
const zufallsJahr = () => 3000 + Math.floor(Math.random() * 6000);
const mitJahr = (jahr: number, tag = '06-15') => new Date(`${jahr}-${tag}T12:00:00+02:00`);

async function aufbau(
	opt: { status?: string; kontakt?: 'cm' | 'ohne-rolle' | 'gesperrt' | 'keiner' } = {}
) {
	const kontakt = await legeMitgliedAn(db, {
		nachname: 'Kontaktnamen',
		rollen: opt.kontakt === 'ohne-rolle' ? [] : ['cm'],
		gesperrt: opt.kontakt === 'gesperrt'
	});
	for (;;) {
		const jahr = zufallsJahr();
		const t = await legeTurnierAn(db, {
			jahr,
			name: `Clubmeisterschaft ${jahr}`,
			anmeldeschluss: `${jahr}-05-31`,
			nummern: []
		});
		if (t.ergebnis !== 'ok') continue;
		await db
			.update(turnier)
			.set({
				status: (opt.status ?? 'offen') as TurnierStatus,
				kontaktMitgliedId: opt.kontakt === 'keiner' ? null : kontakt.mitgliedId
			})
			.where(eq(turnier.id, t.id));
		const mitglied = (await legeMitgliedAn(db)).mitgliedId;
		return {
			turnierId: t.id,
			jahr,
			kontaktId: kontakt.mitgliedId,
			mitgliedId: mitglied,
			jetzt: mitJahr(jahr)
		};
	}
}

describe('A-TURNIER-04 Gespräch mit der Turnierleitung', () => {
	test('FR-50: ein Gespräch je Turnier und Mitglied, es entsteht erst mit der ersten Nachricht', async () => {
		const a = await aufbau();
		const leer = await ladeEigenesGespraech(db, a.turnierId, a.mitgliedId, a.jetzt);
		expect(leer?.nachrichten).toEqual([]);
		expect(
			await db.select().from(gespraech).where(eq(gespraech.turnierId, a.turnierId))
		).toHaveLength(0);

		const r1 = await schreibeAlsMitglied(db, a.turnierId, a.mitgliedId, 'Erste', a.jetzt);
		const r2 = await schreibeAlsMitglied(db, a.turnierId, a.mitgliedId, 'Zweite', a.jetzt);
		expect(r1).toMatchObject({ ergebnis: 'ok', kontaktId: a.kontaktId });
		expect(r2).toMatchObject({ ergebnis: 'ok' });
		const gs = await db.select().from(gespraech).where(eq(gespraech.turnierId, a.turnierId));
		expect(gs).toHaveLength(1);
		const ns = await db.select().from(nachricht).where(eq(nachricht.gespraechId, gs[0].id));
		expect(ns.map((n) => n.text).sort()).toEqual(['Erste', 'Zweite']);
		const eigen = await ladeEigenesGespraech(db, a.turnierId, a.mitgliedId, a.jetzt);
		expect(eigen?.nachrichten.map((n) => [n.von, n.text])).toEqual([
			['du', 'Erste'],
			['du', 'Zweite']
		]);
	});

	test('FR-51: ohne gültige Kontaktperson oder ohne Berechtigung nur lesen', async () => {
		for (const kontakt of ['keiner', 'ohne-rolle', 'gesperrt'] as const) {
			const a = await aufbau({ kontakt });
			expect(await schreibeAlsMitglied(db, a.turnierId, a.mitgliedId, 'Hallo', a.jetzt)).toBe(
				'nur-lesen'
			);
			expect((await ladeEigenesGespraech(db, a.turnierId, a.mitgliedId, a.jetzt))?.schreiben).toBe(
				false
			);
			expect((await gespraechStand(db, a.turnierId, a.mitgliedId, a.jetzt)).schreiben).toBe(false);
		}
		const a = await aufbau();
		expect((await ladeEigenesGespraech(db, a.turnierId, a.mitgliedId, a.jetzt))?.schreiben).toBe(
			true
		);
		// Die Kontaktperson selbst schreibt nicht an sich.
		expect(await schreibeAlsMitglied(db, a.turnierId, a.kontaktId, 'Hallo', a.jetzt)).toBe(
			'nur-lesen'
		);
		// Nicht aktives Mitglied.
		const ausgetreten = (await legeMitgliedAn(db, { status: 'ausgetreten' })).mitgliedId;
		expect(await schreibeAlsMitglied(db, a.turnierId, ausgetreten, 'Hallo', a.jetzt)).toBe(
			'nur-lesen'
		);
	});

	test('FR-51: Turnier in Vorbereitung ist nicht sichtbar', async () => {
		const a = await aufbau({ status: 'vorbereitung' });
		expect(await ladeEigenesGespraech(db, a.turnierId, a.mitgliedId, a.jetzt)).toBeNull();
		expect(await schreibeAlsMitglied(db, a.turnierId, a.mitgliedId, 'Hallo', a.jetzt)).toBe(
			'nicht-gefunden'
		);
		expect(await ladeEigenesGespraech(db, -1, a.mitgliedId, a.jetzt)).toBeNull();
	});

	test('FR-51: ab 1.1. nach dem Turnierjahr nur lesen, auch für die Leitung', async () => {
		const a = await aufbau();
		await schreibeAlsMitglied(db, a.turnierId, a.mitgliedId, 'Hallo', a.jetzt);
		const [g] = await db.select().from(gespraech).where(eq(gespraech.turnierId, a.turnierId));
		const spaeter = new Date(`${a.jahr + 1}-01-01T00:30:00+01:00`);
		expect(await schreibeAlsMitglied(db, a.turnierId, a.mitgliedId, 'Noch eins', spaeter)).toBe(
			'nur-lesen'
		);
		expect((await ladeEigenesGespraech(db, a.turnierId, a.mitgliedId, spaeter))?.schreiben).toBe(
			false
		);
		expect((await ladeGespraech(db, g.id, spaeter))?.antworten).toBe(false);
		expect((await ladeGespraech(db, g.id, a.jetzt))?.antworten).toBe(true);
		expect(await antworte(db, g.id, a.kontaktId, 'Zu spät', 0, false, spaeter)).toBe('nur-lesen');
		expect(await setzeZustand(db, g.id, 'erledigt', spaeter)).toBe('nur-lesen');
		expect((await ladeGespraech(db, g.id, a.jetzt))?.zustand).toBe('offen');
	});

	test('FR-52: Antwort lässt erledigt stehen, neue Nachricht des Mitglieds öffnet wieder', async () => {
		const a = await aufbau();
		await schreibeAlsMitglied(db, a.turnierId, a.mitgliedId, 'Frage', a.jetzt);
		const [g] = await db.select().from(gespraech).where(eq(gespraech.turnierId, a.turnierId));
		expect(await setzeZustand(db, g.id, 'erledigt', a.jetzt)).toBe('ok');
		expect(await setzeZustand(db, -1, 'erledigt', a.jetzt)).toBe('nicht-gefunden');
		const r = await antworte(db, g.id, a.kontaktId, 'Antwort', 0, true, a.jetzt);
		expect(r).toEqual({ ergebnis: 'ok', mitgliedId: a.mitgliedId, turnierId: a.turnierId });
		expect((await ladeGespraech(db, g.id, a.jetzt))?.zustand).toBe('erledigt');
		await schreibeAlsMitglied(db, a.turnierId, a.mitgliedId, 'Nachfrage', a.jetzt);
		expect((await ladeGespraech(db, g.id, a.jetzt))?.zustand).toBe('offen');
	});

	test('FR-50: neue Antwort bis zum Öffnen, danach gelesen', async () => {
		const a = await aufbau();
		await schreibeAlsMitglied(db, a.turnierId, a.mitgliedId, 'Frage', a.jetzt);
		const [g] = await db.select().from(gespraech).where(eq(gespraech.turnierId, a.turnierId));
		expect(await gespraechStand(db, a.turnierId, a.mitgliedId, a.jetzt)).toEqual({
			vorhanden: true,
			neueAntwort: false,
			schreiben: true
		});
		const spaeter = new Date(a.jetzt.getTime() + 60_000);
		await antworte(db, g.id, a.kontaktId, 'Antwort', 0, true, spaeter);
		expect((await gespraechStand(db, a.turnierId, a.mitgliedId, spaeter)).neueAntwort).toBe(true);
		const vorher = await ladeEigenesGespraech(db, a.turnierId, a.mitgliedId, spaeter);
		expect(vorher?.nachrichten.map((n) => n.neu)).toEqual([false, true]);
		await markiereGelesen(db, a.turnierId, a.mitgliedId, new Date(spaeter.getTime() + 1000));
		expect((await gespraechStand(db, a.turnierId, a.mitgliedId, spaeter)).neueAntwort).toBe(false);
		const nachher = await ladeEigenesGespraech(db, a.turnierId, a.mitgliedId, spaeter);
		expect(nachher?.nachrichten.every((n) => !n.neu)).toBe(true);
		expect(await gespraechStand(db, a.turnierId, -1, spaeter)).toMatchObject({ vorhanden: false });
	});

	test('FR-50: veraltete Ansicht der Leitung ergibt inzwischen, trotzdem sendet', async () => {
		const a = await aufbau();
		const andere = (await legeMitgliedAn(db, { rollen: ['cm'] })).mitgliedId;
		await schreibeAlsMitglied(db, a.turnierId, a.mitgliedId, 'Frage', a.jetzt);
		const [g] = await db.select().from(gespraech).where(eq(gespraech.turnierId, a.turnierId));
		const stand = (await ladeGespraech(db, g.id, a.jetzt))!.nachrichten.at(-1)!.id;
		expect(await antworte(db, g.id, andere, 'Erste Antwort', stand, false, a.jetzt)).toMatchObject({
			ergebnis: 'ok'
		});
		expect(await antworte(db, g.id, a.kontaktId, 'Doppelt', stand, false, a.jetzt)).toEqual({
			ergebnis: 'inzwischen'
		});
		expect(await antworte(db, g.id, a.kontaktId, 'Doppelt', stand, true, a.jetzt)).toMatchObject({
			ergebnis: 'ok'
		});
		expect(await antworte(db, -1, a.kontaktId, 'x', 0, true, a.jetzt)).toBe('nicht-gefunden');
	});

	test('FR-50: das Mitglied erhält keine Admin-Daten', async () => {
		const a = await aufbau();
		const admin = await legeMitgliedAn(db, {
			vorname: 'Adminvorname',
			nachname: 'Adminnachname',
			rollen: ['cm']
		});
		await schreibeAlsMitglied(db, a.turnierId, a.mitgliedId, 'Frage', a.jetzt);
		const [g] = await db.select().from(gespraech).where(eq(gespraech.turnierId, a.turnierId));
		await antworte(db, g.id, admin.mitgliedId, 'Antwort', 0, true, a.jetzt);
		const eigen = await ladeEigenesGespraech(db, a.turnierId, a.mitgliedId, a.jetzt);
		const json = JSON.stringify(eigen);
		expect(json).not.toContain('Adminnachname');
		expect(json).not.toContain('Adminvorname');
		expect(json).not.toMatch(/adminId|adminMitgliedId/);
		const leitung = await ladeGespraech(db, g.id, a.jetzt);
		expect(leitung?.nachrichten.at(-1)?.admin?.nachname).toBe('Adminnachname');
		expect(leitung?.nachrichten[0].admin).toBeNull();
	});

	test('FR-52: Liste mit offenen zuerst, Zahlen und Gesamtzahl', ZEIT_EIGENE_DB, async () => {
		// Die Gesamtzahl ist global und die gemeinsame Datenbank wird parallel beschrieben: eigene Datenbank.
		const eigene = await legeEigeneDatenbankAn('gespraech_gesamt');
		const gemeinsame = db;
		db = eigene.db;
		try {
			await pruefeListeUndGesamtzahl();
		} finally {
			db = gemeinsame;
			await eigene.abbauen();
		}
	});
});

async function pruefeListeUndGesamtzahl() {
	const a = await aufbau();
	const m2 = (await legeMitgliedAn(db)).mitgliedId;
	const m3 = (await legeMitgliedAn(db)).mitgliedId;
	const t = (n: number) => new Date(a.jetzt.getTime() + n * 60_000);
	await schreibeAlsMitglied(db, a.turnierId, a.mitgliedId, 'alt', t(1));
	await schreibeAlsMitglied(db, a.turnierId, m2, 'neu', t(3));
	await schreibeAlsMitglied(db, a.turnierId, m3, 'mittel', t(2));
	const gs = await db.select().from(gespraech).where(eq(gespraech.turnierId, a.turnierId));
	const vonM3 = gs.find((g) => g.mitgliedId === m3)!;
	await setzeZustand(db, vonM3.id, 'erledigt', a.jetzt);
	const l = await listeGespraeche(db, a.turnierId);
	expect(l?.kontakt?.nachname).toBe('Kontaktnamen');
	expect(l?.zeilen.map((z) => z.letzte.text)).toEqual(['neu', 'alt', 'mittel']);
	expect(l?.zeilen.map((z) => z.zustand)).toEqual(['offen', 'offen', 'erledigt']);
	expect(await listeGespraeche(db, -1)).toBeNull();

	const zahlen = await offeneZahlen(db, [a.turnierId, -1]);
	expect(zahlen.get(a.turnierId)).toEqual({ offen: 2, erledigt: 1 });
	expect(zahlen.get(-1)).toEqual({ offen: 0, erledigt: 0 });

	// In der eigenen Datenbank gibt es nur dieses Turnier: die Gesamtzahl ist exakt.
	expect(await offeneGespraecheGesamt(db, a.jetzt)).toBe(2);
	await setzeZustand(db, vonM3.id, 'offen', a.jetzt);
	expect(await offeneGespraecheGesamt(db, a.jetzt)).toBe(3);
	// Turnierjahr vorbei: zählt nicht mehr.
	expect(await offeneGespraecheGesamt(db, mitJahr(a.jahr + 1, '02-01'))).toBe(0);
}
