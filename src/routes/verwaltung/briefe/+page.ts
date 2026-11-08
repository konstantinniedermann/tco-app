import { error, redirect } from '@sveltejs/kit';
import { ladeBriefe } from '../../../lib/verwaltung/api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Fehlt die Bestätigung mitten in der Sitzung, geht es zurück
// zur Seite «Verwaltung öffnen». `invalidateAll()` lädt die Liste nach dem Erzeugen neu.
export const load: PageLoad = async ({ fetch }) => {
	const a = await ladeBriefe(fetch);
	if (a.art === 'ok') return { zeilen: a.daten };
	if (a.art === 'abgemeldet') redirect(307, '/login');
	if (a.art === 'kein-admin') redirect(307, '/');
	if (a.art === 'unbestaetigt') redirect(307, '/verwaltung/bestaetigen');
	error(503, 'Die Liste lässt sich gerade nicht laden.');
};
