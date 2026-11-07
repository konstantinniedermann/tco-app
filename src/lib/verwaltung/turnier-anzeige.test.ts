import { describe, expect, it } from 'vitest';
import {
	absageSperreText,
	anmeldungenText,
	anmeldungStatus,
	datumKurz,
	datumLang,
	geschlechtText,
	jahrgangText,
	klassierungText,
	spielerGeschlechtText,
	statusText,
	trefferText,
	unpassendText,
	warnungText
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

	it('FR-46: Warnungen beim Anmelden von Hand als kurze Sätze, in fester Reihenfolge', () => {
		expect(warnungText(['passt-nicht', 'voll'])).toBe(
			'Passt nicht zur Kategorie. Hat schon 3 Anmeldungen.'
		);
		expect(warnungText(['angaben-fehlen', 'passt-nicht', 'voll', 'geschlossen'])).toBe(
			'Angaben fehlen. Passt nicht zur Kategorie. Hat schon 3 Anmeldungen. Anmeldung ist geschlossen.'
		);
		expect(warnungText([])).toBe('');
	});

	it('A-ANMELDUNG-06: Zähler der Anmeldungen nennt die Wildcard-Anträge', () => {
		const z = (status: 'bestaetigt' | 'beantragt') => ({ status });
		expect(anmeldungenText([])).toBe('Noch keine Anmeldungen.');
		expect(anmeldungenText([z('bestaetigt')])).toBe('1 Anmeldung');
		expect(anmeldungenText([z('beantragt')])).toBe('1 Anmeldung, 1 Wildcard-Antrag');
		expect(
			anmeldungenText([
				z('bestaetigt'),
				z('bestaetigt'),
				z('bestaetigt'),
				z('bestaetigt'),
				z('beantragt')
			])
		).toBe('5 Anmeldungen, 1 Wildcard-Antrag');
		expect(anmeldungenText([z('beantragt'), z('beantragt')])).toBe(
			'2 Anmeldungen, 2 Wildcard-Anträge'
		);
	});

	it('A-ANMELDUNG-06, FR-08: Status der Anmeldung als Plakette mit Text', () => {
		expect(anmeldungStatus('bestaetigt')).toEqual({ text: 'bestätigt', klasse: 'plakette-ok' });
		expect(anmeldungStatus('beantragt')).toEqual({
			text: 'Wildcard beantragt',
			klasse: 'plakette-offen'
		});
	});

	it('A-ANMELDUNG-06: Geschlecht und Angaben eines Spielers, Fehlendes als Strich', () => {
		expect(spielerGeschlechtText('w')).toBe('weiblich');
		expect(spielerGeschlechtText('m')).toBe('männlich');
		expect(spielerGeschlechtText(null)).toBe('–');
		expect(trefferText({ klassierung: 'R7', geschlecht: 'w', jahrgang: 1990 })).toBe(
			'R7 · weiblich · 1990'
		);
		expect(trefferText({ klassierung: 'keine', geschlecht: 'm', jahrgang: null })).toBe(
			'keine Lizenz · männlich · Jahrgang fehlt'
		);
		expect(trefferText({ klassierung: null, geschlecht: null, jahrgang: 2001 })).toBe(
			'Klassierung fehlt · Geschlecht fehlt · 2001'
		);
	});
});
