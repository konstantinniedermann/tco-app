import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
	legeEigeneDatenbankAn,
	ZEIT_EIGENE_DB,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { icFolgen, icTeam, konto, pushAbo } from '../db/schema.ts';
import { erstelleSitzung, pruefeSitzung } from '../login/sitzung.ts';
import {
	ladeAlleGefolgtenTeams,
	ladeFolgenStand,
	ladeGefolgteTeams,
	setzeFolgen
} from './folgen.ts';

const JETZT = new Date('2026-11-13T10:00:00Z');

let e: EigeneDatenbank;
beforeAll(async () => {
	e = await legeEigeneDatenbankAn('icfolgen');
	const team = (saison: number, teamId: number, liga: string, reihenfolge: number) => ({
		saison,
		teamId,
		wettbewerb: 'ic' as const,
		teamName: `Olten ${teamId}`,
		liga,
		gruppe: 1,
		reihenfolge
	});
	await e.db
		.insert(icTeam)
		.values([
			team(2026, 1, 'Alt 2026', 1),
			team(2027, 1, '2L Herren 1', 2),
			team(2027, 2, '1L Damen', 1),
			team(2027, 3, '3L Herren', 3),
			team(2026, 9, 'Nur 2026', 1)
		]);
}, 30_000);
afterAll(async () => {
	await e.abbauen();
});

async function neuesKonto(mitAbo: boolean): Promise<number> {
	const m = await legeMitgliedAn(e.db, { vorname: 'Vreni', nachname: `Muster-${randomUUID()}` });
	if (mitAbo) {
		const kennung = await erstelleSitzung(e.db, m.kontoId, JETZT);
		const k = (await pruefeSitzung(e.db, kennung, JETZT))!.konto;
		await e.db.insert(pushAbo).values({
			endpunkt: `https://push.example/${randomUUID()}`,
			sitzungHash: k.sitzungHash,
			kontoId: m.kontoId,
			p256dh: 'p',
			auth: 'a',
			eingerichtetAm: JETZT
		});
	}
	return m.kontoId;
}

describe('Interclub-Teams folgen', () => {
	test('folgen ohne Abo: kein-push, nichts gespeichert', ZEIT_EIGENE_DB, async () => {
		const k = await neuesKonto(false);
		expect(await setzeFolgen(e.db, k, 1, true, JETZT)).toBe('kein-push');
		expect(await ladeFolgenStand(e.db, k, 1)).toEqual({ folgt: false, push: false });
		expect(await e.db.select().from(icFolgen).where(eq(icFolgen.kontoId, k))).toEqual([]);
	});

	test('folgen mit Abo: ok, auch doppelt', ZEIT_EIGENE_DB, async () => {
		const k = await neuesKonto(true);
		expect(await setzeFolgen(e.db, k, 1, true, JETZT)).toBe('ok');
		expect(await setzeFolgen(e.db, k, 1, true, JETZT)).toBe('ok');
		expect(await ladeFolgenStand(e.db, k, 1)).toEqual({ folgt: true, push: true });
		expect(await e.db.select().from(icFolgen).where(eq(icFolgen.kontoId, k))).toHaveLength(1);
	});

	test('entfolgen ohne Abo: ok, folgt false', ZEIT_EIGENE_DB, async () => {
		const k = await neuesKonto(false);
		expect(await setzeFolgen(e.db, k, 1, false, JETZT)).toBe('ok');
		expect(await ladeFolgenStand(e.db, k, 1)).toEqual({ folgt: false, push: false });
	});

	test('entfolgen nimmt das Folgen zurück', ZEIT_EIGENE_DB, async () => {
		const k = await neuesKonto(true);
		await setzeFolgen(e.db, k, 1, true, JETZT);
		expect(await setzeFolgen(e.db, k, 1, false, JETZT)).toBe('ok');
		expect(await ladeFolgenStand(e.db, k, 1)).toEqual({ folgt: false, push: true });
	});

	test(
		'entfolgen eines Teams, das es in ic_team nicht mehr gibt: ok, Zeile weg',
		ZEIT_EIGENE_DB,
		async () => {
			const k = await neuesKonto(true);
			await e.db.insert(icFolgen).values({ kontoId: k, teamId: 4712, seit: JETZT });
			expect(await setzeFolgen(e.db, k, 4712, false, JETZT)).toBe('ok');
			expect(await e.db.select().from(icFolgen).where(eq(icFolgen.kontoId, k))).toEqual([]);
		}
	);

	test('unbekanntes Team: nicht-gefunden', ZEIT_EIGENE_DB, async () => {
		const k = await neuesKonto(true);
		expect(await setzeFolgen(e.db, k, 4711, true, JETZT)).toBe('nicht-gefunden');
	});

	test('Team nur einer älteren Saison ist folgbar', ZEIT_EIGENE_DB, async () => {
		const k = await neuesKonto(true);
		expect(await setzeFolgen(e.db, k, 9, true, JETZT)).toBe('ok');
	});

	test('ladeGefolgteTeams: neueste Saison, Liga, Reihenfolge', ZEIT_EIGENE_DB, async () => {
		const k = await neuesKonto(true);
		for (const t of [3, 1, 2, 9]) await setzeFolgen(e.db, k, t, true, JETZT);
		expect(await ladeGefolgteTeams(e.db, k)).toEqual({
			teams: [
				{ teamId: 2, liga: '1L Damen' },
				{ teamId: 1, liga: '2L Herren 1' },
				{ teamId: 3, liga: '3L Herren' }
			],
			push: true
		});
		const ohne = await neuesKonto(false);
		expect(await ladeGefolgteTeams(e.db, ohne)).toEqual({ teams: [], push: false });
	});

	test(
		'JIC 2028 schon da, IC 2028 noch nicht: IC-Team aus 2027 bleibt in der Liste',
		ZEIT_EIGENE_DB,
		async () => {
			const k = await neuesKonto(true);
			await e.db.insert(icTeam).values({
				saison: 2028,
				teamId: 50,
				wettbewerb: 'jic',
				teamName: 'Olten 50',
				liga: 'Junioren U15',
				gruppe: 1,
				reihenfolge: 1
			});
			try {
				for (const t of [50, 1, 2]) await setzeFolgen(e.db, k, t, true, JETZT);
				expect((await ladeGefolgteTeams(e.db, k)).teams).toEqual([
					{ teamId: 2, liga: '1L Damen' },
					{ teamId: 1, liga: '2L Herren 1' },
					{ teamId: 50, liga: 'Junioren U15' }
				]);
			} finally {
				await e.db.delete(icTeam).where(eq(icTeam.saison, 2028));
			}
		}
	);

	test(
		'ladeAlleGefolgtenTeams: Liga der neuesten Saison je Team und seit wann, unbekannte Teams sichtbar',
		ZEIT_EIGENE_DB,
		async () => {
			const k = await neuesKonto(true);
			for (const t of [9, 1, 2]) await setzeFolgen(e.db, k, t, true, JETZT);
			await e.db.insert(icFolgen).values({ kontoId: k, teamId: 777, seit: JETZT });
			const alle = await ladeAlleGefolgtenTeams(e.db, k);
			expect(alle).toHaveLength(4);
			expect(alle).toEqual(
				expect.arrayContaining([
					{ teamId: 9, liga: 'Nur 2026', seit: JETZT },
					{ teamId: 1, liga: '2L Herren 1', seit: JETZT },
					{ teamId: 2, liga: '1L Damen', seit: JETZT },
					{ teamId: 777, liga: 'Team 777', seit: JETZT }
				])
			);
			expect(await ladeAlleGefolgtenTeams(e.db, await neuesKonto(false))).toEqual([]);
		}
	);

	test('Konto gelöscht: ic_folgen weg', ZEIT_EIGENE_DB, async () => {
		const k = await neuesKonto(true);
		await setzeFolgen(e.db, k, 1, true, JETZT);
		await e.db.delete(konto).where(eq(konto.id, k));
		expect(await e.db.select().from(icFolgen).where(eq(icFolgen.kontoId, k))).toEqual([]);
	});
});
