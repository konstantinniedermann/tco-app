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
	// Inhaltszeilen des Abschnitts «## Unveröffentlicht» vor und nach dem Schritt.
	const VORHER = ['', '- Älterer Eintrag (Schritt 21).', ''];

	// Merge mit Code nach der Regel aus ADR-012: Nummer bleibt, ein neuer Eintrag kommt dazu.
	const merge: Versionsschritt = {
		commit: 'abc1234',
		nurDoku: false,
		versionVorher: '0.5.0',
		version: '0.5.0',
		obersteVersion: '0.5.0',
		unveroeffentlichtVorher: VORHER,
		unveroeffentlicht: [...VORHER.slice(0, 2), '- Neuer Eintrag (#42).', '']
	};

	// Doku-Abgleich vor dem Release: Nummer steigt, ihr Abschnitt zuoberst, «Unveröffentlicht» leer.
	const abgleich: Versionsschritt = {
		...merge,
		version: '0.6.0',
		obersteVersion: '0.6.0',
		unveroeffentlicht: ['']
	};

	const OHNE_EINTRAG = 'Merge mit Code ohne neuen Eintrag unter «Unveröffentlicht»';

	describe('Merge mit Code, Nummer bleibt', () => {
		it('nimmt einen Merge mit neuer Zeile unter «Unveröffentlicht» an', () => {
			expect(pruefeVersionsschritte([merge])).toEqual([]);
		});

		it('nimmt einen umgeschriebenen Eintrag an', () => {
			const umgeschrieben = ['', '- Älterer Eintrag (Schritt 21), ergänzt um #42.', ''];
			expect(pruefeVersionsschritte([{ ...merge, unveroeffentlicht: umgeschrieben }])).toEqual([]);
		});

		it('nimmt den ersten Eintrag an, wenn «Unveröffentlicht» vorher leer war', () => {
			expect(
				pruefeVersionsschritte([
					{ ...merge, unveroeffentlichtVorher: [''], unveroeffentlicht: ['', '- Neu.', ''] }
				])
			).toEqual([]);
		});

		it('weist einen Merge ohne Änderung unter «Unveröffentlicht» ab', () => {
			// Auch der stille Fall: Der Eintrag landete im Abschnitt einer schon gesetzten Nummer.
			expect(pruefeVersionsschritte([{ ...merge, unveroeffentlicht: VORHER }])).toEqual([
				expect.stringContaining(`abc1234: ${OHNE_EINTRAG}`)
			]);
		});

		it('weist einen Merge ab, der unter «Unveröffentlicht» nur löscht', () => {
			expect(pruefeVersionsschritte([{ ...merge, unveroeffentlicht: [''] }])).toEqual([
				expect.stringContaining(OHNE_EINTRAG)
			]);
		});

		it('weist eine reine Leerzeichen-Änderung ab', () => {
			const leerzeichen = ['', '  - Älterer  Eintrag (Schritt 21). ', '', '   ', ''];
			expect(pruefeVersionsschritte([{ ...merge, unveroeffentlicht: leerzeichen }])).toEqual([
				expect.stringContaining(OHNE_EINTRAG)
			]);
		});

		it('meldet einen fehlenden Abschnitt «Unveröffentlicht»', () => {
			expect(pruefeVersionsschritte([{ ...merge, unveroeffentlicht: undefined }])).toEqual([
				expect.stringContaining(
					'abc1234: docs/versionen.md — Abschnitt «## Unveröffentlicht» fehlt'
				)
			]);
		});
	});

	describe('Nummer steigt (Doku-Abgleich vor dem Release)', () => {
		it('nimmt den Abgleich an: ein Schritt, Abschnitt zuoberst, «Unveröffentlicht» leer', () => {
			expect(pruefeVersionsschritte([abgleich])).toEqual([]);
		});

		it('nimmt eine Korrektur in derselben Form an (letzter Merge nach der alten Regel)', () => {
			expect(
				pruefeVersionsschritte([{ ...abgleich, version: '0.5.1', obersteVersion: '0.5.1' }])
			).toEqual([]);
		});

		it('weist eine neue Nummer ab, wenn «Unveröffentlicht» nicht leer ist', () => {
			expect(pruefeVersionsschritte([{ ...abgleich, unveroeffentlicht: VORHER }])).toEqual([
				expect.stringContaining(
					'abc1234: Version steigt auf 0.6.0, aber «Unveröffentlicht» ist nicht leer'
				)
			]);
		});

		it('meldet einen Sprung über eine Nummer', () => {
			expect(
				pruefeVersionsschritte([{ ...abgleich, version: '0.5.2', obersteVersion: '0.5.2' }])
			).toEqual([expect.stringContaining('0.5.0 → 0.5.2 ist kein einzelner Schritt')]);
		});

		it('meldet eine neue Nummer ohne obersten Abschnitt in docs/versionen.md', () => {
			expect(pruefeVersionsschritte([{ ...abgleich, obersteVersion: '0.5.0' }])).toEqual([
				expect.stringContaining('oberster Abschnitt ist 0.5.0, nicht 0.6.0')
			]);
		});

		it('meldet einen fehlenden Abschnitt «Unveröffentlicht»', () => {
			expect(pruefeVersionsschritte([{ ...abgleich, unveroeffentlicht: undefined }])).toEqual([
				expect.stringContaining('Abschnitt «## Unveröffentlicht» fehlt')
			]);
		});
	});

	describe('reine Doku', () => {
		it('verlangt keinen Eintrag und meldet eine neue Nummer', () => {
			const doku = { ...merge, nurDoku: true, unveroeffentlicht: VORHER };
			expect(pruefeVersionsschritte([doku])).toEqual([]);
			expect(pruefeVersionsschritte([{ ...abgleich, nurDoku: true }])).toEqual([
				expect.stringContaining('reine Doku, aber Version steigt')
			]);
		});
	});

	it('prüft jeden Schritt einzeln', () => {
		const zweiter = {
			...merge,
			commit: 'def5678',
			unveroeffentlichtVorher: merge.unveroeffentlicht,
			unveroeffentlicht: merge.unveroeffentlicht
		};
		expect(pruefeVersionsschritte([merge, zweiter])).toEqual([
			expect.stringContaining(`def5678: ${OHNE_EINTRAG}`)
		]);
	});
});
