import { error } from '@sveltejs/kit';
import { leiteUmBeimLaden } from '../../../lib/login/waechter.ts';
import { ladeFairgate } from '../../../lib/verwaltung/mitglieder-api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Fehlt die Bestätigung mitten in der Sitzung, geht es zurück
// zur Seite «Verwaltung öffnen». `invalidate('app:fairgate')` lädt Liste und Zähler neu.
export const load: PageLoad = async ({ fetch, depends }) => {
	depends('app:fairgate');
	const a = await ladeFairgate(fetch);
	if (a.art === 'ok') return { zeilen: a.daten };
	leiteUmBeimLaden(a, 'verwaltung');
	error(503, 'Die Liste lässt sich gerade nicht laden.');
};
