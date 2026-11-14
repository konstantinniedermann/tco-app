// Der gemeinsame Wächter der Anmeldung (Zielbild 6.1 Punkt 5, B-21): wohin die App führt, wenn die
// Anmeldung, die Verwaltungsrolle oder die Code-Bestätigung fehlt. Er bildet das Verhalten genau
// nach, das die Seiten vorher je für sich geschrieben hatten; wo sie voneinander abweichen, ist das
// ein benannter Fall (E-44, Fälle A bis K in Anhang E.5 von docs/refactoring-analyse.md).
//
// Der Kern ist die Tabelle `zielOhneZugang` ohne Browser. Darum zwei dünne Hüllen ohne eigene
// Entscheidung: eine für die Ladefunktion (`redirect`), eine nach einer Aktion im Baustein (`goto`,
// im Gespräch das volle Neuladen). Der Wächter fragt die Sitzung nicht selbst; er nimmt das Ergebnis
// des Abrufs, den die Seite ohnehin stellt. So entsteht keine zusätzliche Anfrage.
import { redirect } from '@sveltejs/kit';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { laeuftVomSymbol, zeigeEinstieg } from '../hilfe/geraet.ts';
import { holeSpeicher, leseMailanfrage } from './mailanfrage.ts';

/** Die Wörter, bei denen der Wächter umleiten kann. */
export type OhneZugang = 'abgemeldet' | 'kein-admin' | 'unbestaetigt';

/**
 * Die benannten Fälle:
 * - `start`: die Startseite; wartet ein Mail-Code, dorthin, sonst auf dem Handy im Browser zur
 *   Einstiegsseite, sonst zum Login.
 * - `mitglied`: Profil, Anlass, die CM- und die Interclub-Seiten; Mail-Code, sonst Login, nie die
 *   Einstiegsseite (F).
 * - `ohne-mailcode`: `/profil/email` (A) und jede Aktion der Mitglieder-App (C); nur Login.
 * - `verwaltung`: die Seiten der Verwaltung und `leiteUm`; ohne Mail-Code (E).
 * - `verwaltung-zugang`: das Layout der Verwaltung; die Bestätigung liest es aus den Daten.
 * - `verwaltung-rollen`: die Seite «Rollen»; ohne Rolle zur Verwaltung, nicht zur Startseite (B).
 */
export type Zugangsfall =
	'start' | 'mitglied' | 'ohne-mailcode' | 'verwaltung' | 'verwaltung-zugang' | 'verwaltung-rollen';

/** Welche Wörter ein Fall umleitet; bei den anderen entscheidet die Seite selbst. */
type Woerter = {
	start: 'abgemeldet';
	mitglied: 'abgemeldet';
	'ohne-mailcode': 'abgemeldet';
	verwaltung: OhneZugang;
	'verwaltung-zugang': 'abgemeldet' | 'kein-admin';
	'verwaltung-rollen': OhneZugang;
};

/** Was das Gerät beiträgt; die Tabelle liest nur, was ihre Zelle braucht. */
export type Lage = { readonly mailCodeWartet: boolean; readonly einstiegZeigen: boolean };

export type Ziel =
	'/login' | '/login/mail' | '/willkommen' | '/' | '/verwaltung' | '/verwaltung/bestaetigen';

const zumLogin = (): Ziel => '/login';

const TABELLE: { [F in Zugangsfall]: Record<Woerter[F], (lage: Lage) => Ziel> } = {
	start: {
		abgemeldet: (l) =>
			l.mailCodeWartet ? '/login/mail' : l.einstiegZeigen ? '/willkommen' : '/login'
	},
	mitglied: { abgemeldet: (l) => (l.mailCodeWartet ? '/login/mail' : '/login') },
	'ohne-mailcode': { abgemeldet: zumLogin },
	verwaltung: {
		abgemeldet: zumLogin,
		'kein-admin': () => '/',
		unbestaetigt: () => '/verwaltung/bestaetigen'
	},
	'verwaltung-zugang': { abgemeldet: zumLogin, 'kein-admin': () => '/' },
	'verwaltung-rollen': {
		abgemeldet: zumLogin,
		'kein-admin': () => '/verwaltung',
		unbestaetigt: () => '/verwaltung/bestaetigen'
	}
};

/** Wohin bei diesem Ergebnis und Fall; `null`: kein Fall des Wächters, die Seite entscheidet. */
export function zielOhneZugang(art: string, fall: Zugangsfall, lage: Lage): Ziel | null {
	const zeile: Partial<Record<string, (lage: Lage) => Ziel>> = TABELLE[fall];
	return Object.hasOwn(zeile, art) ? (zeile[art]?.(lage) ?? null) : null;
}

/** Gerätespeicher und Gerät, erst gelesen, wenn eine Zelle danach fragt (wie vorher je Seite). */
const LAGE_IM_BROWSER: Lage = {
	get mailCodeWartet() {
		return leseMailanfrage(holeSpeicher(), Date.now()) !== null;
	},
	get einstiegZeigen() {
		return zeigeEinstieg(navigator.userAgent, laeuftVomSymbol(window));
	}
};

/**
 * Hülle für die Ladefunktion: leitet mit `redirect(307, …)` um, wenn das Ergebnis ein Fall des
 * Wächters ist, sonst kehrt sie zurück. Danach kennt der Typprüfer das Ergebnis ohne diese Wörter.
 * Nie in einem `try` aufrufen: `redirect` wirft.
 */
export function leiteUmBeimLaden<A extends { art: string }, F extends Zugangsfall>(
	r: A,
	fall: F
): asserts r is Exclude<A, { art: Woerter[F] }> {
	const ziel = zielOhneZugang(r.art, fall, LAGE_IM_BROWSER);
	if (ziel !== null) redirect(307, ziel);
}

/**
 * Hülle nach einer Aktion im Baustein: wechselt in der App zum Ziel und gibt `true` zurück, wenn
 * das Ergebnis ein Fall des Wächters ist. `ganz-neu` lädt die App mit der Adresse neu statt zu
 * wechseln (Gespräch mit der Turnierleitung, Fall D). Ohne Angabe gilt der Fall der Aktionen der
 * Mitglieder-App (nur Login, Fall C).
 */
export async function leiteUmNachAktion(
	r: { art: string },
	fall: Zugangsfall = 'ohne-mailcode',
	weg: 'wechsel' | 'ganz-neu' = 'wechsel'
): Promise<boolean> {
	const ziel = zielOhneZugang(r.art, fall, LAGE_IM_BROWSER);
	if (ziel === null) return false;
	if (weg === 'ganz-neu') window.location.assign(ziel);
	else await goto(resolve(ziel));
	return true;
}
