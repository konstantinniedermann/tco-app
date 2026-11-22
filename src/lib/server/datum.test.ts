import { describe, expect, it } from 'vitest';
import { formatiereDatum, heuteInZuerich, jahrInZuerich, plusTage } from './datum.ts';

describe('Datum in Schweizer Zeit', () => {
	it('FR-37: Jahr am Jahreswechsel: 31.12. 23:30 UTC ist in Zürich schon das neue Jahr', () => {
		expect(jahrInZuerich(new Date('2026-12-31T23:30:00Z'))).toBe(2027);
		expect(jahrInZuerich(new Date('2026-12-31T22:30:00Z'))).toBe(2026);
	});

	it('A-LOGIN-01: Datum wie im Brief', () => {
		expect(formatiereDatum(new Date('2027-01-31T23:30:00Z'))).toBe('01.02.2027');
	});

	it('heute in Zürich: 22:30 UTC im Sommer ist schon der nächste Tag', () => {
		expect(heuteInZuerich(new Date('2027-05-12T22:30:00Z'))).toBe('2027-05-13');
		expect(heuteInZuerich(new Date('2027-05-12T21:30:00Z'))).toBe('2027-05-12');
	});

	it('plusTage rechnet über Monats- und Jahresgrenzen', () => {
		expect(plusTage('2027-05-03', -7)).toBe('2027-04-26');
		expect(plusTage('2026-12-30', 3)).toBe('2027-01-02');
	});
});
