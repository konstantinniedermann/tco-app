import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
	legeEigeneDatenbankAn,
	ZEIT_EIGENE_DB,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { importiereBeispiel } from '../../../../tests/hilfen/interclub.ts';
import { icBegegnung, icStand, icTeam } from '../db/schema.ts';
import { hatInterclub, ladeTeam, ladeUebersicht } from './ansicht.ts';

// Die Ansicht liest die ganze Datenbank («neueste Saison»): eigene Datenbank je Block.
const IMPORT = new Date('2026-11-12T08:00:00Z');
const J = (s: string) => new Date(s);

describe('leere Datenbank', () => {
	let e: EigeneDatenbank;
	beforeAll(async () => {
		e = await legeEigeneDatenbankAn('icansicht');
	}, 30_000);
	afterAll(async () => {
		await e.abbauen();
	});

	test('nichts vorhanden', ZEIT_EIGENE_DB, async () => {
		expect(await hatInterclub(e.db)).toBe(false);
		expect(await ladeUebersicht(e.db, J('2026-11-13T10:00:00Z'))).toBeNull();
		expect(await ladeTeam(e.db, 7398)).toBeNull();
	});
});

describe('Saison ohne Begegnungen', () => {
	let e: EigeneDatenbank;
	beforeAll(async () => {
		e = await legeEigeneDatenbankAn('icansicht');
		await e.db.insert(icTeam).values({
			saison: 2027,
			teamId: 1,
			wettbewerb: 'ic',
			teamName: 'Olten 1',
			liga: '2L Herren 1',
			gruppe: 1,
			reihenfolge: 1
		});
	}, 30_000);
	afterAll(async () => {
		await e.abbauen();
	});

	test('Teams ohne Begegnungen: Saison nicht abgeschlossen', ZEIT_EIGENE_DB, async () => {
		const u = (await ladeUebersicht(e.db, J('2027-03-01T10:00:00Z')))!;
		expect(u.saison).toBe(2027);
		expect(u.abgeschlossen).toBe(false);
	});
});

describe('Saison 2026', () => {
	let e: EigeneDatenbank;
	beforeAll(async () => {
		e = await legeEigeneDatenbankAn('icansicht');
		await importiereBeispiel(e.db, 2026, IMPORT);
	}, 30_000);
	afterAll(async () => {
		await e.abbauen();
	});

	test('Saison zu Ende: keine Karten, Kacheln mit Schlussrang', async () => {
		expect(await hatInterclub(e.db)).toBe(true);
		const u = (await ladeUebersicht(e.db, J('2026-11-13T10:00:00Z')))!;
		expect(u.saison).toBe(2026);
		expect(u.stand).toEqual(IMPORT);
		expect(u.abgeschlossen).toBe(true);
		expect(u.letzte).toEqual([]);
		expect(u.naechste).toEqual([]);
		expect(u.aktive).toHaveLength(10);
		expect(u.junioren).toHaveLength(7);
		expect(u.aktive![0]).toMatchObject({
			liga: '35+ NLA Herren',
			rang: 4,
			von: 4,
			entscheid: 'abstieg'
		});
		expect(u.aktive!.find((k) => k.teamId === 7398)).toMatchObject({
			liga: '2L Herren 1',
			teamName: 'Olten 1',
			rang: 2,
			von: 4,
			entscheid: 'aufstieg'
		});
		expect(u.aktive!.find((k) => k.liga === '2L Damen')!.entscheid).toBeNull();
	});

	test('letzte Resultate: 7 Tage inklusive heute, nur eigene, Ergebnis aus Sicht des TCO', async () => {
		const u = (await ladeUebersicht(e.db, J('2026-05-10T10:00:00Z')))!;
		expect(u.abgeschlossen).toBe(false);
		const olten = u.letzte.filter((s) => s.teamId === 7398);
		expect(olten).toHaveLength(1);
		expect(olten[0]).toMatchObject({
			art: 'gruppe',
			runde: 2,
			datum: '2026-05-09',
			heim: 'Olten 1',
			gast: 'Aarau 2',
			heimPunkte: 7,
			gastPunkte: 2,
			eigen: true,
			tcoHeim: true,
			ergebnis: 'sieg'
		});
		expect(u.letzte.some((s) => s.heim === 'Muhen')).toBe(false);
		const daten = u.letzte.map((s) => s.datum);
		expect(daten).toEqual([...daten].sort().reverse());
	});

	test('Unentschieden', async () => {
		const u = (await ladeUebersicht(e.db, J('2026-11-13T10:00:00Z')))!;
		expect(u).not.toBeNull();
		const t = (await ladeTeam(
			e.db,
			(await e.db.select().from(icTeam)).find((x) => x.liga === '65+ 1L Herren')!.teamId
		))!;
		const s = t.spiele.find((x) => x.heim === 'Bremgarten AG' && x.gast === 'Olten')!;
		expect(s).toMatchObject({
			heimPunkte: 3,
			gastPunkte: 3,
			ergebnis: 'unentschieden',
			tcoHeim: false
		});
	});

	test('offene Begegnung: in 3 Tagen in «nächste», in 8 Tagen nicht', async () => {
		const [vorher] = await e.db
			.select()
			.from(icBegegnung)
			.where(
				and(
					eq(icBegegnung.teamId, 7398),
					eq(icBegegnung.heim, 'Olten 1'),
					eq(icBegegnung.gast, 'Villmergen')
				)
			);
		const wo = and(
			eq(icBegegnung.saison, 2026),
			eq(icBegegnung.teamId, 7398),
			eq(icBegegnung.begegnungId, vorher.begegnungId)
		);
		await e.db.update(icBegegnung).set({ heimPunkte: null, gastPunkte: null }).where(wo);
		try {
			const drin = (await ladeUebersicht(e.db, J('2026-04-29T10:00:00Z')))!;
			const s = drin.naechste.find((x) => x.teamId === 7398 && x.gast === 'Villmergen')!;
			expect(s).toMatchObject({ ergebnis: null, heimPunkte: null, datum: '2026-05-02' });
			const draussen = (await ladeUebersicht(e.db, J('2026-04-24T10:00:00Z')))!;
			expect(draussen.naechste.some((x) => x.teamId === 7398 && x.gast === 'Villmergen')).toBe(
				false
			);
			// Eine offene Begegnung nach dem Fenster hält die Saison offen.
			const spaet = (await ladeUebersicht(e.db, J('2026-11-13T10:00:00Z')))!;
			expect(spaet.abgeschlossen).toBe(false);
		} finally {
			await e.db
				.update(icBegegnung)
				.set({ heimPunkte: vorher.heimPunkte, gastPunkte: vorher.gastPunkte })
				.where(wo);
		}
	});

	test('Tageswechsel in Zürich: «heute» ist der Zürcher Kalendertag', async () => {
		const gefunden = (u: NonNullable<Awaited<ReturnType<typeof ladeUebersicht>>>) =>
			u.letzte.some((s) => s.teamId === 7398 && s.datum === '2026-05-24');
		// 22:30 UTC = 31.05. 00:30 in Zürich, Fenster 25.–31.05.
		expect(gefunden((await ladeUebersicht(e.db, J('2026-05-30T22:30:00Z')))!)).toBe(false);
		// 21:30 UTC = 30.05. 23:30 in Zürich, Fenster 24.–30.05.
		expect(gefunden((await ladeUebersicht(e.db, J('2026-05-30T21:30:00Z')))!)).toBe(true);
	});

	test('Junioren-Team «Olten»: eigen nur über den Namen dieses Teams', async () => {
		const t = (await ladeTeam(e.db, 46797))!;
		const eigene = t.spiele.filter((s) => s.eigen);
		expect(eigene).toHaveLength(3);
		for (const s of t.spiele) expect(s.eigen).toBe(s.heim === 'Olten' || s.gast === 'Olten');
		expect(t.spiele.some((s) => !s.eigen && s.ergebnis !== null)).toBe(false);
		const g = t.spiele.find((s) => s.heim === 'Solothurn' && s.gast === 'Olten')!;
		expect(g.tcoHeim).toBe(false);
		// «Olten 1» in der Gruppe von 7398: Begegnungen ohne Olten 1 sind nicht eigen.
		const t2 = (await ladeTeam(e.db, 7398))!;
		const fremd = t2.spiele.find((s) => s.heim === 'Muhen' && s.gast === 'Villmergen')!;
		expect(fremd).toMatchObject({ eigen: false, tcoHeim: false, ergebnis: null });
	});

	test('Aufstiegsspiele: eigen über die Team-Id, Ergebnis aus den Punkten', async () => {
		const t = (await ladeTeam(e.db, 16551))!;
		expect(t.gruppe).toBe(18);
		expect(t.entscheide!.art).toBe('aufstieg');
		const s = t.entscheide!.spiele;
		expect(s).toHaveLength(3);
		expect(s.every((x) => x.eigen && x.art === 'aufstieg')).toBe(true);
		expect(s.map((x) => [x.heim, x.gast, x.tcoHeim, x.ergebnis, x.zeit])).toEqual([
			['Lyss', 'Olten', false, 'sieg', '09:00'],
			['Olten', 'Böckten', true, 'sieg', '09:00'],
			['Rotweiss BE', 'Olten', false, 'niederlage', '09:00']
		]);
		expect(t.rangliste.filter((z) => z.eigen)).toHaveLength(1);
		expect((await ladeTeam(e.db, 7395))!.entscheide!.art).toBe('abstieg');
		expect((await ladeTeam(e.db, 15954))!.entscheide).toBeNull();
	});

	test('Rangliste: Partien aus den Endständen der Gruppe', async () => {
		const t = (await ladeTeam(e.db, 7398))!;
		expect(t).toMatchObject({ saison: 2026, liga: '2L Herren 1', teamName: 'Olten 1', gruppe: 62 });
		expect(t.stand).toEqual(IMPORT);
		expect(t.rangliste).toEqual([
			{
				rang: 1,
				teamName: 'Muhen',
				partienGewonnen: 27,
				partienVerloren: 0,
				saetze: '54:3',
				eigen: false
			},
			{
				rang: 2,
				teamName: 'Olten 1',
				partienGewonnen: 15,
				partienVerloren: 12,
				saetze: '31:27',
				eigen: true
			},
			{
				rang: 3,
				teamName: 'Aarau 2',
				partienGewonnen: 7,
				partienVerloren: 20,
				saetze: '17:40',
				eigen: false
			},
			{
				rang: 4,
				teamName: 'Villmergen',
				partienGewonnen: 5,
				partienVerloren: 22,
				saetze: '12:44',
				eigen: false
			}
		]);
		const r = (await ladeTeam(e.db, 11956))!.rangliste;
		expect(r[0]).toMatchObject({
			teamName: 'Gerlafingen',
			partienGewonnen: 26,
			partienVerloren: 10
		});
		expect(r.find((z) => z.eigen)).toMatchObject({
			teamName: 'Olten 1',
			partienGewonnen: 10,
			partienVerloren: 26
		});
	});

	test('zwei Saisons: die neueste gewinnt, Team-Id früherer Saison zeigt die neueste', async () => {
		const spaeter = new Date('2027-03-01T08:00:00Z');
		await importiereBeispiel(e.db, 2027, spaeter, {
			nichtFreigeschaltet: [{ jahr: 2027, wettbewerb: 'jic' }]
		});
		try {
			const u = (await ladeUebersicht(e.db, J('2027-03-02T10:00:00Z')))!;
			expect(u.saison).toBe(2027);
			expect(u.stand).toEqual(spaeter);
			expect(u.junioren).toBeNull();
			expect(u.aktive).toHaveLength(10);
			expect((await ladeTeam(e.db, 7398))!.saison).toBe(2027);
			expect((await ladeTeam(e.db, 46797))!.saison).toBe(2026);
			expect(await ladeTeam(e.db, 999999)).toBeNull();
		} finally {
			await e.db.delete(icTeam).where(eq(icTeam.saison, 2027));
			await e.db.delete(icStand).where(eq(icStand.saison, 2027));
		}
	});
});
