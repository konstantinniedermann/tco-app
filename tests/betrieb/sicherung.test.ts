import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { fuehreAus, tempOrdner, type Ergebnis } from './hilfe.ts';

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
const AKTUELL = `sha256:${'a'.repeat(64)}`;

// MYTCO_BASIS mit sicherung.env und der Einrichtung der Umgebungen (für die Postgres-Fassung).
function baue(repository = 's3:https://beispiel.invalid/bucket'): string {
	const basis = tempOrdner('mytco-basis-');
	writeFileSync(
		join(basis, 'sicherung.env'),
		`RESTIC_REPOSITORY=${repository}\nRESTIC_PASSWORD=test\n`
	);
	for (const u of ['test', 'live']) {
		mkdirSync(join(basis, u, 'betrieb'), { recursive: true });
		copyFileSync('betrieb/compose.umgebung.yml', join(basis, u, 'betrieb', 'compose.umgebung.yml'));
		mkdirSync(join(basis, u, 'zustand'), { recursive: true });
		writeFileSync(join(basis, u, 'zustand', 'aktuell'), `${AKTUELL}\n`);
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
		// Wie das echte psql liest die Wiederherstellung ihre ganze Eingabe.
		stub: {
			STUB_MUSTER_P: 'psql',
			STUB_AUSGABE_P: ZAEHLUNG,
			STUB_STDIN_BEI: 'exec -T db psql -X',
			...stub
		}
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

	test('legt das Repo nie an', () => {
		expect(index(e, ' init')).toBe(-1);
	});

	// Compose verlangt MYTCO_IMAGE; der nächtliche Lauf aus systemd hat es nicht von selbst.
	test('setzt MYTCO_IMAGE aus zustand/aktuell für die Compose-Aufrufe', () => {
		const compose = e.aufrufe.map((a, i) => ({ a, i })).filter(({ a }) => a.startsWith('compose '));
		expect(compose.length).toBeGreaterThan(0);
		for (const { i } of compose) {
			expect(e.umwelt[i].image).toBe(`ghcr.io/konstantinniedermann/tco-app@${AKTUELL}`);
		}
	});
});

describe('sichern: Sonderfälle', () => {
	// Das Repo legt der Betrieb einmal von Hand an. Ein automatisches init würde bei einem
	// falschen Ziel im Wegwerf-Container landen und trotzdem ok melden.
	test('fehlendes Repo: fehler, kein init, kein backup', () => {
		const x = lauf('sichern', ['test'], { STUB_FEHLER_BEI: 'cat config' });
		expect(x.status).toBe(1);
		expect(letzteZeile(x)).toBe('fehler');
		expect(index(x, ' init')).toBe(-1);
		expect(index(x, ' backup ')).toBe(-1);
	});

	test.each([
		['doppelte Anführungszeichen', '"/srv/sicherung"'],
		['einfache Anführungszeichen', "'/srv/sicherung'"],
		['relativer Pfad', 'srv/sicherung'],
		['Punkt-Pfad', './sicherung'],
		['leer', ''],
		['unbekanntes Schema', 'ftp:beispiel.invalid/x'],
		['Leerzeichen', '/srv/sicher ung'],
		['Leerzeichen hinten', '/srv/sicherung ']
	])('ungültiges Ziel (%s): fehler, kein restic', (_name, ziel) => {
		const x = lauf('sichern', ['live'], {}, baue(ziel));
		expect(x.status).toBe(1);
		expect(letzteZeile(x)).toBe('fehler');
		expect(mit(x, 'restic/restic')).toHaveLength(0);
		expect(readFileSync(`${x.basis}/live/protokoll.log`, 'utf-8')).toContain('Sicherungsziel');
	});

	test.each([
		's3:https://beispiel.invalid/bucket',
		'sftp:beispiel.invalid:/srv/x',
		'rest:https://beispiel.invalid/',
		'b2:eimer:pfad',
		'azure:behaelter:/',
		'gs:eimer:/',
		'swift:behaelter:/pfad',
		'rclone:ziel:pfad',
		'/srv/sicherung'
	])('gültiges Ziel %s: ok', (ziel) => {
		const x = lauf('sichern', ['live'], {}, baue(ziel));
		expect(letzteZeile(x)).toBe('ok');
	});

	test('ohne zustand/aktuell trotzdem ok (MYTCO_IMAGE bleibt, wie es ist)', () => {
		const basis = baue();
		rmSync(join(basis, 'live', 'zustand', 'aktuell'));
		const x = lauf('sichern', ['live'], {}, basis);
		expect(letzteZeile(x)).toBe('ok');
	});

	test('Ziel nicht erreichbar: fehler', () => {
		const x = lauf('sichern', ['live'], { STUB_FEHLER_BEI: ' backup ' });
		expect(x.status).toBe(1);
		expect(x.stdout.trim().split('\n').pop()).toBe('fehler');
		expect(index(x, 'forget --tag live --keep-within')).toBe(-1);
	});

	test('Ziel nicht erreichbar: fehler, kein backup', () => {
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

	// Die Sicherung vor dem Zurückspielen räumt nicht auf: Ein knapp 30 Tage alter, gerade
	// gewählter Lauf darf zwischen Auswahl und Einspielen nicht verschwinden.
	test('ohne-aufraeumen: ok, Dump und Zählung abgelegt, kein forget', () => {
		const x = lauf('sichern', ['live', 'ohne-aufraeumen']);
		expect(x.status).toBe(0);
		expect(letzteZeile(x)).toBe('ok');
		expect(mit(x, ' backup ')).toHaveLength(2);
		expect(mit(x, 'forget')).toHaveLength(0);
		expect(x.stdout).not.toContain('schritt: aufraeumen');
	});

	test.each([
		['unbekanntes Argument', ['live', 'falsch']],
		['leeres Argument', ['live', '']],
		['ohne-aufraeumen mit Zusatz', ['live', 'ohne-aufraeumen', 'x']]
	])('%s: fehler, kein docker', (_name, args) => {
		const x = lauf('sichern', args);
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
		const restore = index(x, 'pg_restore -f -');
		const start = index(x, 'start app');
		expect(stop).toBeGreaterThan(-1);
		expect(restore).toBeGreaterThan(stop);
		expect(start).toBeGreaterThan(restore);
	});

	// Eine ältere Sicherung kennt spätere Tabellen nicht; pg_restore --clean liesse sie stehen,
	// und die nächste Migration scheiterte an CREATE TABLE. Darum: Schemas leeren, dann
	// einspielen, alles in einer Transaktion, die nur bei vollständigem Dump bestätigt wird.
	const SQL_DUMP = 'CREATE TABLE public.mitglied ();';
	const MIT_SQL = {
		...SNAP_TEST,
		STUB_MUSTER_R: 'pg_restore -f -',
		STUB_AUSGABE_R: SQL_DUMP
	};
	const eingabe = (x: Ergebnis) => readFileSync(`${x.basis}/stub-protokoll.stdin`, 'utf-8');

	test('leert public und drizzle und spielt in einer Transaktion ein', () => {
		const x = lauf('wiederherstellen', ['test', 'lauf-x'], MIT_SQL);
		expect(letzteZeile(x)).toBe('ok');
		expect(mit(x, 'pg_restore')).toEqual([expect.stringMatching(/exec -T db pg_restore -f -$/)]);
		// Die Zählungen der Sicherung vorher laufen ohne -X; eingespielt wird genau einmal.
		const psql = mit(x, 'psql -X');
		expect(psql).toHaveLength(1);
		// Fehler nur als SQLSTATE: DETAIL, CONTEXT und Hauptzeile tragen sonst Werte (DS-06).
		expect(psql[0]).toContain(
			'exec -T db psql -X -q -v ON_ERROR_STOP=1 -v VERBOSITY=sqlstate -U mytco -d mytco'
		);
		expect(eingabe(x)).toBe(
			[
				'BEGIN;',
				'DROP SCHEMA IF EXISTS public CASCADE;',
				'DROP SCHEMA IF EXISTS drizzle CASCADE;',
				'CREATE SCHEMA public;',
				SQL_DUMP,
				'COMMIT;',
				''
			].join('\n')
		);
		expect(index(x, 'psql')).toBeLessThan(index(x, 'start app'));
	});

	// Die Standardausgabe von psql (z. B. die setval-Ergebnisse aus dem Dump) trägt Werte aus
	// der Datenbank; sie wird verworfen. Die Fehlerausgabe (nur SQLSTATE) bleibt im Protokoll.
	test('Standardausgabe von psql landet nicht im Protokoll, die Fehlerausgabe schon', () => {
		const x = lauf('wiederherstellen', ['test', 'lauf-x'], {
			...MIT_SQL,
			// A vor P (Zählungen): der erste Treffer in alphabetischer Reihenfolge gewinnt
			STUB_MUSTER_A: 'exec -T db psql -X',
			STUB_AUSGABE_A: 'setval 4711'
		});
		expect(letzteZeile(x)).toBe('ok');
		const log = readFileSync(`${x.basis}/test/protokoll.log`, 'utf-8');
		expect(log).not.toContain('setval 4711');
		expect(log).toContain('STUB-GEHEIM-LOG');
		expect(x.stdout).not.toContain('setval 4711');
	});

	test('Dump aus restic scheitert: kein COMMIT, fehler, App läuft wieder', () => {
		const x = lauf('wiederherstellen', ['test', 'lauf-x'], {
			...MIT_SQL,
			STUB_FEHLER_BEI: 'dump --tag test,lauf-x'
		});
		expect(x.status).toBe(1);
		expect(letzteZeile(x)).toBe('fehler');
		expect(eingabe(x)).not.toContain('COMMIT');
		expect(index(x, 'start app')).toBeGreaterThan(index(x, 'psql'));
	});

	test('pg_restore scheitert: kein COMMIT, fehler', () => {
		const x = lauf('wiederherstellen', ['test', 'lauf-x'], {
			...MIT_SQL,
			STUB_FEHLER_BEI: 'pg_restore'
		});
		expect(letzteZeile(x)).toBe('fehler');
		expect(eingabe(x)).not.toContain('COMMIT');
	});

	test('psql scheitert: fehler, App läuft wieder', () => {
		const x = lauf('wiederherstellen', ['test', 'lauf-x'], {
			...SNAP_TEST,
			STUB_FEHLER_BEI: 'exec -T db psql -X'
		});
		expect(letzteZeile(x)).toBe('fehler');
		expect(index(x, 'start app')).toBeGreaterThan(index(x, 'exec -T db psql -X'));
	});

	test('ungültiges Sicherungsziel: fehler, App bleibt unberührt', () => {
		const x = lauf('wiederherstellen', ['test', 'lauf-x'], SNAP_TEST, baue('"/srv/x"'));
		expect(letzteZeile(x)).toBe('fehler');
		expect(mit(x, 'restic/restic')).toHaveLength(0);
		expect(index(x, 'stop app')).toBe(-1);
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

	// Compose löst MYTCO_IMAGE (Pflichtwert) bei jedem Befehl auf, der den Dienst app betrifft.
	test('stop und start der App laufen mit dem Image aus zustand/aktuell', () => {
		const x = lauf('wiederherstellen', ['test', 'lauf-x'], SNAP_TEST);
		expect(letzteZeile(x)).toBe('ok');
		for (const teil of ['stop app', 'start app']) {
			expect(x.umwelt[index(x, teil)].image).toBe(
				`ghcr.io/konstantinniedermann/tco-app@${AKTUELL}`
			);
		}
	});

	test('ohne zustand/aktuell: fehler, App bleibt unberührt', () => {
		const basis = baue();
		rmSync(join(basis, 'test', 'zustand', 'aktuell'));
		const x = lauf('wiederherstellen', ['test', 'lauf-x'], SNAP_TEST, basis);
		expect(x.status).toBe(1);
		expect(letzteZeile(x)).toBe('fehler');
		expect(index(x, 'stop app')).toBe(-1);
		expect(index(x, 'pg_restore')).toBe(-1);
	});

	test('ungültiger Lauf-Name: fehler, kein docker', () => {
		const x = lauf('wiederherstellen', ['test', 'lauf-x; rm -rf /'], SNAP_TEST);
		expect(letzteZeile(x)).toBe('fehler');
		expect(x.aufrufe).toEqual([]);
	});
});

describe('wiederherstellen: Sicherung vorher, Notschalter ohne-sicherung', () => {
	const L = 'lauf-20260101T020000Z';
	const SNAP_L = { STUB_MUSTER_S: 'snapshots', STUB_AUSGABE_S: SNAP('live', L) };
	const NOTSCHALTER = 'wiederherstellen: ohne Sicherung vorher (Notschalter)';
	const protokoll = (x: Ergebnis) => readFileSync(`${x.basis}/live/protokoll.log`, 'utf-8');
	const schritte = (x: Ergebnis) =>
		x.stdout
			.split('\n')
			.filter((z) => z.startsWith('schritt: '))
			.map((z) => z.slice('schritt: '.length));

	test.each([
		[['live'], true],
		[['live', L], true],
		[['live', 'ohne-sicherung'], false],
		[['live', L, 'ohne-sicherung'], false],
		[['live', 'ohne-sicherung', L], false]
	])('%j: ok, Sicherung vorher: %s', (args, gesichert) => {
		const x = lauf('wiederherstellen', args, SNAP_L);
		expect(x.status).toBe(0);
		expect(letzteZeile(x)).toBe('ok');
		expect(mit(x, `dump --tag live,${L}`).length).toBeGreaterThan(0);
		expect(mit(x, ' backup ')).toHaveLength(gesichert ? 2 : 0);
		expect(protokoll(x).includes(NOTSCHALTER)).toBe(!gesichert);
	});

	test.each([
		['unbekanntes Argument', ['live', 'etwas']],
		['drei Zusatzargumente', ['live', 'lauf-x', 'ohne-sicherung', 'zuviel']],
		['zwei Läufe', ['live', L, 'lauf-y']],
		['Notschalter doppelt', ['live', 'ohne-sicherung', 'ohne-sicherung']],
		['leeres Argument', ['live', '']],
		['Notschalter mit Zusatz', ['live', 'ohne-sicherung=ja']]
	])('%s: fehler, bevor etwas passiert', (_name, args) => {
		const x = lauf('wiederherstellen', args, SNAP_L);
		expect(x.status).toBe(1);
		expect(x.stdout.trim()).toBe('fehler');
		expect(x.aufrufe).toEqual([]);
	});

	test('Schritte: snapshot suchen, sichern, app stoppen, einspielen, app starten', () => {
		const x = lauf('wiederherstellen', ['live'], SNAP_L);
		expect(schritte(x)).toEqual([
			'snapshot suchen',
			'sichern',
			'app stoppen',
			'einspielen',
			'app starten'
		]);
	});

	test('Schritte mit Notschalter: ohne sichern', () => {
		const x = lauf('wiederherstellen', ['live', 'ohne-sicherung'], SNAP_L);
		expect(schritte(x)).toEqual(['snapshot suchen', 'app stoppen', 'einspielen', 'app starten']);
		expect(mit(x, ' backup ')).toHaveLength(0);
	});

	// Ohne Lauf-Angabe würde sonst der eben gesicherte Stand eingespielt.
	test('Lauf wird vor der Sicherung bestimmt, gesichert wird vor dem Anhalten der App', () => {
		const x = lauf('wiederherstellen', ['live'], SNAP_L);
		const suche = index(x, 'snapshots --tag live');
		const sicherung = index(x, ' backup ');
		expect(suche).toBeGreaterThan(-1);
		expect(sicherung).toBeGreaterThan(suche);
		expect(index(x, 'stop app')).toBeGreaterThan(index(x, '--stdin-filename zaehlung.txt'));
	});

	test('die Sicherung vorher räumt nicht auf (kein forget)', () => {
		const x = lauf('wiederherstellen', ['live'], SNAP_L);
		expect(mit(x, 'forget')).toHaveLength(0);
	});

	test('Sicherung scheitert: fehler, App und Datenbank unberührt', () => {
		const x = lauf('wiederherstellen', ['live'], { ...SNAP_L, STUB_FEHLER_BEI: ' backup ' });
		expect(x.status).toBe(1);
		expect(letzteZeile(x)).toBe('fehler');
		expect(x.stdout.match(/^(ok|fehler)$/gm)).toEqual(['fehler']);
		expect(index(x, 'stop app')).toBe(-1);
		expect(index(x, 'pg_restore')).toBe(-1);
		expect(protokoll(x)).toContain('wiederherstellen: Sicherung vor dem Einspielen gescheitert');
		expect(existsSync(`${x.basis}/live/sperre`)).toBe(false);
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

	// Von der Ausgabe von pg_restore kommt nur die Zahl der Fehlerzeilen ins Protokoll (DS-06).
	test('Ausgabe von pg_restore: nur die Fehlerzahl im Protokoll, keine Werte', () => {
		const x = lauf('probe', ['live', 'lauf-p'], {
			...SNAP_LIVE,
			...ZAEHL_DATEI,
			STUB_MUSTER_R: 'pg_restore',
			STUB_AUSGABE_R: [
				'pg_restore: error: COPY failed for table "mitglied": ERROR:  duplicate key value',
				'DETAIL:  Key (email)=(x@example.org) already exists.'
			].join('\n')
		});
		const log = readFileSync(`${x.basis}/live/protokoll.log`, 'utf-8');
		expect(log).not.toContain('x@example.org');
		expect(log).toContain('probe: 1 Fehlerzeilen von pg_restore (Inhalt verworfen)');
	});

	test('ungültiges Sicherungsziel: fehler, kein restic, nichts gestartet', () => {
		const x = lauf('probe', ['live', 'lauf-p'], { ...SNAP_LIVE, ...ZAEHL_DATEI }, baue('srv/x'));
		expect(letzteZeile(x)).toBe('fehler');
		expect(mit(x, 'restic/restic')).toHaveLength(0);
		expect(index(x, 'run -d')).toBe(-1);
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
