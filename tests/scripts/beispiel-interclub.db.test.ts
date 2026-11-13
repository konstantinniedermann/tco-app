import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { legeBeispielInterclubAn } from '../../scripts/beispiel-interclub.ts';
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
});
