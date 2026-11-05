// Texte der Verwaltung: Namen von Feldern, Rollen und Verlaufseinträgen, Zeitangaben.
import type { Feld, MitgliedZeile, Rolle, VerlaufEintrag } from './api.ts';

export const FELD_NAMEN: Record<Feld, string> = {
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
	lizenznummer: 'Lizenznummer'
};

export const ROLLEN_NAMEN: Record<Rolle, string> = {
	admin: 'Admin',
	cm: 'CM-Verantwortliche',
	lizenz: 'Lizenzverantwortliche/r'
};

/** Meldung beim Feld, wenn E-Mail oder Nummer schon einem anderen Mitglied gehört (409). */
export const VERGEBEN = {
	email: 'Diese E-Mail-Adresse gehört schon einem anderen Mitglied',
	mitgliedernummer: 'Diese Nummer gehört schon einem anderen Mitglied'
} as const;

/** Fehlertext des Servers («fehlt», «4 Ziffern») als Satz beim Feld (UI-06). */
export function feldMeldung(text: string): string {
	return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

const nameVon = <T extends string>(namen: Record<T, string>, roh: string | null) =>
	roh !== null && roh in namen ? namen[roh as T] : (roh ?? '');

/** «Telefon geändert», «Rolle Admin vergeben» … (FR-26: nie Werte). */
export function aktionText(z: Pick<VerlaufEintrag, 'aktion' | 'detail'>): string {
	switch (z.aktion) {
		case 'angelegt':
			return 'angelegt';
		case 'feld-geaendert':
			return `${nameVon(FELD_NAMEN, z.detail)} geändert`;
		case 'rolle-vergeben':
			return `Rolle ${nameVon(ROLLEN_NAMEN, z.detail)} vergeben`;
		case 'rolle-entzogen':
			return `Rolle ${nameVon(ROLLEN_NAMEN, z.detail)} entzogen`;
		case 'sitzungen-beendet':
			return 'alle Sitzungen beendet';
		case 'fairgate-uebertragen':
			return 'In Fairgate übertragen';
		default:
			return z.aktion;
	}
}

/** Plakette der Mitgliederliste: Status des Kontos, bei Austritt oder Löschung der Status. */
export function plakette(z: Pick<MitgliedZeile, 'login' | 'status'>): {
	text: string;
	klasse: string;
} {
	if (z.status === 'ausgetreten') return { text: 'ausgetreten', klasse: 'plakette' };
	if (z.status === 'geloescht') return { text: 'gelöscht', klasse: 'plakette' };
	switch (z.login) {
		case 'eingeloggt':
			return { text: 'aktiv', klasse: 'plakette plakette-ok' };
		case 'brief-offen':
			return { text: 'Brief offen', klasse: 'plakette plakette-offen' };
		case 'gesperrt':
			return { text: 'gesperrt', klasse: 'plakette plakette-gesperrt' };
		default:
			return { text: 'ohne Brief', klasse: 'plakette' };
	}
}

const ZEIT = new Intl.DateTimeFormat('de-CH', { dateStyle: 'short', timeStyle: 'short' });
const TAG = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' });

export const zeitText = (iso: string) => ZEIT.format(new Date(iso));
export const tagText = (iso: string) => TAG.format(new Date(iso));
