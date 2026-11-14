import { leiteUmBeimLaden } from '../../../lib/login/waechter.ts';
import { ladeVerlauf } from '../../../lib/verwaltung/mitglieder-api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). «?mitglied=<id>» zeigt nur die Einträge dieses Mitglieds; der
// Filter ist die Adresse, darum lädt die Seite bei jedem Wechsel des Filters hier neu. Fehlt die
// Bestätigung mitten in der Sitzung, geht es zurück zur Seite «Verwaltung öffnen». Eine Störung ist
// keine Fehlerseite: `zeilen: null` heisst «nicht geladen», die Seite zeigt dann die Meldung.
export const load: PageLoad = async ({ fetch, url }) => {
	const roh = url.searchParams.get('mitglied');
	const mitglied = roh !== null && /^\d+$/.test(roh) ? Number(roh) : undefined;
	const a = await ladeVerlauf({ mitglied }, fetch);
	leiteUmBeimLaden(a, 'verwaltung');
	return { mitglied, zeilen: a.art === 'ok' ? a.daten : null };
};
