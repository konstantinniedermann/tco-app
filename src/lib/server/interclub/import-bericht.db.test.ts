import { readdirSync, readFileSync } from 'node:fs';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest';
import { beispielAbruf } from '../../../../scripts/beispiel-interclub.ts';
import { erstelleDb } from '../db/index.ts';
import { icBegegnung, icBericht, icPartie, icSpieler, icStand, icTeam } from '../db/schema.ts';
import { importiereSaison, type ImportDienste } from './import.ts';

// Einzelpartien im Import (#81 Teil 2). Beispieldaten: echte Berichte 2026 mit erfundenen Namen.
const db = erstelleDb(process.env.DATABASE_URL!);
const SAISONS = [2081, 2082, 2083, 2084, 2085, 2086];
const VEREIN = 2202;
const ST = 'https://low-scalability.microservices.swisstennis.ch/interclub';

const dienste = (holen: ImportDienste['holen']): ImportDienste => ({
	db,
	holen,
	jetzt: () => new Date('2081-05-02T10:00:00Z'),
	pause: async () => {}
});

// Erwartung unabhängig vom Import aus den Dateien: Partien mit Spielern, TCO- und Gegnerspieler.
type Mitglied = { id: number; name: string };
type Roh = {
	homeTeam: { clubNumber: number };
	singles: { players: Record<'home' | 'away', { members: Mitglied[] }> }[];
	doubles: Roh['singles'];
};
const ORDNER = new URL('../../../../scripts/beispiel-interclub/2026/', import.meta.url);
const berichte = readdirSync(ORDNER)
	.filter((n) => n.startsWith('bericht-'))
	.map((n) => ({
		id: Number(n.slice(8, -5)),
		roh: JSON.parse(readFileSync(new URL(n, ORDNER), 'utf8')) as Roh
	}));
const erwartet = { partien: 0, tco: [] as Mitglied[], gegner: [] as Mitglied[] };
for (const { roh } of berichte) {
	const tcoHeim = roh.homeTeam.clubNumber === VEREIN;
	for (const p of [...roh.singles, ...roh.doubles]) {
		const tco = p.players[tcoHeim ? 'home' : 'away'].members;
		const gegner = p.players[tcoHeim ? 'away' : 'home'].members;
		if (tco.length > 0) erwartet.partien++;
		erwartet.tco.push(...tco);
		erwartet.gegner.push(...gegner);
	}
}

const anzahl = async (saison: number) => ({
	berichte: (await db.select().from(icBericht).where(eq(icBericht.saison, saison))).length,
	partien: (await db.select().from(icPartie).where(eq(icPartie.saison, saison))).length,
	spieler: (await db.select().from(icSpieler).where(eq(icSpieler.saison, saison))).length
});
const hatBericht = async (saison: number, begegnungId: number) =>
	(
		await db
			.select()
			.from(icBericht)
			.where(and(eq(icBericht.saison, saison), eq(icBericht.begegnungId, begegnungId)))
	).length === 1;

const aufraeumen = async () => {
	await db.delete(icTeam).where(inArray(icTeam.saison, SAISONS));
	await db.delete(icStand).where(inArray(icStand.saison, SAISONS));
};
beforeEach(aufraeumen);
afterEach(aufraeumen);
afterAll(async () => {
	await db.$client.end();
});

describe('importiereSaison: Einzelpartien', () => {
	test('holt die Berichte aller eigenen, gespielten Begegnungen mit beiden Seiten', async () => {
		const urls: string[] = [];
		const fake = beispielAbruf();
		const wort = await importiereSaison(
			dienste((u) => (urls.push(u), fake(u))),
			2081,
			VEREIN
		);
		expect(wort).toEqual({ ic: 'ok', jic: 'ok' });
		expect(berichte).toHaveLength(63);
		expect(await anzahl(2081)).toEqual({
			berichte: 63,
			partien: erwartet.partien,
			spieler: erwartet.tco.length + erwartet.gegner.length
		});
		expect(urls).toContain(
			`${ST}/encounter-results?encounterId=972338&competition=ic&year=2081&lang=de`
		);
		// Begegnung ohne TCO (Aarau 2 – Muhen) wird nicht abgefragt.
		expect(urls.some((u) => u.includes('encounterId=972340'))).toBe(false);
		expect(urls.filter((u) => /\/(encounter|tableau)-results\?/.test(u))).toHaveLength(63);
	});

	test('Auf-/Abstiegsspiele kommen über tableau-results', async () => {
		const urls: string[] = [];
		const fake = beispielAbruf();
		await importiereSaison(
			dienste((u) => (urls.push(u), fake(u))),
			2082,
			VEREIN
		);
		expect(urls).toContain(
			`${ST}/tableau-results?encounterId=45486&competition=ic&year=2082&lang=de`
		);
		expect(urls.some((u) => u.includes('encounter-results?encounterId=45486'))).toBe(false);
		expect(await hatBericht(2082, 45486)).toBe(true);
	});

	test('Gegner nur mit Name und Klassierung, Nummern nur bei TCO-Spielern', async () => {
		await importiereSaison(dienste(beispielAbruf()), 2083, VEREIN);
		const zeilen = await db.select().from(icSpieler).where(eq(icSpieler.saison, 2083));
		const tco = zeilen.filter((z) => z.seite === 'tco');
		const gegner = zeilen.filter((z) => z.seite === 'gegner');
		expect(gegner).toHaveLength(erwartet.gegner.length);
		expect(gegner.every((z) => z.stId === null && z.rangliste === null)).toBe(true);
		expect(gegner.every((z) => /^[RN]\d$/.test(z.klassierung))).toBe(true);
		const tcoIds = new Set(erwartet.tco.map((m) => m.id));
		expect(tco.every((z) => z.stId !== null && tcoIds.has(z.stId))).toBe(true);
		expect(zeilen.every((z) => !/\(/.test(z.name))).toBe(true);
	});

	test('fehlender Bericht: Begegnung bleibt ohne Einzelpartien, Import ok', async () => {
		const wort = await importiereSaison(
			dienste(beispielAbruf({ ohneBericht: [972338] })),
			2084,
			VEREIN
		);
		expect(wort.ic).toBe('ok');
		const b = await db
			.select()
			.from(icBegegnung)
			.where(and(eq(icBegegnung.saison, 2084), eq(icBegegnung.begegnungId, 972338)));
		expect(b).toHaveLength(1);
		expect(await hatBericht(2084, 972338)).toBe(false);
		expect((await anzahl(2084)).berichte).toBe(62);
	});

	test('abweichender oder nicht abrufbarer Bericht: alter Stand mit Berichten bleibt', async () => {
		await importiereSaison(dienste(beispielAbruf()), 2085, VEREIN);
		const vorher = await anzahl(2085);
		const kaputt = await importiereSaison(
			dienste(beispielAbruf({ berichtKaputt: [972338] })),
			2085,
			VEREIN
		);
		expect(kaputt).toEqual({ ic: 'form', jic: 'ok' });
		const fake = beispielAbruf();
		const weg = await importiereSaison(
			dienste(async (u) => {
				if (u.includes('encounterId=972338')) throw new Error('Netz weg');
				return fake(u);
			}),
			2085,
			VEREIN
		);
		expect(weg).toEqual({ ic: 'stoerung', jic: 'ok' });
		expect(await anzahl(2085)).toEqual(vorher);
		expect(await hatBericht(2085, 972338)).toBe(true);
	});

	test('unlesbarer Bericht (kein JSON): form, alter Bericht bleibt', async () => {
		await importiereSaison(dienste(beispielAbruf()), 2085, VEREIN);
		const vorher = await anzahl(2085);
		const fake = beispielAbruf();
		const wort = await importiereSaison(
			dienste(async (u) =>
				u.includes('encounterId=972338')
					? new Response('<html>Fehler</html>', { status: 200 })
					: fake(u)
			),
			2085,
			VEREIN
		);
		expect(wort).toEqual({ ic: 'form', jic: 'ok' });
		expect(await anzahl(2085)).toEqual(vorher);
		expect(await hatBericht(2085, 972338)).toBe(true);
	});

	test('zweiter Import ersetzt die Berichte', async () => {
		await importiereSaison(dienste(beispielAbruf()), 2086, VEREIN);
		const vorher = await anzahl(2086);
		expect(await importiereSaison(dienste(beispielAbruf()), 2086, VEREIN)).toEqual({
			ic: 'ok',
			jic: 'ok'
		});
		expect(await anzahl(2086)).toEqual(vorher);
	});
});
