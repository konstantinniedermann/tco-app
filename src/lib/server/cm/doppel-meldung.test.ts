import { describe, expect, test } from 'vitest';
import { austrittAnfrageMeldung, austrittMeldung } from './doppel-meldung.ts';

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
});
