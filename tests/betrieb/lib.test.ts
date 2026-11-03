import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { fuehreAus, tempOrdner } from './hilfe.ts';

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

	test('Übernahme schlägt fehl, wenn sich die PID seit dem Lesen geändert hat', () => {
		const tot = spawnSync('true').pid;
		const basis = fuehreAus(TREIBER, ['true']).basis;
		const dir = join(basis, 'test', 'sperre');
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'pid'), String(process.pid) + '\n');
		// beobachtet wurde die tote PID, inzwischen hält ein anderer Prozess die Sperre
		const lauf = fuehreAus(TREIBER, ['sperre_uebernehmen', 'test', String(tot)], { basis });
		expect(lauf.status).toBe(1);
		expect(readFileSync(join(dir, 'pid'), 'utf-8').trim()).toBe(String(process.pid));
	});

	test('Übernahme gelingt bei unveränderter toter PID', () => {
		const tot = String(spawnSync('true').pid);
		const basis = fuehreAus(TREIBER, ['true']).basis;
		const dir = join(basis, 'test', 'sperre');
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'pid'), tot + '\n');
		const lauf = fuehreAus(TREIBER, ['sperre_uebernehmen', 'test', tot], { basis });
		expect(lauf.status).toBe(0);
		expect(readFileSync(join(dir, 'pid'), 'utf-8').trim()).not.toBe(tot);
	});

	test('freigeben lässt eine fremde Sperre stehen', () => {
		const basis = fuehreAus(TREIBER, ['true']).basis;
		const dir = join(basis, 'test', 'sperre');
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'pid'), String(process.pid) + '\n');
		expect(fuehreAus(TREIBER, ['sperre_freigeben', 'test'], { basis }).status).toBe(0);
		expect(existsSync(dir)).toBe(true);
	});

	test('nehmen und freigeben im selben Prozess räumt die Sperre ab', () => {
		const lauf = lib('sperre_zyklus', 'test');
		expect(lauf.status).toBe(0);
		expect(existsSync(join(lauf.basis, 'test', 'sperre'))).toBe(false);
	});

	test('nehmen legt die Sperre an', () => {
		const { basis } = lib('true');
		const lauf = (f: string) => fuehreAus(TREIBER, [f, 'test'], { basis });
		expect(lauf('sperre_nehmen').status).toBe(0);
		expect(existsSync(join(basis, 'test', 'sperre', 'pid'))).toBe(true);
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
		expect(lauf.umwelt[0].umgebung).toBe('live');
	});
});

describe('compose_proxy', () => {
	test('ruft docker compose mit Projekt mytco-proxy, Datei und proxy.env auf', () => {
		const lauf = lib('compose_proxy', 'up', '-d');
		const b = lauf.basis;
		expect(lauf.aufrufe).toEqual([
			`compose -p mytco-proxy -f ${b}/proxy/compose.proxy.yml --env-file ${b}/proxy/proxy.env up -d`
		]);
	});
});

describe('Ersatz-docker', () => {
	test('wählt die Ausgabe je Unterbefehl einer compose()-Zeile', () => {
		const stub = {
			STUB_MUSTER_A_PS: 'geheim.env ps',
			STUB_AUSGABE_A_PS: 'laeuft',
			STUB_MUSTER_B_PSQL: 'exec -T db psql',
			STUB_AUSGABE_B_PSQL: 'public.a|3'
		};
		const ps = fuehreAus(TREIBER, ['compose', 'test', 'ps', '-q'], { stub });
		expect(ps.stdout).toBe('laeuft\n');
		const psql = fuehreAus(TREIBER, ['compose', 'test', 'exec', '-T', 'db', 'psql'], { stub });
		expect(psql.stdout).toBe('public.a|3\n');
		const sonst = fuehreAus(TREIBER, ['compose', 'test', 'up'], { stub });
		expect(sonst.stdout).toBe('');
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

describe('mail_umleitung_gesetzt', () => {
	const mitEnv = (inhalt: string | null) => {
		const basis = tempOrdner('mytco-basis-');
		if (inhalt !== null) {
			mkdirSync(join(basis, 'live'), { recursive: true });
			writeFileSync(join(basis, 'live/geheim.env'), inhalt);
		}
		return fuehreAus(TREIBER, ['mail_umleitung_gesetzt', 'live'], { basis }).status;
	};

	test.each([
		['leer', 'MAIL_NUR_AN=\n'],
		['zwei einfache Anführungszeichen', "MAIL_NUR_AN=''\n"],
		['Leerzeichen in Anführungszeichen', 'MAIL_NUR_AN=" "\n'],
		['nur Leerzeichen', 'MAIL_NUR_AN=   \n'],
		['keine Zeile', 'ORIGIN=https://x\n'],
		['auskommentiert', '#MAIL_NUR_AN=pl@example.org\n']
	])('gilt als leer: %s', (_name, inhalt) => {
		expect(mitEnv(inhalt)).toBe(1);
	});

	test('Datei fehlt: nicht gesetzt', () => {
		expect(mitEnv(null)).toBe(1);
	});

	test.each([
		['ohne Anführungszeichen', 'MAIL_NUR_AN=pl@example.org\n'],
		['einfache Anführungszeichen', "MAIL_NUR_AN='pl@example.org'\n"],
		['doppelte Anführungszeichen', 'MAIL_NUR_AN="pl@example.org"\n'],
		['zwischen anderen Zeilen', 'A=1\nMAIL_NUR_AN=pl@example.org\nB=2\n']
	])('gilt als gesetzt: %s', (_name, inhalt) => {
		expect(mitEnv(inhalt)).toBe(0);
	});
});

// Von der Fehlerausgabe von pg_restore kommt nur die Zahl ins Protokoll (DS-06): DETAIL- und
// CONTEXT-Zeilen tragen Werte aus der Datenbank.
describe('nur_fehlerzahl', () => {
	const zaehle = (eingabe: string) =>
		fuehreAus(TREIBER, ['nur_fehlerzahl', 'probe'], { stdin: eingabe });

	test.each([
		['leere Eingabe', ''],
		['ohne Fehlerzeile', 'pg_restore: warning: nichts\nirgendwas\n'],
		['Fehlertext nicht am Zeilenanfang', 'DETAIL:  pg_restore: error: (x@example.org)\n']
	])('0 Fehlerzeilen (%s): keine Ausgabe', (_name, eingabe) => {
		const x = zaehle(eingabe);
		expect(x.status).toBe(0);
		expect(x.stdout).toBe('');
	});

	test('zwei Fehlerzeilen: genau eine Zeile mit der Zahl, ohne Werte', () => {
		const x = zaehle(
			[
				'pg_restore: error: COPY failed for table "mitglied": ERROR:  duplicate key value',
				'DETAIL:  Key (email)=(x@example.org) already exists.',
				'CONTEXT:  COPY mitglied, line 1: "x@example.org"',
				'pg_restore: error: could not execute query: ERROR:  x@example.org',
				'pg_restore: warning: errors ignored on restore: 2',
				''
			].join('\n')
		);
		expect(x.status).toBe(0);
		expect(x.stdout).toBe('probe: 2 Fehlerzeilen von pg_restore (Inhalt verworfen)\n');
		expect(x.stdout).not.toContain('x@example.org');
		expect(x.stderr).not.toContain('x@example.org');
	});
});
