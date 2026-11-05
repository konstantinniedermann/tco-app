import { describe, expect, test } from 'vitest';
import { pruefeAnlass, pruefeAntwort } from './angaben.ts';

const GUT = {
	titel: '  Generalversammlung 2027 ',
	beginn: '2027-03-19T19:30',
	ort: 'Clubhaus',
	einladung: 'Traktanden',
	anmeldeschluss: '2027-03-16T23:59'
};

describe('Angaben eines Anlasses', () => {
	test('gültige Angaben werden getrimmt und in Zeitpunkte umgerechnet', () => {
		const r = pruefeAnlass(GUT);
		expect(r).toEqual({
			ok: true,
			werte: {
				titel: 'Generalversammlung 2027',
				beginn: new Date('2027-03-19T18:30:00Z'),
				ort: 'Clubhaus',
				einladung: 'Traktanden',
				anmeldeschluss: new Date('2027-03-16T22:59:00Z')
			}
		});
	});

	test('Pflichtfelder fehlen: Meldung je Feld', () => {
		expect(pruefeAnlass({})).toEqual({
			ok: false,
			felder: {
				titel: 'Bitte einen Titel angeben.',
				beginn: 'Bitte Datum und Zeit angeben.',
				ort: 'Bitte einen Ort angeben.',
				anmeldeschluss: 'Bitte Datum und Zeit angeben.'
			}
		});
	});

	test('Einladung darf leer sein', () => {
		const r = pruefeAnlass({ ...GUT, einladung: undefined });
		expect(r.ok && r.werte.einladung).toBe('');
	});

	test('FR-28: Anmeldeschluss nach Beginn wird abgewiesen', () => {
		expect(pruefeAnlass({ ...GUT, anmeldeschluss: '2027-03-19T19:31' })).toEqual({
			ok: false,
			felder: { anmeldeschluss: 'Der Anmeldeschluss darf nicht nach dem Beginn liegen.' }
		});
	});

	test('Längen: Titel und Ort höchstens 120, Einladung höchstens 5000 Zeichen', () => {
		expect(
			pruefeAnlass({
				...GUT,
				titel: 'x'.repeat(121),
				ort: 'y'.repeat(121),
				einladung: 'z'.repeat(5001)
			})
		).toEqual({
			ok: false,
			felder: {
				titel: 'Höchstens 120 Zeichen.',
				ort: 'Höchstens 120 Zeichen.',
				einladung: 'Höchstens 5000 Zeichen.'
			}
		});
	});

	test('Zeit, die es wegen der Umstellung nicht gibt, gilt als fehlend', () => {
		const r = pruefeAnlass({ ...GUT, beginn: '2027-03-28T02:30' });
		expect(r.ok === false && r.felder.beginn).toBe('Bitte Datum und Zeit angeben.');
	});
});

describe('Antwort zu einem Anlass', () => {
	test('FR-30: Bemerkung wird getrimmt, leer wird null', () => {
		expect(pruefeAntwort({ antwort: 'kommt-nicht', bemerkung: '  Ferien  ' })).toEqual({
			ok: true,
			antwort: 'kommt-nicht',
			bemerkung: 'Ferien'
		});
		expect(pruefeAntwort({ antwort: 'kommt-nicht', bemerkung: '   ' })).toEqual({
			ok: true,
			antwort: 'kommt-nicht',
			bemerkung: null
		});
	});

	test('FR-30: 500 Zeichen gehen, 501 sind zu lang', () => {
		expect(pruefeAntwort({ antwort: 'kommt-nicht', bemerkung: 'a'.repeat(500) }).ok).toBe(true);
		expect(pruefeAntwort({ antwort: 'kommt-nicht', bemerkung: 'a'.repeat(501) })).toEqual({
			ok: false,
			feld: 'bemerkung'
		});
	});

	test('FR-30: bei kommt fällt die Bemerkung weg', () => {
		expect(pruefeAntwort({ antwort: 'kommt', bemerkung: 'Hallo' })).toEqual({
			ok: true,
			antwort: 'kommt',
			bemerkung: null
		});
	});

	test('unbekannte Antwort oder falscher Typ der Bemerkung', () => {
		expect(pruefeAntwort({ antwort: 'vielleicht' })).toEqual({ ok: false, feld: 'antwort' });
		expect(pruefeAntwort({ antwort: 'kommt-nicht', bemerkung: 5 })).toEqual({
			ok: false,
			feld: 'bemerkung'
		});
	});
});
