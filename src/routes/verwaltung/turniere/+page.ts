import { leiteUmBeimLaden } from '../../../lib/login/waechter.ts';
import { ladeTurniere } from '../../../lib/verwaltung/turnier-api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Fehlt die Bestätigung mitten in der Sitzung, geht es zurück
// zur Seite «Verwaltung öffnen». Eine Störung ist keine Fehlerseite: `zeilen: null` heisst «nicht
// geladen», die Seite zeigt dann die Meldung.
export const load: PageLoad = async ({ fetch }) => {
	const a = await ladeTurniere(fetch);
	leiteUmBeimLaden(a, 'verwaltung');
	return { zeilen: a.art === 'ok' ? a.daten : null };
};
