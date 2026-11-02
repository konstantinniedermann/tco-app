import {
	chmodSync,
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	statSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { fuehreAus, type Ergebnis } from './hilfe.ts';

const NEU = 'sha256:' + 'a1'.repeat(32);
const ALT = 'sha256:' + 'b2'.repeat(32);
const VOR = 'sha256:' + 'c3'.repeat(32);
const LIVE = 'sha256:' + 'd4'.repeat(32);
const LIVE_VOR = 'sha256:' + '07'.repeat(32);
const MUELL1 = 'sha256:' + 'e5'.repeat(32);
const MUELL2 = 'sha256:' + 'f6'.repeat(32);
const REPO = 'ghcr.io/konstantinniedermann/tco-app';

type Aufbau = {
	// Dateien relativ zu MYTCO_BASIS (Inhalt)
	dateien?: Record<string, string>;
	// ausführbare Dateien relativ zu MYTCO_BASIS
	ausfuehrbar?: Record<string, string>;
};

const FAKE_SICHERN =
	'#!/usr/bin/env bash\necho "sichern $*" >>"$MYTCO_BASIS/sichern-aufrufe"\nexit "${STUB_SICHERN_EXIT:-0}"\n';

// Ein bereits ausgeliefertes Live: Einrichtung, gemeinsame Teile, Proxy-Dateien, Zustand.
const BESTEHENDES_LIVE: Aufbau = {
	dateien: {
		'live/zustand/aktuell': `${ALT}\n`,
		'live/betrieb/compose.umgebung.yml': 'ALT-LIVE-BETRIEB',
		'gemeinsam/bin/lib.sh': 'ALT-LIB',
		'proxy/caddy/Caddyfile': 'ALT-CADDYFILE',
		'proxy/caddy/umgebungen/live.caddy': 'ALT-LIVE-CADDY',
		'proxy/compose.proxy.yml': 'ALT-COMPOSE'
	},
	ausfuehrbar: { 'gemeinsam/bin/sichern': FAKE_SICHERN }
};
const BESTEHENDES_LIVE_PFADE = [
	...Object.keys(BESTEHENDES_LIVE.dateien ?? {}),
	'gemeinsam/bin/sichern'
];

// Baut ein MYTCO_BASIS mit der Einrichtung des Repos als entnommene Fassung (mit Ersatz-sichern).
function baue(aufbau: Aufbau = {}): string {
	const basis = mkdtempSync(join(tmpdir(), 'mytco-basis-'));
	const betrieb = join(basis, 'fassungen', NEU, 'betrieb');
	mkdirSync(dirname(betrieb), { recursive: true });
	cpSync('betrieb', betrieb, { recursive: true });
	const sichern = join(betrieb, 'bin', 'sichern');
	writeFileSync(sichern, FAKE_SICHERN);
	chmodSync(sichern, 0o755);
	for (const [pfad, inhalt] of Object.entries(aufbau.dateien ?? {})) {
		const ziel = join(basis, pfad);
		mkdirSync(dirname(ziel), { recursive: true });
		writeFileSync(ziel, inhalt);
	}
	for (const [pfad, inhalt] of Object.entries(aufbau.ausfuehrbar ?? {})) {
		const ziel = join(basis, pfad);
		mkdirSync(dirname(ziel), { recursive: true });
		writeFileSync(ziel, inhalt);
		chmodSync(ziel, 0o755);
	}
	return basis;
}

function ausliefern(
	umgebung: string,
	basis: string,
	stub: Record<string, string> = {},
	digest = NEU
): Ergebnis {
	const lauf = fuehreAus(
		join(basis, 'fassungen', digest, 'betrieb', 'bin', 'ausliefern'),
		[umgebung, digest],
		{ basis, stub }
	);
	pruefeAusgabe(lauf);
	return lauf;
}

function zurueck(umgebung: string, basis: string, stub: Record<string, string> = {}): Ergebnis {
	const lauf = fuehreAus('betrieb/bin/zurueck', [umgebung], { basis, stub });
	pruefeAusgabe(lauf);
	return lauf;
}

// Nur Schritt-, ok- und fehler-Zeilen, nie Ausgabe von docker.
function pruefeAusgabe(lauf: Ergebnis) {
	for (const zeile of lauf.stdout.split('\n').filter(Boolean)) {
		expect(zeile).toMatch(/^(schritt: [a-z -]+|ok|fehler)$/);
	}
	expect(lauf.stdout).not.toContain('STUB-GEHEIM-LOG');
	expect(lauf.stderr).not.toContain('STUB-GEHEIM-LOG');
}

const letzteZeile = (lauf: Ergebnis) => lauf.stdout.trim().split('\n').pop();
const lies = (basis: string, pfad: string) => readFileSync(join(basis, pfad), 'utf-8').trim();
const inode = (basis: string, pfad: string) => statSync(join(basis, pfad)).ino;
const gibt = (basis: string, pfad: string) => existsSync(join(basis, pfad));
const index = (lauf: Ergebnis, teil: string) => lauf.aufrufe.findIndex((a) => a.includes(teil));
const appStarts = (lauf: Ergebnis) =>
	lauf.aufrufe
		.map((a, i) => ({ a, i }))
		.filter(({ a }) => a.includes('--wait-timeout') && a.endsWith(' app'));
const MIT_DB_UP = { STUB_MUSTER_A: 'ps --status running -q db', STUB_AUSGABE_A: 'db-container' };

describe('ausliefern: erster Lauf auf Test', () => {
	const basis = baue();
	const lauf = ausliefern('test', basis);

	test('meldet ok, setzt aktuell, kein vorher', () => {
		expect(lauf.status).toBe(0);
		expect(letzteZeile(lauf)).toBe('ok');
		expect(lies(basis, 'test/zustand/aktuell')).toBe(NEU);
		expect(gibt(basis, 'test/zustand/vorher')).toBe(false);
	});

	test('setzt Test zurück, migriert, startet die App mit dem neuen Image', () => {
		const down = index(lauf, 'down --volumes');
		const dbUp = index(lauf, 'up -d --wait db');
		const migration = index(lauf, 'run --rm --no-deps app node scripts/migrate.ts');
		const [appUp] = appStarts(lauf);
		expect(down).toBeGreaterThanOrEqual(0);
		expect(dbUp).toBeGreaterThan(down);
		expect(migration).toBeGreaterThan(dbUp);
		expect(appUp.i).toBeGreaterThan(migration);
		expect(appUp.a).toContain('up -d --wait --wait-timeout 60 app');
		expect(lauf.umwelt[appUp.i]).toEqual({ image: `${REPO}@${NEU}`, umgebung: 'test' });
	});

	test('übernimmt Einrichtung, Caddy-Datei und (erster Lauf) gemeinsame Teile', () => {
		expect(gibt(basis, 'test/betrieb/compose.umgebung.yml')).toBe(true);
		expect(gibt(basis, 'proxy/caddy/umgebungen/test.caddy')).toBe(true);
		expect(gibt(basis, 'proxy/caddy/Caddyfile')).toBe(true);
		expect(gibt(basis, 'proxy/compose.proxy.yml')).toBe(true);
		expect(gibt(basis, 'gemeinsam/bin/sichern')).toBe(true);
		expect(gibt(basis, 'gemeinsam/bin/lib.sh')).toBe(true);
	});

	test('validiert Caddy in einem Wegwerf-Container und startet den Proxy', () => {
		expect(index(lauf, 'run --rm --no-deps caddy caddy validate')).toBeGreaterThanOrEqual(0);
		expect(lauf.aufrufe.some((a) => a.includes('mytco-proxy') && a.includes('up -d'))).toBe(true);
	});

	test('sichert nicht, löscht keine Images, gibt die Sperre frei, Docker-Ausgabe im Protokoll', () => {
		expect(gibt(basis, 'sichern-aufrufe')).toBe(false);
		expect(index(lauf, 'image rm')).toBe(-1);
		expect(gibt(basis, 'test/sperre')).toBe(false);
		expect(lies(basis, 'test/protokoll.log')).toContain('STUB-GEHEIM-LOG');
	});
});

describe('ausliefern: gemeinsame Teile', () => {
	test('Test-Lauf mit vorhandenem Live lässt Caddyfile und Proxy-Compose unberührt', () => {
		const basis = baue({ dateien: { 'live/zustand/aktuell': `${ALT}\n` } });
		const lauf = ausliefern('test', basis);
		expect(letzteZeile(lauf)).toBe('ok');
		expect(gibt(basis, 'proxy/caddy/Caddyfile')).toBe(false);
		expect(gibt(basis, 'proxy/compose.proxy.yml')).toBe(false);
		expect(gibt(basis, 'gemeinsam/bin/sichern')).toBe(false);
		expect(gibt(basis, 'proxy/caddy/umgebungen/test.caddy')).toBe(true);
	});

	test('Live-Lauf kopiert sie auch bei vorhandenem Live', () => {
		const basis = baue({ dateien: { 'live/zustand/aktuell': `${ALT}\n` } });
		const lauf = ausliefern('live', basis);
		expect(letzteZeile(lauf)).toBe('ok');
		expect(gibt(basis, 'proxy/caddy/Caddyfile')).toBe(true);
		expect(gibt(basis, 'proxy/compose.proxy.yml')).toBe(true);
		expect(gibt(basis, 'gemeinsam/bin/lib.sh')).toBe(true);
		expect(gibt(basis, 'proxy/caddy/umgebungen/live.caddy')).toBe(true);
	});
});

describe('ausliefern: Live und Sicherung', () => {
	test('erster Live-Lauf ohne Datenbank sichert nicht und liefert aus', () => {
		const basis = baue();
		const lauf = ausliefern('live', basis);
		expect(letzteZeile(lauf)).toBe('ok');
		expect(gibt(basis, 'sichern-aufrufe')).toBe(false);
		expect(index(lauf, 'down')).toBe(-1);
		expect(lies(basis, 'live/zustand/aktuell')).toBe(NEU);
	});

	test('läuft die Datenbank, wird vor jeder Änderung gesichert', () => {
		const basis = baue(BESTEHENDES_LIVE);
		const lauf = ausliefern('live', basis, MIT_DB_UP);
		expect(letzteZeile(lauf)).toBe('ok');
		expect(lies(basis, 'sichern-aufrufe')).toBe('sichern live');
		// die Sicherung läuft vor Caddy-Prüfung und Migration
		expect(index(lauf, 'ps --status running -q db')).toBeLessThan(index(lauf, 'caddy validate'));
		expect(index(lauf, 'down --volumes')).toBe(-1);
	});

	test('scheitert die Sicherung: fehler, nichts verändert', () => {
		const basis = baue(BESTEHENDES_LIVE);
		const vorher = BESTEHENDES_LIVE_PFADE.map((p) => lies(basis, p));
		const lauf = ausliefern('live', basis, { ...MIT_DB_UP, STUB_SICHERN_EXIT: '1' });
		expect(lauf.status).toBe(1);
		expect(letzteZeile(lauf)).toBe('fehler');
		expect(appStarts(lauf)).toHaveLength(0);
		expect(index(lauf, 'migrate.ts')).toBe(-1);
		expect(index(lauf, 'caddy')).toBe(-1);
		expect(BESTEHENDES_LIVE_PFADE.map((p) => lies(basis, p))).toEqual(vorher);
		expect(lies(basis, 'live/zustand/aktuell')).toBe(ALT);
		expect(gibt(basis, 'proxy/caddy/umgebungen/test.caddy')).toBe(false);
		expect(gibt(basis, 'live/sperre')).toBe(false);
	});

	test('läuft die Datenbank, aber gemeinsam/bin/sichern fehlt: fehler, nichts verändert', () => {
		const basis = baue({ dateien: BESTEHENDES_LIVE.dateien });
		const lauf = ausliefern('live', basis, MIT_DB_UP);
		expect(lauf.status).toBe(1);
		expect(letzteZeile(lauf)).toBe('fehler');
		expect(lies(basis, 'live/betrieb/compose.umgebung.yml')).toBe('ALT-LIVE-BETRIEB');
		expect(gibt(basis, 'gemeinsam/bin/sichern')).toBe(false);
		expect(index(lauf, 'caddy')).toBe(-1);
	});
});

describe('ausliefern: Fehlerfälle', () => {
	test('Migration scheitert: fehler, kein Start der App, aktuell unverändert', () => {
		const basis = baue({ dateien: { 'test/zustand/aktuell': `${ALT}\n` } });
		const lauf = ausliefern('test', basis, { STUB_FEHLER_BEI: 'migrate.ts' });
		expect(lauf.status).toBe(1);
		expect(letzteZeile(lauf)).toBe('fehler');
		expect(appStarts(lauf)).toHaveLength(0);
		expect(lies(basis, 'test/zustand/aktuell')).toBe(ALT);
	});

	test('App nicht gesund, mit Vorgänger: startet den vorherigen Digest, fehler', () => {
		const basis = baue({
			dateien: { 'test/zustand/aktuell': `${ALT}\n`, 'test/zustand/vorher': `${VOR}\n` }
		});
		const lauf = ausliefern('test', basis, { STUB_FEHLER_BEI: '--wait-timeout' });
		expect(lauf.status).toBe(1);
		expect(letzteZeile(lauf)).toBe('fehler');
		const starts = appStarts(lauf);
		expect(starts).toHaveLength(2);
		expect(lauf.umwelt[starts[0].i].image).toBe(`${REPO}@${NEU}`);
		expect(lauf.umwelt[starts[1].i].image).toBe(`${REPO}@${ALT}`);
		expect(lies(basis, 'test/zustand/aktuell')).toBe(ALT);
		expect(lies(basis, 'test/zustand/vorher')).toBe(VOR);
		expect(index(lauf, 'image rm')).toBe(-1);
	});

	test('App nicht gesund, allererster Lauf: fehler ohne Absturz, kein zweiter Start', () => {
		const basis = baue();
		const lauf = ausliefern('test', basis, { STUB_FEHLER_BEI: '--wait-timeout' });
		expect(lauf.status).toBe(1);
		expect(letzteZeile(lauf)).toBe('fehler');
		expect(appStarts(lauf)).toHaveLength(1);
		expect(gibt(basis, 'test/zustand/aktuell')).toBe(false);
		expect(gibt(basis, 'test/sperre')).toBe(false);
	});

	test('Testdaten des Images werden geladen, ein Fehler dabei ist fehler', () => {
		const basis = baue();
		const lauf = ausliefern('test', basis);
		expect(index(lauf, 'test -f scripts/testdaten.ts')).toBeGreaterThanOrEqual(0);
		expect(index(lauf, 'node scripts/testdaten.ts')).toBeGreaterThan(index(lauf, 'migrate.ts'));
		const kaputt = ausliefern('test', baue(), { STUB_FEHLER_BEI: 'node scripts/testdaten.ts' });
		expect(letzteZeile(kaputt)).toBe('fehler');
		expect(appStarts(kaputt)).toHaveLength(0);
	});

	test('Live lädt keine Testdaten', () => {
		const lauf = ausliefern('live', baue());
		expect(index(lauf, 'testdaten')).toBe(-1);
	});

	test('Sperre gehalten: fehler ohne docker-Aufruf', () => {
		const basis = baue({ dateien: { 'test/sperre/pid': `${process.pid}\n` } });
		const lauf = ausliefern('test', basis);
		expect(lauf.status).toBe(1);
		expect(letzteZeile(lauf)).toBe('fehler');
		expect(lauf.aufrufe).toHaveLength(0);
		expect(gibt(basis, 'test/sperre/pid')).toBe(true);
	});

	test('ungültige Eingabe: fehler ohne docker-Aufruf', () => {
		const basis = baue();
		const lauf = fuehreAus(
			join(basis, 'fassungen', NEU, 'betrieb', 'bin', 'ausliefern'),
			['prod', NEU],
			{ basis }
		);
		expect(lauf.status).toBe(1);
		expect(lauf.stdout).toBe('fehler\n');
		expect(lauf.aufrufe).toHaveLength(0);
	});
});

describe('ausliefern: Caddy', () => {
	const alt = {
		'proxy/caddy/Caddyfile': 'ALT-CADDYFILE',
		'proxy/caddy/umgebungen/test.caddy': 'ALT-TEST',
		'proxy/compose.proxy.yml': 'ALT-COMPOSE'
	};

	test('ungültige Konfiguration: alles zurück, fehler, kein Start der App', () => {
		const basis = baue({ dateien: alt });
		const lauf = ausliefern('test', basis, { STUB_FEHLER_BEI: 'caddy validate' });
		expect(lauf.status).toBe(1);
		expect(letzteZeile(lauf)).toBe('fehler');
		expect(lies(basis, 'proxy/caddy/Caddyfile')).toBe('ALT-CADDYFILE');
		expect(lies(basis, 'proxy/caddy/umgebungen/test.caddy')).toBe('ALT-TEST');
		expect(lies(basis, 'proxy/compose.proxy.yml')).toBe('ALT-COMPOSE');
		expect(appStarts(lauf)).toHaveLength(0);
		expect(gibt(basis, 'test/sperre')).toBe(false);
	});

	test('läuft der Proxy, bleiben die Inodes der gemounteten Dateien und Ordner beim Zurücksetzen', () => {
		const basis = baue({ dateien: alt });
		const pfade = [
			'proxy/caddy',
			'proxy/caddy/umgebungen',
			'proxy/caddy/Caddyfile',
			'proxy/caddy/umgebungen/test.caddy'
		];
		const vorher = pfade.map((p) => inode(basis, p));
		const lauf = ausliefern('test', basis, {
			STUB_FEHLER_BEI: 'caddy validate',
			STUB_MUSTER_B: 'ps --status running -q caddy',
			STUB_AUSGABE_B: 'caddy-container'
		});
		expect(letzteZeile(lauf)).toBe('fehler');
		expect(index(lauf, 'exec -T caddy caddy validate')).toBeGreaterThanOrEqual(0);
		expect(pfade.map((p) => inode(basis, p))).toEqual(vorher);
		expect(lies(basis, 'proxy/caddy/Caddyfile')).toBe('ALT-CADDYFILE');
		expect(lies(basis, 'proxy/caddy/umgebungen/test.caddy')).toBe('ALT-TEST');
	});

	test('gelungene Übernahme überschreibt die gemounteten Dateien an Ort und Stelle', () => {
		const basis = baue({ dateien: alt });
		const pfade = ['proxy/caddy', 'proxy/caddy/umgebungen', 'proxy/caddy/Caddyfile'];
		const vorher = pfade.map((p) => inode(basis, p));
		const lauf = ausliefern('live', basis, {
			STUB_MUSTER_B: 'ps --status running -q caddy',
			STUB_AUSGABE_B: 'caddy-container'
		});
		expect(letzteZeile(lauf)).toBe('ok');
		expect(pfade.map((p) => inode(basis, p))).toEqual(vorher);
		expect(lies(basis, 'proxy/caddy/Caddyfile')).not.toBe('ALT-CADDYFILE');
	});

	test('ungültige Konfiguration setzt auch gemeinsame Teile und Einrichtung zurück', () => {
		const basis = baue(BESTEHENDES_LIVE);
		const vorher = BESTEHENDES_LIVE_PFADE.map((p) => lies(basis, p));
		const lauf = ausliefern('live', basis, { STUB_FEHLER_BEI: 'caddy validate' });
		expect(letzteZeile(lauf)).toBe('fehler');
		expect(BESTEHENDES_LIVE_PFADE.map((p) => lies(basis, p))).toEqual(vorher);
		expect(gibt(basis, 'gemeinsam/bin/wiederherstellen')).toBe(false);
		expect(gibt(basis, 'live/betrieb.neu')).toBe(false);
		expect(appStarts(lauf)).toHaveLength(0);
	});

	test('ungültige Konfiguration beim ersten Mal: neue Dateien werden wieder entfernt', () => {
		const basis = baue();
		const lauf = ausliefern('test', basis, { STUB_FEHLER_BEI: 'caddy validate' });
		expect(letzteZeile(lauf)).toBe('fehler');
		expect(gibt(basis, 'proxy/caddy/Caddyfile')).toBe(false);
		expect(gibt(basis, 'proxy/caddy/umgebungen/test.caddy')).toBe(false);
	});

	test('läuft der Proxy, wird im Container validiert und neu geladen', () => {
		const basis = baue();
		const lauf = ausliefern('test', basis, {
			STUB_MUSTER_B: 'ps --status running -q caddy',
			STUB_AUSGABE_B: 'caddy-container'
		});
		expect(letzteZeile(lauf)).toBe('ok');
		const validate = index(lauf, 'exec -T caddy caddy validate --config /etc/caddy/Caddyfile');
		const reload = index(lauf, 'exec -T caddy caddy reload --config /etc/caddy/Caddyfile');
		expect(validate).toBeGreaterThanOrEqual(0);
		expect(reload).toBeGreaterThan(validate);
		expect(index(lauf, 'run --rm --no-deps caddy')).toBe(-1);
		expect(lauf.aufrufe.some((a) => a.includes('mytco-proxy') && a.includes('up -d'))).toBe(false);
	});
});

describe('ausliefern: Zustand und Aufräumen', () => {
	test('gesund: aktuell wird vorher, der neue Digest aktuell', () => {
		const basis = baue({ dateien: { 'test/zustand/aktuell': `${ALT}\n` } });
		const lauf = ausliefern('test', basis);
		expect(letzteZeile(lauf)).toBe('ok');
		expect(lies(basis, 'test/zustand/aktuell')).toBe(NEU);
		expect(lies(basis, 'test/zustand/vorher')).toBe(ALT);
	});

	test('derselbe Digest erneut: vorher bleibt, wird nicht zum aktuellen', () => {
		const basis = baue({
			dateien: { 'test/zustand/aktuell': `${NEU}\n`, 'test/zustand/vorher': `${VOR}\n` }
		});
		ausliefern('test', basis);
		expect(lies(basis, 'test/zustand/aktuell')).toBe(NEU);
		expect(lies(basis, 'test/zustand/vorher')).toBe(VOR);
	});

	const liste = [NEU, ALT, VOR, LIVE, LIVE_VOR, MUELL1, MUELL2, '<none>'].join('\n');
	const aufbau = {
		dateien: {
			'test/zustand/aktuell': `${ALT}\n`,
			'test/zustand/vorher': `${VOR}\n`,
			'live/zustand/aktuell': `${LIVE}\n`,
			'live/zustand/vorher': `${LIVE_VOR}\n`
		}
	};

	test('löscht Images des Repos ausser aktuell/vorher beider Umgebungen (auch das herausgerotierte)', () => {
		const lauf = ausliefern('test', baue(aufbau), {
			STUB_MUSTER_C: 'image ls',
			STUB_AUSGABE_C: liste
		});
		expect(letzteZeile(lauf)).toBe('ok');
		const geloescht = lauf.aufrufe.filter((a) => a.startsWith('image rm'));
		expect(geloescht.sort()).toEqual(
			[MUELL1, MUELL2, VOR].map((d) => `image rm ${REPO}@${d}`).sort()
		);
		expect(lauf.aufrufe.some((a) => a.startsWith('image ls') && a.includes(REPO))).toBe(true);
	});

	test('ein Fehler beim Aufräumen macht aus ok kein fehler', () => {
		const lauf = ausliefern('test', baue(aufbau), {
			STUB_MUSTER_C: 'image ls',
			STUB_AUSGABE_C: liste,
			STUB_FEHLER_BEI: 'image rm'
		});
		expect(lauf.status).toBe(0);
		expect(letzteZeile(lauf)).toBe('ok');
	});
});

describe('zurueck', () => {
	test('ohne vorher: fehler, kein Start', () => {
		const basis = mkdtempSync(join(tmpdir(), 'mytco-basis-'));
		mkdirSync(join(basis, 'test/zustand'), { recursive: true });
		writeFileSync(join(basis, 'test/zustand/aktuell'), `${NEU}\n`);
		const lauf = zurueck('test', basis);
		expect(lauf.status).toBe(1);
		expect(letzteZeile(lauf)).toBe('fehler');
		expect(appStarts(lauf)).toHaveLength(0);
		expect(lies(basis, 'test/zustand/aktuell')).toBe(NEU);
		expect(gibt(basis, 'test/sperre')).toBe(false);
	});

	test('mit vorher: startet diesen Digest und tauscht die Zustände', () => {
		const basis = mkdtempSync(join(tmpdir(), 'mytco-basis-'));
		mkdirSync(join(basis, 'test/zustand'), { recursive: true });
		writeFileSync(join(basis, 'test/zustand/aktuell'), `${NEU}\n`);
		writeFileSync(join(basis, 'test/zustand/vorher'), `${ALT}\n`);
		const lauf = zurueck('test', basis);
		expect(lauf.status).toBe(0);
		expect(letzteZeile(lauf)).toBe('ok');
		const [start] = appStarts(lauf);
		expect(lauf.umwelt[start.i]).toEqual({ image: `${REPO}@${ALT}`, umgebung: 'test' });
		expect(lies(basis, 'test/zustand/aktuell')).toBe(ALT);
		expect(lies(basis, 'test/zustand/vorher')).toBe(NEU);
	});

	test('App startet nicht: fehler, Zustände unverändert', () => {
		const basis = mkdtempSync(join(tmpdir(), 'mytco-basis-'));
		mkdirSync(join(basis, 'test/zustand'), { recursive: true });
		writeFileSync(join(basis, 'test/zustand/aktuell'), `${NEU}\n`);
		writeFileSync(join(basis, 'test/zustand/vorher'), `${ALT}\n`);
		const lauf = zurueck('test', basis, { STUB_FEHLER_BEI: '--wait-timeout' });
		expect(lauf.status).toBe(1);
		expect(letzteZeile(lauf)).toBe('fehler');
		// zweiter Start mit dem bisherigen Image (aktuell)
		const starts = appStarts(lauf);
		expect(starts).toHaveLength(2);
		expect(lauf.umwelt[starts[0].i].image).toBe(`${REPO}@${ALT}`);
		expect(lauf.umwelt[starts[1].i].image).toBe(`${REPO}@${NEU}`);
		expect(lies(basis, 'test/zustand/aktuell')).toBe(NEU);
		expect(lies(basis, 'test/zustand/vorher')).toBe(ALT);
	});

	test('ungültige Umgebung: fehler ohne docker-Aufruf', () => {
		const lauf = zurueck('prod', mkdtempSync(join(tmpdir(), 'mytco-basis-')));
		expect(lauf.stdout).toBe('fehler\n');
		expect(lauf.aufrufe).toHaveLength(0);
	});
});
