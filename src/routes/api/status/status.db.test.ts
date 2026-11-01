import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { afterAll, describe, expect, test, vi } from 'vitest';
import { APP_VERSION } from '../../../lib/version.ts';
import { erstelleDb as erstelleDbRoh, holeDb, type Db } from '../../../lib/server/db/index.ts';
import { ermittleStatus } from '../../../lib/server/status.ts';
import { MINDESTVERSION } from '../../../lib/server/version.ts';
import { GET } from './+server.ts';

const offeneDbs: Db[] = [];

function erstelleDb(url: string) {
	const db = erstelleDbRoh(url);
	offeneDbs.push(db);
	return db;
}

afterAll(async () => {
	await Promise.all(offeneDbs.map((db) => db.$client.end()));
});

async function roh(sql: string) {
	const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	try {
		return await client.query(sql);
	} finally {
		await client.end();
	}
}

describe('/api/status', () => {
	test('Testlauf nutzt eine eigene Datenbank', async () => {
		const { rows } = await roh('select current_database() as name');
		expect(rows[0].name).toMatch(/^mytco_test_[0-9a-f]{8}$/);
	});

	test('GET /api/status mit erreichbarer Datenbank → 200', async () => {
		const res = await GET();
		expect(res.status).toBe(200);
		expect(res.headers.get('cache-control')).toBe('no-store');
		expect(await res.json()).toEqual({
			status: 'ok',
			version: APP_VERSION,
			mindestversion: MINDESTVERSION
		});
	});

	test('holeDb liefert eine wiederverwendete Verbindung und braucht DATABASE_URL', async () => {
		const url = process.env.DATABASE_URL;
		vi.resetModules();
		delete process.env.DATABASE_URL;
		const modul = await import('../../../lib/server/db/index.ts');
		expect(() => modul.holeDb()).toThrow('DATABASE_URL fehlt');
		process.env.DATABASE_URL = url;
		expect(modul.holeDb()).toBe(modul.holeDb());
		offeneDbs.push(modul.holeDb());
		expect(holeDb()).toBe(holeDb());
		offeneDbs.push(holeDb());
	});

	test('error-Event auf dem Pool löst keinen Absturz aus und loggt keine Details', () => {
		const db = erstelleDb(process.env.DATABASE_URL!);
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => db.$client.emit('error', new Error('geheim://passwort'))).not.toThrow();
		expect(log).toHaveBeenCalledTimes(1);
		expect(log.mock.calls[0]).toEqual(['Datenbankverbindung unterbrochen']);
		log.mockRestore();
	});

	test('query_timeout bricht eine hängende Abfrage ab', async () => {
		const db = erstelleDb(process.env.DATABASE_URL!);
		expect(db.$client.options.query_timeout).toBe(5000);
	});

	test('Datenbank nicht erreichbar → fehler ohne Details', async () => {
		const tot = erstelleDb('postgres://mytco:x@127.0.0.1:1/keine');
		const antwort = await ermittleStatus(tot);
		expect(antwort).toEqual({
			status: 'fehler',
			version: APP_VERSION,
			mindestversion: MINDESTVERSION
		});
	});

	test('Migrationen laufen auf leerer Datenbank durch', async () => {
		const db = erstelleDb(process.env.DATABASE_URL!);
		await expect(migrate(db, { migrationsFolder: 'drizzle' })).resolves.toBeUndefined();
	});
});
