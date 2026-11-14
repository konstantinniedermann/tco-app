import { describe, expect, test } from 'vitest';
import { aufgabeText, begegnungText, endstandText, vorlesetext } from './anzeige.ts';

// Texte der Seite einer Begegnung (UI-Leitbild, Seite einer Begegnung, Baustein Partie).
describe('Texte der Seite einer Begegnung', () => {
	test('Unterzeile: Datum, Heim/Auswärts, Runde; Auf-/Abstieg mit Uhrzeit statt Runde', () => {
		expect(
			begegnungText({ datum: '2026-05-02', zeit: null, tcoHeim: true, art: 'gruppe', runde: 1 })
		).toBe('Sa 02.05. · Heim · Runde 1');
		expect(
			begegnungText({
				datum: '2026-06-07',
				zeit: '09:00',
				tcoHeim: false,
				art: 'aufstieg',
				runde: 4
			})
		).toBe('So 07.06., 09:00 · Auswärts · Aufstiegsspiel');
		expect(
			begegnungText({ datum: '2026-06-14', zeit: null, tcoHeim: true, art: 'abstieg', runde: 1 })
		).toBe('So 14.06. · Heim · Abstiegsspiel');
	});

	test('Endstand mit Sätzen in der Reihenfolge Heim:Gast wie der Endstand', () => {
		expect(endstandText({ tco: 16, gegner: 3 }, true)).toBe('Endstand · Sätze 16:3');
		expect(endstandText({ tco: 4, gegner: 11 }, false)).toBe('Endstand · Sätze 11:4');
	});

	test('Aufgabe als Wort, sonst nichts', () => {
		expect(aufgabeText('gegner')).toBe('Gegner hat aufgegeben');
		expect(aufgabeText('tco')).toBe('TCO hat aufgegeben');
		expect(aufgabeText(null)).toBeNull();
	});

	test('Vorlesetext zum Ergebnis der Partie', () => {
		expect(vorlesetext('sieg')).toBe('gewonnen');
		expect(vorlesetext('niederlage')).toBe('verloren');
		expect(vorlesetext(null)).toBe('');
	});
});
