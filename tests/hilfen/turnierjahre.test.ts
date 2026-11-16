import { describe, expect, test } from 'vitest';
import { jahresvergabe, TURNIERJAHRE } from './turnierjahre.ts';

describe('Turnierjahre der Datenbanktests', () => {
	test('kein Jahr gehört zwei Dateien, jeder Bereich ist aufsteigend', () => {
		const bereiche = Object.entries(TURNIERJAHRE).sort(([, a], [, b]) => a[0] - b[0]);
		for (const [datei, [von, bis]] of bereiche) {
			expect(von, datei).toBeLessThanOrEqual(bis);
		}
		for (let i = 1; i < bereiche.length; i++) {
			const [vorher, [, bisVorher]] = bereiche[i - 1];
			const [datei, [von]] = bereiche[i];
			expect(von, `${datei} beginnt im Bereich von ${vorher}`).toBeGreaterThan(bisVorher);
		}
	});

	test('zählt je Datei fortlaufend, auch über zwei Aufrufe derselben Datei', () => {
		const vergabe = jahresvergabe({ 'a.db.test.ts': [10, 20], 'b.db.test.ts': [30, 40] });
		const a = vergabe('file:///repo/a.db.test.ts');
		const nochmalA = vergabe('file:///repo/a.db.test.ts');
		const b = vergabe('file:///repo/b.db.test.ts');
		expect([a(), a(), nochmalA(), b(), a()]).toEqual([10, 11, 12, 30, 13]);
	});

	test('ein Block mehrerer Jahre wird ganz vergeben', () => {
		const naechstes = jahresvergabe({ 'a.db.test.ts': [10, 20] })('a.db.test.ts');
		expect([naechstes(), naechstes(4), naechstes()]).toEqual([10, 11, 15]);
	});

	test('bricht ab, wenn der Bereich aufgebraucht ist oder die Datei keinen hat', () => {
		const vergabe = jahresvergabe({ 'a.db.test.ts': [10, 12] });
		const naechstes = vergabe('a.db.test.ts');
		expect(naechstes(2)).toBe(10);
		expect(() => naechstes(2)).toThrow('aufgebraucht (10 bis 12)');
		expect(naechstes()).toBe(12);
		expect(() => naechstes()).toThrow('aufgebraucht');
		expect(() => vergabe('file:///repo/xa.db.test.ts')).toThrow('Keine Turnierjahre');
	});
});
