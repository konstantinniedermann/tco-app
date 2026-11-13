import { error, redirect } from '@sveltejs/kit';
import { ladeFairgate } from '../../../lib/verwaltung/mitglieder-api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Fehlt die Bestätigung mitten in der Sitzung, geht es zurück
// zur Seite «Verwaltung öffnen». `invalidate('app:fairgate')` lädt Liste und Zähler neu.
export const load: PageLoad = async ({ fetch, depends }) => {
	depends('app:fairgate');
	const a = await ladeFairgate(fetch);
	if (a.art === 'ok') return { zeilen: a.daten };
	if (a.art === 'abgemeldet') redirect(307, '/login');
	if (a.art === 'kein-admin') redirect(307, '/');
	if (a.art === 'unbestaetigt') redirect(307, '/verwaltung/bestaetigen');
	error(503, 'Die Liste lässt sich gerade nicht laden.');
};
