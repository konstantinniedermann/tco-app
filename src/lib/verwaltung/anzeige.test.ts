import { describe, expect, it } from 'vitest';
import { aktionText, feldMeldung, plakette } from './anzeige.ts';

describe('Texte der Verwaltung', () => {
	it('FR-26: Verlaufstexte nennen Feld oder Rolle, nie einen Wert', () => {
		expect(aktionText({ aktion: 'feld-geaendert', detail: 'telefon' })).toBe('Telefon geändert');
		expect(aktionText({ aktion: 'rolle-vergeben', detail: 'cm' })).toBe(
			'Rolle CM-Verantwortliche vergeben'
		);
		expect(aktionText({ aktion: 'rolle-entzogen', detail: 'admin' })).toBe('Rolle Admin entzogen');
		expect(aktionText({ aktion: 'angelegt', detail: null })).toBe('angelegt');
		expect(aktionText({ aktion: 'fairgate-uebertragen', detail: null })).toBe(
			'In Fairgate übertragen'
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
});
