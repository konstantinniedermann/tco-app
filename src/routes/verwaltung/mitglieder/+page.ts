import { leiteUmBeimLaden } from '../../../lib/login/waechter.ts';
import { ladeMitglieder } from '../../../lib/verwaltung/mitglieder-api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Das erste Laden der Liste, ohne Suche und Filter; nach einer
// Eingabe lädt die Seite selbst neu. Fehlt die Bestätigung mitten in der Sitzung, geht es zurück zur
// Seite «Verwaltung öffnen». Eine Störung ist keine Fehlerseite: `zeilen: null` heisst «nicht
// geladen», die Seite zeigt dann die Meldung.
export const load: PageLoad = async ({ fetch }) => {
	const a = await ladeMitglieder({ suche: '', status: '' }, fetch);
	leiteUmBeimLaden(a, 'verwaltung');
	return { zeilen: a.art === 'ok' ? a.daten : null };
};
