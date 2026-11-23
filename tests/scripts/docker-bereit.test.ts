import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

const SKRIPT = resolve('scripts/docker-bereit.sh');
const ordner: string[] = [];

type Lage = {
	// an: Docker läuft schon · nach-start: erst nach «open» und zwei weiteren Abfragen bereit · nie
	docker: 'an' | 'nach-start' | 'nie';
	system?: 'Darwin' | 'Linux';
	// false: «open» findet Docker Desktop nicht
	app?: boolean;
	frist?: string;
};

// Attrappen für docker, open, uname und sleep in einem eigenen PATH-Ordner.
function lauf(lage: Lage) {
	const stub = mkdtempSync(join(tmpdir(), 'docker-bereit-'));
	ordner.push(stub);
	const datei = (name: string, inhalt: string) => {
		writeFileSync(join(stub, name), `#!/bin/bash\n${inhalt}\n`);
		chmodSync(join(stub, name), 0o755);
	};
	datei(
		'docker',
		`echo "$*" >> "${stub}/docker.log"
case "${lage.docker}" in
  an) exit 0 ;;
  nie) exit 1 ;;
esac
[ -f "${stub}/gestartet" ] || exit 1
echo x >> "${stub}/zaehler"
[ "$(wc -l < "${stub}/zaehler")" -ge 2 ]`
	);
	datei(
		'open',
		`echo "$*" > "${stub}/open.log"\n${lage.app === false ? 'exit 1' : `touch "${stub}/gestartet"`}`
	);
	datei('uname', `echo ${lage.system ?? 'Darwin'}`);
	datei('sleep', 'exit 0');
	const erg = spawnSync('/bin/bash', [SKRIPT], {
		encoding: 'utf8',
		env: {
			PATH: `${stub}:/usr/bin:/bin`,
			...(lage.frist ? { DOCKER_START_FRIST: lage.frist } : {})
		}
	});
	const lies = (name: string) =>
		existsSync(join(stub, name)) ? readFileSync(join(stub, name), 'utf8') : '';
	return { code: erg.status, fehler: erg.stderr, open: lies('open.log').trim() };
}

afterEach(() => {
	for (const o of ordner.splice(0)) rmSync(o, { recursive: true, force: true });
});

describe('docker-bereit.sh', () => {
	test('Docker läuft schon: fertig, ohne Docker Desktop zu starten', () => {
		const erg = lauf({ docker: 'an' });
		expect(erg.code).toBe(0);
		expect(erg.open).toBe('');
	});

	test('Docker aus auf dem Mac: startet Docker Desktop im Hintergrund und wartet', () => {
		const erg = lauf({ docker: 'nach-start' });
		expect(erg.code).toBe(0);
		expect(erg.open).toBe('-ga Docker');
		expect(erg.fehler).toContain('Docker Desktop startet');
	});

	test('Docker Desktop wird nicht rechtzeitig bereit: Abbruch mit Frist', () => {
		const erg = lauf({ docker: 'nie', frist: '3' });
		expect(erg.code).toBe(1);
		expect(erg.open).toBe('-ga Docker');
		expect(erg.fehler).toContain('nach 3 s');
	});

	test('Docker Desktop fehlt auf dem Mac: Abbruch mit Hinweis', () => {
		const erg = lauf({ docker: 'nie', app: false });
		expect(erg.code).toBe(1);
		expect(erg.fehler).toContain('Docker ist nicht erreichbar');
	});

	test('ausserhalb macOS: startet nichts, Abbruch mit Hinweis', () => {
		const erg = lauf({ docker: 'nie', system: 'Linux' });
		expect(erg.code).toBe(1);
		expect(erg.open).toBe('');
		expect(erg.fehler).toContain('Docker ist nicht erreichbar');
	});
});
