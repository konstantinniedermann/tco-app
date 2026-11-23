import { describe, expect, test } from 'vitest';
import { profilMeldung, rolleMeldung, zugangMeldung } from './meldung.ts';

describe('Meldungen der Verwaltung (FR-56)', () => {
	test('Profil: Feldnamen wie im Formular, in der Reihenfolge der Felder', () => {
		expect(profilMeldung(['telefon', 'strasse'])).toEqual({
			titel: 'Dein Profil',
			text: 'Die Verwaltung hat dein Profil geändert: Strasse, Telefon.',
			pfad: '/profil'
		});
		expect(profilMeldung(['email']).text).toBe('Die Verwaltung hat dein Profil geändert: E-Mail.');
	});

	test('Rolle vergeben und entzogen', () => {
		expect(rolleMeldung('cm', 'vergeben')).toEqual({
			titel: 'MyTCO',
			text: 'Du hast neu die Rolle «CM-Admin».',
			pfad: '/'
		});
		expect(rolleMeldung('mitglieder', 'entzogen')).toEqual({
			titel: 'MyTCO',
			text: 'Deine Rolle «Mitglieder-Admin» wurde entfernt.',
			pfad: '/'
		});
	});

	test('Zugang wieder offen', () => {
		expect(zugangMeldung()).toEqual({
			titel: 'MyTCO',
			text: 'Dein Zugang zu MyTCO ist wieder offen.',
			pfad: '/'
		});
	});
});
