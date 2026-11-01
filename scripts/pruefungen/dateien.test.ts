import { describe, expect, it } from 'vitest';
import { istTestquelle } from './dateien.ts';

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
