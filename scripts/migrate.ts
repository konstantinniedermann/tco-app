// Läuft im Docker-Image mit `node scripts/migrate.ts` (nur abtrennbare TS-Syntax).
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL fehlt');
	process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
try {
	await migrate(drizzle(pool), { migrationsFolder: 'drizzle' });
	console.log('Migrationen angewendet');
} catch {
	console.error('Migration fehlgeschlagen');
	process.exitCode = 1;
} finally {
	await pool.end();
}
