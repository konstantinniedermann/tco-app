import { describe, expect, test } from 'vitest';
import {
	abgelehntMeldung,
	abgemeldetMeldung,
	angenommenMeldung,
	anfrageMeldung,
	austrittAnfrageMeldung,
	austrittMeldung,
	hinfaelligMeldung
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
});
