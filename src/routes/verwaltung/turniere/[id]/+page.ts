import { error, redirect } from '@sveltejs/kit';
import { ladeTurnier } from '../../../../lib/verwaltung/api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Fehlt die Bestätigung mitten in der Sitzung, geht es zurück
// zur Seite «Verwaltung öffnen».
export const load: PageLoad = async ({ fetch, params }) => {
	const a = await ladeTurnier(Number(params.id), fetch);
	if (a.art === 'ok') return { detail: a.daten };
	if (a.art === 'abgemeldet') redirect(307, '/login');
	if (a.art === 'kein-admin') redirect(307, '/');
	if (a.art === 'unbestaetigt') redirect(307, '/verwaltung/bestaetigen');
	if (a.art === 'nicht-gefunden') error(404, 'Dieses Turnier gibt es nicht.');
	error(503, 'Das Turnier lässt sich gerade nicht laden.');
};
