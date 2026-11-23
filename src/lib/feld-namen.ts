// Die Anzeigenamen der Angaben eines Mitglieds; Oberfläche und Server (Meldungstexte) teilen sie.
import type { Feld } from './server/admin/angaben.ts';

export const FELD_NAMEN: Record<Feld | 'klassierung' | 'rufname', string> = {
	mitgliedernummer: 'Mitgliedernummer',
	vorname: 'Vorname',
	nachname: 'Nachname',
	strasse: 'Strasse',
	plz: 'PLZ',
	ort: 'Ort',
	email: 'E-Mail',
	telefon: 'Telefon',
	geschlecht: 'Geschlecht',
	jahrgang: 'Jahrgang',
	klassierung: 'Klassierung',
	rufname: 'Rufname',
	lizenznummer: 'Lizenznummer'
};
