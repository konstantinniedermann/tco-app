import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ohneVersion } from './gruener-stand.ts';

const SKRIPT = resolve(import.meta.dirname, 'gruener-stand.ts');

let repo: string;

// Im Pre-Commit-Hook setzt git GIT_INDEX_FILE und GIT_DIR; ohne Bereinigung träfen die
// Aufrufe das echte Repo statt des Temp-Repos.
function sauberesEnv(): NodeJS.ProcessEnv {
	return Object.fromEntries(
		Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))
	);
}

function git(...args: string[]): string {
	return execFileSync('git', args, { cwd: repo, encoding: 'utf-8', env: sauberesEnv() }).trim();
}

function schreibe(pfad: string, inhalt: string): void {
	mkdirSync(dirname(join(repo, pfad)), { recursive: true });
	writeFileSync(join(repo, pfad), inhalt);
}

function committe(pfade: Record<string, string>): string {
	for (const [pfad, inhalt] of Object.entries(pfade)) {
		schreibe(pfad, inhalt);
		git('add', pfad);
	}
	git('commit', '-q', '-m', 'schritt');
	return git('rev-parse', 'HEAD');
}

function paket(version: string, extra: Record<string, unknown> = {}): string {
	return JSON.stringify({ name: 'mytco', version, ...extra }, null, '\t') + '\n';
}

function sperre(version: string): string {
	return (
		JSON.stringify(
			{
				name: 'mytco',
				version,
				lockfileVersion: 3,
				packages: { '': { name: 'mytco', version }, 'node_modules/a': { version: '1.0.0' } }
			},
			null,
			'\t'
		) + '\n'
	);
}

function skript(...args: string[]): { code: number | null; ausgabe: string } {
	const lauf = spawnSync('node', [SKRIPT, ...args], {
		cwd: repo,
		encoding: 'utf-8',
		env: sauberesEnv()
	});
	return { code: lauf.status, ausgabe: lauf.stdout + lauf.stderr };
}

function gruenMerken(): void {
	expect(skript('beginn').code).toBe(0);
	expect(skript('merken').code).toBe(0);
}

beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), 'gruener-stand-'));
	git('init', '-q');
	git('config', 'user.email', 'test@example.org');
	git('config', 'user.name', 'Test');
	git('config', 'commit.gpgsign', 'false');
	committe({
		'src/a.ts': 'export const a = 1;\n',
		'docs/x.md': 'alt\n',
		'package.json': paket('0.1.0'),
		'package-lock.json': sperre('0.1.0')
	});
});

afterEach(() => {
	rmSync(repo, { recursive: true, force: true });
});

describe('ohneVersion', () => {
	it('entfernt die Versionsnummer aus package.json', () => {
		expect(ohneVersion('package.json', paket('0.1.0'))).toBe(
			ohneVersion('package.json', paket('0.2.0'))
		);
	});

	it('entfernt beide Versionsnummern aus package-lock.json, nicht die der Pakete', () => {
		expect(ohneVersion('package-lock.json', sperre('0.1.0'))).toBe(
			ohneVersion('package-lock.json', sperre('0.1.1'))
		);
		expect(ohneVersion('package-lock.json', sperre('0.1.0'))).toContain('"1.0.0"');
	});

	it('lässt andere Dateien unverändert', () => {
		expect(ohneVersion('src/a.ts', 'x\n')).toBe('x\n');
	});
});

describe('gruener-stand.ts', () => {
	it('kennt ohne gemerkten Stand nichts als grün', () => {
		expect(skript('pruefen', 'HEAD').code).toBe(1);
	});

	it('kennt einen gemerkten Stand als grün', () => {
		gruenMerken();
		const ergebnis = skript('pruefen', 'HEAD');
		expect(ergebnis.code).toBe(0);
		expect(ergebnis.ausgabe).toContain('schon grün geprüft');
	});

	it('bleibt grün, wenn danach nur Doku und die Versionsnummer dazukommen', () => {
		gruenMerken();
		committe({ 'docs/x.md': 'neu\n', 'README.md': 'neu\n' });
		const merge = committe({
			'package.json': paket('0.1.1'),
			'package-lock.json': sperre('0.1.1')
		});
		expect(skript('pruefen', merge).code).toBe(0);
	});

	it('ist nicht mehr grün, wenn Code dazukommt', () => {
		gruenMerken();
		const neu = committe({ 'src/a.ts': 'export const a = 2;\n' });
		expect(skript('pruefen', neu).code).toBe(1);
	});

	it('ist nicht mehr grün, wenn sich in package.json mehr als die Version ändert', () => {
		gruenMerken();
		const neu = committe({ 'package.json': paket('0.1.1', { dependencies: { b: '1.0.0' } }) });
		expect(skript('pruefen', neu).code).toBe(1);
	});

	it('ist nicht mehr grün bei der Datenschutzerklärung (die App baut sie ein, DS-09)', () => {
		gruenMerken();
		const neu = committe({ 'docs/datenschutzerklaerung.md': 'neu\n' });
		expect(skript('pruefen', neu).code).toBe(1);
	});

	it('merkt nichts, wenn beim Beginn Uncommittetes herumlag', () => {
		schreibe('src/a.ts', 'export const a = 3;\n');
		expect(skript('beginn').code).toBe(0);
		git('checkout', '--', 'src/a.ts');
		const ergebnis = skript('merken');
		expect(ergebnis.code).toBe(0);
		expect(ergebnis.ausgabe).toContain('nicht gemerkt');
		expect(skript('pruefen', 'HEAD').code).toBe(1);
	});

	it('merkt nichts, wenn am Ende eine neue Datei herumliegt', () => {
		expect(skript('beginn').code).toBe(0);
		schreibe('src/neu.ts', 'export const b = 1;\n');
		expect(skript('merken').ausgabe).toContain('nicht gemerkt');
		expect(skript('pruefen', 'HEAD').code).toBe(1);
	});

	it('merkt nichts, wenn während der Prüfung ein Commit dazukam', () => {
		expect(skript('beginn').code).toBe(0);
		committe({ 'src/a.ts': 'export const a = 4;\n' });
		expect(skript('merken').ausgabe).toContain('nicht gemerkt');
		expect(skript('pruefen', 'HEAD').code).toBe(1);
	});

	it('merkt nichts ohne Beginn', () => {
		expect(skript('merken').ausgabe).toContain('nicht gemerkt');
		expect(skript('pruefen', 'HEAD').code).toBe(1);
	});

	it('prüft im Zweifel voll: unlesbare package.json gilt nicht als grün', () => {
		gruenMerken();
		const kaputt = committe({ 'package.json': '{ kaputt' });
		expect(skript('pruefen', kaputt).code).not.toBe(0);
	});

	it('gilt für alle Worktrees desselben Repos', () => {
		gruenMerken();
		const anderer = join(repo, '.wt');
		git('worktree', 'add', '-q', anderer, '-b', 'anderer');
		const lauf = spawnSync('node', [SKRIPT, 'pruefen', 'HEAD'], {
			cwd: anderer,
			encoding: 'utf-8',
			env: sauberesEnv()
		});
		expect(lauf.status).toBe(0);
	});
});
