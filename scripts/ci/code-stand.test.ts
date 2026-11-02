import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SKRIPT = resolve(import.meta.dirname, 'code-stand.sh');

let repo: string;

// Im Pre-Commit-Hook setzt git GIT_INDEX_FILE und GIT_DIR; ohne Bereinigung träfen die
// Aufrufe das echte Repo statt des Temp-Repos.
function sauberesEnv(): NodeJS.ProcessEnv {
	return Object.fromEntries(
		Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))
	);
}

function git(...args: string[]): void {
	execFileSync('git', args, { cwd: repo, stdio: 'ignore', env: sauberesEnv() });
}

function schreibe(pfad: string, inhalt: string): void {
	mkdirSync(dirname(join(repo, pfad)), { recursive: true });
	writeFileSync(join(repo, pfad), inhalt);
	git('add', pfad);
}

function codeStand(): string {
	return execFileSync('bash', [SKRIPT], { cwd: repo, encoding: 'utf-8', env: sauberesEnv() });
}

beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), 'code-stand-'));
	git('init', '-q');
	schreibe('src/a.ts', 'export const a = 1;\n');
	schreibe('docs/x.md', 'alt\n');
	schreibe('README.md', 'alt\n');
});

afterEach(() => {
	rmSync(repo, { recursive: true, force: true });
});

describe('code-stand.sh', () => {
	it('gibt 40 Hex-Zeichen und einen Zeilenumbruch aus', () => {
		expect(codeStand()).toMatch(/^[0-9a-f]{40}\n$/);
	});
	it('bleibt bei Änderungen an Doku gleich', () => {
		const vorher = codeStand();
		schreibe('docs/x.md', 'neu\n');
		schreibe('docs/unter/y.png', 'bild\n');
		schreibe('README.md', 'neu\n');
		schreibe('src/hinweis.md', 'neu\n');
		schreibe('docs/übersicht.md', 'neu\n');
		expect(codeStand()).toBe(vorher);
	});
	it('ändert sich bei Änderungen an Code', () => {
		const vorher = codeStand();
		schreibe('src/a.ts', 'export const a = 2;\n');
		expect(codeStand()).not.toBe(vorher);
	});
	it('ändert sich bei neuem Code und bei Umbenennung', () => {
		const vorher = codeStand();
		schreibe('src/b.ts', 'export const a = 1;\n');
		const nachNeu = codeStand();
		expect(nachNeu).not.toBe(vorher);
		git('mv', 'src/b.ts', 'src/c.ts');
		expect(codeStand()).not.toBe(nachNeu);
	});
	it('ändert sich bei geändertem Dateimodus', () => {
		const vorher = codeStand();
		git('update-index', '--chmod=+x', 'src/a.ts');
		expect(codeStand()).not.toBe(vorher);
	});
	it('ignoriert nicht versionierte Dateien', () => {
		const vorher = codeStand();
		writeFileSync(join(repo, 'lose.ts'), 'x');
		expect(codeStand()).toBe(vorher);
	});
});
