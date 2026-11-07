import { error, redirect } from '@sveltejs/kit';
import { ladeAuskunft } from '../../../../../lib/verwaltung/api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Der Server legt beim Abruf den Verlaufseintrag «Auskunft
// erstellt» an (DS-07).
export const load: PageLoad = async ({ fetch, params }) => {
	const a = await ladeAuskunft(Number(params.id), fetch);
	if (a.art === 'ok') return { auskunft: a.daten };
	if (a.art === 'abgemeldet') redirect(307, '/login');
	if (a.art === 'kein-admin') redirect(307, '/');
	if (a.art === 'unbestaetigt') redirect(307, '/verwaltung/bestaetigen');
	if (a.art === 'nicht-gefunden') error(404, 'Zu diesem Mitglied gibt es keine Auskunft.');
	error(503, 'Die Auskunft lässt sich gerade nicht laden.');
};
