import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { fuehreAus, type Ergebnis } from './hilfe.ts';

const ZAEHLUNG = 'public.mitglied|3\npublic.rolle|2';
// Wie restic: je Lauf ein Dump- und ein Zählungs-Snapshot, "time" zuerst.
const eintrag = (umgebung: string, lauf: string, pfad: string, id: string) => ({
	time: '2026-01-01T02:30:00Z',
	paths: [pfad],
	hostname: 'mytco',
	tags: [umgebung, lauf],
	short_id: id
});
const SNAP = (umgebung: string, ...laeufe: string[]) =>
	JSON.stringify(
		laeufe.flatMap((l, i) => [
			eintrag(umgebung, l, `/mytco-${umgebung}.dump`, `d${i}`),
			eintrag(umgebung, l, '/zaehlung.txt', `z${i}`)
		])
	);
// Nur der Dump, die Zählung fehlt: der Lauf ist nicht abgeschlossen.
const SNAP_OHNE_ZAEHLUNG = (umgebung: string, lauf: string) =>
	JSON.stringify([eintrag(umgebung, lauf, `/mytco-${umgebung}.dump`, 'd0')]);
const SNAP_LEER = '[]';

// MYTCO_BASIS mit sicherung.env und der Einrichtung der Umgebungen (für die Postgres-Fassung).
function baue(repository = 's3:https://beispiel.invalid/bucket'): string {
	const basis = mkdtempSync(join(tmpdir(), 'mytco-basis-'));
	writeFileSync(
		join(basis, 'sicherung.env'),
		`RESTIC_REPOSITORY=${repository}\nRESTIC_PASSWORD=test\n`
	);
	for (const u of ['test', 'live']) {
		mkdirSync(join(basis, u, 'betrieb'), { recursive: true });
		copyFileSync('betrieb/compose.umgebung.yml', join(basis, u, 'betrieb', 'compose.umgebung.yml'));
	}
	return basis;
}

function lauf(
	skript: string,
	args: string[],
	stub: Record<string, string> = {},
	basis = baue()
): Ergebnis {
	const erg = fuehreAus(`betrieb/bin/${skript}`, args, {
		basis,
		stub: { STUB_MUSTER_P: 'psql', STUB_AUSGABE_P: ZAEHLUNG, ...stub }
	});
	// Nur Schritt-, ok- und fehler-Zeilen, nie Ausgabe von docker.
	for (const zeile of erg.stdout.split('\n').filter(Boolean)) {
		expect(zeile).toMatch(/^(schritt: [a-z -]+|ok|fehler)$/);
	}
	expect(erg.stdout).not.toContain('STUB-GEHEIM-LOG');
	expect(erg.stderr).not.toContain('STUB-GEHEIM-LOG');
	return erg;
}

const letzteZeile = (e: Ergebnis) => e.stdout.trim().split('\n').pop();
const index = (e: Ergebnis, teil: string) => e.aufrufe.findIndex((a) => a.includes(teil));
const mit = (e: Ergebnis, teil: string) => e.aufrufe.filter((a) => a.includes(teil));

describe('sichern', () => {
	const e = lauf('sichern', ['live']);

	test('meldet ok', () => {
		expect(e.status).toBe(0);
		expect(letzteZeile(e)).toBe('ok');
	});

	test('legt Dump und Zählung mit den Tags live und lauf-… ab', () => {
		const ablagen = mit(e, ' backup ');
		expect(ablagen).toHaveLength(2);
		const dump = ablagen.find((a) => a.includes('--stdin-filename mytco-live.dump'));
		const zaehl = ablagen.find((a) => a.includes('--stdin-filename zaehlung.txt'));
		expect(dump).toBeDefined();
		expect(zaehl).toBeDefined();
		for (const a of [dump!, zaehl!]) {
			expect(a).toContain('--stdin');
			expect(a).toContain('--tag live');
			expect(a).toMatch(/--tag lauf-\d{8}T\d{6}Z/);
		}
		const lauf = (a: string) => /--tag (lauf-\S+)/.exec(a)![1];
		expect(lauf(dump!)).toBe(lauf(zaehl!));
	});

	test('dumpt mit pg_dump -Fc aus der Datenbank der Umgebung', () => {
		expect(
			e.aufrufe.some((a) => a.includes('-p mytco-live') && a.includes('pg_dump -U mytco -Fc mytco'))
		).toBe(true);
	});

	test('räumt nach 30 Tagen auf, nach der Ablage', () => {
		const forget = index(e, 'forget --tag live --keep-within 30d --prune');
		expect(forget).toBeGreaterThan(-1);
		expect(forget).toBeGreaterThan(index(e, 'zaehlung.txt'));
	});

	test('zählt vor und nach dem Dump', () => {
		const aufrufe = e.aufrufe;
		const dump = aufrufe.findIndex((a) => a.includes('mytco-live.dump'));
		const zaehlen = aufrufe.map((a, i) => ({ a, i })).filter(({ a }) => a.includes('psql'));
		expect(zaehlen).toHaveLength(2);
		expect(zaehlen[0].i).toBeLessThan(dump);
		expect(zaehlen[1].i).toBeGreaterThan(dump);
	});

	test('restic läuft per gepinntem Image mit sicherung.env', () => {
		const restic = e.aufrufe.filter((a) => a.includes('restic/restic'));
		expect(restic.length).toBeGreaterThan(0);
		for (const a of restic) {
			expect(a).toMatch(/restic\/restic:[\d.]+@sha256:[0-9a-f]{64}/);
			expect(a).toContain('--env-file');
			expect(a).toContain('sicherung.env');
			expect(a).not.toContain(' -v ');
			// fester Host (sonst löscht forget nie), kein Docker-Log der Ausgabe, Schloss abwarten
			expect(a).toContain('--hostname mytco');
			expect(a).toContain('--log-driver none');
			expect(a).toContain('--retry-lock 2m');
		}
	});

	test('legt das Repo nicht an, wenn es schon da ist', () => {
		expect(index(e, ' init')).toBe(-1);
	});
});

describe('sichern: Sonderfälle', () => {
	test('fehlendes Repo wird vor dem ersten backup angelegt', () => {
		const x = lauf('sichern', ['test'], { STUB_FEHLER_BEI: 'cat config' });
		expect(letzteZeile(x)).toBe('ok');
		const init = index(x, ' init');
		expect(init).toBeGreaterThan(-1);
		expect(init).toBeLessThan(index(x, ' backup '));
	});

	test('Ziel nicht erreichbar: fehler', () => {
		const x = lauf('sichern', ['live'], { STUB_FEHLER_BEI: ' backup ' });
		expect(x.status).toBe(1);
		expect(x.stdout.trim().split('\n').pop()).toBe('fehler');
		expect(index(x, 'forget --tag live --keep-within')).toBe(-1);
	});

	test('Ziel und Anlegen scheitern: fehler, kein backup', () => {
		const x = lauf('sichern', ['live'], { STUB_FEHLER_BEI: 'restic/restic' });
		expect(letzteZeile(x)).toBe('fehler');
		expect(index(x, ' backup ')).toBe(-1);
	});

	test('Dump scheitert: fehler, keine Zählung abgelegt, Snapshots des Laufs verworfen', () => {
		const x = lauf('sichern', ['live'], {
			STUB_FEHLER_BEI: 'pg_dump',
			STUB_MUSTER_S: 'snapshots',
			STUB_AUSGABE_S: SNAP_OHNE_ZAEHLUNG('live', 'lauf-x')
		});
		expect(letzteZeile(x)).toBe('fehler');
		expect(index(x, 'zaehlung.txt')).toBe(-1);
		expect(mit(x, 'snapshots --tag live,lauf-').length).toBeGreaterThan(0);
		expect(mit(x, ' forget d0')).toHaveLength(1);
	});

	test('Zählung ändert sich einmal: zweiter Versuch, erster Dump verworfen, dann ok', () => {
		const x = lauf('sichern', ['live'], {
			STUB_MUSTER_P: 'psql',
			STUB_FOLGE_P: 'a|1@@a|2@@a|2@@a|2',
			STUB_MUSTER_S: 'snapshots',
			STUB_AUSGABE_S: SNAP_OHNE_ZAEHLUNG('live', 'lauf-x')
		});
		expect(letzteZeile(x)).toBe('ok');
		expect(mit(x, '--stdin-filename mytco-live.dump')).toHaveLength(2);
		expect(mit(x, ' forget d0')).toHaveLength(1);
		expect(mit(x, '--stdin-filename zaehlung.txt')).toHaveLength(1);
	});

	test('Zählung ändert sich immer: nach 3 Versuchen fehler, keine Zählung abgelegt', () => {
		const x = lauf('sichern', ['live'], {
			STUB_MUSTER_P: 'psql',
			STUB_FOLGE_P: 'a|1@@a|2@@a|3@@a|4@@a|5@@a|6',
			STUB_MUSTER_S: 'snapshots',
			STUB_AUSGABE_S: SNAP_OHNE_ZAEHLUNG('live', 'lauf-x')
		});
		expect(letzteZeile(x)).toBe('fehler');
		expect(mit(x, '--stdin-filename mytco-live.dump')).toHaveLength(3);
		expect(index(x, 'zaehlung.txt')).toBe(-1);
		expect(mit(x, ' forget d0')).toHaveLength(3);
	});

	test('lokales Ziel wird am selben Pfad gemountet', () => {
		const x = lauf('sichern', ['live'], {}, baue('/srv/sicherung'));
		expect(letzteZeile(x)).toBe('ok');
		for (const a of mit(x, 'restic/restic'))
			expect(a).toContain('-v /srv/sicherung:/srv/sicherung');
	});

	test('ungültige Umgebung: fehler, kein docker', () => {
		const x = lauf('sichern', ['prod']);
		expect(x.status).toBe(1);
		expect(x.stdout.trim()).toBe('fehler');
		expect(x.aufrufe).toEqual([]);
	});

	test('nimmt keine Umgebungssperre (ausliefern hält sie)', () => {
		const basis = baue();
		mkdirSync(join(basis, 'live', 'sperre'), { recursive: true });
		writeFileSync(join(basis, 'live', 'sperre', 'pid'), `${process.pid}\n`);
		const x = lauf('sichern', ['live'], {}, basis);
		expect(letzteZeile(x)).toBe('ok');
	});
});

describe('wiederherstellen', () => {
	const SNAP_TEST = { STUB_MUSTER_S: 'snapshots', STUB_AUSGABE_S: SNAP('test', 'lauf-x') };

	test('filtert mit --tag test,lauf-x, hält die App an und startet sie wieder', () => {
		const x = lauf('wiederherstellen', ['test', 'lauf-x'], SNAP_TEST);
		expect(letzteZeile(x)).toBe('ok');
		expect(mit(x, 'dump --tag test,lauf-x').length).toBeGreaterThan(0);
		const stop = index(x, 'stop app');
		const restore = index(x, 'pg_restore --clean --if-exists');
		const start = index(x, 'start app');
		expect(stop).toBeGreaterThan(-1);
		expect(restore).toBeGreaterThan(stop);
		expect(start).toBeGreaterThan(restore);
	});

	test('spielt in einer Transaktion ein und bricht beim ersten Fehler ab', () => {
		const x = lauf('wiederherstellen', ['test', 'lauf-x'], SNAP_TEST);
		expect(mit(x, 'pg_restore')[0]).toContain(
			'pg_restore --clean --if-exists --single-transaction --exit-on-error'
		);
	});

	test('unvollständiger Lauf (ohne Zählung) wird nicht eingespielt', () => {
		const x = lauf('wiederherstellen', ['test', 'lauf-x'], {
			STUB_MUSTER_S: 'snapshots',
			STUB_AUSGABE_S: SNAP_OHNE_ZAEHLUNG('test', 'lauf-x')
		});
		expect(letzteZeile(x)).toBe('fehler');
		expect(index(x, 'pg_restore')).toBe(-1);
	});

	test('beide Tags müssen im selben Snapshot stehen', () => {
		const gemischt = JSON.stringify([
			eintrag('live', 'lauf-x', '/zaehlung.txt', 'a'),
			eintrag('test', 'lauf-y', '/zaehlung.txt', 'b')
		]);
		const x = lauf('wiederherstellen', ['test', 'lauf-x'], {
			STUB_MUSTER_S: 'snapshots',
			STUB_AUSGABE_S: gemischt
		});
		expect(letzteZeile(x)).toBe('fehler');
		expect(index(x, 'pg_restore')).toBe(-1);
	});

	test('ohne Lauf wird ein unvollständiger, neuerer Lauf übergangen', () => {
		const x = lauf('wiederherstellen', ['live'], {
			STUB_MUSTER_S: 'snapshots',
			STUB_AUSGABE_S: JSON.stringify([
				eintrag('live', 'lauf-20260101T020000Z', '/zaehlung.txt', 'z0'),
				eintrag('live', 'lauf-20260301T020000Z', '/mytco-live.dump', 'd1')
			])
		});
		expect(letzteZeile(x)).toBe('ok');
		expect(mit(x, 'dump --tag live,lauf-20260101T020000Z').length).toBeGreaterThan(0);
	});

	test('Snapshot trägt nur live: fehler, kein pg_restore, App bleibt unberührt', () => {
		const x = lauf('wiederherstellen', ['test', 'lauf-x'], {
			STUB_MUSTER_S: 'snapshots',
			STUB_AUSGABE_S: SNAP('live', 'lauf-x')
		});
		expect(x.status).toBe(1);
		expect(letzteZeile(x)).toBe('fehler');
		expect(index(x, 'pg_restore')).toBe(-1);
		expect(index(x, 'stop app')).toBe(-1);
	});

	test('restic liefert keinen Snapshot: fehler', () => {
		const x = lauf('wiederherstellen', ['test', 'lauf-x'], {
			STUB_MUSTER_S: 'snapshots',
			STUB_AUSGABE_S: SNAP_LEER
		});
		expect(letzteZeile(x)).toBe('fehler');
		expect(index(x, 'pg_restore')).toBe(-1);
	});

	test('ohne Lauf der neueste dieser Umgebung', () => {
		const x = lauf('wiederherstellen', ['live'], {
			STUB_MUSTER_S: 'snapshots',
			STUB_AUSGABE_S: SNAP(
				'live',
				'lauf-20260101T020000Z',
				'lauf-20260301T020000Z',
				'lauf-20260201T020000Z'
			)
		});
		expect(letzteZeile(x)).toBe('ok');
		expect(mit(x, 'snapshots')[0]).toContain('--tag live ');
		expect(mit(x, 'dump --tag live,lauf-20260301T020000Z').length).toBeGreaterThan(0);
	});

	test('Einspielen scheitert: fehler, App wird trotzdem gestartet', () => {
		const x = lauf('wiederherstellen', ['test', 'lauf-x'], {
			...SNAP_TEST,
			STUB_FEHLER_BEI: 'pg_restore'
		});
		expect(x.status).toBe(1);
		expect(letzteZeile(x)).toBe('fehler');
		expect(index(x, 'start app')).toBeGreaterThan(index(x, 'pg_restore'));
	});

	test('ungültiger Lauf-Name: fehler, kein docker', () => {
		const x = lauf('wiederherstellen', ['test', 'lauf-x; rm -rf /'], SNAP_TEST);
		expect(letzteZeile(x)).toBe('fehler');
		expect(x.aufrufe).toEqual([]);
	});
});

describe('probe', () => {
	const SNAP_LIVE = { STUB_MUSTER_S: 'snapshots', STUB_AUSGABE_S: SNAP('live', 'lauf-p') };
	const ZAEHL_DATEI = { STUB_MUSTER_Z: 'zaehlung.txt', STUB_AUSGABE_Z: ZAEHLUNG };

	test('gleiche Zählung: ok, Wegwerf-Netz ist --internal, alles wird entfernt', () => {
		const x = lauf('probe', ['live', 'lauf-p'], { ...SNAP_LIVE, ...ZAEHL_DATEI });
		expect(x.status).toBe(0);
		expect(letzteZeile(x)).toBe('ok');
		expect(mit(x, 'network create --internal')).toHaveLength(1);
		expect(mit(x, 'rm -f mytco-probe-live-')).toHaveLength(1);
		expect(mit(x, 'network rm mytco-probe-live-')).toHaveLength(1);
		// Wegwerf-Postgres: dieselbe Fassung (Digest) wie in compose.umgebung.yml
		const run = mit(x, 'run -d --name mytco-probe-live-')[0];
		expect(run).toMatch(/postgres:[\w.-]+@sha256:[0-9a-f]{64}/);
		expect(run).toContain('--network mytco-probe-live-');
	});

	test('spielt in die Wegwerf-Datenbank ein, nicht in die Umgebung', () => {
		const x = lauf('probe', ['live', 'lauf-p'], { ...SNAP_LIVE, ...ZAEHL_DATEI });
		expect(mit(x, 'pg_restore').every((a) => a.startsWith('exec -i mytco-probe-live-'))).toBe(true);
		expect(mit(x, '-p mytco-live')).toHaveLength(0);
	});

	test('abweichende Zählung: fehler, Container und Netz werden trotzdem entfernt', () => {
		const x = lauf('probe', ['live', 'lauf-p'], {
			...SNAP_LIVE,
			STUB_MUSTER_Z: 'zaehlung.txt',
			STUB_AUSGABE_Z: 'public.mitglied|4\npublic.rolle|2'
		});
		expect(x.status).toBe(1);
		expect(letzteZeile(x)).toBe('fehler');
		expect(mit(x, 'rm -f mytco-probe-live-')).toHaveLength(1);
		expect(mit(x, 'network rm mytco-probe-live-')).toHaveLength(1);
	});

	test('Einspielen scheitert: fehler, Aufräumen läuft trotzdem', () => {
		const x = lauf('probe', ['live', 'lauf-p'], {
			...SNAP_LIVE,
			...ZAEHL_DATEI,
			STUB_FEHLER_BEI: 'pg_restore'
		});
		expect(letzteZeile(x)).toBe('fehler');
		expect(mit(x, 'rm -f mytco-probe-live-')).toHaveLength(1);
		expect(mit(x, 'network rm mytco-probe-live-')).toHaveLength(1);
	});

	test('Snapshot einer anderen Umgebung: fehler, nichts gestartet', () => {
		const x = lauf('probe', ['test', 'lauf-p'], {
			...ZAEHL_DATEI,
			STUB_MUSTER_S: 'snapshots',
			STUB_AUSGABE_S: SNAP('live', 'lauf-p')
		});
		expect(letzteZeile(x)).toBe('fehler');
		expect(index(x, 'run -d')).toBe(-1);
	});
});

describe('systemd', () => {
	test('Service und Timer wie vorgesehen', async () => {
		const { readFileSync } = await import('node:fs');
		const dienst = readFileSync('betrieb/systemd/mytco-sicherung.service', 'utf-8');
		const timer = readFileSync('betrieb/systemd/mytco-sicherung.timer', 'utf-8');
		expect(dienst).toContain('Type=oneshot');
		expect(dienst).toContain('User=mytco');
		expect(dienst).toContain('ExecStart=/opt/mytco/gemeinsam/bin/sichern live');
		expect(dienst).toContain('ExecStartPost=/opt/mytco/gemeinsam/bin/probe live');
		expect(timer).toContain('OnCalendar=*-*-* 02:30:00');
		expect(timer).toContain('Persistent=true');
	});
});
