import { describe, expect, test } from 'vitest';
import { MAX_TEXT, MAX_TITEL, vorlagenAnlass } from './vorlagen.ts';

// Erfundener Anlass; Beginn und Schluss in UTC, angezeigt in Schweizer Zeit (Winterzeit, +1 h).
const GV = {
	titel: 'Generalversammlung 2027',
	beginn: new Date('2027-03-19T18:30:00Z'),
	anmeldeschluss: new Date('2027-03-16T22:59:00Z')
};

describe('Vorlagen zum Anlass', () => {
	test('FR-42: Vorlagen füllen Titel, Beginn und Anmeldeschluss in Schweizer Zeit', () => {
		expect(vorlagenAnlass(GV)).toEqual([
			{
				art: 'erinnerung',
				titel: 'Erinnerung: Generalversammlung 2027',
				text: 'Generalversammlung 2027: Bitte melde dich bis Di, 16. März an oder ab.'
			},
			{
				art: 'aenderung',
				titel: 'Geändert: Generalversammlung 2027',
				text: 'Generalversammlung 2027: Datum, Zeit oder Ort geändert. Bitte prüfe deine Antwort.'
			},
			{
				art: 'neu',
				titel: 'Neuer Anlass: Generalversammlung 2027',
				text: 'Neu in MyTCO: Generalversammlung 2027 am Freitag, 19. März 2027, 19.30 Uhr. Melde dich an.'
			}
		]);
	});

	test('FR-42: Vorlagen bleiben in den Grenzen auch mit langem Anlasstitel', () => {
		const lang = 'Sommerfest mit Grill '.repeat(6).slice(0, 120);
		expect(lang).toHaveLength(120);
		const vorlagen = vorlagenAnlass({ ...GV, titel: lang });
		expect(vorlagen.map((v) => v.art)).toEqual(['erinnerung', 'aenderung', 'neu']);
		for (const v of vorlagen) {
			expect(v.titel.length, v.titel).toBeLessThanOrEqual(MAX_TITEL);
			expect(v.text.length, v.text).toBeLessThanOrEqual(MAX_TEXT);
			expect(v.titel).toContain('…');
			expect(v.titel).toMatch(/^(Erinnerung|Geändert|Neuer Anlass): Sommerfest/);
		}
		// Im Text hat der längste Anlasstitel (120 Zeichen) noch ganz Platz.
		for (const v of vorlagen) expect(v.text).toContain(lang);
		// Ein noch längerer Titel wird auch im Text gekürzt; der feste Teil bleibt ganz.
		const [erinnerung, aenderung, neu] = vorlagenAnlass({ ...GV, titel: 'x'.repeat(300) });
		for (const v of [erinnerung, aenderung, neu])
			expect(v.text.length, v.text).toBeLessThanOrEqual(MAX_TEXT);
		expect(erinnerung.text).toMatch(/^x+…: Bitte melde dich bis Di, 16\. März an oder ab\.$/);
		expect(aenderung.text).toMatch(
			/^x+…: Datum, Zeit oder Ort geändert\. Bitte prüfe deine Antwort\.$/
		);
		expect(neu.text).toMatch(
			/^Neu in MyTCO: x+… am Freitag, 19\. März 2027, 19\.30 Uhr\. Melde dich an\.$/
		);
		expect(neu.text).toHaveLength(MAX_TEXT);
	});

	test('FR-42: Kürzen trennt kein Zeichen ausserhalb der Grundebene (Emoji)', () => {
		const titel = 'a'.repeat(36) + '🎾' + 'b'.repeat(20);
		const [erinnerung] = vorlagenAnlass({ ...GV, titel });
		// «Erinnerung: » (12) + 36 «a» = 48 Zeichen; das Emoji (2) hätte keinen Platz mehr vor «…».
		expect(erinnerung.titel).toBe(`Erinnerung: ${'a'.repeat(36)}…`);
		expect(erinnerung.titel).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
	});
});
