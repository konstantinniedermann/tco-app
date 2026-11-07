import { describe, expect, it } from 'vitest';
import { MELDUNG } from '../login/anmelden.ts';
import {
	aktionText,
	fehlerText,
	feldMeldung,
	geaendertText,
	neueAngaben,
	plakette,
	datumText,
	datumZeitText,
	wiedereintrittBis,
	loeschungAm,
	auskunftTitel
} from './anzeige.ts';

describe('Texte der Verwaltung', () => {
	it('Ansicht als …: nur-ansehen und kein-recht sagen, warum nichts gespeichert ist', () => {
		expect(fehlerText({ art: 'nur-ansehen' })).toBe('In der Ansicht kannst du nichts speichern.');
		expect(fehlerText({ art: 'kein-recht' })).toBe('Das darfst du hier nur ansehen, nicht ändern.');
		expect(fehlerText({ art: 'stoerung' })).toBe(MELDUNG.stoerung);
		expect(fehlerText({ art: 'veraltet' })).toBe(MELDUNG.stoerung);
	});

	it('FR-26: Verlaufstexte nennen Feld oder Rolle, nie einen Wert', () => {
		expect(aktionText({ aktion: 'feld-geaendert', detail: 'telefon' })).toBe('Telefon geändert');
		expect(aktionText({ aktion: 'feld-geaendert', detail: 'klassierung' })).toBe(
			'Klassierung geändert'
		);
		expect(aktionText({ aktion: 'rolle-vergeben', detail: 'cm' })).toBe('Rolle CM-Admin vergeben');
		expect(aktionText({ aktion: 'rolle-vergeben', detail: 'mytco' })).toBe(
			'Rolle MyTCO-Admin vergeben'
		);
		// Einträge von vor dem Umbau der Rollen nennen die alte Rolle.
		expect(aktionText({ aktion: 'rolle-entzogen', detail: 'admin' })).toBe('Rolle Admin entzogen');
		expect(aktionText({ aktion: 'angelegt', detail: null })).toBe('angelegt');
		expect(aktionText({ aktion: 'fairgate-uebertragen', detail: null })).toBe(
			'In Fairgate übertragen'
		);
	});

	it('Verlaufstexte für Austritt, Löschen und Auskunft', () => {
		const text = (aktion: Parameters<typeof aktionText>[0]['aktion']) =>
			aktionText({ aktion, detail: null });
		expect(text('ausgetreten')).toBe('Austritt erfasst');
		expect(text('wiedereingetreten')).toBe('Wiedereintritt erfasst');
		expect(text('loeschung-vorgemerkt')).toBe('zum Löschen vorgemerkt');
		expect(text('loeschung-zurueckgenommen')).toBe('Löschung rückgängig gemacht');
		expect(text('auskunft-erstellt')).toBe('Auskunft erstellt');
		expect(plakette({ login: 'eingeloggt', status: 'vorgemerkt' })).toEqual({
			text: 'wird gelöscht',
			klasse: 'plakette plakette-gesperrt'
		});
	});

	it('UI-06: Fehlertext des Servers wird ein Satz', () => {
		expect(feldMeldung('fehlt')).toBe('Fehlt.');
		expect(feldMeldung('4 Ziffern')).toBe('4 Ziffern.');
	});

	it('UI-05: Plakette immer mit Text', () => {
		expect(plakette({ login: 'brief-offen', status: 'aktiv' }).text).toBe('Brief offen');
		expect(plakette({ login: 'eingeloggt', status: 'aktiv' }).text).toBe('aktiv');
		expect(plakette({ login: 'eingeloggt', status: 'ausgetreten' }).text).toBe('ausgetreten');
		expect(plakette({ login: 'ohne-brief', status: 'aktiv' }).text).toBe('ohne Brief');
	});

	it('A-KONTO-02: Geändert fasst die Adressfelder zusammen', () => {
		expect(geaendertText(['email', 'strasse', 'plz', 'ort'])).toBe('E-Mail, Adresse');
		expect(geaendertText(['strasse', 'plz', 'email'])).toBe('Adresse, E-Mail');
		expect(geaendertText(['telefon'])).toBe('Telefon');
	});

	it('A-KONTO-02: Neue Angaben zeigen nur geänderte Werte, Geleertes als «(leer)»', () => {
		const angaben = {
			email: 'lea@example.org',
			telefon: null,
			strasse: 'Neuweg 2',
			plz: '8000',
			ort: 'Zürich'
		};
		expect(neueAngaben({ felder: ['strasse', 'email'], angaben })).toEqual([
			'Neuweg 2, 8000 Zürich',
			'lea@example.org'
		]);
		expect(neueAngaben({ felder: ['telefon'], angaben })).toEqual(['(leer)']);
	});
});

describe('Datumstexte der Mitgliedschaft (Schweizer Zeit)', () => {
	it('Datum als «7.11.2026», nach Zürcher Kalender', () => {
		expect(datumText('2026-11-07T10:00:00Z')).toBe('7.11.2026');
		expect(datumText('2026-11-07T23:30:00Z')).toBe('8.11.2026');
		expect(datumText('2026-07-31T22:30:00Z')).toBe('1.8.2026');
	});

	it('Datum mit Zeit als «7.11.2026, 09:12»', () => {
		expect(datumZeitText('2026-11-07T08:12:00Z')).toBe('7.11.2026, 09:12');
	});

	it('Frist des Wiedereintritts: ein Kalenderjahr, 29. Februar wird 1. März', () => {
		expect(wiedereintrittBis(new Date('2026-11-07T10:00:00Z'))).toBe('7.11.2027');
		expect(wiedereintrittBis(new Date('2026-11-07T23:30:00Z'))).toBe('8.11.2027');
		expect(wiedereintrittBis(new Date('2028-02-29T10:00:00Z'))).toBe('1.3.2029');
	});

	it('Löschung nach der Bedenkzeit: sieben Tage', () => {
		expect(loeschungAm(new Date('2026-11-07T10:00:00Z'))).toBe('14.11.2026');
		expect(loeschungAm(new Date('2026-10-25T10:00:00Z'))).toBe('1.11.2026');
	});

	it('Titel der Auskunft: Vorname Nachname', () => {
		expect(auskunftTitel({ vorname: 'Lea', nachname: 'Beispiel' })).toBe('Lea Beispiel');
	});
});
