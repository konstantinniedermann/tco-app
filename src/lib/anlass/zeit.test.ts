import { describe, expect, test } from 'vitest';
import {
	formatiereBeginn,
	formatiereTag,
	formatiereZeitpunkt,
	utcZuZuerich,
	zuerichZuUtc
} from './zeit.ts';

describe('Schweizer Zeit', () => {
	test('zuerichZuUtc: Winterzeit UTC+1', () => {
		expect(zuerichZuUtc('2027-03-19T19:30')?.toISOString()).toBe('2027-03-19T18:30:00.000Z');
	});

	test('zuerichZuUtc: Sommerzeit UTC+2', () => {
		expect(zuerichZuUtc('2027-06-12T10:00')?.toISOString()).toBe('2027-06-12T08:00:00.000Z');
	});

	test('zuerichZuUtc: Zeit in der Lücke der Umstellung gibt es nicht', () => {
		expect(zuerichZuUtc('2027-03-28T02:30')).toBeNull();
	});

	test('zuerichZuUtc: doppelte Stunde im Herbst nimmt die frühere', () => {
		expect(zuerichZuUtc('2027-10-31T02:30')?.toISOString()).toBe('2027-10-31T00:30:00.000Z');
	});

	test('zuerichZuUtc: Unsinn gibt null', () => {
		expect(zuerichZuUtc('')).toBeNull();
		expect(zuerichZuUtc('2027-02-30T10:00')).toBeNull();
		expect(zuerichZuUtc('19.03.2027')).toBeNull();
		expect(zuerichZuUtc('2027-03-19T24:00')).toBeNull();
	});

	test('utcZuZuerich ist das Gegenstück', () => {
		expect(utcZuZuerich(new Date('2027-03-19T18:30:00.000Z'))).toBe('2027-03-19T19:30');
		expect(utcZuZuerich(new Date('2027-06-12T08:00:00.000Z'))).toBe('2027-06-12T10:00');
		expect(utcZuZuerich(zuerichZuUtc('2027-12-31T23:59')!)).toBe('2027-12-31T23:59');
	});

	test('formatiereBeginn: Wochentag, Datum und Uhrzeit mit Punkt', () => {
		expect(formatiereBeginn('2027-03-19T18:30:00.000Z')).toBe('Freitag, 19. März 2027, 19.30 Uhr');
	});

	test('formatiereTag: kurzer Wochentag und Datum', () => {
		expect(formatiereTag('2027-03-16T22:59:00.000Z')).toBe('Di, 16. März');
	});

	test('formatiereZeitpunkt: Datum und Uhrzeit für Tabellen', () => {
		expect(formatiereZeitpunkt('2027-03-02T13:05:00.000Z')).toBe('02.03.2027, 14.05');
	});
});
