import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb, type Db } from '../db/index.ts';
import { aenderung, kontoRolle } from '../db/schema.ts';
import { istAdmin, ladeRollen, setzeRollen } from './rollen.ts';

// «Letzter Admin» ist eine globale Eigenschaft; die gemeinsame Test-Datenbank teilen sich
// mehrere Dateien. Darum bekommt diese Datei eine eigene Datenbank.
const basisUrl = process.env.DATABASE_URL!;
const name = `mytco_rollen_${randomBytes(4).toString('hex')}`;
let db: Db;

beforeAll(async () => {
	const admin = new pg.Client({ connectionString: basisUrl });
	await admin.connect();
	await admin.query(`CREATE DATABASE ${name}`);
	await admin.end();
	const url = new URL(basisUrl);
	url.pathname = `/${name}`;
	db = erstelleDb(url.toString());
	await migrate(drizzle(db.$client), { migrationsFolder: 'drizzle' });
});

afterAll(async () => {
	await db.$client.end();
	const admin = new pg.Client({ connectionString: basisUrl });
	await admin.connect();
	await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
	await admin.end();
});

const jetzt = new Date('2026-11-02T12:00:00Z');

async function leereRollen() {
	await db.delete(kontoRolle);
}

describe('Rollen', () => {
	test('A-ROLLE-01, RR-01, FR-03: Admin vergibt und entzieht Rollen, Verlauf je Rolle', async () => {
		await leereRollen();
		const admin = await legeMitgliedAn(db, { rollen: ['admin'] });
		const ziel = await legeMitgliedAn(db);
		const urheber = { art: 'admin', mitgliedId: admin.mitgliedId } as const;

		expect(await setzeRollen(db, urheber, ziel.kontoId, ['cm', 'lizenz'], jetzt)).toBe('ok');
		expect((await ladeRollen(db, ziel.kontoId)).sort()).toEqual(['cm', 'lizenz']);
		expect(await setzeRollen(db, urheber, ziel.kontoId, ['cm'], jetzt)).toBe('ok');
		expect(await ladeRollen(db, ziel.kontoId)).toEqual(['cm']);

		const verlauf = await db
			.select()
			.from(aenderung)
			.where(eq(aenderung.mitgliedId, ziel.mitgliedId));
		expect(verlauf.map((z) => [z.aktion, z.detail, z.urheberMitgliedId]).sort()).toEqual([
			['rolle-entzogen', 'lizenz', admin.mitgliedId],
			['rolle-vergeben', 'cm', admin.mitgliedId],
			['rolle-vergeben', 'lizenz', admin.mitgliedId]
		]);
	});

	test('Unveränderte Rollen: kein Verlaufseintrag', async () => {
		await leereRollen();
		const admin = await legeMitgliedAn(db, { rollen: ['admin'] });
		const ziel = await legeMitgliedAn(db, { rollen: ['cm'] });
		const urheber = { art: 'admin', mitgliedId: admin.mitgliedId } as const;
		expect(await setzeRollen(db, urheber, ziel.kontoId, ['cm'], jetzt)).toBe('ok');
		const verlauf = await db
			.select()
			.from(aenderung)
			.where(eq(aenderung.mitgliedId, ziel.mitgliedId));
		expect(verlauf).toHaveLength(0);
	});

	test('setzeRollen: unbekanntes Konto ergibt nicht-gefunden', async () => {
		expect(await setzeRollen(db, { art: 'automatisch' }, 2_000_000_000, ['cm'], jetzt)).toBe(
			'nicht-gefunden'
		);
	});

	test('RR-03: der letzte Admin kann sich die Rolle nicht entziehen', async () => {
		await leereRollen();
		const admin = await legeMitgliedAn(db, { rollen: ['admin'] });
		const urheber = { art: 'admin', mitgliedId: admin.mitgliedId } as const;
		expect(await setzeRollen(db, urheber, admin.kontoId, ['cm'], jetzt)).toBe('letzter-admin');
		expect(await ladeRollen(db, admin.kontoId)).toEqual(['admin']);
		expect(await istAdmin(db, admin.kontoId)).toBe(true);
	});

	test('RR-03: mit einem zweiten Admin darf die Rolle entzogen werden', async () => {
		await leereRollen();
		const a = await legeMitgliedAn(db, { rollen: ['admin'] });
		const b = await legeMitgliedAn(db, { rollen: ['admin'] });
		const urheber = { art: 'admin', mitgliedId: a.mitgliedId } as const;
		expect(await setzeRollen(db, urheber, a.kontoId, [], jetzt)).toBe('ok');
		expect(await istAdmin(db, a.kontoId)).toBe(false);
		expect(await istAdmin(db, b.kontoId)).toBe(true);
	});

	test('RR-03: zwei Admins entziehen sich gleichzeitig die Rolle — einer bleibt', async () => {
		for (let lauf = 0; lauf < 5; lauf++) {
			await leereRollen();
			const a = await legeMitgliedAn(db, { rollen: ['admin'] });
			const b = await legeMitgliedAn(db, { rollen: ['admin'] });
			const ergebnisse = await Promise.all([
				setzeRollen(db, { art: 'admin', mitgliedId: a.mitgliedId }, b.kontoId, [], jetzt),
				setzeRollen(db, { art: 'admin', mitgliedId: b.mitgliedId }, a.kontoId, [], jetzt)
			]);
			expect([...ergebnisse].sort()).toEqual(['letzter-admin', 'ok']);
			const admins = [await istAdmin(db, a.kontoId), await istAdmin(db, b.kontoId)];
			expect(admins.filter(Boolean)).toHaveLength(1);
		}
	});

	test('RR-08: ein gesperrtes Konto zählt nicht als Admin', async () => {
		await leereRollen();
		const gesperrt = await legeMitgliedAn(db, { rollen: ['admin'], gesperrt: true });
		const ausgetreten = await legeMitgliedAn(db, { rollen: ['admin'], status: 'ausgetreten' });
		expect(await istAdmin(db, gesperrt.kontoId)).toBe(false);
		expect(await istAdmin(db, ausgetreten.kontoId)).toBe(false);
		// Ein gesperrter Admin ist kein Ersatz: der aktive bleibt der letzte.
		const aktiv = await legeMitgliedAn(db, { rollen: ['admin'] });
		expect(await setzeRollen(db, { art: 'automatisch' }, aktiv.kontoId, [], jetzt)).toBe(
			'letzter-admin'
		);
	});
});
