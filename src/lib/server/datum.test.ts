import { describe, expect, it } from 'vitest';
import { formatiereDatum, jahrInZuerich } from './datum.ts';

describe('Datum in Schweizer Zeit', () => {
	it('Jahr am Jahreswechsel: 31.12. 23:30 UTC ist in Zürich schon das neue Jahr', () => {
		expect(jahrInZuerich(new Date('2026-12-31T23:30:00Z'))).toBe(2027);
		expect(jahrInZuerich(new Date('2026-12-31T22:30:00Z'))).toBe(2026);
	});

	it('Datum wie im Brief', () => {
		expect(formatiereDatum(new Date('2027-01-31T23:30:00Z'))).toBe('01.02.2027');
	});
});
