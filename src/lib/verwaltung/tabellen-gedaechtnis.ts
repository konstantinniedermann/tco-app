// Gedächtnis der Tabellen-Steuerung (#92): hält Sortierung, Filter (auch Text) und Suche je
// Tabelle nur im Arbeitsspeicher des Tabs, damit die Ansicht jede Rückkehr zur Liste innerhalb der
// App übersteht (Zurück, Pfad, Seitenleiste). Kein Browserspeicher: Neuladen vergisst es.
import {
	ausAdresse,
	hatTabellenwerte,
	suchteil,
	type Filter,
	type Sortierung,
	type Spalte
} from './tabelle.ts';

export type Stand = {
	sortierung: Sortierung;
	filter: Filter;
	suche?: string;
	/** Scroll-Lage der Box, damit die Liste nach «Zurück» an derselben Stelle steht. */
	scroll?: { oben: number; links: number };
};

const gedaechtnis = new Map<string, Stand>();

export function merke(tabelle: string, stand: Stand): void {
	gedaechtnis.set(tabelle, stand);
}

export function erinnere(tabelle: string): Stand | undefined {
	return gedaechtnis.get(tabelle);
}

/** Beim Abmelden: Die nächste Person im selben Tab sieht keine Suche und keine Filter. */
export function vergissTabellen(): void {
	gedaechtnis.clear();
}

/**
 * Womit eine Tabelle beginnt: Steht nichts von ihr in der Adresse, gilt das Gedächtnis (Rückkehr
 * in der App). Passt die Adresse zum Gedächtnis, gilt das Gedächtnis samt Text und Scroll-Lage.
 * Sonst gilt die Adresse (Lesezeichen, anderer Link), ohne Text.
 */
export function startStand<Z>(
	q: Pick<URLSearchParams, 'get'>,
	spalten: readonly Spalte<Z>[],
	gemerkt: Stand | undefined
): Stand {
	const adresse = ausAdresse(q, spalten);
	if (gemerkt) {
		if (!hatTabellenwerte(q, spalten)) return gemerkt;
		const ohneText = ausAdresse(
			new URLSearchParams(suchteil('', spalten, gemerkt.sortierung, gemerkt.filter)),
			spalten
		);
		if (JSON.stringify(ohneText) === JSON.stringify(adresse)) return gemerkt;
	}
	return { ...adresse, suche: '' };
}
