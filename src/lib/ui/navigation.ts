// Entscheidungen beim Seitenwechsel der Mitglieder-App (UI-Leitbild, Bewegung und Bedienung,
// UI-09). Nur reine Funktionen; das Layout verbindet sie mit SvelteKit.

/** Bewegung beim Seitenwechsel: überblenden, tiefer hinein oder zurück schieben. */
export type Uebergang = 'blende' | 'tiefer' | 'zurueck';

/** Bereich einer Seite = ihr Reiter (UI-Leitbild, feste Ordnung). */
export type Bereich = '/' | '/clubmeisterschaft' | '/profil';

/** Die Reiter in ihrer Reihenfolge: Start · CM · Profil. */
export const REITER: readonly Bereich[] = ['/', '/clubmeisterschaft', '/profil'];

const BEREICH: Record<string, Bereich> = {
	'/': '/',
	'/anlass/[id]': '/',
	'/hilfe': '/',
	'/datenschutz': '/',
	'/clubmeisterschaft': '/clubmeisterschaft',
	'/clubmeisterschaft/[id]': '/clubmeisterschaft',
	'/clubmeisterschaft/[id]/doppel/[kid]': '/clubmeisterschaft',
	'/clubmeisterschaft/[id]/kategorie/[kid]': '/clubmeisterschaft',
	'/profil': '/profil',
	'/profil/email': '/profil'
};

// Seiten, die auch ohne Sitzung offen sind: Reiter nur mit Sitzung, sonst zurück zum Login.
const AUCH_OHNE_SITZUNG = new Set(['/hilfe', '/datenschutz']);

// Ebene jeder Seite der Mitglieder-App: 0 = oberste Seiten der Reiter und Login-Seiten,
// 1 = Unterseiten mit Zurück-Link, 2 = Unterseiten davon. Seiten ohne Eintrag (Verwaltung, unbekannt) wechseln ohne Bewegung.
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
	'/clubmeisterschaft': 0,
	'/clubmeisterschaft/[id]': 1,
	'/clubmeisterschaft/[id]/doppel/[kid]': 2,
	'/clubmeisterschaft/[id]/kategorie/[kid]': 2
};

const FUSSZEILE = new Set(['/', '/login', '/login/mail', '/willkommen']);
const LOGIN_SEITEN = new Set(['/login', '/login/mail', '/willkommen']);

export function bereichVon(routeId: string | null): Bereich | null {
	return routeId === null ? null : (BEREICH[routeId] ?? null);
}

/** Reiter nach dem Login auf jeder Seite eines Bereichs; Hilfe und Datenschutz nur mit Sitzung. */
export function zeigtReiter(routeId: string | null, angemeldet: boolean): boolean {
	if (bereichVon(routeId) === null) return false;
	return angemeldet || !AUCH_OHNE_SITZUNG.has(routeId ?? '');
}

/** Ziel des Zurück-Links; `text: null` heisst, die Seite setzt den Namen (z. B. der CM) selbst. */
export type Eltern = { route: string; text: string | null };

const START: Eltern = { route: '/', text: 'Start' };
const ANMELDEN: Eltern = { route: '/login', text: 'Anmelden' };

/**
 * Eine Stufe höher in der festen Ordnung (UI-Leitbild), egal woher man kam. `bereichsWurzel`:
 * Die Seite einer CM ist die oberste des Reiters CM, wenn sie die einzige laufende ist.
 */
export function elternVon(
	routeId: string | null,
	k: { angemeldet: boolean; bereichsWurzel: boolean }
): Eltern | null {
	switch (routeId) {
		case '/anlass/[id]':
			return START;
		case '/hilfe':
		case '/datenschutz':
			return k.angemeldet ? START : ANMELDEN;
		case '/login/mail':
			return ANMELDEN;
		case '/profil/email':
			return { route: '/profil', text: 'Profil' };
		case '/clubmeisterschaft/[id]':
			return k.bereichsWurzel ? null : { route: '/clubmeisterschaft', text: 'Clubmeisterschaft' };
		case '/clubmeisterschaft/[id]/doppel/[kid]':
		case '/clubmeisterschaft/[id]/kategorie/[kid]':
			return { route: '/clubmeisterschaft/[id]', text: null };
		default:
			return null;
	}
}

/**
 * Welche Bewegung ein Wechsel bekommt. `popstate` (Zurück-Taste oder -Geste des Browsers)
 * bleibt ohne: Die Geste animiert der Browser selbst, sonst liefe die Bewegung doppelt.
 */
export function uebergang(von: string | null, nach: string | null, typ: string): Uebergang | null {
	if (typ === 'popstate' || von === null || nach === null || von === nach) return null;
	const bereichAlt = bereichVon(von);
	const bereichNach = bereichVon(nach);
	if (bereichAlt !== null && bereichNach !== null && bereichAlt !== bereichNach) return 'blende';
	const ebeneVon = EBENE[von];
	const ebeneNach = EBENE[nach];
	if (ebeneVon === undefined || ebeneNach === undefined) return null;
	if (ebeneNach > ebeneVon) return 'tiefer';
	if (ebeneNach < ebeneVon) return 'zurueck';
	return 'blende';
}

/** Der Bereich des angetippten Ziels gilt sofort als aktiv, nicht erst, wenn es geladen ist. */
export function aktiverReiter(aktuell: string | null, ziel: string | null): Bereich | null {
	return bereichVon(ziel) ?? bereichVon(aktuell);
}

/** Fusszeile «Hilfe · Datenschutz · Version» nur vor dem Login und auf der Startseite. */
export function zeigtFusszeile(routeId: string | null, fehler: boolean): boolean {
	return !fehler && routeId !== null && FUSSZEILE.has(routeId);
}

/**
 * Jede Seite beginnt oben (auch jeder Reiter). Nur der Zurück-Link (auch ein Reiter auf einer
 * Unterseite, der eine Stufe höher führt) und die Zurück-Taste oder -Geste
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
