import { randomBytes } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { erstelleDb, type Db } from '../../src/lib/server/db/index.ts';

export type EigeneDatenbank = { db: Db; abbauen: () => Promise<void> };

async function mitAdminVerbindung(fn: (c: pg.Client) => Promise<unknown>): Promise<void> {
	const admin = new pg.Client({ connectionString: process.env.DATABASE_URL! });
	await admin.connect();
	try {
		await fn(admin);
	} finally {
		await admin.end();
	}
}

// Für Tests, deren Aussage global ist (z. B. «letzter Admin»): Die gemeinsame Test-Datenbank
// teilen sich mehrere Dateien parallel. `abbauen` löscht die Datenbank auch dann, wenn das
// Schliessen des Clients fehlschlägt; schlägt schon das Anlegen fehl, bleibt nichts zurück.
export async function legeEigeneDatenbankAn(praefix: string): Promise<EigeneDatenbank> {
	const name = `mytco_${praefix}_${randomBytes(4).toString('hex')}`;
	const loesche = () =>
		mitAdminVerbindung((c) => c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`));
	let db: Db | undefined;
	try {
		await mitAdminVerbindung((c) => c.query(`CREATE DATABASE ${name}`));
		const url = new URL(process.env.DATABASE_URL!);
		url.pathname = `/${name}`;
		db = erstelleDb(url.toString());
		await migrate(drizzle(db.$client), { migrationsFolder: 'drizzle' });
	} catch (fehler) {
		try {
			await db?.$client.end();
		} finally {
			await loesche();
		}
		throw fehler;
	}
	const offen = db;
	return {
		db: offen,
		abbauen: async () => {
			try {
				await offen.$client.end();
			} finally {
				await loesche();
			}
		}
	};
}
