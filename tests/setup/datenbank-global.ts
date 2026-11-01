import { randomBytes } from 'node:crypto';
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
	await admin.query(`CREATE DATABASE ${name}`);
	await admin.end();

	const testUrl = new URL(basisUrl);
	testUrl.pathname = `/${name}`;
	project.provide('datenbankUrl', testUrl.toString());

	return async () => {
		const abbau = new pg.Client({ connectionString: basisUrl });
		await abbau.connect();
		await abbau.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
		await abbau.end();
	};
}
