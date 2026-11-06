// Passung von Spieler und Einzel-Kategorie (FR-07). Läuft im Browser und auf dem Server.
import type { Art, Geschlecht } from '../server/db/schema.ts';
import { BEREICH, istStufe, type Klassierung } from './klassierung.ts';

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
