import { describe, expect, it } from 'vitest';
import roh from '../../../docs/datenschutzerklaerung.md?raw';
import { leseErklaerung } from './erklaerung.ts';

const BEISPIEL = `[← Zurück](x.md)

# Titel der Doku

Hinweis nur für die Doku.

---

## Datenschutz in MyTCO

Stand: [Datum]

**Welche Daten:** Name und
Adresse.

- Erster Punkt
  geht weiter.
- **Fett:** zweiter Punkt.

Schluss.
`;

describe('Datenschutzerklärung aus der Doku (DS-09)', () => {
	it('nimmt nur den Teil nach der Trennlinie', () => {
		const e = leseErklaerung(BEISPIEL);
		expect(e.titel).toBe('Datenschutz in MyTCO');
		expect(JSON.stringify(e)).not.toContain('Hinweis nur für die Doku');
	});

	it('fasst Absätze und Listenpunkte über Zeilen zusammen, Fettes als eigener Teil', () => {
		expect(leseErklaerung(BEISPIEL).bloecke).toEqual([
			{ art: 'absatz', teile: [{ text: 'Stand: [Datum]', fett: false }] },
			{
				art: 'absatz',
				teile: [
					{ text: 'Welche Daten:', fett: true },
					{ text: ' Name und Adresse.', fett: false }
				]
			},
			{
				art: 'liste',
				punkte: [
					[{ text: 'Erster Punkt geht weiter.', fett: false }],
					[
						{ text: 'Fett:', fett: true },
						{ text: ' zweiter Punkt.', fett: false }
					]
				]
			},
			{ art: 'absatz', teile: [{ text: 'Schluss.', fett: false }] }
		]);
	});

	it('liest die echte Erklärung ohne Markdown-Reste', () => {
		const e = leseErklaerung(roh);
		expect(e.titel).toBe('Datenschutz in MyTCO');
		const text = JSON.stringify(e);
		expect(text).toContain('Kein Tracking:');
		// JSON schreibt einen Zeilenumbruch als \n.
		expect(text).not.toMatch(/\*\*|"#|\\n/);
	});

	it('DS-09: Erklärung nennt CM-Anmeldungen und ihre Aufbewahrung', () => {
		const text = JSON.stringify(leseErklaerung(roh));
		expect(text).toContain('Anmeldungen zur Clubmeisterschaft');
		expect(text).toContain('Namen der bestätigten Anmeldungen');
		expect(text).toContain('bei deinen Anmeldungen zur Clubmeisterschaft');
	});

	it('DS-09: Erklärung sagt, wer Klassierung, Geschlecht und Jahrgang ändert (FR-37)', () => {
		const text = JSON.stringify(leseErklaerung(roh));
		expect(text).toContain('Klassierung änderst du jederzeit im Profil');
		expect(text).toContain(
			'Geschlecht und Jahrgang trägst du einmal auf der Seite der Clubmeisterschaft ein'
		);
	});

	it('meldet einen fehlenden Titel als Fehler statt eine leere Seite zu zeigen', () => {
		expect(() => leseErklaerung('ohne Trennlinie')).toThrow();
	});
});
