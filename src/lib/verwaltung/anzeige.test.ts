import { describe, expect, it } from 'vitest';
import { MELDUNG } from '../login/anmelden.ts';
import {
	aktionText,
	fehlerText,
	feldMeldung,
	geaendertText,
	neueAngaben,
	plakette
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

	it('FR-26, FR-46: Änderungen des CM-Admins an Anmeldungen stehen neutral im Verlauf', () => {
		expect(aktionText({ aktion: 'cm-anmeldung-geaendert', detail: null })).toBe(
			'CM-Anmeldung geändert (CM)'
		);
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
