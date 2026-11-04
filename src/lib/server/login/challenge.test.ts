import { describe, expect, it } from 'vitest';
import { CHALLENGE_GUELTIG_MS, CHALLENGE_MAX, ChallengeSpeicher } from './challenge.ts';

function speicher() {
	let t = 0;
	return { s: new ChallengeSpeicher({ jetzt: () => t }), setze: (n: number) => (t = n) };
}

describe('ChallengeSpeicher', () => {
	it('SI-18: Challenge gilt nur einmal', () => {
		const { s } = speicher();
		s.lege('v1', 'abc');
		expect(s.nimm('v1')).toBe('abc');
		expect(s.nimm('v1')).toBeNull();
	});

	it('SI-18: Challenge verfällt nach 5 Minuten', () => {
		const { s, setze } = speicher();
		s.lege('v1', 'abc');
		s.lege('v2', 'def');
		setze(CHALLENGE_GUELTIG_MS);
		expect(s.nimm('v1')).toBe('abc');
		setze(CHALLENGE_GUELTIG_MS + 1);
		expect(s.nimm('v2')).toBeNull();
	});

	it('SI-18: unbekannter, leerer oder fremdartiger Schlüssel ergibt null', () => {
		const { s } = speicher();
		s.lege('v1', 'abc');
		expect(s.nimm('x')).toBeNull();
		expect(s.nimm('')).toBeNull();
		expect(s.nimm(42)).toBeNull();
		expect(s.nimm(undefined)).toBeNull();
	});

	it('SI-18: höchstens 1000 offene Challenges, die älteste fällt weg', () => {
		const { s } = speicher();
		for (let i = 0; i <= CHALLENGE_MAX; i++) s.lege(`v${i}`, `c${i}`);
		expect(s.nimm('v0')).toBeNull();
		expect(s.nimm(`v${CHALLENGE_MAX}`)).toBe(`c${CHALLENGE_MAX}`);
		expect(s.nimm('v1')).toBe('c1');
	});
});
