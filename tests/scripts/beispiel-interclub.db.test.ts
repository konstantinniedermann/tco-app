import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { beispielAbruf, legeBeispielInterclubAn } from '../../scripts/beispiel-interclub.ts';
import { icTeam } from '../../src/lib/server/db/schema.ts';
import { legeEigeneDatenbankAn, type EigeneDatenbank } from '../hilfen/eigene-datenbank.ts';

let eigene: EigeneDatenbank;
beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('beispielinterclub');
});
afterAll(async () => {
	await eigene.abbauen();
});

describe('Beispiel-Interclub für make seed', () => {
	test('A-INTERCLUB-SEED-01: zweiter Lauf legt die 17 Teams nicht doppelt an', async () => {
		const jetzt = new Date('2026-11-13T10:00:00Z');
		await legeBeispielInterclubAn(eigene.db, jetzt);
		await legeBeispielInterclubAn(eigene.db, jetzt);
		const teams = await eigene.db.select().from(icTeam);
		expect(teams).toHaveLength(17);
		expect(new Set(teams.map((t) => t.teamId)).size).toBe(17);
	});

	test('A-INTERCLUB-SEED-01: eine fehlerhafte Antwort lässt den Aufruf scheitern', async () => {
		const ganz = beispielAbruf();
		const kaputt = async (url: string) =>
			new URL(url).searchParams.get('competition') === 'jic' &&
			new URL(url).pathname.endsWith('club-teams')
				? new Response('{}', { status: 200 })
				: ganz(url);
		await expect(
			legeBeispielInterclubAn(eigene.db, new Date('2026-11-13T10:00:00Z'), kaputt)
		).rejects.toThrow('Interclub-Beispieldaten');
	});
});
