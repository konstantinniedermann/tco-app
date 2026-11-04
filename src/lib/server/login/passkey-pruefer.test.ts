import { describe, expect, it } from 'vitest';
import { kennungAusAntwort } from './passkey-pruefer.ts';

describe('kennungAusAntwort', () => {
	it('A-LOGIN-07: liefert die id nur, wenn sie base64url und höchstens 1023 Zeichen lang ist', () => {
		expect(kennungAusAntwort({ id: 'abC-_12' })).toBe('abC-_12');
		expect(kennungAusAntwort({ id: 'a'.repeat(1023) })).toBe('a'.repeat(1023));
		expect(kennungAusAntwort({ id: 'a'.repeat(1024) })).toBeNull();
		for (const schlecht of [{ id: '' }, { id: 'a b' }, { id: 'a=' }, { id: 5 }, {}, null, 'x', 7])
			expect(kennungAusAntwort(schlecht)).toBeNull();
	});
});
