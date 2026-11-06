import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
	legeEigeneDatenbankAn,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { kontoRolle } from './schema.ts';

// Die Datenbank beginnt auf dem Stand vor dem Umbau der Rollen (0008) und spielt 0009 selbst ein.
let eigene: EigeneDatenbank | undefined;

beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('migration_0009', { bis: '0008_turnier' });
});

afterAll(async () => {
	await eigene?.abbauen();
});

const rollenVon = async (kontoId: number) =>
	(
		await eigene!.db
			.select({ rolle: kontoRolle.rolle })
			.from(kontoRolle)
			.where(eq(kontoRolle.kontoId, kontoId))
	)
		.map((z) => z.rolle)
		.sort();

const constraint = (f: unknown) => {
	const c = (f as { cause?: { constraint_name?: string; constraint?: string } } | null)?.cause;
	return c?.constraint_name ?? c?.constraint;
};

describe('Migration 0009: vier Admin-Rollen', () => {
	test('«admin wird zu mytco und mitglieder»', async () => {
		const db = eigene!.db;
		const admin = await legeMitgliedAn(db, { rollen: ['admin', 'cm'] });
		const nurAdmin = await legeMitgliedAn(db, { rollen: ['admin'] });
		const cm = await legeMitgliedAn(db, { rollen: ['cm', 'lizenz'] });

		await migrate(drizzle(db.$client), { migrationsFolder: 'drizzle' });

		expect(await rollenVon(admin.kontoId)).toEqual(['cm', 'mitglieder', 'mytco']);
		expect(await rollenVon(nurAdmin.kontoId)).toEqual(['mitglieder', 'mytco']);
		expect(await rollenVon(cm.kontoId)).toEqual(['cm', 'lizenz']);

		const f = await db
			.insert(kontoRolle)
			.values({ kontoId: cm.kontoId, rolle: 'admin' })
			.then(
				() => null,
				(e: unknown) => e
			);
		expect(constraint(f)).toBe('konto_rolle_rolle_check');
	});
});
