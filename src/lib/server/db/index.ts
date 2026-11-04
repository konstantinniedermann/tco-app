import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

export type Db = ReturnType<typeof erstelleDb>;
export type DbOderTx = Db | Parameters<Parameters<Db['transaction']>[0]>[0];

export function erstelleDb(url: string) {
	const pool = new pg.Pool({
		connectionString: url,
		connectionTimeoutMillis: 3000,
		query_timeout: 5000
	});
	// Ein abgebrochener Leerlauf-Client darf den Server nicht beenden; keine Details loggen (SI-05).
	pool.on('error', () => {
		console.error('Datenbankverbindung unterbrochen');
	});
	return drizzle(pool, { schema });
}

let db: Db | undefined;

export function holeDb(): Db {
	// process.env statt `$app/env/private`: SvelteKit 3 liest src/env.ts beim Laden aus einem
	// Schnappschuss der Umgebung zum Konfigurationszeitpunkt (siehe docs/beobachtungen.md). Die
	// Test-Datenbank entsteht erst im Global-Setup, daher passt das unter Vitest nicht.
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL fehlt');
	db ??= erstelleDb(url);
	return db;
}
