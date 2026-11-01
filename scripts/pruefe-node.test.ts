import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';

const soll = readFileSync('.nvmrc', 'utf-8').trim();
const ordner = mkdtempSync(join(tmpdir(), 'pruefe-node-'));
afterAll(() => rmSync(ordner, { recursive: true, force: true }));

/** Führt das Skript mit einem falschen `node` im PATH aus, das die Hauptversion `major` meldet. */
function mitNode(major: string) {
	const bin = join(ordner, major);
	mkdirSync(bin, { recursive: true });
	writeFileSync(join(bin, 'node'), `#!/bin/sh\necho ${major}\n`);
	chmodSync(join(bin, 'node'), 0o755);
	return spawnSync('bash', ['scripts/pruefe-node.sh'], {
		env: { ...process.env, PATH: `${bin}:/usr/bin:/bin` },
		encoding: 'utf-8'
	});
}

describe('scripts/pruefe-node.sh', () => {
	test('lässt die Hauptversion aus .nvmrc durch', () => {
		expect(mitNode(soll).status).toBe(0);
	});

	test('bricht bei einer anderen Hauptversion mit klarer Meldung ab', () => {
		const lauf = mitNode('20');
		expect(lauf.status).toBe(1);
		expect(lauf.stderr).toContain(`Node 20 statt ${soll}`);
	});
});
