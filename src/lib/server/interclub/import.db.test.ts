import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { beispielAbruf } from '../../../../scripts/beispiel-interclub.ts';
import { erstelleDb } from '../db/index.ts';
import { icBegegnung, icEntscheid, icRang, icStand, icTeam } from '../db/schema.ts';
import { importiereSaison, type ImportDienste } from './import.ts';

const db = erstelleDb(process.env.DATABASE_URL!);
// Eigene Saisons, die kein anderer Test benutzt; jeder Test räumt sie auf.
const SAISONS = [2071, 2072, 2073, 2074, 2075, 2076, 2077];
const VEREIN = 2202;
const JETZT = new Date('2071-05-02T10:00:00Z');

let pausen = 0;
const dienste = (holen: ImportDienste['holen'], jetzt = JETZT): ImportDienste => ({
	db,
	holen,
	jetzt: () => jetzt,
	pause: async () => {
		pausen++;
	}
});

const aufraeumen = () => db.delete(icTeam).where(inArray(icTeam.saison, SAISONS));
const zaehle = async (saison: number) => ({
	teams: (await db.select().from(icTeam).where(eq(icTeam.saison, saison))).length,
	begegnungen: (await db.select().from(icBegegnung).where(eq(icBegegnung.saison, saison))).length,
	raenge: (await db.select().from(icRang).where(eq(icRang.saison, saison))).length,
	entscheide: (await db.select().from(icEntscheid).where(eq(icEntscheid.saison, saison))).length
});
const stand = (saison: number, w: 'ic' | 'jic') =>
	db
		.select()
		.from(icStand)
		.where(and(eq(icStand.saison, saison), eq(icStand.wettbewerb, w)))
		.then((z) => z[0]?.abgerufenAm);

let spies: ReturnType<typeof vi.spyOn>[] = [];
beforeEach(async () => {
	pausen = 0;
	spies = [
		vi.spyOn(console, 'error').mockImplementation(() => {}),
		vi.spyOn(console, 'warn').mockImplementation(() => {}),
		vi.spyOn(console, 'log').mockImplementation(() => {})
	];
	await aufraeumen();
	await db.delete(icStand).where(inArray(icStand.saison, SAISONS));
});
afterEach(async () => {
	for (const s of spies) expect(s).not.toHaveBeenCalled();
	vi.restoreAllMocks();
	await aufraeumen();
	await db.delete(icStand).where(inArray(icStand.saison, SAISONS));
});
afterAll(async () => {
	await db.$client.end();
});

describe('importiereSaison', () => {
	test('importiert beide Wettbewerbe, mit Pause zwischen den Abfragen', async () => {
		const urls: string[] = [];
		const fake = beispielAbruf();
		const wort = await importiereSaison(
			dienste((u) => (urls.push(u), fake(u))),
			2071,
			VEREIN
		);
		expect(wort).toEqual({ ic: 'ok', jic: 'ok' });
		expect(urls[0]).toBe(
			'https://low-scalability.microservices.swisstennis.ch/interclub/club-teams?clubId=2202&competition=ic&year=2071&lang=de'
		);
		expect(urls).toContain(
			'https://low-scalability.microservices.swisstennis.ch/interclub/team-results?teamId=7398&competition=ic&year=2071&lang=de'
		);
		expect(pausen).toBe(urls.length - 1);
		expect(pausen).toBeGreaterThanOrEqual(18);
		expect((await zaehle(2071)).teams).toBe(17);
		const b = await db
			.select()
			.from(icBegegnung)
			.where(and(eq(icBegegnung.saison, 2071), eq(icBegegnung.teamId, 7398)));
		expect(b).toHaveLength(6);
		expect(await stand(2071, 'ic')).toEqual(JETZT);
		expect(await stand(2071, 'jic')).toEqual(JETZT);
	});

	test('Wettbewerb ohne Spielplan: keine-teams, vorhandener Stand bleibt', async () => {
		await importiereSaison(dienste(beispielAbruf()), 2072, VEREIN);
		const vorher = await zaehle(2072);
		const spaeter = new Date('2072-06-01T10:00:00Z');
		const wort = await importiereSaison(
			dienste(beispielAbruf({ nichtFreigeschaltet: [{ jahr: 2072, wettbewerb: 'jic' }] }), spaeter),
			2072,
			VEREIN
		);
		expect(wort).toEqual({ ic: 'ok', jic: 'keine-teams' });
		expect(await stand(2072, 'ic')).toEqual(spaeter);
		expect(await stand(2072, 'jic')).toEqual(JETZT);
		expect(await zaehle(2072)).toEqual(vorher);
	});

	test('ungültige Team-Antwort: form, alter Stand bleibt', async () => {
		await importiereSaison(dienste(beispielAbruf()), 2073, VEREIN);
		const vorher = await zaehle(2073);
		const fake = beispielAbruf();
		const spaeter = new Date('2073-06-01T10:00:00Z');
		const wort = await importiereSaison(
			dienste(async (u) => {
				if (u.includes('teamId=7398&competition=ic'))
					return new Response(JSON.stringify({ title: { de: 'Olten 1' }, results: 'kaputt' }), {
						status: 200
					});
				return fake(u);
			}, spaeter),
			2073,
			VEREIN
		);
		expect(wort.ic).toBe('form');
		expect(await stand(2073, 'ic')).toEqual(JETZT);
		expect(await zaehle(2073)).toEqual(vorher);
	});

	test('Punkte als Text: form', async () => {
		const fake = beispielAbruf();
		const wort = await importiereSaison(
			dienste(async (u) => {
				if (u.includes('teamId=7398&competition=ic')) {
					const j = await (await fake(u)).json();
					j.results[0].homeTeamScore = 'sechs';
					return new Response(JSON.stringify(j), { status: 200 });
				}
				return fake(u);
			}),
			2074,
			VEREIN
		);
		expect(wort.ic).toBe('form');
		expect(await stand(2074, 'ic')).toBeUndefined();
		expect((await zaehle(2074)).teams).toBe(await zaehleJic());
	});

	test('Abruf wirft oder 503: stoerung, Stand bleibt', async () => {
		await importiereSaison(dienste(beispielAbruf()), 2075, VEREIN);
		const vorher = await zaehle(2075);
		const wirft = await importiereSaison(
			dienste(async () => {
				throw new Error('Netz weg');
			}),
			2075,
			VEREIN
		);
		expect(wirft).toEqual({ ic: 'stoerung', jic: 'stoerung' });
		const fake = beispielAbruf();
		const s503 = await importiereSaison(
			dienste(async (u) =>
				u.includes('/team-results') ? new Response('{}', { status: 503 }) : fake(u)
			),
			2075,
			VEREIN
		);
		expect(s503).toEqual({ ic: 'stoerung', jic: 'stoerung' });
		expect(await zaehle(2075)).toEqual(vorher);
		expect(await stand(2075, 'ic')).toEqual(JETZT);
	});

	test('zweiter Import mit einem Team weniger ersetzt vollständig', async () => {
		await importiereSaison(dienste(beispielAbruf()), 2076, VEREIN);
		const fake = beispielAbruf();
		const wort = await importiereSaison(
			dienste(async (u) => {
				const r = await fake(u);
				if (u.includes('/club-teams?') && u.includes('competition=ic')) {
					const j = await r.json();
					j.teams = j.teams.filter((t: { id: number }) => t.id !== 7398);
					return new Response(JSON.stringify(j), { status: 200 });
				}
				return r;
			}),
			2076,
			VEREIN
		);
		expect(wort.ic).toBe('ok');
		const rest = async (t: typeof icBegegnung | typeof icRang | typeof icTeam) =>
			(
				await db
					.select()
					.from(t)
					.where(and(eq(t.saison, 2076), eq(t.teamId, 7398)))
			).length;
		expect(await rest(icTeam)).toBe(0);
		expect(await rest(icBegegnung)).toBe(0);
		expect(await rest(icRang)).toBe(0);
		expect((await db.select().from(icEntscheid).where(eq(icEntscheid.teamId, 7398))).length).toBe(
			0
		);
		expect((await zaehle(2076)).teams).toBe(16);
	});

	test('Saisons berühren einander nicht', async () => {
		await importiereSaison(dienste(beispielAbruf()), 2077, VEREIN);
		const a = await zaehle(2077);
		await importiereSaison(dienste(beispielAbruf()), 2071, VEREIN);
		expect(await zaehle(2077)).toEqual(a);
		expect((await zaehle(2071)).teams).toBe(17);
	});
});

async function zaehleJic() {
	return (
		await db
			.select()
			.from(icTeam)
			.where(and(eq(icTeam.saison, 2074), eq(icTeam.wettbewerb, 'jic')))
	).length;
}
