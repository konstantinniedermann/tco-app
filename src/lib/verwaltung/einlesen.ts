// A-MITGLIED-07: Einleseschema für Seite und Server. Durchgesetzt wird auf dem Server
// (`server/admin/einlesen.ts`); die Seite prüft die Grösse nur, um sich die Anfrage zu sparen.
import type { Feld } from '../server/admin/angaben.ts';
import type { DateiFehler } from '../server/admin/einlesen.ts';
import { FELD_NAMEN } from './anzeige.ts';

// Unter der Grenze des Servers für eine Anfrage (512 KB), samt JSON-Hülle (Projektleiter, 08.11.2026).
export const MAX_BYTES = 400 * 1024;
export const MAX_ZEILEN = 2000;

export const VORLAGE = 'mytco-einlesen-vorlage.csv';

/** Die Spalten in der Reihenfolge der Vorlage, mit der Regel für die Seite. */
export const SPALTEN: readonly { spalte: Feld; pflicht: boolean; form: string }[] = [
	{ spalte: 'mitgliedernummer', pflicht: true, form: '1–20 Ziffern oder Buchstaben, aus Fairgate' },
	{ spalte: 'vorname', pflicht: true, form: 'höchstens 100 Zeichen' },
	{ spalte: 'nachname', pflicht: true, form: 'höchstens 100 Zeichen' },
	{ spalte: 'strasse', pflicht: true, form: 'höchstens 100 Zeichen' },
	{ spalte: 'plz', pflicht: true, form: '4 Ziffern' },
	{ spalte: 'ort', pflicht: true, form: 'höchstens 100 Zeichen' },
	{ spalte: 'email', pflicht: true, form: 'eine Adresse je Mitglied' },
	{ spalte: 'telefon', pflicht: false, form: '6–20 Zeichen aus Ziffern, Leerzeichen und +' },
	{ spalte: 'geschlecht', pflicht: false, form: 'w, m oder leer' },
	{ spalte: 'jahrgang', pflicht: false, form: 'vierstellig, z. B. 1980' },
	{ spalte: 'lizenznummer', pflicht: false, form: '1–20 Ziffern oder Buchstaben' }
];

export const PFLICHT_SPALTEN: readonly Feld[] = SPALTEN.filter((s) => s.pflicht).map(
	(s) => s.spalte
);

/** Satz zum Fehler der ganzen Datei (UI-06: was tun). */
export function dateiFehlerText(f: DateiFehler): string {
	switch (f.grund) {
		case 'leer':
			return 'Die Datei ist leer.';
		case 'keine-zeilen':
			return 'Die Datei enthält nur die Kopfzeile, keine Mitglieder.';
		case 'zu-gross':
			return 'Die Datei ist grösser als 400 KB. Teile sie auf und lies die Teile nacheinander ein.';
		case 'zu-viele-zeilen':
			return `Die Datei hat mehr als ${MAX_ZEILEN} Zeilen. Teile sie auf und lies die Teile nacheinander ein.`;
		case 'kodierung':
			return 'Die Datei ist nicht als UTF-8 gespeichert, Umlaute gingen verloren. In Excel: Datei › Speichern unter › «CSV UTF-8».';
		case 'anfuehrungszeichen':
			return 'In der Datei ist ein Anführungszeichen nicht geschlossen.';
		case 'spalten': {
			const teile = [
				f.unbekannt.length ? `unbekannt: ${f.unbekannt.map((s) => s || '(leer)').join(', ')}` : '',
				f.fehlend.length ? `fehlt: ${f.fehlend.join(', ')}` : '',
				f.doppelt.length ? `doppelt: ${f.doppelt.join(', ')}` : ''
			].filter(Boolean);
			return `Die Kopfzeile passt nicht zur Vorlage (${teile.join(' · ')}).`;
		}
	}
}

/** «PLZ: 4 Ziffern · E-Mail: fehlt»; eine falsche Feldzahl steht ohne Feldname. */
export function zeilenFehlerText(fehler: Partial<Record<Feld | 'zeile', string>>): string {
	return Object.entries(fehler)
		.map(([feld, text]) => (feld === 'zeile' ? text : `${FELD_NAMEN[feld as Feld]}: ${text}`))
		.join(' · ');
}

export const VORHANDEN_GRUND = {
	nummer: 'gleiche Mitgliedernummer',
	email: 'gleiche E-Mail',
	beides: 'gleiche Mitgliedernummer und E-Mail'
} as const;
