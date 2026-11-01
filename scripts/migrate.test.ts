import { spawnSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';

describe('scripts/migrate.ts', () => {
	test('nennt bei einem Fehler Code und Meldung, aber nie die DATABASE_URL', () => {
		const url = 'postgres://mytco:geheim_pw@127.0.0.1:1/keine';
		const lauf = spawnSync(process.execPath, ['scripts/migrate.ts'], {
			env: { ...process.env, DATABASE_URL: url },
			encoding: 'utf-8'
		});
		expect(lauf.status).toBe(1);
		expect(lauf.stderr).toMatch(/^Migration fehlgeschlagen: ECONNREFUSED .*127\.0\.0\.1:1/m);
		expect(lauf.stderr + lauf.stdout).not.toContain('geheim_pw');
	});

	test('bricht ohne DATABASE_URL ab', () => {
		const env = { ...process.env };
		delete env.DATABASE_URL;
		const lauf = spawnSync(process.execPath, ['scripts/migrate.ts'], { env, encoding: 'utf-8' });
		expect(lauf.status).toBe(1);
		expect(lauf.stderr.trim()).toBe('DATABASE_URL fehlt');
	});
});
