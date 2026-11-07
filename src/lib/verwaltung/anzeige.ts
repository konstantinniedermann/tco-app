// Texte der Verwaltung: Namen von Feldern, Rollen und Verlaufseinträgen, Zeitangaben.
import { MELDUNG } from '../login/anmelden.ts';
import type { Antwort, FairgateZeile, Feld, MitgliedZeile, VerlaufEintrag } from './api.ts';
import { ROLLEN_NAME } from './rollen-namen.ts';

export const NUR_ANSEHEN = 'In der Ansicht kannst du nichts speichern.';
const KEIN_RECHT = 'Das darfst du hier nur ansehen, nicht ändern.';

/**
 * Meldung für eine Antwort, die keine Seite eigens behandelt: In der Ansicht oder ohne
 * Schreibrecht sagt sie, warum nichts gespeichert ist; sonst die Störung (UI-06).
 */
export function fehlerText(a: Antwort<unknown>): string {
	if (a.art === 'nur-ansehen') return NUR_ANSEHEN;
	if (a.art === 'kein-recht') return KEIN_RECHT;
	return MELDUNG.stoerung;
}

export const FELD_NAMEN: Record<Feld | 'klassierung', string> = {
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
	lizenznummer: 'Lizenznummer'
};

// Verlaufseinträge von vor dem Umbau der Rollen nennen noch die alte Rolle admin.
const VERLAUF_ROLLEN: Record<string, string> = { ...ROLLEN_NAME, admin: 'Admin' };

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

/** «Telefon geändert», «Rolle CM-Admin vergeben» … (FR-26: nie Werte). */
export function aktionText(z: Pick<VerlaufEintrag, 'aktion' | 'detail'>): string {
	switch (z.aktion) {
		case 'angelegt':
			return 'angelegt';
		case 'feld-geaendert':
			return `${nameVon(FELD_NAMEN, z.detail)} geändert`;
		case 'rolle-vergeben':
			return `Rolle ${nameVon(VERLAUF_ROLLEN, z.detail)} vergeben`;
		case 'rolle-entzogen':
			return `Rolle ${nameVon(VERLAUF_ROLLEN, z.detail)} entzogen`;
		case 'sitzungen-beendet':
			return 'alle Sitzungen beendet';
		case 'fairgate-uebertragen':
			return 'In Fairgate übertragen';
		case 'ausgetreten':
			return 'Austritt erfasst';
		case 'wiedereingetreten':
			return 'Wiedereintritt erfasst';
		case 'loeschung-vorgemerkt':
			return 'zum Löschen vorgemerkt';
		case 'loeschung-zurueckgenommen':
			return 'Löschung rückgängig gemacht';
		case 'auskunft-erstellt':
			return 'Auskunft erstellt';
		default:
			return z.aktion;
	}
}

const ADRESSE: readonly Feld[] = ['strasse', 'plz', 'ort'];

/** Spalte «Geändert» der Liste Für Fairgate: Adressfelder zusammengefasst, «Adresse, E-Mail». */
export function geaendertText(felder: readonly Feld[]): string {
	const namen = felder.map((f) => (ADRESSE.includes(f) ? 'Adresse' : FELD_NAMEN[f]));
	return [...new Set(namen)].join(', ');
}

/** Spalte «Neue Angaben»: die Werte der geänderten Angaben, eine Zeile je Angabe. */
export function neueAngaben(z: Pick<FairgateZeile, 'felder' | 'angaben'>): string[] {
	const a = z.angaben;
	const zeilen: string[] = [];
	if (z.felder.some((f) => ADRESSE.includes(f))) {
		const ortZeile = [a.plz, a.ort].filter(Boolean).join(' ');
		zeilen.push([a.strasse, ortZeile].filter(Boolean).join(', ') || '(leer)');
	}
	if (z.felder.includes('email')) zeilen.push(a.email);
	if (z.felder.includes('telefon')) zeilen.push(a.telefon || '(leer)');
	return zeilen;
}

/** Plakette der Mitgliederliste: Status des Kontos, bei Austritt oder Löschung der Status. */
export function plakette(z: Pick<MitgliedZeile, 'login' | 'status'>): {
	text: string;
	klasse: string;
} {
	if (z.status === 'ausgetreten') return { text: 'ausgetreten', klasse: 'plakette' };
	if (z.status === 'vorgemerkt')
		return { text: 'wird gelöscht', klasse: 'plakette plakette-gesperrt' };
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
