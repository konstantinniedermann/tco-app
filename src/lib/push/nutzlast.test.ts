import { describe, expect, test } from 'vitest';
import { leseNutzlast, oeffneZiel, sicheresZiel, type Fenster } from './nutzlast.ts';

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

describe('Tipp auf den Push (FR-40)', () => {
	const URSPRUNG = 'https://my.example.org';
	const ZIEL = 'https://my.example.org/anlass/7';

	function clients(fenster: { url: string; navigiert: 'ja' | 'null' | 'wirft' }[]) {
		const protokoll: string[] = [];
		const offen: Fenster[] = fenster.map((f, i) => {
			const eigenes: Fenster = {
				url: f.url,
				focus: async () => {
					protokoll.push(`focus:${i}`);
					return eigenes;
				},
				navigate: async (url: string) => {
					protokoll.push(`navigate:${i}:${url}`);
					if (f.navigiert === 'wirft') throw new TypeError('nicht gesteuert');
					return f.navigiert === 'ja' ? eigenes : null;
				}
			};
			return eigenes;
		});
		return {
			protokoll,
			c: {
				matchAll: async () => offen,
				openWindow: async (url: string) => {
					protokoll.push(`openWindow:${url}`);
					return null;
				}
			}
		};
	}

	test('FR-40: offenes Fenster von MyTCO navigiert zum Ziel und bekommt den Fokus', async () => {
		const h = clients([
			{ url: 'https://anders.example.org/', navigiert: 'ja' },
			{ url: `${URSPRUNG}/profil`, navigiert: 'ja' }
		]);
		await oeffneZiel(h.c, ZIEL, URSPRUNG);
		expect(h.protokoll).toEqual([`navigate:1:${ZIEL}`, 'focus:1']);
	});

	test('FR-40: lässt sich das Fenster nicht navigieren, öffnet ein neues, ohne Fokus auf das alte', async () => {
		const h = clients([{ url: `${URSPRUNG}/`, navigiert: 'wirft' }]);
		await oeffneZiel(h.c, ZIEL, URSPRUNG);
		expect(h.protokoll).toEqual([`navigate:0:${ZIEL}`, `openWindow:${ZIEL}`]);
	});

	test('FR-40: ohne offenes Fenster ein neues; navigiert ohne Client zurück, kein zweites Fenster', async () => {
		const leer = clients([]);
		await oeffneZiel(leer.c, ZIEL, URSPRUNG);
		expect(leer.protokoll).toEqual([`openWindow:${ZIEL}`]);
		const ohneClient = clients([{ url: `${URSPRUNG}/`, navigiert: 'null' }]);
		await oeffneZiel(ohneClient.c, ZIEL, URSPRUNG);
		expect(ohneClient.protokoll).toEqual([`navigate:0:${ZIEL}`]);
	});
});
