// Passung von Spieler und Einzel-Kategorie (FR-07). Läuft im Browser und auf dem Server.
import type { Art, Geschlecht } from '../server/db/schema.ts';
import { BEREICH, istStufe, punkte, type Klassierung, type Stufe } from './klassierung.ts';

export type Spieler = {
	geschlecht: 'w' | 'm' | null;
	jahrgang: number | null;
	klassierung: Klassierung | null;
};

export type KategorieRegel = {
	art: Art;
	geschlecht: Geschlecht;
	jahrgangVon: number | null;
	jahrgangBis: number | null;
	klassierungVon: string | null;
	klassierungBis: string | null;
	/** Nur Doppel: Summe der Punkte (`punkte`) beider Spieler muss mindestens so hoch sein. */
	mindestsumme: number | null;
};

export type CmAngabe = 'klassierung' | 'geschlecht' | 'jahrgang';

/** FR-37: Angaben, die dem Spieler für eine Anmeldung noch fehlen. */
export function fehlendeAngaben(s: Spieler): CmAngabe[] {
	const fehlt: CmAngabe[] = [];
	if (s.klassierung === null) fehlt.push('klassierung');
	if (s.geschlecht === null) fehlt.push('geschlecht');
	if (s.jahrgang === null) fehlt.push('jahrgang');
	return fehlt;
}

/** FR-07: passt der Spieler in diese Einzel-Kategorie? Fehlende Angaben passen nie. */
export function passtEinzel(k: KategorieRegel, s: Spieler): boolean {
	if (k.art !== 'einzel' || fehlendeAngaben(s).length > 0) return false;

	if (k.geschlecht === 'herren' && s.geschlecht !== 'm') return false;
	if (k.geschlecht === 'damen' && s.geschlecht !== 'w') return false;
	if (k.geschlecht === 'mixed') return false;

	if (k.jahrgangVon !== null && s.jahrgang! < k.jahrgangVon) return false;
	if (k.jahrgangBis !== null && s.jahrgang! > k.jahrgangBis) return false;

	if (k.klassierungVon === null && k.klassierungBis === null) return true;
	if (!istStufe(k.klassierungVon) || !istStufe(k.klassierungBis)) return false;
	if (s.klassierung === 'keine') return k.klassierungBis === 'R9';
	const i = BEREICH.indexOf(s.klassierung as (typeof BEREICH)[number]);
	return i >= BEREICH.indexOf(k.klassierungVon) && i <= BEREICH.indexOf(k.klassierungBis);
}

/**
 * FR-08: Wildcard nur nach oben: Geschlecht und Jahrgang passen, nur die Klassierung ist
 * schwächer als `klassierungBis` (`keine` gilt als schwächer als R9).
 */
export function wildcardEinzel(k: KategorieRegel, s: Spieler): boolean {
	if (k.art !== 'einzel' || fehlendeAngaben(s).length > 0 || passtEinzel(k, s)) return false;
	if (!istStufe(k.klassierungBis) || !istStufe(k.klassierungVon)) return false;
	// Ohne Klassierungsbereich gäbe es nichts zu lockern; Geschlecht und Jahrgang prüft die Passung
	// derselben Kategorie ohne Klassierungsbereich.
	if (!passtEinzel({ ...k, klassierungVon: null, klassierungBis: null }, s)) return false;
	if (s.klassierung === 'keine') return true;
	return BEREICH.indexOf(s.klassierung as Stufe) > BEREICH.indexOf(k.klassierungBis);
}

/** FR-08: Warnungen beim Anmelden von Hand (der Verwalter darf trotzdem anmelden). */
export function warnungenEinzel(
	k: KategorieRegel,
	s: Spieler
): ('angaben-fehlen' | 'passt-nicht')[] {
	if (fehlendeAngaben(s).length > 0) return ['angaben-fehlen'];
	return passtEinzel(k, s) ? [] : ['passt-nicht'];
}

/** Doppel: was einem Spieler noch fehlt, damit ein Paar geprüft werden kann. */
export type Vermerk = 'angaben-fehlen' | 'klassierung-fehlt';

export function vermerk(s: Spieler): Vermerk | null {
	if (s.geschlecht === null) return 'angaben-fehlen';
	return s.klassierung === null ? 'klassierung-fehlt' : null;
}

/** Geschlechter des Paars passen zur Kategorie; `null` (nur bei der Suche) passt immer. */
function geschlechtPaarPasst(k: KategorieRegel, a: 'w' | 'm', b: 'w' | 'm' | null): boolean {
	switch (k.geschlecht) {
		case 'herren':
			return a === 'm' && (b === null || b === 'm');
		case 'damen':
			return a === 'w' && (b === null || b === 'w');
		case 'mixed':
			return b === null || a !== b;
		default:
			return true;
	}
}

/** FR-07: passt der Spieler allein in diese Doppel-Kategorie? Der Jahrgang zählt im Doppel nicht. */
export function passtDoppelAllein(k: KategorieRegel, s: Spieler): boolean {
	if (k.art !== 'doppel' || fehlendeAngaben(s).length > 0) return false;
	return k.geschlecht === 'herren'
		? s.geschlecht === 'm'
		: k.geschlecht !== 'damen' || s.geschlecht === 'w';
}

/**
 * FR-07: passt das Paar in diese Doppel-Kategorie? `streng = false` (Suche): `a` muss vollständig
 * sein, fehlende Angaben von `b` gelten als passend (ohne Klassierung entfällt die Summenprüfung).
 * `streng = true` (Annehmen): beide müssen Geschlecht und Klassierung haben. Kein Jahrgang.
 */
export function passtAlsPaar(k: KategorieRegel, a: Spieler, b: Spieler, streng: boolean): boolean {
	if (k.art !== 'doppel' || k.mindestsumme === null || fehlendeAngaben(a).length > 0) return false;
	if (streng && (b.geschlecht === null || b.klassierung === null)) return false;
	if (!geschlechtPaarPasst(k, a.geschlecht!, b.geschlecht)) return false;
	if (b.klassierung === null) return true;
	return punkte(a.klassierung!) + punkte(b.klassierung) >= k.mindestsumme;
}
