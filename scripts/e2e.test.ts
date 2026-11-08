import { describe, expect, it } from 'vitest';
import {
	e2eDatenbankName,
	istE2eDatenbank,
	istVeralteteE2eDatenbank,
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
