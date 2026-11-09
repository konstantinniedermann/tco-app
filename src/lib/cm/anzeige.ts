// Anzeigehilfen der Clubmeisterschaft für Mitglieder: reine Funktionen, Browser und Server.
import type { KategorieRegel, Vermerk } from '../turnier/passung.ts';
import { nameText, type Namensteile } from '../name.ts';
import { geschlechtText } from '../verwaltung/turnier-anzeige.ts';

/**
 * A-ANMELDUNG-02: eigener Stand auf der Startseiten-Kachel, mit den offenen Anfragen an einen
 * («2 Anmeldungen · 1 Anfrage»).
 */
export function standText(anzahl: number, anfragen = 0): string {
	const stand =
		anzahl === 0
			? 'Noch keine Anmeldung'
			: `${anzahl} ${anzahl === 1 ? 'Anmeldung' : 'Anmeldungen'}`;
	return anfragen === 0
		? stand
		: `${stand} · ${anfragen} ${anfragen === 1 ? 'Anfrage' : 'Anfragen'}`;
}

function jahrgang(von: number | null, bis: number | null): string {
	if (von !== null && bis !== null) return `Jahrgang ${von}–${bis}`;
	if (von !== null) return `ab Jahrgang ${von}`;
	if (bis !== null) return `bis Jahrgang ${bis}`;
	return '';
}

/** FR-07: «Herren · R1–R6 · ab Jahrgang 2009»; was die Kategorie nicht einschränkt, fehlt. */
export function kategorieText(k: KategorieRegel): string {
	const klassierung =
		k.klassierungVon !== null && k.klassierungBis !== null
			? `${k.klassierungVon}–${k.klassierungBis}`
			: '';
	return [
		k.geschlecht === 'offen' ? '' : geschlechtText(k.geschlecht),
		klassierung,
		jahrgang(k.jahrgangVon, k.jahrgangBis)
	]
		.filter((teil) => teil !== '')
		.join(' · ');
}

/** A-ANMELDUNG-04: ein Paar in der kurzen Textform, «Lea Beispiel / Hannes (Johannes Muster)». */
export const paarText = (paar: Namensteile[]): string =>
	paar.map((n) => nameText(n, 'vorname-zuerst')).join(' / ');

/** FR-08: Längengrenze des Wildcard-Kommentars. */
export const KOMMENTAR_MAX = 300;

/** FR-08: Zähler unter dem Kommentarfeld, «12 von 300 Zeichen». */
export const kommentarZaehlerText = (laenge: number): string =>
	`${laenge} von ${KOMMENTAR_MAX} Zeichen`;

/** A-ANMELDUNG-04: «Doppel · Mixed · zusammen mind. 9»; was die Kategorie nicht einschränkt, fehlt. */
export function doppelText(k: KategorieRegel): string {
	return [
		'Doppel',
		k.geschlecht === 'offen' ? '' : geschlechtText(k.geschlecht),
		k.mindestsumme === null ? '' : `zusammen mind. ${k.mindestsumme}`
	]
		.filter((teil) => teil !== '')
		.join(' · ');
}

const VERMERK: Record<Vermerk, string> = {
	'klassierung-fehlt': 'Klassierung fehlt',
	'angaben-fehlen': 'Angaben fehlen'
};

/** FR-48: Vermerk eines möglichen Partners in der Suche. */
export const vermerkText = (v: Vermerk): string => VERMERK[v];

/** FR-49: Längengrenze des Kommentars *sucht Partner*. */
export const SUCHTEXT_MAX = 120;

/** FR-49: Zähler unter dem Kommentarfeld, «45 von 120 Zeichen». */
export const suchtextZaehlerText = (laenge: number): string =>
	`${laenge} von ${SUCHTEXT_MAX} Zeichen`;

/** Hinweis vor der ersten Anmeldung im Turnier (Datenschutz, Kontaktdaten). */
export const KONTAKT_HINWEIS =
	'Deine Gegner und dein Doppelpartner sehen während der Clubmeisterschaft deine ' +
	'E-Mail-Adresse und Telefonnummer, damit ihr die Spiele selbst abmachen könnt. ' +
	'Verbergen geht nicht.';

/** FR-19: Telefonnummer für einen `tel:`-Link, nur Ziffern und ein führendes «+». */
export const waehlbar = (nummer: string): string =>
	`${nummer.trim().startsWith('+') ? '+' : ''}${nummer.replace(/\D/g, '')}`;

/** FR-19: wie `KONTAKT_HINWEIS`, für den Weg über die Anfrage (Rückfrage, Annehmen). */
const PAAR_KONTAKT_HINWEIS =
	'Dann sehen deine Gegner und dein Doppelpartner während der Clubmeisterschaft deine ' +
	'E-Mail-Adresse und Telefonnummer.';

/**
 * FR-48, FR-19: Text der Rückfrage vor dem Senden einer Anfrage; `anrede` ist der Rufname des
 * Angefragten, sonst sein Vorname (`anredeName`).
 */
export function rueckfrageText(anrede: string): string {
	return (
		`${anrede} sieht deinen Namen, deine Klassierung und deine Telefonnummer (ohne Telefon deine ` +
		`E-Mail), damit ${anrede} dich erreichen kann. Nimmt ${anrede} an, seid ihr angemeldet. ` +
		PAAR_KONTAKT_HINWEIS
	);
}

/** FR-48, FR-19: Hinweis auf der Anfrage-Karte, bevor der Angefragte annimmt. */
export const ANNEHMEN_HINWEIS = `Nimmst du an, seid ihr angemeldet. ${PAAR_KONTAKT_HINWEIS}`;

/** Was eine Karte der Übersicht vom eigenen Stand braucht (Browser- und Server-Typ). */
type EigenerStand = {
	art: 'einzel' | 'doppel';
	anmeldungId: number | null;
	eigen: { art: 'paar' | 'sucht' } | null;
};

/** Plakette im Kartenkopf: der eigene Stand in der Kategorie, sonst `null`. */
export function standPlakette<K extends EigenerStand>(
	k: K,
	wildcard: boolean
): { text: 'angemeldet' | 'sucht Partner' | 'Wildcard beantragt'; art: 'ok' | 'offen' } | null {
	if (k.anmeldungId === null) return null;
	if (wildcard) return { text: 'Wildcard beantragt', art: 'offen' };
	if (k.art === 'doppel' && k.eigen?.art === 'sucht')
		return { text: 'sucht Partner', art: 'offen' };
	return { text: 'angemeldet', art: 'ok' };
}

/** Text der Kachel auf die Seite der Kategorie: «12 angemeldet», im Doppel «5 Paare». */
export function anmeldungenText(k: {
	art: 'einzel' | 'doppel';
	namen: unknown[];
	paare: unknown[];
}): string {
	const n = k.art === 'doppel' ? k.paare.length : k.namen.length;
	// Im Doppel zählen nur Paare; wer allein sucht, steht zugeklappt darüber.
	if (k.art === 'doppel') return n === 0 ? 'Noch kein Paar' : `${n} ${n === 1 ? 'Paar' : 'Paare'}`;
	if (n === 0) return 'Noch niemand angemeldet';
	return `${n} angemeldet`;
}

/** Titel der zugeklappten Suchenden einer Doppel-Karte. */
export const suchendeText = (n: number): string => `${n} ${n === 1 ? 'sucht' : 'suchen'} Partner`;

export const NACHRICHT_MAX = 1000;
export const NACHRICHT_NUR_LESEN = 'Schreiben geht zurzeit nicht.';

const BLASE_ZEIT = new Intl.DateTimeFormat('de-CH', {
	timeZone: 'Europe/Zurich',
	weekday: 'short',
	day: 'numeric',
	month: 'long',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

/** Kopf einer Sprechblase: «Du · Mo, 9. Juni, 18:40» (Zürcher Zeit). */
export function blaseKopfText(von: 'du' | 'leitung', gesendetAm: string): string {
	const t = Object.fromEntries(
		BLASE_ZEIT.formatToParts(new Date(gesendetAm)).map((p) => [p.type, p.value])
	);
	const tag = String(t.weekday).replace(/\.$/, '');
	return `${von === 'du' ? 'Du' : 'Turnierleitung'} · ${tag}, ${t.day}. ${t.month}, ${t.hour}:${t.minute}`;
}

/** Zähler der offenen Nachrichten an die Turnierleitung (Kachel Verwaltung auf der Startseite). */
export const nachrichtenOffenText = (n: number): string =>
	n === 1
		? '1 Nachricht an die Turnierleitung offen'
		: `${n} Nachrichten an die Turnierleitung offen`;
