import { describe, expect, it } from 'vitest';
import { istKlappeOffen, merkeKlappe, millisekunden, vergissKlappen } from './klappe.ts';

describe('Aufklappbereiche merken sich, ob sie offen sind', () => {
	it('sind anfangs zu und bleiben so, wie man sie zuletzt gelassen hat', () => {
		expect(istKlappeOffen('profil-angaben')).toBe(false);
		merkeKlappe('profil-angaben', true);
		expect(istKlappeOffen('profil-angaben')).toBe(true);
		expect(istKlappeOffen('profil-passkey')).toBe(false);
		merkeKlappe('profil-angaben', false);
		expect(istKlappeOffen('profil-angaben')).toBe(false);
	});

	it('vergessen alles beim Abmelden', () => {
		merkeKlappe('profil-passkey', true);
		vergissKlappen();
		expect(istKlappeOffen('profil-passkey')).toBe(false);
	});
});

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
