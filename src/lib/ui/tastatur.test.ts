import { describe, expect, it } from 'vitest';
import { naechstesFeld, oeffnetTastatur } from './tastatur.ts';

describe('Eingabe mit Tastatur (UI-Leitbild)', () => {
	it('erkennt Felder, die die Tastatur des Handys öffnen', () => {
		expect(oeffnetTastatur('INPUT', 'text')).toBe(true);
		expect(oeffnetTastatur('INPUT', 'tel')).toBe(true);
		expect(oeffnetTastatur('INPUT', 'email')).toBe(true);
		expect(oeffnetTastatur('TEXTAREA', 'textarea')).toBe(true);
		expect(oeffnetTastatur('SELECT', 'select-one')).toBe(true);
	});

	it('Tasten, Häkchen und Auswahlknöpfe öffnen keine Tastatur', () => {
		const typen = ['checkbox', 'radio', 'submit', 'button', 'reset', 'file', 'range', 'hidden'];
		for (const typ of typen) expect(oeffnetTastatur('INPUT', typ), typ).toBe(false);
		expect(oeffnetTastatur('BUTTON', 'submit')).toBe(false);
		expect(oeffnetTastatur('A', '')).toBe(false);
	});

	it('«Weiter» führt zum nächsten Feld mit Tastatur, im letzten gibt es keines', () => {
		const strasse = { name: 'strasse', tastatur: true };
		const haken = { name: 'haken', tastatur: false };
		const plz = { name: 'plz', tastatur: true };
		const taste = { name: 'speichern', tastatur: false };
		const felder = [strasse, haken, plz, taste];
		const mitTastatur = (f: { tastatur: boolean }) => f.tastatur;
		expect(naechstesFeld(felder, strasse, mitTastatur)).toBe(plz);
		expect(naechstesFeld(felder, plz, mitTastatur)).toBeNull();
	});
});
