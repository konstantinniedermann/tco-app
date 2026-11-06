import { describe, expect, test } from 'vitest';
import { leseNutzlast, sicheresZiel } from './nutzlast.ts';

const daten = (wert: unknown) => ({
	json: () => {
		if (wert instanceof Error) throw wert;
		return wert;
	}
});

describe('Push im Service Worker (FR-40)', () => {
	test('FR-40: Nutzlast mit Titel, Text und Link wird gelesen', () => {
		expect(leseNutzlast(daten({ titel: 'GV', text: 'Bitte anmelden', link: '/anlass/7' }))).toEqual(
			{ titel: 'GV', text: 'Bitte anmelden', link: '/anlass/7' }
		);
	});

	test('FR-40: fehlende oder ungültige Nutzlast zeigt nichts', () => {
		expect(leseNutzlast(null)).toBeNull();
		expect(leseNutzlast(daten(new SyntaxError('kein JSON')))).toBeNull();
		expect(leseNutzlast(daten({ titel: 'GV', text: 'x' }))).toBeNull();
		expect(leseNutzlast(daten({ titel: '', text: 'x', link: '/' }))).toBeNull();
		expect(leseNutzlast(daten({ titel: 1, text: 'x', link: '/' }))).toBeNull();
		expect(leseNutzlast(daten('Text'))).toBeNull();
	});

	test('FR-40: nur Links mit gleichem Ursprung, sonst die Startseite', () => {
		const ursprung = 'https://my.example.org';
		expect(sicheresZiel('/anlass/7', ursprung)).toBe('https://my.example.org/anlass/7');
		expect(sicheresZiel('https://my.example.org/anlass/7', ursprung)).toBe(
			'https://my.example.org/anlass/7'
		);
		expect(sicheresZiel('https://boese.example.org/', ursprung)).toBe('https://my.example.org/');
		expect(sicheresZiel('//boese.example.org/x', ursprung)).toBe('https://my.example.org/');
		expect(sicheresZiel('javascript:alert(1)', ursprung)).toBe('https://my.example.org/');
		expect(sicheresZiel(undefined, ursprung)).toBe('https://my.example.org/');
		expect(sicheresZiel('http://[kaputt', ursprung)).toBe('https://my.example.org/');
	});
});
