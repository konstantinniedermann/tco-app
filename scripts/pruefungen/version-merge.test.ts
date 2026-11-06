import { describe, expect, it } from 'vitest';
import {
	istNaechsteVersion,
	pruefeVersionsschritte,
	type Versionsschritt
} from './version-merge.ts';

describe('istNaechsteVersion', () => {
	it('erlaubt Korrektur, Nebenversion und Hauptversion um genau einen Schritt', () => {
		expect(istNaechsteVersion('0.5.0', '0.5.1')).toBe(true);
		expect(istNaechsteVersion('0.5.3', '0.6.0')).toBe(true);
		expect(istNaechsteVersion('0.5.3', '1.0.0')).toBe(true);
	});

	it('weist gleich, Sprünge und Nebenversion ohne zurückgesetzte Korrektur ab', () => {
		expect(istNaechsteVersion('0.5.0', '0.5.0')).toBe(false);
		expect(istNaechsteVersion('0.5.0', '0.5.2')).toBe(false);
		expect(istNaechsteVersion('0.5.3', '0.6.3')).toBe(false);
		expect(istNaechsteVersion('0.5.3', '1.5.3')).toBe(false);
		expect(istNaechsteVersion('0.5.3', '0.5.2')).toBe(false);
	});
});

describe('pruefeVersionsschritte', () => {
	const merge: Versionsschritt = {
		commit: 'abc1234',
		nurDoku: false,
		versionVorher: '0.5.0',
		version: '0.5.1',
		obersteVersion: '0.5.1'
	};

	it('meldet nichts bei einem Merge mit Code und neuer Nummer samt Abschnitt', () => {
		expect(pruefeVersionsschritte([merge])).toEqual([]);
	});

	it('meldet einen Merge mit Code, der die Version nicht erhöht', () => {
		expect(
			pruefeVersionsschritte([{ ...merge, version: '0.5.0', obersteVersion: '0.5.0' }])
		).toEqual([expect.stringContaining('abc1234: Merge mit Code, aber Version bleibt 0.5.0')]);
	});

	it('meldet einen Sprung über eine Nummer', () => {
		expect(
			pruefeVersionsschritte([{ ...merge, version: '0.5.2', obersteVersion: '0.5.2' }])
		).toEqual([expect.stringContaining('0.5.0 → 0.5.2 ist kein einzelner Schritt')]);
	});

	it('meldet eine neue Nummer ohne obersten Abschnitt in docs/versionen.md', () => {
		expect(pruefeVersionsschritte([{ ...merge, obersteVersion: '0.5.0' }])).toEqual([
			expect.stringContaining('oberster Abschnitt ist 0.5.0, nicht 0.5.1')
		]);
	});

	it('lässt reine Doku ohne neue Nummer durch und meldet reine Doku mit neuer Nummer', () => {
		const doku = { ...merge, nurDoku: true, version: '0.5.0', obersteVersion: '0.5.0' };
		expect(pruefeVersionsschritte([doku])).toEqual([]);
		expect(pruefeVersionsschritte([{ ...merge, nurDoku: true }])).toEqual([
			expect.stringContaining('reine Doku, aber Version steigt')
		]);
	});

	it('prüft jeden Schritt einzeln', () => {
		const zweiter = { ...merge, commit: 'def5678', versionVorher: '0.5.1' };
		expect(pruefeVersionsschritte([merge, zweiter])).toEqual([
			expect.stringContaining('def5678: Merge mit Code, aber Version bleibt 0.5.1')
		]);
	});
});
