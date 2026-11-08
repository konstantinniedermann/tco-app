// Anzeigehilfen der Clubmeisterschaft für Mitglieder: reine Funktionen, Browser und Server.
import type { KategorieRegel } from '../turnier/passung.ts';
import { nameText, type Namensteile } from '../name.ts';
import { geschlechtText } from '../verwaltung/turnier-anzeige.ts';

/** A-ANMELDUNG-02: eigener Stand auf der Startseiten-Kachel. */
export const standText = (anzahl: number): string =>
	anzahl === 0 ? 'Noch keine Anmeldung' : `${anzahl} ${anzahl === 1 ? 'Anmeldung' : 'Anmeldungen'}`;

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

/** FR-08: Längengrenze des Wildcard-Kommentars. */
export const KOMMENTAR_MAX = 300;

/** FR-08: Zähler unter dem Kommentarfeld, «12 von 300 Zeichen». */
export const kommentarZaehlerText = (laenge: number): string =>
	`${laenge} von ${KOMMENTAR_MAX} Zeichen`;
