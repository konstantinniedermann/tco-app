import { describe, expect, it } from 'vitest';
import { istPruefLauf, istTestquelle, wirdAusgefuehrt } from './dateien.ts';

describe('istTestquelle', () => {
	it('erkennt test- und spec-Dateien in ts und js', () => {
		for (const pfad of ['a.test.ts', 'x/a.spec.ts', 'a.test.js', 'tests/e2e/a.spec.js']) {
			expect(istTestquelle(pfad)).toBe(true);
		}
	});
	it('lässt andere Dateien aus', () => {
		for (const pfad of ['a.ts', 'a.test.svelte', 'testing.ts', 'a.spec.md']) {
			expect(istTestquelle(pfad)).toBe(false);
		}
	});
});

describe('wirdAusgefuehrt', () => {
	it.each([
		'src/lib/server/a.test.ts',
		'src/a.test.ts',
		'src/routes/api/x/x.db.test.ts',
		'scripts/pruefungen/a.test.ts',
		'tests/a.test.ts',
		'tests/x/a.db.test.ts',
		'tests/e2e/a.test.ts',
		'tests/e2e/x/a.test.ts'
	])('%s läuft in einem Testprogramm', (pfad) => {
		expect(wirdAusgefuehrt(pfad)).toBe(true);
	});
	it.each([
		'a.test.ts',
		'lib/a.test.ts',
		'src/a.spec.ts',
		'src/a.test.js',
		'tests/e2e/a.spec.ts',
		'scripts/a.db.test.ts'
	])('%s läuft in keinem Testprogramm', (pfad) => {
		expect(wirdAusgefuehrt(pfad)).toBe(false);
	});
});

describe('istPruefLauf', () => {
	it('erkennt den Prüflauf gegen Test, den nur make test-pruefung startet', () => {
		expect(istPruefLauf('tests/test-server/pruefung.test.ts')).toBe(true);
		expect(wirdAusgefuehrt('tests/test-server/pruefung.test.ts')).toBe(false);
	});
	it('zählt andere Tests nicht dazu', () => {
		expect(istPruefLauf('tests/e2e/a.test.ts')).toBe(false);
		expect(istPruefLauf('tests/a.test.ts')).toBe(false);
	});
});
