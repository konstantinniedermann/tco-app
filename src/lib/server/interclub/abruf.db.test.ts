import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { beispielAbruf } from '../../../../scripts/beispiel-interclub.ts';
import { erstelleDb } from '../db/index.ts';
import { icAbruf, icBegegnung, icBericht, icStand, icTeam } from '../db/schema.ts';
import { fuehreAbrufAus, ladeLage } from './abruf.ts';
import type { ImportDienste } from './import.ts';

// Regelmässiger Abruf (#81 Teil 3a). Eigene Saisons 2061–2063: laufende Saison 2063, Nachholen ab
// 2061, damit die Saisons anderer Testdateien nicht mitzählen.
const db = erstelleDb(process.env.DATABASE_URL!);
const SAISONS = [2061, 2062, 2063];
const VEREIN = 2202;
const AB = { ab: 2061 };
// Mittwoch, 12. Mai 2063, 10:00 in Zürich.
const JETZT = new Date('2063-05-12T08:00:00Z');
const MINUTE = 60_000;

const dienste = (holen: ImportDienste['holen'], jetzt = JETZT): ImportDienste => ({
	db,
	holen,
	jetzt: () => jetzt,
	pause: async () => {}
});
const versuche = () =>
	db
		.select({ saison: icAbruf.saison, wettbewerb: icAbruf.wettbewerb, wort: icAbruf.wort })
		.from(icAbruf)
		.where(inArray(icAbruf.saison, SAISONS))
		.orderBy(icAbruf.saison, icAbruf.wettbewerb);

const aufraeumen = async () => {
	await db.delete(icTeam).where(inArray(icTeam.saison, SAISONS));
	await db.delete(icStand).where(inArray(icStand.saison, SAISONS));
	await db.delete(icAbruf).where(inArray(icAbruf.saison, SAISONS));
};
beforeEach(aufraeumen);
afterEach(async () => {
	vi.restoreAllMocks();
	await aufraeumen();
});
afterAll(async () => {
	await db.$client.end();
});

describe('fuehreAbrufAus', () => {
	test('leere Datenbank: holt die laufende Saison und genau ein Paar zum Nachholen', async () => {
		await fuehreAbrufAus(dienste(beispielAbruf()), VEREIN, AB);
		expect(await versuche()).toEqual([
			{ saison: 2061, wettbewerb: 'ic', wort: 'ok' },
			{ saison: 2063, wettbewerb: 'ic', wort: 'ok' },
			{ saison: 2063, wettbewerb: 'jic', wort: 'ok' }
		]);
		expect((await db.select().from(icTeam).where(eq(icTeam.saison, 2063))).length).toBe(17);
	});

	test('zweiter Lauf 10 min später holt nichts', async () => {
		await fuehreAbrufAus(dienste(beispielAbruf()), VEREIN, AB);
		const holen = vi.fn(beispielAbruf());
		await fuehreAbrufAus(dienste(holen, new Date(JETZT.getTime() + 10 * MINUTE)), VEREIN, AB);
		expect(holen).not.toHaveBeenCalled();
	});

	test('Störung: Versuch mit stoerung gemerkt, Log fester Text, alter Stand bleibt', async () => {
		const fehler = vi.spyOn(console, 'error').mockImplementation(() => {});
		await fuehreAbrufAus(dienste(beispielAbruf()), VEREIN, AB);
		const teams = (await db.select().from(icTeam).where(eq(icTeam.saison, 2063))).length;
		const spaeter = new Date(JETZT.getTime() + 25 * 60 * MINUTE);
		await fuehreAbrufAus(
			dienste(async () => {
				throw new Error('geheim');
			}, spaeter),
			VEREIN,
			AB
		);
		expect(await versuche()).toContainEqual({ saison: 2063, wettbewerb: 'ic', wort: 'stoerung' });
		expect(fehler).toHaveBeenCalledWith('Interclub-Abruf gestört');
		expect(JSON.stringify(fehler.mock.calls)).not.toContain('geheim');
		expect((await db.select().from(icTeam).where(eq(icTeam.saison, 2063))).length).toBe(teams);
	});

	test('Form unerwartet: fester Text im Log', async () => {
		const fehler = vi.spyOn(console, 'error').mockImplementation(() => {});
		await fuehreAbrufAus(
			dienste(async () => new Response('{"unerwartet":true}', { status: 200 })),
			VEREIN,
			AB
		);
		expect(await versuche()).toContainEqual({ saison: 2063, wettbewerb: 'ic', wort: 'form' });
		expect(fehler).toHaveBeenCalledWith('Interclub-Abruf: Form unerwartet');
	});

	test('keine-teams gemerkt; der Stand der Vorjahressaison bleibt', async () => {
		await fuehreAbrufAus(dienste(beispielAbruf()), VEREIN, AB);
		const holen = beispielAbruf({
			nichtFreigeschaltet: [
				{ jahr: 2063, wettbewerb: 'ic' },
				{ jahr: 2063, wettbewerb: 'jic' }
			]
		});
		// Nachholen ist für 2061 jic dran, laufende Saison antwortet «noch nicht freigeschaltet».
		await db.delete(icTeam).where(eq(icTeam.saison, 2063));
		await db.delete(icStand).where(eq(icStand.saison, 2063));
		await db.delete(icAbruf).where(eq(icAbruf.saison, 2063));
		await fuehreAbrufAus(dienste(holen, new Date(JETZT.getTime() + 25 * 60 * MINUTE)), VEREIN, AB);
		expect(await versuche()).toEqual([
			{ saison: 2061, wettbewerb: 'ic', wort: 'ok' },
			{ saison: 2061, wettbewerb: 'jic', wort: 'ok' },
			{ saison: 2063, wettbewerb: 'ic', wort: 'keine-teams' },
			{ saison: 2063, wettbewerb: 'jic', wort: 'keine-teams' }
		]);
		expect((await db.select().from(icTeam).where(eq(icTeam.saison, 2061))).length).toBe(17);
	});

	test('überlappender Schlag startet keinen zweiten Lauf', async () => {
		let oeffne = () => {};
		const tor = new Promise<void>((r) => (oeffne = r));
		const fake = beispielAbruf();
		const holen = vi.fn(async (u: string) => {
			await tor;
			return fake(u);
		});
		let ersterFertig = false;
		const erster = fuehreAbrufAus(dienste(holen), VEREIN, AB).then(() => (ersterFertig = true));
		await fuehreAbrufAus(dienste(holen), VEREIN, AB);
		expect(ersterFertig).toBe(false);
		oeffne();
		await erster;
		expect(await versuche()).toHaveLength(3);
	});
});

describe('ladeLage', () => {
	const team = { saison: 2063, teamId: 1, wettbewerb: 'ic' as const, liga: '2L', gruppe: 1 };
	const begegnung = (o: Partial<typeof icBegegnung.$inferInsert>) => ({
		saison: 2063,
		teamId: 1,
		begegnungId: 1,
		runde: 1,
		datum: '2063-05-11',
		heim: 'Olten 1',
		gast: 'Gegnerdorf',
		heimPunkte: 5,
		gastPunkte: 4,
		...o
	});
	beforeEach(async () => {
		await db.insert(icTeam).values({ ...team, teamName: 'Olten 1', reihenfolge: 1 });
	});

	test('Spiel von gestern ohne Bericht → ic frisch', async () => {
		await db.insert(icBegegnung).values(begegnung({}));
		expect((await ladeLage(db, JETZT, 2061)).frisch).toEqual(['ic']);
	});

	test('Spiel von gestern mit Bericht → nicht frisch', async () => {
		await db.insert(icBegegnung).values(begegnung({}));
		await db.insert(icBericht).values({
			saison: 2063,
			teamId: 1,
			begegnungId: 1,
			tcoHeim: true,
			tcoSaetze: 10,
			gegnerSaetze: 8,
			tcoGames: 80,
			gegnerGames: 70
		});
		expect((await ladeLage(db, JETZT, 2061)).frisch).toEqual([]);
	});

	test('Spiel vor 8 Tagen ohne Resultat → nicht frisch; vor 7 Tagen → frisch', async () => {
		await db
			.insert(icBegegnung)
			.values(begegnung({ datum: '2063-05-04', heimPunkte: null, gastPunkte: null }));
		expect((await ladeLage(db, JETZT, 2061)).frisch).toEqual([]);
		await db
			.update(icBegegnung)
			.set({ datum: '2063-05-05' })
			.where(and(eq(icBegegnung.saison, 2063), eq(icBegegnung.begegnungId, 1)));
		expect((await ladeLage(db, JETZT, 2061)).frisch).toEqual(['ic']);
	});

	test('fremdes Spiel ohne Resultat zählt nicht', async () => {
		await db
			.insert(icBegegnung)
			.values(begegnung({ heim: 'A', gast: 'B', heimPunkte: null, gastPunkte: null }));
		expect((await ladeLage(db, JETZT, 2061)).frisch).toEqual([]);
	});

	test('vorhanden und versuche kommen aus ic_stand und ic_abruf', async () => {
		await db.insert(icStand).values({ saison: 2062, wettbewerb: 'jic', abgerufenAm: JETZT });
		await db
			.insert(icAbruf)
			.values({ saison: 2061, wettbewerb: 'ic', versuchtAm: JETZT, wort: 'form' });
		const l = await ladeLage(db, JETZT, 2061);
		expect(l.vorhanden).toContainEqual({ saison: 2062, wettbewerb: 'jic' });
		expect(l.versuche).toContainEqual({
			saison: 2061,
			wettbewerb: 'ic',
			versuchtAm: JETZT,
			wort: 'form'
		});
		expect(l.ab).toBe(2061);
	});
});
