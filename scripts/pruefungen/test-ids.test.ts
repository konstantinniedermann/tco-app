import { describe, expect, it } from 'vitest';
import { faelligeIds, fehlendeTests, nichtAusgefuehrteTests } from './test-ids.ts';

describe('nichtAusgefuehrteTests', () => {
	it('meldet Testdateien ausserhalb der Muster der Testprogramme', () => {
		expect(
			nichtAusgefuehrteTests(['src/a.test.ts', 'lib/b.test.ts', 'tests/e2e/c.spec.ts'])
		).toEqual([
			'lib/b.test.ts: Testdatei wird von keinem Testprogramm ausgeführt',
			'tests/e2e/c.spec.ts: Testdatei wird von keinem Testprogramm ausgeführt'
		]);
	});
});

describe('fehlendeTests', () => {
	it('beachtet die Wortgrenze', () => {
		expect(fehlendeTests(['FR-1'], ["test('FR-10: x')"])).toEqual(['FR-1']);
		expect(fehlendeTests(['FR-10'], ["test('FR-10: x')"])).toEqual([]);
	});
	it('findet die ID in irgendeiner Quelle', () => {
		expect(fehlendeTests(['RR-02', 'A-X-01'], ['a', "// RR-02\ntest('A-X-01')"])).toEqual([]);
	});
});

describe('faelligeIds', () => {
	const leer = { fachmodell: '', rollen: '', anforderungen: '', testkonzept: '' };

	it('liefert umgesetzte IDs, Checkliste deckt A-IDs ab', () => {
		expect(
			faelligeIds({
				fachmodell: '| FR-01 | x | A-1 | umgesetzt |\n| FR-02 | y | A-2 | geplant |',
				rollen: '',
				anforderungen: '| A-LOGIN-01 | x | q | e | umgesetzt\\* |',
				testkonzept: '## Checkliste vor dem Release\n- [ ] Brief (A-LOGIN-01)'
			})
		).toEqual(['FR-01']);
	});
	it('liest Rollen-Zeilen und ignoriert den Stern', () => {
		expect(
			faelligeIds({
				...leer,
				rollen: '| RR-01 | Regel | umgesetzt* |\n| RR-02 | Regel | geplant |'
			})
		).toEqual(['RR-01']);
	});
	it('meldet nicht abgedeckte A-IDs', () => {
		expect(
			faelligeIds({
				...leer,
				anforderungen: '| A-LOGIN-01 | x | q | e | umgesetzt |',
				testkonzept: '## Checkliste vor dem Release\n- [ ] Brief\n\n## Werkzeuge\nA-LOGIN-01'
			})
		).toEqual(['A-LOGIN-01']);
	});
	it('ignoriert Gross-/Kleinschreibung beim Status', () => {
		expect(faelligeIds({ ...leer, rollen: '| RR-01 | Regel | Umgesetzt |' })).toEqual(['RR-01']);
	});
	it('ignoriert Status ausser umgesetzt', () => {
		expect(
			faelligeIds({ ...leer, anforderungen: '| A-X-01 | x | q | e | verworfen — nicht nötig |' })
		).toEqual([]);
	});
});
