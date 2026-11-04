import { describe, expect, it } from 'vitest';
import type { Angaben } from './angaben.ts';
import { geaenderteFelder } from './verlauf.ts';

const alt: Angaben = {
	mitgliedernummer: null,
	vorname: 'Erika',
	nachname: 'Beispiel',
	strasse: 'Musterweg 1',
	plz: '4600',
	ort: 'Olten',
	email: 'erika@example.org',
	telefon: null,
	geschlecht: null,
	jahrgang: null,
	lizenznummer: null
};

describe('geaenderteFelder', () => {
	it('FR-26: geaenderteFelder nennt nur echt geänderte Felder', () => {
		const neu = { ...alt, ort: 'Aarau', vorname: 'Eva', telefon: '+41 00 000 00 00' };
		expect(geaenderteFelder(alt, neu)).toEqual(['vorname', 'ort', 'telefon']);
		expect(geaenderteFelder(alt, { ...alt })).toEqual([]);
	});
});
