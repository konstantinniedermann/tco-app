import { describe, expect, it } from 'vitest';
import { millisekunden } from './klappe.ts';

describe('Dauer der Bewegungs-Tokens (UI-09)', () => {
	it('liest Millisekunden und Sekunden', () => {
		expect(millisekunden('250ms')).toBe(250);
		expect(millisekunden(' 0.35s ')).toBe(350);
	});

	it('gibt 0 bei fehlendem oder unbekanntem Wert (keine Bewegung)', () => {
		expect(millisekunden('')).toBe(0);
		expect(millisekunden('schnell')).toBe(0);
	});
});
