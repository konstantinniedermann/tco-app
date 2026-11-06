import { describe, expect, it } from 'vitest';
import {
	absageSperreText,
	datumKurz,
	datumLang,
	geschlechtText,
	jahrgangText,
	klassierungText,
	statusText,
	unpassendText
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

	it('FR-35, FR-36: Texte zu Anmeldungen mit richtiger Einzahl und Mehrzahl', () => {
		expect(unpassendText(1)).toBe(
			'1 Anmeldung passt nach der Änderung nicht mehr zu dieser Kategorie. Sie bleibt trotzdem stehen.'
		);
		expect(unpassendText(3)).toBe(
			'3 Anmeldungen passen nach der Änderung nicht mehr zu dieser Kategorie. Sie bleiben trotzdem stehen.'
		);
		expect(absageSperreText(1)).toBe(
			'Diese Kategorie hat 1 aktive Anmeldung. Absagen geht erst, wenn keine mehr da ist.'
		);
		expect(absageSperreText(2)).toBe(
			'Diese Kategorie hat 2 aktive Anmeldungen. Absagen geht erst, wenn keine mehr da sind.'
		);
	});
});
