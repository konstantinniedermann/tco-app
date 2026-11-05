import { describe, expect, it } from 'vitest';
import { MAILANFRAGE_SCHLUESSEL, merkeMailanfrage } from '../login/mailanfrage.ts';
import {
	WECHSEL_SCHLUESSEL,
	merkeWechsel,
	startZustand,
	vergissWechsel
} from './wechselanfrage.ts';

const MINUTE_MS = 60_000;
const START = Date.UTC(2026, 10, 5, 10, 0, 0);

function speicher() {
	const daten = new Map<string, string>();
	return {
		daten,
		getItem: (k: string) => daten.get(k) ?? null,
		setItem: (k: string, v: string) => void daten.set(k, v),
		removeItem: (k: string) => void daten.delete(k)
	};
}

function wirft(): never {
	throw new Error('Speicher gesperrt');
}

describe('A-KONTO-01: E-Mail-Wechsel übersteht Neuladen', () => {
	it('gemerkter Wechsel → Schritt 2 mit der neuen Adresse, bis 15 Minuten', () => {
		const s = speicher();
		merkeWechsel(s, 'lea.neu@example.org', START);
		expect(startZustand(s, START)).toEqual({ schritt: 'codes', email: 'lea.neu@example.org' });
		expect(startZustand(s, START + 15 * MINUTE_MS)).toEqual({
			schritt: 'codes',
			email: 'lea.neu@example.org'
		});
	});

	it('ohne Eintrag → Schritt 1', () => {
		expect(startZustand(speicher(), START)).toEqual({ schritt: 'adresse', email: '' });
	});

	it('abgelaufener Eintrag → Schritt 1, Eintrag gelöscht', () => {
		const s = speicher();
		merkeWechsel(s, 'lea.neu@example.org', START);
		expect(startZustand(s, START + 15 * MINUTE_MS + 1)).toEqual({ schritt: 'adresse', email: '' });
		expect(s.daten.has(WECHSEL_SCHLUESSEL)).toBe(false);
	});

	it('Speicher, der wirft → Schritt 1 ohne Wurf', () => {
		const s = { getItem: wirft, setItem: wirft, removeItem: wirft };
		expect(() => merkeWechsel(s, 'lea.neu@example.org', START)).not.toThrow();
		expect(startZustand(s, START)).toEqual({ schritt: 'adresse', email: '' });
		expect(() => vergissWechsel(s)).not.toThrow();
	});

	it('vergissWechsel löscht den Eintrag', () => {
		const s = speicher();
		merkeWechsel(s, 'lea.neu@example.org', START);
		vergissWechsel(s);
		expect(startZustand(s, START)).toEqual({ schritt: 'adresse', email: '' });
	});

	it('eigener Schlüssel: Login-Anfrage und Wechsel stören sich nicht', () => {
		const s = speicher();
		merkeMailanfrage(s, 'lea.beispiel@example.org', START);
		expect(startZustand(s, START)).toEqual({ schritt: 'adresse', email: '' });
		merkeWechsel(s, 'lea.neu@example.org', START);
		vergissWechsel(s);
		expect(s.daten.has(MAILANFRAGE_SCHLUESSEL)).toBe(true);
	});
});
