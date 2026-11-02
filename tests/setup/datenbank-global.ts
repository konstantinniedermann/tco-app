import { randomBytes } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import type { TestProject } from 'vitest/node';

const STANDARD_URL = 'postgres://mytco:mytco_lokal@localhost:55432/mytco';

declare module 'vitest' {
	export interface ProvidedContext {
		datenbankUrl: string;
	}
}

export default async function setup(project: TestProject) {
	const basisUrl = process.env.DATABASE_URL ?? STANDARD_URL;
	const name = `mytco_test_${randomBytes(4).toString('hex')}`;

	const admin = new pg.Client({ connectionString: basisUrl });
	await admin.connect();
	try {
		await admin.query(`CREATE DATABASE ${name}`);
	} finally {
		await admin.end();
	}

	const testUrl = new URL(basisUrl);
	testUrl.pathname = `/${name}`;
	// Einmal hier migrieren, damit parallele Testdateien nicht gleichzeitig migrieren.
	const pool = new pg.Pool({ connectionString: testUrl.toString() });
	try {
		await migrate(drizzle(pool), { migrationsFolder: 'drizzle' });
	} finally {
		await pool.end();
	}
	project.provide('datenbankUrl', testUrl.toString());

	return async () => {
		const abbau = new pg.Client({ connectionString: basisUrl });
		await abbau.connect();
		try {
			await abbau.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
		} finally {
			await abbau.end();
		}
	};
}
