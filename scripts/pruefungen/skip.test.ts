import { describe, expect, it } from 'vitest';
import { pruefeSkip } from './skip.ts';

describe('pruefeSkip', () => {
	it('meldet skip und fixme ohne Begründung', () => {
		expect(pruefeSkip(new Map([['a.test.ts', "test.skip('x')"]]))).toHaveLength(1);
		expect(pruefeSkip(new Map([['a.test.ts', "it.fixme('x')"]]))).toHaveLength(1);
	});
	it('akzeptiert eine Begründung im Kommentar derselben Zeile', () => {
		expect(pruefeSkip(new Map([['a.test.ts', "test.skip('x') // skip: wartet auf K-27"]]))).toEqual(
			[]
		);
	});
	it.each([
		"test.skip.each([1])('x', () => {})",
		"describe.skip.each([1])('x', () => {})",
		"it.skipIf(cond)('x', () => {})",
		"describe.skipIf(cond)('x', () => {})",
		"test.todo('x')",
		"xit('x')",
		"xtest('x')",
		"xdescribe('x')",
		"describe\n\t.skip('x', () => {})",
		"it.runIf(cond)('x', () => {})",
		"it.fails('x', () => {})",
		'test.fail()',
		"test('x', ({ skip }) => { skip() })",
		"test('x', (ctx) => { ctx.skip() })",
		"test.skip('x') // skip:",
		"test.skip('x') // skip:   "
	])('meldet auch %j', (code) => {
		expect(pruefeSkip(new Map([['a.test.ts', code]]))).toHaveLength(1);
	});
	it('lässt Wörter wie skipped oder text.todo-Liste nicht anschlagen', () => {
		expect(pruefeSkip(new Map([['a.test.ts', "const skipped = 1; mix('x')"]]))).toEqual([]);
		expect(pruefeSkip(new Map([['a.test.ts', 'const failed = r.failed; unskip(x)']]))).toEqual([]);
	});
	it('nennt Datei und Zeile', () => {
		expect(pruefeSkip(new Map([['a.test.ts', "ok\ntest.skip('x')"]]))[0]).toContain('a.test.ts:2');
	});
});
