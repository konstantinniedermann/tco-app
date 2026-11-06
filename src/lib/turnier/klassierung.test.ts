import { describe, expect, it } from 'vitest';
import { BEREICH, istKlassierung, istStufe, klassierungName, staerker } from './klassierung.ts';

describe('Klassierung', () => {
	it('FR-34: N1 ist stärker als R1, R1 stärker als R9', () => {
		expect(staerker('N1', 'R1')).toBe(true);
		expect(staerker('R1', 'R9')).toBe(true);
		expect(staerker('R9', 'R1')).toBe(false);
		expect(staerker('R4', 'R4')).toBe(false);
	});

	it('FR-34: nur die 13 Stufen N1 bis R9 gelten als Stufe', () => {
		expect(BEREICH).toHaveLength(13);
		expect(istStufe('N4')).toBe(true);
		expect(istStufe('R9')).toBe(true);
		expect(istStufe('keine')).toBe(false);
		expect(istStufe('r1')).toBe(false);
		expect(istStufe(3)).toBe(false);
	});

	it('FR-37: keine Lizenz ist eine Klassierung, R10 nicht', () => {
		expect(istKlassierung('keine')).toBe(true);
		expect(istKlassierung('R9')).toBe(true);
		expect(istKlassierung('R10')).toBe(false);
		expect(klassierungName('keine')).toBe('keine Lizenz');
		expect(klassierungName('R4')).toBe('R4');
	});
});
