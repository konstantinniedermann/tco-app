import { describe, expect, test } from 'vitest';
import { AENDERN_AB, zeigtAendern } from './zeilenaktionen.ts';

describe('UI-Leitbild, Tabelle: Aktionen einer Zeile', () => {
	test('bis zwei Aktionen stehen als Tasten in der Zeile, ab drei nur «Ändern»', () => {
		expect(AENDERN_AB).toBe(3);
		expect(zeigtAendern(1)).toBe(false);
		expect(zeigtAendern(2)).toBe(false);
		expect(zeigtAendern(3)).toBe(true);
		expect(zeigtAendern(4)).toBe(true);
	});
});
