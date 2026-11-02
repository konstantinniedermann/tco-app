import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { konto } from '../db/schema.ts';
import { erstelleBremsen } from './bremse.ts';
import { erzeugeBriefCode } from './codes.ts';
import { erstelleLoginDienst } from './dienst.ts';

// Erzwingt Hash-Kollisionen: die ersten Aufrufe liefern vorgegebene Codes.
const vorgabe: string[] = [];
vi.mock('./codes.ts', async (importOriginal) => {
	const original = await importOriginal<typeof import('./codes.ts')>();
	return { ...original, erzeugeBriefCode: () => vorgabe.shift() ?? original.erzeugeBriefCode() };
});

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

beforeEach(() => {
	vorgabe.length = 0;
});

const dienst = erstelleLoginDienst({
	db,
	schluessel: 'y'.repeat(40),
	kontakt: 'kontakt@example.org',
	mailer: async () => {},
	bremsen: erstelleBremsen(),
	jetzt: () => new Date('2026-11-02T12:00:00Z')
});

describe('Brief-Code: Hash-Kollision', () => {
	test('bei Kollision wird mit neuem Code wiederholt', async () => {
		const a = await legeMitgliedAn(db);
		const b = await legeMitgliedAn(db);
		const belegt = erzeugeBriefCode();
		vorgabe.push(belegt);
		await dienst.stelleBriefCodeAus(a.kontoId);
		vorgabe.push(belegt, belegt);
		const { code } = await dienst.stelleBriefCodeAus(b.kontoId);
		expect(code).not.toBe(belegt);
		const [k] = await db.select().from(konto).where(eq(konto.id, b.kontoId));
		expect(k.briefCodeHash).not.toBeNull();
	});

	test('nach drei Kollisionen wird der Fehler weitergereicht', async () => {
		const a = await legeMitgliedAn(db);
		const b = await legeMitgliedAn(db);
		const belegt = erzeugeBriefCode();
		vorgabe.push(belegt);
		await dienst.stelleBriefCodeAus(a.kontoId);
		vorgabe.push(belegt, belegt, belegt);
		await expect(dienst.stelleBriefCodeAus(b.kontoId)).rejects.toThrow();
	});
});
