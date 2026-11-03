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
	it('zählt Verbindungs-URLs nicht als Mailadresse', () => {
		expect(
			pruefeTestdaten(new Map([['tests/a.test.ts', 'postgres://user:pass@localhost:55432/db']]))
		).toEqual([]);
	});
	it('erlaubt nur example.org selbst, keine Unterdomains', () => {
		expect(pruefeTestdaten(new Map([['tests/a.test.ts', 'x@mail.example.org']]))).toHaveLength(1);
	});
});
