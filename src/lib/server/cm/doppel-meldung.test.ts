import { describe, expect, test } from 'vitest';
import {
	abgelehntMeldung,
	abgemeldetMeldung,
	anfrageGeloeschtText,
	angenommenMeldung,
	anfrageMeldung,
	austrittAnfrageMeldung,
	austrittMeldung,
	geloeschtDoppelText,
	herausgenommenText,
	hinfaelligMeldung,
	neuerPartnerText,
	ohneErsatzText,
	verschobenDoppelText,
	vonHandAlleinText,
	vonHandPaarText
} from './doppel-meldung.ts';

describe('Meldungen zum Doppel', () => {
	test('FR-04: Austritt des Partners, ohne Grund und ohne Namen', () => {
		expect(austrittMeldung('Mixed Doppel', 7)).toEqual({
			titel: 'Clubmeisterschaft',
			text: 'Eure Anmeldung für «Mixed Doppel» ist zurückgezogen.',
			pfad: '/clubmeisterschaft/7'
		});
	});

	test('FR-04: Anfrage an oder von einem Ausgetretenen ist hinfällig', () => {
		expect(austrittAnfrageMeldung('Herren Doppel', 12)).toEqual({
			titel: 'Clubmeisterschaft',
			text: 'Die Anfrage für «Herren Doppel» ist hinfällig.',
			pfad: '/clubmeisterschaft/12'
		});
	});

	test('FR-48, FR-47: Texte der Anfrage, Antwort und Abmeldung nennen nur den Namen des anderen', () => {
		const m = (text: string) => ({
			titel: 'Clubmeisterschaft',
			text,
			pfad: '/clubmeisterschaft/7'
		});
		expect(anfrageMeldung('Lea Marbach', 'Mixed Doppel', 7)).toEqual(
			m(
				'Lea Marbach möchte mit dir «Mixed Doppel» spielen. Annehmen oder ablehnen kannst du in MyTCO.'
			)
		);
		expect(angenommenMeldung('Marco Beispiel', 'Mixed Doppel', 7)).toEqual(
			m('Marco Beispiel hat angenommen. Ihr seid für «Mixed Doppel» angemeldet.')
		);
		expect(abgelehntMeldung('Marco Beispiel', 'Mixed Doppel', 7)).toEqual(
			m('Marco Beispiel hat deine Anfrage für «Mixed Doppel» abgelehnt.')
		);
		expect(hinfaelligMeldung('Marco Beispiel', 'Mixed Doppel', 7)).toEqual(
			m(
				'Marco Beispiel hat inzwischen einen Partner für «Mixed Doppel». Die Anfrage ist hinfällig.'
			)
		);
		expect(abgemeldetMeldung('Lea Marbach', 'Mixed Doppel', 7)).toEqual(
			m('Lea Marbach hat sich von «Mixed Doppel» abgemeldet. Eure Anmeldung ist zurückgezogen.')
		);
	});

	test('FR-46, FR-47: Texte des CM-Admins nennen den anderen Spieler, nie den CM-Admin beim Namen', () => {
		expect(vonHandPaarText('Marco Beispiel', 'Mixed Doppel')).toBe(
			'Der CM-Admin hat dich mit Marco Beispiel für «Mixed Doppel» angemeldet. Partner und Gegner sehen deine E-Mail und Telefonnummer.'
		);
		expect(vonHandAlleinText('Mixed Doppel')).toBe(
			'Der CM-Admin hat dich für «Mixed Doppel» angemeldet; du suchst noch einen Partner. Partner und Gegner sehen deine E-Mail und Telefonnummer.'
		);
		expect(anfrageGeloeschtText('Marco Beispiel', 'Mixed Doppel')).toBe(
			'Deine Anfrage an Marco Beispiel für «Mixed Doppel» ist hinfällig.'
		);
	});

	test('FR-46, FR-47: Partner ändern, verschieben und löschen nennen den anderen, nie den CM-Admin beim Namen', () => {
		expect(herausgenommenText('Lena Aebi', 'Mixed Doppel')).toBe(
			'Der CM-Admin hat dich aus dem Doppel mit Lena Aebi für «Mixed Doppel» genommen.'
		);
		expect(neuerPartnerText('Marco Beispiel', 'Mixed Doppel')).toBe(
			'Der CM-Admin hat Marco Beispiel als deinen Partner für «Mixed Doppel» eingetragen.'
		);
		expect(ohneErsatzText('Mixed Doppel')).toBe(
			'Der CM-Admin hat deinen Partner aus «Mixed Doppel» genommen. Du suchst jetzt einen Partner.'
		);
		expect(verschobenDoppelText('Offenes Doppel', 'Herren Doppel')).toBe(
			'Der CM-Admin hat eure Anmeldung von «Offenes Doppel» nach «Herren Doppel» verschoben.'
		);
		expect(geloeschtDoppelText('Mixed Doppel')).toBe(
			'Der CM-Admin hat eure Anmeldung für «Mixed Doppel» gelöscht.'
		);
	});
});
