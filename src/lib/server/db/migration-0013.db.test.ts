import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
	legeEigeneDatenbankAn,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';

// Die Datenbank beginnt auf dem Stand vor 0013 und spielt 0013 selbst ein.
let eigene: EigeneDatenbank | undefined;

beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('migration_0013', { bis: '0012_mitteilungen' });
});

afterAll(async () => {
	await eigene?.abbauen();
});

describe('Migration 0013: Austritt und Löschen', () => {
	test('Bestand: ausgetretenes Mitglied bekommt austritt_am, die Migration gelingt', async () => {
		const db = eigene!.db;
		// Reines SQL mit den Spalten von vor 0013.
		const m = await db.$client.query<{ id: number }>(
			`insert into mitglied (vorname, nachname, strasse, plz, ort, email, status)
			 values ('Test', 'Muster', 'Erfundenweg 1', '4600', 'Olten', $1, 'ausgetreten') returning id`,
			[`test-${randomUUID()}@example.org`]
		);
		const aktiv = await db.$client.query<{ id: number }>(
			`insert into mitglied (vorname, nachname, strasse, plz, ort, email)
			 values ('Test', 'Muster', 'Erfundenweg 1', '4600', 'Olten', $1) returning id`,
			[`test-${randomUUID()}@example.org`]
		);
		const vorher = Date.now();
		await migrate(drizzle(db.$client), { migrationsFolder: 'drizzle' });
		const zeilen = await db.$client.query<{ id: number; austritt_am: Date | null }>(
			`select id, austritt_am from mitglied where id = any($1)`,
			[[m.rows[0].id, aktiv.rows[0].id]]
		);
		const von = (id: number) => zeilen.rows.find((z) => z.id === id)!;
		expect(von(m.rows[0].id).austritt_am!.getTime()).toBeGreaterThanOrEqual(vorher - 1000);
		expect(von(aktiv.rows[0].id).austritt_am).toBeNull();
	});
});
