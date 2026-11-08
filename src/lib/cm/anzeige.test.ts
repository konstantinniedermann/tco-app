import { describe, expect, test } from 'vitest';
import type { KategorieRegel } from '../turnier/passung.ts';
import {
	doppelText,
	kategorieText,
	kommentarZaehlerText,
	namenText,
	rueckfrageText,
	standText,
	SUCHTEXT_MAX,
	suchtextZaehlerText,
	waehlbar,
	vermerkText,
	vornameVon,
	weiterePaare
} from './anzeige.ts';

const regel = (k: Partial<KategorieRegel> = {}): KategorieRegel => ({
	art: 'einzel',
	geschlecht: 'herren',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: null,
	klassierungBis: null,
	mindestsumme: null,
	...k
});

describe('Anzeige der Clubmeisterschaft für Mitglieder', () => {
	test('A-ANMELDUNG-02: Stand als Text', () => {
		expect(standText(0)).toBe('Noch keine Anmeldung');
		expect(standText(1)).toBe('1 Anmeldung');
		expect(standText(2)).toBe('2 Anmeldungen');
		expect(standText(3)).toBe('3 Anmeldungen');
	});

	test('FR-07: Kategorie als Kurztext ohne leere Teile', () => {
		expect(
			kategorieText(regel({ jahrgangVon: 2009, klassierungVon: 'R1', klassierungBis: 'R6' }))
		).toBe('Herren · R1–R6 · ab Jahrgang 2009');
		expect(kategorieText(regel({ geschlecht: 'damen' }))).toBe('Damen');
		expect(kategorieText(regel({ geschlecht: 'offen', jahrgangBis: 1976 }))).toBe(
			'bis Jahrgang 1976'
		);
		expect(
			kategorieText(regel({ geschlecht: 'offen', klassierungVon: 'R1', klassierungBis: 'R9' }))
		).toBe('R1–R9');
		expect(
			kategorieText(
				regel({
					jahrgangVon: 1980,
					jahrgangBis: 1989,
					klassierungVon: 'R7',
					klassierungBis: 'R9'
				})
			)
		).toBe('Herren · R7–R9 · Jahrgang 1980–1989');
	});

	test('A-ANMELDUNG-01: Namen der Angemeldeten', () => {
		expect(namenText([])).toBe('Noch niemand angemeldet.');
		expect(namenText(['Anna Beispiel'])).toBe('Angemeldet (1): Anna Beispiel');
		expect(namenText(['Anna Beispiel', 'Bea Muster'])).toBe(
			'Angemeldet (2): Anna Beispiel, Bea Muster'
		);
	});

	test('FR-08: Zähler des Wildcard-Kommentars', () => {
		expect(kommentarZaehlerText(0)).toBe('0 von 300 Zeichen');
		expect(kommentarZaehlerText(12)).toBe('12 von 300 Zeichen');
	});

	test('A-ANMELDUNG-02: Stand nennt offene Anfragen an einen', () => {
		expect(standText(2, 1)).toBe('2 Anmeldungen · 1 Anfrage');
		expect(standText(0, 2)).toBe('Noch keine Anmeldung · 2 Anfragen');
		expect(standText(1, 0)).toBe('1 Anmeldung');
	});

	test('A-ANMELDUNG-04: Doppel als Kurztext, ohne leere Teile', () => {
		expect(doppelText(regel({ art: 'doppel', geschlecht: 'mixed', mindestsumme: 9 }))).toBe(
			'Doppel · Mixed · zusammen mind. 9'
		);
		expect(doppelText(regel({ art: 'doppel', geschlecht: 'damen' }))).toBe('Doppel · Damen');
		expect(doppelText(regel({ art: 'doppel', geschlecht: 'offen', mindestsumme: 0 }))).toBe(
			'Doppel · zusammen mind. 0'
		);
	});

	test('FR-48: Vermerk in der Partnersuche als Text', () => {
		expect(vermerkText('klassierung-fehlt')).toBe('Klassierung fehlt');
		expect(vermerkText('angaben-fehlen')).toBe('Angaben fehlen');
	});

	test('FR-49: Zähler des Kommentars «sucht Partner»', () => {
		expect(SUCHTEXT_MAX).toBe(120);
		expect(suchtextZaehlerText(45)).toBe('45 von 120 Zeichen');
	});

	test('FR-19: Kontakt des Partners als Link, weitere Paare ohne das eigene', () => {
		expect(waehlbar('079 000 00 01')).toBe('0790000001');
		expect(waehlbar('+41 (79) 000-00-01')).toBe('+41790000001');
		expect(vornameVon('Marco Muster')).toBe('Marco');
		expect(
			weiterePaare(['Lea Beispiel / Marco Muster', 'Jonas Keller / Nina Brunner'], 'Marco Muster')
		).toEqual(['Jonas Keller / Nina Brunner']);
	});

	test('FR-48: Rückfrage vor der Anfrage nennt den Angefragten beim Vornamen', () => {
		expect(rueckfrageText('Marco')).toBe(
			'Marco sieht deinen Namen, deine Klassierung und deine Telefonnummer, damit Marco dich ' +
				'anrufen kann. Nimmt Marco an, seid ihr angemeldet und seht gegenseitig E-Mail und Telefon.'
		);
	});
});
