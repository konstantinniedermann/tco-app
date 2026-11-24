import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

const soll = readFileSync('.nvmrc', 'utf8').trim().replace(/^v/, '').split('.')[0];
const alt = String(Number(soll) - 2);
const ordner: string[] = [];
afterEach(() => {
	for (const o of ordner.splice(0)) rmSync(o, { recursive: true, force: true });
});

// Attrappen für node (zwei Hauptversionen zu alt) und docker in einem eigenen PATH-Ordner; jeder Aufruf
// ausser der Versionsabfrage landet im Protokoll, ausgeführt wird nichts.
function make(ziel: string) {
	const stub = mkdtempSync(join(tmpdir(), 'make-node-'));
	ordner.push(stub);
	const datei = (name: string, inhalt: string) => {
		writeFileSync(join(stub, name), `#!/bin/bash\n${inhalt}\n`);
		chmodSync(join(stub, name), 0o755);
	};
	datei(
		'node',
		`if [ "$1" = "-p" ]; then echo ${alt}; exit 0; fi\necho "node $*" >> "${stub}/aufrufe.log"`
	);
	datei('docker', `echo "docker $*" >> "${stub}/aufrufe.log"`);
	const lauf = spawnSync('make', ['--no-print-directory', ziel], {
		encoding: 'utf8',
		env: { ...process.env, PATH: `${stub}:${process.env.PATH}`, MAKEFLAGS: '' }
	});
	const log = join(stub, 'aufrufe.log');
	return { ...lauf, aufrufe: existsSync(log) ? readFileSync(log, 'utf8') : '' };
}

describe('make bricht bei falscher Node-Version ab, bevor ein Skript läuft', () => {
	// Ältere Node-Versionen kennen import.meta.main nicht: seed-lokal.ts, admin-festlegen.ts und
	// e2e.ts endeten dort still mit Exit 0, make e2e meldete grün ohne einen Test.
	test.each(['seed', 'admin', 'e2e'])('make %s', (ziel) => {
		const lauf = make(ziel);
		expect(lauf.stderr).toContain(`Abbruch: Node ${alt} statt ${soll}`);
		expect(lauf.status).not.toBe(0);
		expect(lauf.aufrufe).toBe('');
	});
});
