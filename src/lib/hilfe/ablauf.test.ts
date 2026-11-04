import { describe, expect, test } from 'vitest';
import { dauerMs, FERTIG_MS, SCHRITT_MS, start, weiter, type Ablauf } from './ablauf.ts';

describe('Takt der Anleitung (UI-09)', () => {
	test('A-HILFE-02: Schritt dauert 3,5 s, das Bild Fertig 6 s', () => {
		expect(SCHRITT_MS).toBe(3500);
		expect(FERTIG_MS).toBe(6000);
		expect(dauerMs(start(5))).toBe(3500);
		expect(dauerMs({ schritt: 4, durchlauf: 1, anzahl: 5 })).toBe(6000);
	});

	test('A-HILFE-02: nach dem Bild Fertig beginnt der nächste Durchlauf bei Bild 1', () => {
		expect(start(5)).toEqual({ schritt: 0, durchlauf: 1, anzahl: 5 });
		expect(weiter({ schritt: 1, durchlauf: 1, anzahl: 5 })).toEqual({
			schritt: 2,
			durchlauf: 1,
			anzahl: 5
		});
		expect(weiter({ schritt: 4, durchlauf: 1, anzahl: 5 })).toEqual({
			schritt: 0,
			durchlauf: 2,
			anzahl: 5
		});
	});

	test('A-HILFE-02: nach drei Durchläufen endet die Animation beim Bild Fertig', () => {
		let a: Ablauf = start(5);
		for (let i = 0; i < 14; i++) {
			const naechster = weiter(a);
			if (naechster === 'ende') throw new Error(`zu früh beendet nach ${i} Schritten`);
			a = naechster;
		}
		expect(a).toEqual({ schritt: 4, durchlauf: 3, anzahl: 5 });
		expect(weiter(a)).toBe('ende');
	});
});
