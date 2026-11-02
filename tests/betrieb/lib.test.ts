import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { fuehreAus } from './hilfe.ts';

const TREIBER = 'tests/betrieb/lib-treiber.sh';
const lib = (...args: string[]) => fuehreAus(TREIBER, args);
const GUELTIG = 'sha256:' + 'ab12'.repeat(16);

describe('pruefe_umgebung', () => {
	test.each(['test', 'live'])('nimmt %s an', (wert) => {
		expect(lib('pruefe_umgebung', wert).status).toBe(0);
	});

	test.each(['Test', 'prod', 'test live', '', 'test\n'])('lehnt %j ab', (wert) => {
		const lauf = lib('pruefe_umgebung', wert);
		expect(lauf.status).toBe(1);
		expect(lauf.stdout).toBe('fehler\n');
	});
});

describe('pruefe_digest', () => {
	test('nimmt einen 64-Hex-Digest an', () => {
		expect(lib('pruefe_digest', GUELTIG).status).toBe(0);
	});

	test.each([
		['Grossbuchstaben', 'sha256:' + 'AB12'.repeat(16)],
		['63 Zeichen', GUELTIG.slice(0, -1)],
		['Befehl angehängt', `${GUELTIG};ls`],
		['Zeilenumbruch', `${GUELTIG}\n`],
		['Zeile davor', `x\n${GUELTIG}`],
		['Befehlsersetzung', '$(id)'],
		['zweites Wort', `${GUELTIG} x`]
	])('lehnt %s ab', (_name, wert) => {
		const lauf = lib('pruefe_digest', wert);
		expect(lauf.status).toBe(1);
		expect(lauf.stdout).toBe('fehler\n');
	});
});

describe('schritt', () => {
	test('druckt die Schrittzeile', () => {
		expect(lib('schritt', 'pruefen').stdout).toBe('schritt: pruefen\n');
	});
});

describe('Sperre', () => {
	// Legt eine Sperre mit fester PID-Datei an und versucht dann, sie zu nehmen.
	function mitSperre(pid: string) {
		const basis = fuehreAus(TREIBER, ['true']).basis;
		const dir = join(basis, 'test', 'sperre');
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'pid'), pid + '\n');
		const lauf = fuehreAus(TREIBER, ['sperre_nehmen', 'test'], { basis });
		return { lauf, dir };
	}

	test('lehnt ab, wenn die PID lebt', () => {
		expect(mitSperre(String(process.pid)).lauf.status).toBe(1);
	});

	test('übernimmt eine Sperre mit toter PID', () => {
		const tot = spawnSync('true').pid;
		const { lauf, dir } = mitSperre(String(tot));
		expect(lauf.status).toBe(0);
		expect(readFileSync(join(dir, 'pid'), 'utf-8').trim()).not.toBe(String(tot));
	});

	test('nehmen legt die Sperre an, freigeben entfernt sie', () => {
		const { basis } = lib('true');
		const lauf = (f: string) => fuehreAus(TREIBER, [f, 'test'], { basis });
		expect(lauf('sperre_nehmen').status).toBe(0);
		expect(existsSync(join(basis, 'test', 'sperre', 'pid'))).toBe(true);
		expect(lauf('sperre_freigeben').status).toBe(0);
		expect(existsSync(join(basis, 'test', 'sperre'))).toBe(false);
	});
});

describe('protokoll', () => {
	test('schreibt die Ausgabe ins Protokoll, nicht an den Aufrufer', () => {
		const lauf = lib('protokoll', 'test', 'docker', 'ps');
		expect(lauf.status).toBe(0);
		expect(lauf.stdout + lauf.stderr).not.toContain('STUB-GEHEIM-LOG');
		expect(readFileSync(join(lauf.basis, 'test', 'protokoll.log'), 'utf-8')).toContain(
			'STUB-GEHEIM-LOG'
		);
		expect(lauf.aufrufe).toEqual(['ps']);
	});

	test('gibt den Exit-Code des Befehls zurück', () => {
		const lauf = fuehreAus(TREIBER, ['protokoll', 'test', 'docker', 'ps'], {
			stub: { STUB_FEHLER_BEI: 'ps' }
		});
		expect(lauf.status).toBe(1);
	});
});

describe('compose', () => {
	test('ruft docker compose mit Projekt, Datei und env-Datei auf', () => {
		const lauf = lib('compose', 'live', 'up', '-d');
		const b = lauf.basis;
		expect(lauf.aufrufe).toEqual([
			`compose -p mytco-live -f ${b}/live/betrieb/compose.umgebung.yml --env-file ${b}/live/geheim.env up -d`
		]);
	});
});

describe('Ersatz-docker', () => {
	test('wählt die Ausgabe nach Argumentzeile, mit Kürzen vom Ende', () => {
		const stub = { STUB_AUSGABE_COMPOSE_PS: 'laeuft', STUB_AUSGABE_INSPECT: 'kurz' };
		const ps = fuehreAus(TREIBER, ['docker', 'compose', 'ps', '-q'], { stub });
		expect(ps.stdout).toBe('laeuft\n');
		const inspect = fuehreAus(TREIBER, ['docker', 'inspect', 'x'], { stub });
		expect(inspect.stdout).toBe('kurz\n');
	});
});

describe('ZAEHL_SQL', () => {
	test('zählt je Tabelle über query_to_xml und lässt Systemschemas aus', () => {
		const sql = lib('zeige', 'ZAEHL_SQL').stdout;
		expect(sql).toContain('query_to_xml');
		expect(sql).toContain('BASE TABLE');
		expect(sql).toContain('pg_catalog');
		expect(sql).toContain('information_schema');
		expect(sql).toContain('ORDER BY');
	});
});
