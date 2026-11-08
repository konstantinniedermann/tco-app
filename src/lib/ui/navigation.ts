// Entscheidungen beim Seitenwechsel der Mitglieder-App (UI-Leitbild, Bewegung und Bedienung,
// UI-09). Nur reine Funktionen; das Layout verbindet sie mit SvelteKit.

/** Bewegung beim Seitenwechsel: überblenden, tiefer hinein oder zurück schieben. */
export type Uebergang = 'blende' | 'tiefer' | 'zurueck';

const REITER_SEITEN = new Set(['/', '/profil']);

// Ebene jeder Seite der Mitglieder-App: 0 = Reiter- und Login-Seiten, 1 = Unterseiten mit
// «‹ Zurück», 2 = Unterseiten davon. Seiten ohne Eintrag (Verwaltung, unbekannt) wechseln ohne Bewegung.
const EBENE: Record<string, number> = {
	'/': 0,
	'/profil': 0,
	'/login': 0,
	'/willkommen': 0,
	'/hilfe': 1,
	'/datenschutz': 1,
	'/login/mail': 1,
	'/profil/email': 1,
	'/anlass/[id]': 1,
	'/clubmeisterschaft/[id]': 1,
	'/clubmeisterschaft/[id]/doppel/[kid]': 2
};

const FUSSZEILE = new Set(['/', '/login', '/login/mail', '/willkommen']);
const LOGIN_SEITEN = new Set(['/login', '/login/mail', '/willkommen']);

export function istReiterSeite(routeId: string | null): boolean {
	return routeId !== null && REITER_SEITEN.has(routeId);
}

/**
 * Welche Bewegung ein Wechsel bekommt. `popstate` (Zurück-Taste oder -Geste des Browsers)
 * bleibt ohne: Die Geste animiert der Browser selbst, sonst liefe die Bewegung doppelt.
 */
export function uebergang(von: string | null, nach: string | null, typ: string): Uebergang | null {
	if (typ === 'popstate' || von === null || nach === null || von === nach) return null;
	const ebeneVon = EBENE[von];
	const ebeneNach = EBENE[nach];
	if (ebeneVon === undefined || ebeneNach === undefined) return null;
	if (ebeneNach > ebeneVon) return 'tiefer';
	if (ebeneNach < ebeneVon) return 'zurueck';
	return 'blende';
}

/** Der angetippte Reiter gilt sofort als aktiv, nicht erst, wenn seine Seite geladen ist. */
export function aktiverReiter(aktuell: string | null, ziel: string | null): string | null {
	return istReiterSeite(ziel) ? ziel : aktuell;
}

/** Fusszeile «Hilfe · Datenschutz · Version» nur vor dem Login und auf der Startseite. */
export function zeigtFusszeile(routeId: string | null, fehler: boolean): boolean {
	return !fehler && routeId !== null && FUSSZEILE.has(routeId);
}

/**
 * Jede Seite beginnt oben (auch jeder Reiter). Nur «‹ Zurück» und die Zurück-Taste oder -Geste
 * des Browsers bringen eine Seite dorthin zurück, wo man sie verlassen hat.
 */
export function stelltStandWiederHer(
	von: string | null,
	nach: string | null,
	typ: string
): boolean {
	return typ === 'popstate' || uebergang(von, nach, typ) === 'zurueck';
}

/** Auf dem Weg zum Login (z. B. nach dem Abmelden) gehen gemerkte Positionen und Klappen verloren. */
export function vergisstStand(nach: string | null): boolean {
	return nach !== null && LOGIN_SEITEN.has(nach);
}
