import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SKRIPT = resolve(import.meta.dirname, 'versionsnotizen.sh');

const VERSIONEN = `# Versionen

## 1.2.30 — später

- dreissig

## 1.2.3 — Datum

- drei
- noch drei

## 1.2.4

- vier

## Unveröffentlicht

- offen
`;

let ordner: string;

function notizen(version: string): { status: number | null; ausgabe: string } {
	const lauf = spawnSync('bash', [SKRIPT, version], { cwd: ordner, encoding: 'utf-8' });
	return { status: lauf.status, ausgabe: lauf.stdout };
}

beforeEach(() => {
	ordner = mkdtempSync(join(tmpdir(), 'versionsnotizen-'));
	mkdirSync(join(ordner, 'docs'));
	writeFileSync(join(ordner, 'docs', 'versionen.md'), VERSIONEN);
});

afterEach(() => {
	rmSync(ordner, { recursive: true, force: true });
});

describe('versionsnotizen.sh', () => {
	it('liefert den Text bis zur nächsten Überschrift, bei Überschrift mit Datum', () => {
		expect(notizen('1.2.3').ausgabe).toBe('\n- drei\n- noch drei\n\n');
	});
	it('findet die Überschrift ohne Zusatz', () => {
		expect(notizen('1.2.4').ausgabe).toBe('\n- vier\n\n');
	});
	it('verwechselt 1.2.3 nicht mit 1.2.30', () => {
		const ausgabe = notizen('1.2.30').ausgabe;
		expect(ausgabe).toContain('dreissig');
		expect(ausgabe).not.toContain('drei\n');
		expect(notizen('1.2.3').ausgabe).not.toContain('dreissig');
	});
	it('gibt bei fehlender Version nichts aus (Aufrufer prüft auf Text)', () => {
		const lauf = notizen('9.9.9');
		expect(lauf.status).toBe(0);
		expect(lauf.ausgabe.trim()).toBe('');
	});
	it('bricht ohne Versionsargument ab', () => {
		const lauf = spawnSync('bash', [SKRIPT], { cwd: ordner, encoding: 'utf-8' });
		expect(lauf.status).not.toBe(0);
	});
});
