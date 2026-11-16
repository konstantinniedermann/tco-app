import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	BUILD_WURZEL,
	buildOrdner,
	e2eDatenbankName,
	entferneBuildOrdner,
	istE2eDatenbank,
	istVeralteteE2eDatenbank,
	raeumeAlteBuildsAuf,
	urlMitDatenbank
} from './e2e.ts';

describe('E2E auf eigener Datenbank', () => {
	const jetzt = new Date('2026-11-08T17:05:00Z');

	it('benennt die Datenbank mit Zeit (UTC) und Zufall', () => {
		expect(e2eDatenbankName(jetzt, 'ab12cd34')).toBe('mytco_e2e_202611081705_ab12cd34');
	});

	it('hält einen eben angelegten Namen nicht für veraltet', () => {
		expect(istVeralteteE2eDatenbank(e2eDatenbankName(jetzt, 'ab12cd34'), jetzt)).toBe(false);
	});

	it('hält eine E2E-Datenbank nach mehr als einem Tag für veraltet', () => {
		const vorEinemTag = new Date(jetzt.getTime() - 24 * 60 * 60 * 1000);
		const name = e2eDatenbankName(vorEinemTag, 'ab12cd34');
		expect(istVeralteteE2eDatenbank(name, jetzt)).toBe(false);
		expect(istVeralteteE2eDatenbank(name, new Date(jetzt.getTime() + 60_000))).toBe(true);
	});

	it.each(['mytco', 'mytco_test_ab12cd34', 'mytco_e2e_kaputt', 'mytco_e2e_202611081705_XY'])(
		'lässt %s stehen',
		(name) => {
			expect(istVeralteteE2eDatenbank(name, new Date('2099-01-01T00:00:00Z'))).toBe(false);
		}
	);

	it('ersetzt nur den Datenbanknamen in der URL', () => {
		expect(
			urlMitDatenbank('postgres://mytco:mytco_lokal@localhost:55432/mytco', 'mytco_e2e_x')
		).toBe('postgres://mytco:mytco_lokal@localhost:55432/mytco_e2e_x');
	});

	it('erkennt nur Datenbanken dieses Skripts (Riegel in playwright.config.ts)', () => {
		const basis = 'postgres://mytco:mytco_lokal@localhost:55432/mytco';
		expect(istE2eDatenbank(urlMitDatenbank(basis, e2eDatenbankName(jetzt, 'ab12cd34')))).toBe(true);
		expect(istE2eDatenbank(basis)).toBe(false);
		expect(istE2eDatenbank('kein url')).toBe(false);
	});
});

describe('E2E baut in einen eigenen Ordner', () => {
	const jetzt = new Date('2026-11-08T17:05:00Z');
	const vorZweiTagen = new Date(jetzt.getTime() - 2 * 24 * 60 * 60 * 1000);
	const ordner: string[] = [];

	/** Leerer Ordner im Temp-Verzeichnis, der nach dem Test verschwindet. */
	function leererOrdner(): string {
		const pfad = mkdtempSync(join(tmpdir(), 'mytco-e2e-build-'));
		ordner.push(pfad);
		return pfad;
	}

	function legeAn(wurzel: string, name: string): void {
		mkdirSync(join(wurzel, name, 'build'), { recursive: true });
		writeFileSync(join(wurzel, name, 'build', 'index.js'), '');
	}

	afterEach(() => {
		for (const pfad of ordner.splice(0)) rmSync(pfad, { recursive: true, force: true });
	});

	it('legt den Ordner je Lauf unter einer gemeinsamen, gitignorierten Wurzel an', () => {
		expect(BUILD_WURZEL).toBe('.e2e-build');
		expect(buildOrdner('mytco_e2e_202611081705_ab12cd34')).toBe(
			join('.e2e-build', 'mytco_e2e_202611081705_ab12cd34')
		);
	});

	it('entfernt den Ordner des Laufs samt Inhalt, auch wenn es ihn nicht gibt', () => {
		const wurzel = leererOrdner();
		const name = e2eDatenbankName(jetzt, 'ab12cd34');
		legeAn(wurzel, name);
		entferneBuildOrdner(join(wurzel, name));
		expect(existsSync(join(wurzel, name))).toBe(false);
		expect(() => entferneBuildOrdner(join(wurzel, name))).not.toThrow();
	});

	it('räumt Ordner abgebrochener Läufe weg, die älter als ein Tag sind, und nur diese', () => {
		const wurzel = leererOrdner();
		const alt = e2eDatenbankName(vorZweiTagen, 'aaaa1111');
		const frisch = e2eDatenbankName(jetzt, 'bbbb2222');
		legeAn(wurzel, alt);
		legeAn(wurzel, frisch);
		legeAn(wurzel, 'fremd');
		expect(raeumeAlteBuildsAuf(wurzel, jetzt)).toEqual([alt]);
		expect(readdirSync(wurzel).sort()).toEqual([frisch, 'fremd'].sort());
	});

	it('kommt ohne Wurzel aus (erster Lauf)', () => {
		expect(raeumeAlteBuildsAuf(join(leererOrdner(), 'gibt-es-nicht'), jetzt)).toEqual([]);
	});
});
