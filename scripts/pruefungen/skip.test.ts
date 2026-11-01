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
	it('nennt Datei und Zeile', () => {
		expect(pruefeSkip(new Map([['a.test.ts', "ok\ntest.skip('x')"]]))[0]).toContain('a.test.ts:2');
	});
});
