import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

export type Db = ReturnType<typeof erstelleDb>;

export function erstelleDb(url: string) {
	const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
	return drizzle(pool, { schema });
}

let db: Db | undefined;

export function holeDb(): Db {
	if (!db) {
		// Fallback: `$env/dynamic/private` liefert unter SvelteKit 3 ohne src/env.ts nichts
		// (auch nicht in Vitest, siehe Task-4-Bericht); process.env gilt im Node-Server und im Test.
		const url = process.env.DATABASE_URL;
		if (!url) throw new Error('DATABASE_URL fehlt');
		db = erstelleDb(url);
	}
	return db;
}
