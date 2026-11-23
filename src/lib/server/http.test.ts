import { describe, expect, it } from 'vitest';
import { leseBenachrichtigen } from './http.ts';

describe('leseBenachrichtigen', () => {
	it('nimmt ohne Angabe den Standard', () => {
		expect(leseBenachrichtigen({}, true)).toBe(true);
		expect(leseBenachrichtigen({}, false)).toBe(false);
	});

	it('nimmt true und false, wie gegeben', () => {
		expect(leseBenachrichtigen({ benachrichtigen: true }, false)).toBe(true);
		expect(leseBenachrichtigen({ benachrichtigen: false }, true)).toBe(false);
	});

	it('weist andere Typen als Eingabefehler ab', () => {
		for (const wert of ['ja', 1, 0, null, [], {}]) {
			expect(leseBenachrichtigen({ benachrichtigen: wert }, true)).toBeNull();
		}
	});
});
