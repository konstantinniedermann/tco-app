import { describe, expect, test } from 'vitest';
import {
	SITZUNG_GUELTIG_MS,
	VERLAENGERN_NACH_MS,
	mussVerlaengern,
	sitzungAbgelaufen
} from './sitzung.ts';

const jetzt = new Date('2026-11-02T12:00:00Z');
const vor = (ms: number) => new Date(jetzt.getTime() - ms);

describe('Sitzungsregeln', () => {
	test('A-LOGIN-09: Sitzung gilt 365 Tage nach letzter Nutzung', () => {
		expect(sitzungAbgelaufen(vor(SITZUNG_GUELTIG_MS - 1), jetzt)).toBe(false);
		expect(sitzungAbgelaufen(vor(SITZUNG_GUELTIG_MS), jetzt)).toBe(false);
		expect(sitzungAbgelaufen(vor(SITZUNG_GUELTIG_MS + 1), jetzt)).toBe(true);
	});

	test('mussVerlaengern erst nach 24 Stunden', () => {
		expect(mussVerlaengern(vor(VERLAENGERN_NACH_MS - 1), jetzt)).toBe(false);
		expect(mussVerlaengern(vor(VERLAENGERN_NACH_MS), jetzt)).toBe(false);
		expect(mussVerlaengern(vor(VERLAENGERN_NACH_MS + 1), jetzt)).toBe(true);
	});
});
