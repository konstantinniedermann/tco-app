import { describe, expect, it } from 'vitest';
import {
	datumKurz,
	datumLang,
	geschlechtText,
	jahrgangText,
	klassierungText,
	statusText
} from './turnier-anzeige.ts';

describe('Anzeigehilfen für Turniere', () => {
	it('FR-33: Status als Plakette mit Wort', () => {
		expect(statusText('vorbereitung')).toEqual({
			text: 'in Vorbereitung',
			klasse: 'plakette-offen'
		});
		expect(statusText('offen')).toEqual({ text: 'Anmeldung offen', klasse: 'plakette-ok' });
		expect(statusText('geschlossen')).toEqual({
			text: 'Anmeldung geschlossen',
			klasse: 'plakette-gesperrt'
		});
	});

	it('FR-33: Datum aus dem Kalendertag, ohne Zeitzonenverschiebung', () => {
		expect(datumLang('2027-05-31')).toBe('Montag, 31. Mai 2027');
		expect(datumKurz('2027-05-31')).toBe('31.5.2027');
		expect(datumKurz('2027-01-01')).toBe('1.1.2027');
	});

	it('FR-34: Jahrgang und Klassierung als Kurztext', () => {
		expect(jahrgangText(null, null)).toBe('');
		expect(jahrgangText(2009, null)).toBe('ab 2009');
		expect(jahrgangText(null, 1982)).toBe('bis 1982');
		expect(jahrgangText(1990, 1999)).toBe('1990–1999');
		expect(
			klassierungText({
				art: 'einzel',
				klassierungVon: 'R1',
				klassierungBis: 'R6',
				mindestsumme: null
			})
		).toBe('R1–R6');
		expect(
			klassierungText({
				art: 'doppel',
				klassierungVon: null,
				klassierungBis: null,
				mindestsumme: 9
			})
		).toBe('Summe ab 9');
	});

	it('FR-34: Geschlecht als Wort', () => {
		expect(geschlechtText('herren')).toBe('Herren');
		expect(geschlechtText('damen')).toBe('Damen');
		expect(geschlechtText('mixed')).toBe('Mixed');
		expect(geschlechtText('offen')).toBe('offen');
	});
});
