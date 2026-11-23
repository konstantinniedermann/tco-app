import { leiteUmBeimLaden } from '../../../lib/login/waechter.ts';
import { ladeVerlauf } from '../../../lib/verwaltung/mitglieder-api.ts';
import { erinnere, startStand } from '../../../lib/verwaltung/tabellen-gedaechtnis.ts';
import {
	VERLAUF_SPALTEN,
	verlaufAbfrage,
	verlaufGedaechtnis
} from '../../../lib/verwaltung/verlauf-spalten.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). «?mitglied=<id>» zeigt nur die Einträge dieses Mitglieds; der
// Wechsel dieses Filters ist eine Adresse, darum lädt die Seite dann hier neu. Die Filter im
// Spaltentitel lädt die Seite nach einer Eingabe selbst (#92). Fehlt die
// Bestätigung mitten in der Sitzung, geht es zurück zur Seite «Verwaltung öffnen». Eine Störung ist
// keine Fehlerseite: `zeilen: null` heisst «nicht geladen», die Seite zeigt dann die Meldung.
export const load: PageLoad = async ({ fetch, url }) => {
	const roh = url.searchParams.get('mitglied');
	const mitglied = roh !== null && /^\d+$/.test(roh) ? Number(roh) : undefined;
	// #92: Filter aus Adresse und Gedächtnis des Tabs (startStand); Text nur aus dem Gedächtnis.
	const filter = startStand(
		url.searchParams,
		VERLAUF_SPALTEN,
		erinnere(verlaufGedaechtnis(mitglied))
	).filter;
	const a = await ladeVerlauf(verlaufAbfrage(filter, mitglied), fetch);
	leiteUmBeimLaden(a, 'verwaltung');
	return { mitglied, zeilen: a.art === 'ok' ? a.daten : null };
};
