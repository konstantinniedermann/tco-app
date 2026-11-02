import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from './index.ts';
import { konto, mitglied } from './schema.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

describe('Schema Mitglied und Konto', () => {
	test('FR-25: E-Mail-Adresse gehört zu höchstens einem Mitglied', async () => {
		const { email } = await legeMitgliedAn(db);
		await expect(
			db.insert(mitglied).values({
				vorname: 'Test',
				nachname: 'Muster',
				strasse: 'Erfundenweg 1',
				plz: '4600',
				ort: 'Olten',
				email
			})
		).rejects.toThrow();
	});

	test('Konto wird mit dem Mitglied gelöscht', async () => {
		const { mitgliedId, kontoId } = await legeMitgliedAn(db);
		await db.delete(mitglied).where(eq(mitglied.id, mitgliedId));
		const rest = await db.select().from(konto).where(eq(konto.id, kontoId));
		expect(rest).toHaveLength(0);
	});

	test('Status ausserhalb von aktiv, ausgetreten, geloescht wird abgelehnt', async () => {
		await expect(legeMitgliedAn(db, { status: 'unbekannt' })).rejects.toThrow();
	});

	test('Standardwerte: Status aktiv, Sitzungsversion 1, nicht gesperrt', async () => {
		const { mitgliedId, kontoId } = await legeMitgliedAn(db);
		const [m] = await db.select().from(mitglied).where(eq(mitglied.id, mitgliedId));
		const [k] = await db.select().from(konto).where(eq(konto.id, kontoId));
		expect(m.status).toBe('aktiv');
		expect(k).toMatchObject({ sitzungsversion: 1, gesperrt: false, mailCodeFehlversuche: 0 });
	});
});
