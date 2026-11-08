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

/** A-ANMELDUNG-01: Namen der bestätigten Anmeldungen einer Kategorie. */
export const namenText = (namen: Namensteile[]): string =>
	namen.length === 0
		? 'Noch niemand angemeldet.'
		: `Angemeldet (${namen.length}): ${namen.map((n) => nameText(n, 'vorname-zuerst')).join(', ')}`;

/** A-ANMELDUNG-04: ein Paar in der kurzen Textform, «Lea Beispiel / Hannes (Johannes Muster)». */
export const paarText = (paar: Namensteile[]): string =>
	paar.map((n) => nameText(n, 'vorname-zuerst')).join(' / ');

/** A-ANMELDUNG-04: die bestätigten Paare einer Doppel-Kategorie, wie `namenText` im Einzel. */
export const paareText = (paare: Namensteile[][]): string =>
	paare.length === 0
		? 'Noch niemand angemeldet.'
		: `Angemeldet (${paare.length}): ${paare.map(paarText).join(', ')}`;

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

const gleicherName = (a: Namensteile, b: Namensteile) =>
	a.rufname === b.rufname && a.vorname === b.vorname && a.nachname === b.nachname;

/** FR-19: die bestätigten Paare der Kategorie ohne das eigene (das mit dem Partner). */
export const weiterePaare = (paare: Namensteile[][], partner: Namensteile): Namensteile[][] =>
	paare.filter((p) => !p.some((n) => gleicherName(n, partner)));

/**
 * FR-48, FR-19: Text der Rückfrage vor dem Senden einer Anfrage; `anrede` ist der Rufname des
 * Angefragten, sonst sein Vorname (`anredeName`).
 */
export function rueckfrageText(anrede: string): string {
	return (
		`${anrede} sieht deinen Namen, deine Klassierung und deine Telefonnummer, damit ${anrede} ` +
		`dich anrufen kann. Nimmt ${anrede} an, seid ihr angemeldet und seht gegenseitig E-Mail und Telefon.`
	);
}
