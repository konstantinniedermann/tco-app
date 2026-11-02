import { describe, expect, it } from 'vitest';
import {
	MAILANFRAGE_SCHLUESSEL,
	holeSpeicher,
	leseMailanfrage,
	merkeMailanfrage,
	vergissMailanfrage
} from './mailanfrage.ts';

const MINUTE_MS = 60_000;
const START = Date.UTC(2026, 10, 2, 10, 0, 0);

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

describe('Mail-Anfrage im Speicher des Browsers', () => {
	it('liest die gemerkte Adresse bis 15 Minuten nach der Anfrage', () => {
		const s = speicher();
		merkeMailanfrage(s, 'anna@example.org', START);
		expect(leseMailanfrage(s, START)).toBe('anna@example.org');
		expect(leseMailanfrage(s, START + 15 * MINUTE_MS)).toBe('anna@example.org');
	});

	it('gibt nach 15 Minuten null zurück und löscht den Eintrag', () => {
		const s = speicher();
		merkeMailanfrage(s, 'anna@example.org', START);
		expect(leseMailanfrage(s, START + 15 * MINUTE_MS + 1)).toBeNull();
		expect(s.daten.has(MAILANFRAGE_SCHLUESSEL)).toBe(false);
	});

	it('ohne Eintrag null', () => {
		expect(leseMailanfrage(speicher(), START)).toBeNull();
	});

	it('vergissMailanfrage löscht den Eintrag', () => {
		const s = speicher();
		merkeMailanfrage(s, 'anna@example.org', START);
		vergissMailanfrage(s);
		expect(leseMailanfrage(s, START)).toBeNull();
	});

	it('Eintrag aus der Zukunft gilt als kaputt und wird gelöscht', () => {
		const s = speicher();
		merkeMailanfrage(s, 'anna@example.org', START + MINUTE_MS);
		expect(leseMailanfrage(s, START)).toBeNull();
		expect(s.daten.has(MAILANFRAGE_SCHLUESSEL)).toBe(false);
	});

	it.each([
		['kaputtes JSON', '{nicht json'],
		['falsche Form', JSON.stringify({ email: 42, zeit: START })],
		['ohne Zeit', JSON.stringify({ email: 'anna@example.org' })],
		['leere Adresse', JSON.stringify({ email: '', zeit: START })],
		['Liste', JSON.stringify(['anna@example.org', START])],
		['null', 'null']
	])('Review Focus 5: %s ergibt null ohne Wurf und wird gelöscht', (_, roh) => {
		const s = speicher();
		s.daten.set(MAILANFRAGE_SCHLUESSEL, roh);
		expect(leseMailanfrage(s, START)).toBeNull();
		expect(s.daten.has(MAILANFRAGE_SCHLUESSEL)).toBe(false);
	});

	it('Review Focus 5: getItem, der wirft, ergibt null ohne Wurf', () => {
		const s = { getItem: wirft, removeItem: wirft };
		expect(leseMailanfrage(s, START)).toBeNull();
	});

	it('Review Focus 5: setItem, der wirft, ergibt keinen Wurf und danach null', () => {
		const s = speicher();
		expect(() => merkeMailanfrage({ setItem: wirft }, 'anna@example.org', START)).not.toThrow();
		expect(leseMailanfrage(s, START)).toBeNull();
	});

	it('Review Focus 5: removeItem, der wirft, ergibt keinen Wurf', () => {
		expect(() => vergissMailanfrage({ removeItem: wirft })).not.toThrow();
	});
});

describe('Speicher des Browsers holen', () => {
	it('nimmt den übergebenen Speicher', () => {
		const s = speicher();
		expect(holeSpeicher(() => s as unknown as Storage)).toBe(s);
	});

	it.each([
		['Zugriff wirft', () => wirft()],
		['kein Speicher', () => undefined as unknown as Storage]
	])('%s: Ersatz ohne Wirkung, der nie wirft', (_, hole) => {
		const s = holeSpeicher(hole);
		expect(() => merkeMailanfrage(s, 'anna@example.org', START)).not.toThrow();
		expect(leseMailanfrage(s, START)).toBeNull();
	});
});
