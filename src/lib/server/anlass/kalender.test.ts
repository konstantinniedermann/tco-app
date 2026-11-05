import { describe, expect, test } from 'vitest';
import { baueKalender } from './kalender.ts';

const ANLASS = {
	kennung: 'abc123',
	titel: 'Generalversammlung 2027',
	beginn: new Date('2027-03-19T18:30:00Z'),
	ort: 'Clubhaus',
	einladung: 'Traktanden folgen'
};
const JETZT = new Date('2027-02-26T09:00:00Z');

const entfalte = (ics: string) => ics.replace(/\r\n /g, '');

describe('Kalenderdatei', () => {
	test('A-ANLASS-01: Kalenderdatei enthält Beginn, Ende nach zwei Stunden, Titel und Ort', () => {
		const ics = baueKalender(ANLASS, JETZT);
		const zeilen = ics.split('\r\n');
		expect(zeilen[0]).toBe('BEGIN:VCALENDAR');
		expect(zeilen).toContain('VERSION:2.0');
		expect(zeilen).toContain('BEGIN:VEVENT');
		expect(zeilen).toContain('UID:abc123@mytco');
		expect(zeilen).toContain('DTSTAMP:20270226T090000Z');
		expect(zeilen).toContain('DTSTART:20270319T183000Z');
		expect(zeilen).toContain('DTEND:20270319T203000Z');
		expect(zeilen).toContain('SUMMARY:Generalversammlung 2027');
		expect(zeilen).toContain('LOCATION:Clubhaus');
		expect(zeilen).toContain('DESCRIPTION:Traktanden folgen');
		expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
		expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
	});

	test('Kalender: Komma, Semikolon, Backslash und Zeilenumbruch sind maskiert', () => {
		const ics = baueKalender({ ...ANLASS, einladung: 'a,b;c\\d\ne\r\nf' }, JETZT);
		expect(ics.split('\r\n')).toContain('DESCRIPTION:a\\,b\\;c\\\\d\\ne\\nf');
	});

	test('Kalender: lange Zeilen sind nach 75 Oktetten gefaltet, ohne UTF-8-Zeichen zu zerreissen', () => {
		const einladung = 'ä'.repeat(100);
		const ics = baueKalender({ ...ANLASS, einladung }, JETZT);
		for (const zeile of ics.split('\r\n')) {
			expect(new TextEncoder().encode(zeile).length).toBeLessThanOrEqual(75);
			expect(zeile).not.toContain('�');
		}
		expect(entfalte(ics).split('\r\n')).toContain(`DESCRIPTION:${einladung}`);
	});
});
