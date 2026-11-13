import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
	legeEigeneDatenbankAn,
	ZEIT_EIGENE_DB,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { importiereBeispiel } from '../../../../tests/hilfen/interclub.ts';
import { icBericht, icStand, icTeam } from '../db/schema.ts';
import { ladeBegegnung, ladeTeam, ladeUebersicht } from './ansicht.ts';

// Seite einer Begegnung (#81 Teil 2) mit den Beispieldaten 2026 (erfundene Namen).
// «Neueste Saison des Teams»: eigene Datenbank.
describe('ladeBegegnung', () => {
	let e: EigeneDatenbank;
	beforeAll(async () => {
		e = await legeEigeneDatenbankAn('icbegegnung');
		await importiereBeispiel(e.db, 2026, new Date('2026-11-12T08:00:00Z'));
	}, 30_000);
	afterAll(async () => {
		await e.abbauen();
	});

	test(
		'Heimspiel: Kopf, Einzel und Doppel nach Position, nur Name und Klassierung',
		ZEIT_EIGENE_DB,
		async () => {
			const b = (await ladeBegegnung(e.db, 7398, 972338))!;
			expect(b).toMatchObject({
				saison: 2026,
				teamId: 7398,
				liga: '2L Herren 1',
				gegner: 'Villmergen'
			});
			expect(b.spiel).toMatchObject({
				begegnungId: 972338,
				heim: 'Olten 1',
				gast: 'Villmergen',
				heimPunkte: 8,
				gastPunkte: 1,
				tcoHeim: true,
				ergebnis: 'sieg'
			});
			expect(b.saetze).toEqual({ tco: 16, gegner: 3 });
			const p = b.partien!;
			expect(p.einzel.map((x) => x.position)).toEqual([1, 2, 3, 4, 5, 6]);
			expect(p.doppel.map((x) => x.position)).toEqual([1, 2, 3]);
			expect(p.einzel[0]).toEqual({
				position: 1,
				spieler: [{ name: 'Hannes Saitenbett', klassierung: 'R6' }],
				gegner: [{ name: 'Elena Testmann', klassierung: 'R5' }],
				saetze: ['5:7', '0:6'],
				ergebnis: 'niederlage',
				aufgabe: null
			});
			expect(p.doppel[1]).toEqual({
				position: 2,
				spieler: [
					{ name: 'Fabio Fiktiv', klassierung: 'R6' },
					{ name: 'Leo Netzpfosten', klassierung: 'R6' }
				],
				gegner: [
					{ name: 'Elena Testmann', klassierung: 'R5' },
					{ name: 'Luca Attrappe', klassierung: 'R8' }
				],
				saetze: ['0:6', '6:4', '11:9'],
				ergebnis: 'sieg',
				aufgabe: null
			});
			const text = JSON.stringify(b);
			expect(text).not.toContain('9497');
			expect(text).not.toContain('stId');
			expect(text).not.toContain('rangliste');
		}
	);

	test('Auswärtsspiel: Sätze aus Sicht des TCO', ZEIT_EIGENE_DB, async () => {
		const b = (await ladeBegegnung(e.db, 7398, 972339))!;
		expect(b.spiel.tcoHeim).toBe(false);
		expect(b.gegner).toBe('Muhen');
		expect(b.saetze).toEqual({ tco: 1, gegner: 18 });
		expect(b.partien!.einzel[0]).toMatchObject({
			spieler: [{ name: 'Hannes Saitenbett', klassierung: 'R6' }],
			saetze: ['0:6', '2:6'],
			ergebnis: 'niederlage'
		});
	});

	test('Aufgabe des Gegners zählt als Sieg', ZEIT_EIGENE_DB, async () => {
		const b = (await ladeBegegnung(e.db, 7396, 951025))!;
		expect(b.partien!.einzel.find((x) => x.position === 3)).toMatchObject({
			saetze: ['6:3', '5:3'],
			aufgabe: 'gegner',
			ergebnis: 'sieg'
		});
	});

	test('Auf-/Abstiegsspiel mit nicht gespielten Doppeln', ZEIT_EIGENE_DB, async () => {
		const b = (await ladeBegegnung(e.db, 7398, 45486))!;
		expect(b.spiel.art).toBe('aufstieg');
		expect(b.spiel.tcoHeim).toBe(false);
		expect(b.partien!.einzel).toHaveLength(6);
		expect(b.partien!.doppel).toEqual([]);
	});

	test('ohne Bericht: Begegnung ohne Partien', ZEIT_EIGENE_DB, async () => {
		const schluessel = and(
			eq(icBericht.saison, 2026),
			eq(icBericht.teamId, 7398),
			eq(icBericht.begegnungId, 972337)
		);
		const [vorher] = await e.db.select().from(icBericht).where(schluessel);
		await e.db.delete(icBericht).where(schluessel);
		try {
			const b = (await ladeBegegnung(e.db, 7398, 972337))!;
			expect(b.spiel.begegnungId).toBe(972337);
			expect(b.saetze).toBeNull();
			expect(b.partien).toBeNull();
		} finally {
			await e.db.insert(icBericht).values(vorher);
		}
	});

	test('fremde, unbekannte oder falsch zugeordnete Begegnung: null', ZEIT_EIGENE_DB, async () => {
		expect(await ladeBegegnung(e.db, 7398, 972340)).toBeNull(); // Aarau 2 – Muhen
		expect(await ladeBegegnung(e.db, 7398, 999999)).toBeNull();
		expect(await ladeBegegnung(e.db, 7396, 972338)).toBeNull();
		expect(await ladeBegegnung(e.db, 999999, 972338)).toBeNull();
	});

	test('Team-Seite und Übersicht nennen die Nummer der Begegnung', ZEIT_EIGENE_DB, async () => {
		const t = (await ladeTeam(e.db, 7398))!;
		expect(t.spiele.find((s) => s.gast === 'Villmergen' && s.heim === 'Olten 1')!.begegnungId).toBe(
			972338
		);
		expect(t.entscheide!.spiele[0].begegnungId).toBe(45486);
		const u = (await ladeUebersicht(e.db, new Date('2026-05-03T10:00:00Z')))!;
		expect(u.letzte.every((s) => Number.isInteger(s.begegnungId))).toBe(true);
	});

	test('neueste Saison des Teams', ZEIT_EIGENE_DB, async () => {
		await importiereBeispiel(e.db, 2027, new Date('2027-03-01T08:00:00Z'), {
			nichtFreigeschaltet: [{ jahr: 2027, wettbewerb: 'jic' }]
		});
		try {
			expect((await ladeBegegnung(e.db, 7398, 972338))!.saison).toBe(2027);
		} finally {
			await e.db.delete(icTeam).where(eq(icTeam.saison, 2027));
			await e.db.delete(icStand).where(eq(icStand.saison, 2027));
		}
	});
});
