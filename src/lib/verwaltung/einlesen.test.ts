import { describe, expect, it } from 'vitest';
import { dateiFehlerText, zeilenFehlerText } from './einlesen.ts';

describe('Texte beim Einlesen', () => {
	it('A-MITGLIED-07: Kodierung nennt den Weg in Excel', () => {
		expect(dateiFehlerText({ grund: 'kodierung' })).toContain('«CSV UTF-8»');
	});

	it('A-MITGLIED-07: Kopfzeile nennt unbekannte, fehlende und doppelte Spalten', () => {
		expect(
			dateiFehlerText({ grund: 'spalten', unbekannt: ['iban', ''], fehlend: ['plz'], doppelt: [] })
		).toBe('Die Kopfzeile passt nicht zur Vorlage (unbekannt: iban, (leer) · fehlt: plz).');
	});

	it('A-MITGLIED-07: Zeilenfehler mit Feldname, Feldzahl ohne', () => {
		expect(zeilenFehlerText({ plz: '4 Ziffern', email: 'fehlt' })).toBe(
			'PLZ: 4 Ziffern · E-Mail: fehlt'
		);
		expect(zeilenFehlerText({ zeile: '3 Felder statt 7' })).toBe('3 Felder statt 7');
	});
});
