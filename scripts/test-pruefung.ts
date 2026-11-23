// `make test-pruefung`: Prüflauf gegen den echten Test-Server vor dem Release (Checkliste vor dem
// Release, docs/testkonzept.md). Läuft nur auf dem Mac des Projektleiters, nie in der CI.
// 1. per SSH den Wert des Zugangscookies holen (nur im Speicher, nie ausgeben),
// 2. per SSH den Server-Teil im App-Container (scripts/test-pruefung-server.ts),
// 3. Playwright mit playwright.test-server.config.ts gegen Test,
// 4. Tabelle «ok / rot» je Punkt; Exit 1, wenn etwas rot ist.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { istNurDoku } from './pruefungen/nur-doku.ts';

export type Zeile = { punkt: string; ok: boolean; text: string };
export type Einstellungen = { url: string; ssh: string; schluessel: string };

export const BERICHT = 'test-results/test-server/bericht.json';
const CONTAINER = 'mytco-test-app-1';
const PROXY_ENV = '/opt/mytco/proxy/proxy.env';

export function leseEinstellungen(
	env: Record<string, string | undefined>,
	heim = homedir()
): Einstellungen | { fehlt: string[] } {
	const url = env.MYTCO_TEST_URL?.trim().replace(/\/+$/, '') ?? '';
	const ssh = env.MYTCO_TEST_SSH?.trim() ?? '';
	const fehlt = [
		...(url.startsWith('https://') ? [] : ['MYTCO_TEST_URL']),
		...(ssh === '' ? ['MYTCO_TEST_SSH'] : [])
	];
	if (fehlt.length > 0) return { fehlt };
	const schluessel = env.MYTCO_TEST_SSH_SCHLUESSEL?.trim() || join(heim, '.ssh', 'mytco-server');
	return { url, ssh, schluessel };
}

/** Wert von MYTCO_TEST_PASSWORT_HASH aus proxy.env, ohne Anführungszeichen; null ohne Wert. */
export function leseZugang(proxyEnv: string): string | null {
	const zeile = proxyEnv.split('\n').find((z) => z.startsWith('MYTCO_TEST_PASSWORT_HASH='));
	const wert = zeile
		?.slice('MYTCO_TEST_PASSWORT_HASH='.length)
		.trim()
		.replace(/^(["'])(.*)\1$/, '$2');
	return wert ? wert : null;
}

export function leseServerZeilen(ausgabe: string): Zeile[] {
	const zeilen: Zeile[] = [];
	for (const z of ausgabe.split('\n')) {
		const treffer = /^pruefung: (\S+) (ok|rot) (.*)$/.exec(z.trim());
		if (treffer) zeilen.push({ punkt: treffer[1], ok: treffer[2] === 'ok', text: treffer[3] });
		else if (/^pruefung: (verweigert|abgebrochen)/.test(z.trim())) {
			return [{ punkt: 'server', ok: false, text: z.trim().slice('pruefung: '.length) }];
		}
	}
	return zeilen.length > 0
		? zeilen
		: [{ punkt: 'server', ok: false, text: 'keine Antwort des Server-Teils' }];
}

/** Ob Test den Code-Stand von dev zeigt: Vorfahre von dev, dazwischen nur Doku. */
export function istCodeStandVon(
	commit: string,
	devHash: string,
	git: (args: string[]) => string = (args) => execFileSync('git', args, { encoding: 'utf-8' })
): boolean {
	if (!/^[0-9a-f]{7,40}$/.test(commit)) return false;
	try {
		git(['merge-base', '--is-ancestor', commit, devHash]);
	} catch {
		return false;
	}
	const pfade = git(['diff', '--name-only', '--no-renames', commit, devHash])
		.split('\n')
		.filter((p) => p !== '');
	return istNurDoku(pfade);
}

type Suite = { specs?: { title: string; ok: boolean }[]; suites?: Suite[] };

export function ausPlaywright(bericht: Suite): Zeile[] {
	const zeilen: Zeile[] = [];
	const lies = (s: Suite) => {
		for (const spec of s.specs ?? []) zeilen.push({ punkt: spec.title, ok: spec.ok, text: '' });
		for (const unter of s.suites ?? []) lies(unter);
	};
	lies(bericht);
	return zeilen.length > 0 ? zeilen : [{ punkt: 'browser', ok: false, text: 'kein Test gelaufen' }];
}

/**
 * Zeilen des Browser-Teils: nur aus dem Bericht dieses Laufs. Ohne Bericht oder mit Exit ungleich 0
 * (Konfiguration nicht geladen, Absturz) ist der Browser-Teil rot, auch wenn die Tests grün sind.
 */
export function browserZeilen(bericht: Suite | null, status: number | null): Zeile[] {
	if (bericht === null)
		return [{ punkt: 'browser', ok: false, text: 'kein Bericht von Playwright' }];
	const zeilen = ausPlaywright(bericht);
	if (status !== 0 && zeilen.every((z) => z.ok)) {
		zeilen.push({ punkt: 'browser', ok: false, text: 'Playwright mit Fehler beendet' });
	}
	return zeilen;
}

export function tabelle(zeilen: Zeile[]): string {
	return zeilen
		.map((z) => `${z.ok ? 'ok ' : 'rot'}  ${z.punkt}${z.text ? ` — ${z.text}` : ''}`)
		.join('\n');
}

function abbruch(text: string): never {
	console.error(`test-pruefung: ${text}`);
	process.exit(1);
}

function starte(env: Record<string, string | undefined>): void {
	const e = leseEinstellungen(env);
	if ('fehlt' in e) abbruch(`Einstellung fehlt in .env: ${e.fehlt.join(', ')}`);
	if (!existsSync(e.schluessel))
		abbruch('SSH-Schlüssel nicht gefunden (MYTCO_TEST_SSH_SCHLUESSEL)');

	const ssh = (befehl: string) =>
		execFileSync(
			'ssh',
			['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', '-i', e.schluessel, e.ssh, befehl],
			{ encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
		);

	try {
		ssh('true');
	} catch {
		abbruch('SSH zu Test nicht möglich (ssh-add --apple-load-keychain?)');
	}

	try {
		execFileSync('git', ['fetch', '-q', 'origin', 'dev'], { stdio: 'ignore' });
	} catch {
		abbruch('git fetch origin dev gescheitert');
	}
	const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf-8' }).trim();
	const devHash = git(['rev-parse', 'origin/dev']);
	const version = (JSON.parse(git(['show', 'origin/dev:package.json'])) as { version: string })
		.version;

	let zugang: string | null = null;
	try {
		zugang = leseZugang(ssh(`sudo grep '^MYTCO_TEST_PASSWORT_HASH=' ${PROXY_ENV}`));
	} catch {
		// unten gemeldet
	}
	if (zugang === null) abbruch('Zugang zu Test nicht lesbar (proxy.env)');

	let server: string;
	try {
		server = ssh(`sudo docker exec -i -w /app ${CONTAINER} node scripts/test-pruefung-server.ts`);
	} catch (fehler) {
		// Exit 1 des Server-Teils: seine Ausgabe trotzdem werten.
		server = String((fehler as { stdout?: unknown }).stdout ?? '');
	}
	const zeilen = leseServerZeilen(server);

	// Ein Bericht eines früheren Laufs darf nie als dieser Lauf gelten.
	rmSync(BERICHT, { force: true });
	const lauf = spawnSync(
		'npx',
		['playwright', 'test', '-c', 'playwright.test-server.config.ts', '--reporter=line,json'],
		{
			stdio: 'inherit',
			env: {
				...process.env,
				PLAYWRIGHT_JSON_OUTPUT_NAME: BERICHT,
				MYTCO_TEST_URL: e.url,
				MYTCO_TEST_ZUGANG: zugang,
				MYTCO_TEST_ERWARTET_VERSION: version,
				MYTCO_TEST_ERWARTET_DEV: devHash
			}
		}
	);
	zeilen.push(
		...browserZeilen(
			existsSync(BERICHT) ? (JSON.parse(readFileSync(BERICHT, 'utf-8')) as Suite) : null,
			lauf.status
		)
	);

	console.log(`\nPrüflauf gegen Test, Version ${version} (dev ${devHash.slice(0, 7)}):\n`);
	console.log(tabelle(zeilen));
	console.log('\nScreenshots: test-results/test-server/');
	if (zeilen.some((z) => !z.ok)) process.exitCode = 1;
}

if (import.meta.main) starte(process.env);
