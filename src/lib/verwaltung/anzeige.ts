// Texte der Verwaltung: Namen von Feldern, Rollen und Verlaufseinträgen, Zeitangaben.
import { MELDUNG } from '../login/anmelden.ts';
import type { Antwort, FairgateZeile, Feld, MitgliedZeile, Rolle, VerlaufEintrag } from './api.ts';
import { ROLLEN_NAME } from './rollen-namen.ts';

const NUR_ANSEHEN = 'In der Ansicht kannst du nichts speichern.';
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

/** Rollen als Namen in der Reihenfolge der Rollen-Seite: «Mitglieder-Admin, CM-Admin». */
export function rollenText(rollen: readonly Rolle[]): string {
	return (Object.keys(ROLLEN_NAME) as Rolle[])
		.filter((r) => rollen.includes(r))
		.map((r) => ROLLEN_NAME[r])
		.join(', ');
}

/** Meldung, wenn zwischen Laden und Speichern ein anderer das Mitglied geändert hat (409). */
export const VERALTET =
	'Inzwischen hat jemand anderes dieses Mitglied geändert. Nichts gespeichert: Lade den neuen Stand und gib deine Änderung nochmals ein.';

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

/** Geschlecht als Wort, wie im Angabenformular. */
export const GESCHLECHT_NAME = { w: 'weiblich', m: 'männlich' } as const;

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
			return z.detail === 'einlesen' ? 'angelegt (Einlesen)' : 'angelegt';
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
		case 'brief-code-ausgestellt':
			return 'Brief-Code ausgestellt';
		case 'cm-anmeldung-geaendert':
			return 'CM-Anmeldung geändert (CM)';
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

const ZONE = 'Europe/Zurich';

const ZEIT = new Intl.DateTimeFormat('de-CH', {
	dateStyle: 'short',
	timeStyle: 'short',
	timeZone: ZONE
});
// Wie der Brief (formatiereDatum): der Zürcher Kalendertag, nicht der des Browsers.
const TAG = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium', timeZone: ZONE });

/** «01.02.27, 00:30» in Zürcher Zeit, nicht in der des Browsers. */
export const zeitText = (iso: string) => ZEIT.format(new Date(iso));
/** «01.02.2027» nach dem Kalender in Zürich. */
export const tagText = (iso: string) => TAG.format(new Date(iso));
const DATUM = new Intl.DateTimeFormat('de-CH', {
	timeZone: ZONE,
	day: 'numeric',
	month: 'numeric',
	year: 'numeric'
});
const DATUM_ZEIT = new Intl.DateTimeFormat('de-CH', {
	timeZone: ZONE,
	day: 'numeric',
	month: 'numeric',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

/** «7.11.2026» nach dem Kalender in Zürich. */
export const datumText = (iso: string) => DATUM.format(new Date(iso)).replaceAll(' ', '');

/** «7.11.2026, 09:12» in Zürcher Zeit. */
export function datumZeitText(iso: string): string {
	const t = Object.fromEntries(
		DATUM_ZEIT.formatToParts(new Date(iso)).map((p) => [p.type, p.value])
	);
	return `${t.day}.${t.month}.${t.year}, ${t.hour}:${t.minute}`;
}

// Zürcher Kalendertag von `jetzt`, um Jahre und Tage verschoben (Überlauf: 29.2. wird 1.3.).
function verschoben(jetzt: Date, jahre: number, tage: number): string {
	const t = Object.fromEntries(DATUM.formatToParts(jetzt).map((p) => [p.type, p.value]));
	const d = new Date(Date.UTC(Number(t.year) + jahre, Number(t.month) - 1, Number(t.day) + tage));
	return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
}

/** Nur zur Anzeige in der Rückfrage: bis wann der Wiedereintritt ginge (Annahme K-38: ein Kalenderjahr). */
export const wiedereintrittBis = (jetzt: Date) => verschoben(jetzt, 1, 0);

/** Nur zur Anzeige in der Rückfrage: wann die Löschung fällig wird (Bedenkzeit sieben Tage). */
export const loeschungAm = (jetzt: Date) => verschoben(jetzt, 0, 7);

/** «Vorname Nachname» für Titel (die Auskunft liefert «Nachname, Vorname»). */
export const auskunftTitel = (a: { vorname: string; nachname: string }) =>
	`${a.vorname} ${a.nachname}`;
