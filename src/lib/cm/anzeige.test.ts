import { describe, expect, test } from 'vitest';
import type { KategorieRegel } from '../turnier/passung.ts';
import { kategorieText, namenText, standText } from './anzeige.ts';

const regel = (k: Partial<KategorieRegel> = {}): KategorieRegel => ({
	art: 'einzel',
	geschlecht: 'herren',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: null,
	klassierungBis: null,
	...k
});

describe('Anzeige der Clubmeisterschaft für Mitglieder', () => {
	test('A-ANMELDUNG-02: Stand als Text', () => {
		expect(standText(0)).toBe('Noch keine Anmeldung');
		expect(standText(1)).toBe('1 Anmeldung');
		expect(standText(2)).toBe('2 Anmeldungen');
		expect(standText(3)).toBe('3 Anmeldungen');
	});

	test('FR-07: Kategorie als Kurztext ohne leere Teile', () => {
		expect(
			kategorieText(regel({ jahrgangVon: 2009, klassierungVon: 'R1', klassierungBis: 'R6' }))
		).toBe('Herren · R1–R6 · ab Jahrgang 2009');
		expect(kategorieText(regel({ geschlecht: 'damen' }))).toBe('Damen');
		expect(kategorieText(regel({ geschlecht: 'offen', jahrgangBis: 1976 }))).toBe(
			'offen · bis Jahrgang 1976'
		);
		expect(
			kategorieText(
				regel({
					jahrgangVon: 1980,
					jahrgangBis: 1989,
					klassierungVon: 'R7',
					klassierungBis: 'R9'
				})
			)
		).toBe('Herren · R7–R9 · Jahrgang 1980–1989');
	});

	test('A-ANMELDUNG-01: Namen der Angemeldeten', () => {
		expect(namenText([])).toBe('Noch niemand angemeldet.');
		expect(namenText(['Anna Beispiel'])).toBe('Angemeldet (1): Anna Beispiel');
		expect(namenText(['Anna Beispiel', 'Bea Muster'])).toBe(
			'Angemeldet (2): Anna Beispiel, Bea Muster'
		);
	});
});
