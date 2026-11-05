import { describe, expect, test } from 'vitest';
import type { AnlassAnsicht } from './api.ts';
import { standText } from './stand.ts';

const BASIS: AnlassAnsicht = {
	id: 1,
	titel: 'Generalversammlung 2027',
	beginn: '2027-03-19T18:30:00.000Z',
	ort: 'Clubhaus',
	einladung: '',
	anmeldeschluss: '2027-03-16T22:59:00.000Z',
	offen: true,
	antwort: null,
	bemerkung: null,
	zuPruefen: false,
	kalender: '/api/kalender/x'
};

describe('Stand eines Anlasses für das Mitglied', () => {
	test('offen ohne Antwort: bis wann an- oder abmelden', () => {
		expect(standText(BASIS)).toBe('Bitte bis Di, 16. März an- oder abmelden');
	});

	test('mit Antwort: kommt oder kommt nicht', () => {
		expect(standText({ ...BASIS, antwort: 'kommt' })).toBe('Du kommst');
		expect(standText({ ...BASIS, antwort: 'kommt-nicht' })).toBe('Du kommst nicht');
	});

	test('FR-32: Datum oder Ort geändert geht vor', () => {
		expect(standText({ ...BASIS, antwort: 'kommt', zuPruefen: true })).toBe(
			'Datum oder Ort geändert, bitte prüfe deine Antwort'
		);
	});

	test('geschlossen ohne Antwort', () => {
		expect(standText({ ...BASIS, offen: false })).toBe('Anmeldung geschlossen');
	});
});
