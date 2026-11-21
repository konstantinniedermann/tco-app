import { describe, expect, it } from 'vitest';
import { pruefeTestdaten } from './testdaten.ts';

describe('pruefeTestdaten', () => {
	it('meldet Adressen ausserhalb von example.org', () => {
		expect(
			pruefeTestdaten(new Map([['tests/a.test.ts', 'anna@example.org bob@gmail.com']]))
		).toEqual(['tests/a.test.ts: bob@gmail.com']);
	});
	it('prüft nur Test- und Seed-Dateien', () => {
		expect(pruefeTestdaten(new Map([['src/lib/a.ts', 'bob@gmail.com']]))).toEqual([]);
		expect(pruefeTestdaten(new Map([['src/a.test.ts', 'bob@gmail.com']]))).toHaveLength(1);
		expect(pruefeTestdaten(new Map([['db/seed.ts', 'bob@gmail.com']]))).toHaveLength(1);
		expect(pruefeTestdaten(new Map([['db/seed-dev.sql', 'bob@gmail.com']]))).toHaveLength(1);
	});
	it('prüft spec-Dateien und Seed-Verzeichnisse', () => {
		expect(pruefeTestdaten(new Map([['src/a.spec.ts', 'bob@gmail.com']]))).toHaveLength(1);
		expect(pruefeTestdaten(new Map([['src/a.test.js', 'bob@gmail.com']]))).toHaveLength(1);
		expect(pruefeTestdaten(new Map([['db/seed/mitglieder.ts', 'bob@gmail.com']]))).toHaveLength(1);
		expect(pruefeTestdaten(new Map([['db/seeds/a.sql', 'bob@gmail.com']]))).toHaveLength(1);
		expect(pruefeTestdaten(new Map([['db/seeder-notizen/a.ts', 'bob@gmail.com']]))).toEqual([]);
	});
	it('prüft die Daten des Musterbriefs', () => {
		expect(pruefeTestdaten(new Map([['scripts/musterbrief.ts', 'bob@gmail.com']]))).toHaveLength(1);
	});
	it('prüft die Testdaten für die Test-Umgebung', () => {
		expect(pruefeTestdaten(new Map([['scripts/testdaten.ts', 'bob@gmail.com']]))).toHaveLength(1);
		expect(
			pruefeTestdaten(new Map([['scripts/erfundene-mitglieder.ts', 'bob@gmail.com']]))
		).toHaveLength(1);
	});
	it('prüft die Beispieldaten, die make seed dazulegt', () => {
		expect(
			pruefeTestdaten(new Map([['scripts/beispiel-anlass.ts', 'bob@gmail.com']]))
		).toHaveLength(1);
	});
	it('zählt Verbindungs-URLs nicht als Mailadresse', () => {
		expect(
			pruefeTestdaten(new Map([['tests/a.test.ts', 'postgres://user:pass@localhost:55432/db']]))
		).toEqual([]);
	});
	it('meldet Telefonnummern ausser mit der Vorwahl 00 (+41 00 …, 000 …)', () => {
		const befunde = (text: string) => pruefeTestdaten(new Map([['tests/a.test.ts', text]]));
		expect(befunde("telefon: '+41 79 000 00 01'")).toEqual(['tests/a.test.ts: +41 79 000 00 01']);
		expect(befunde("telefon: '079 000 00 01'")).toEqual(['tests/a.test.ts: 079 000 00 01']);
		expect(befunde('+41 (79) 000-00-01 0041 62 000 00 01 0790000001 +41790000001')).toHaveLength(4);
		expect(befunde("'+41 00 123 45 67' '000 123 45 67' '+41 (00) 000-00-01' '0000000001'")).toEqual(
			[]
		);
	});
	it('zählt andere Zahlen nicht als Telefonnummer', () => {
		const befunde = (text: string) => pruefeTestdaten(new Map([['tests/a.test.ts', text]]));
		expect(befunde("'2026-11-21T10:00:00Z' 12345678 4600 Olten 'R4' 1790 '123456' 0.5")).toEqual(
			[]
		);
		expect(befunde("'schluessel-0123456789abcdef' 'rm 0123456789ab' x0790000001")).toEqual([]);
	});
	it('prüft auch Dateien in Ordnern mit Präfix beispiel-', () => {
		expect(
			pruefeTestdaten(
				new Map([['scripts/beispiel-interclub/2026/bericht-1.json', 'bob@gmail.com']])
			)
		).toHaveLength(1);
	});
	it('erlaubt nur example.org selbst, keine Unterdomains', () => {
		expect(pruefeTestdaten(new Map([['tests/a.test.ts', 'x@mail.example.org']]))).toHaveLength(1);
	});
});
