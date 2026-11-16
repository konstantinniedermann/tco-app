import { error } from '@sveltejs/kit';
import { leiteUmBeimLaden } from '../../../../../lib/login/waechter.ts';
import { holeGespraeche } from '../../../../../lib/verwaltung/gespraech-api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Posteingang der Turnierleitung (A-TURNIER-04).
export const load: PageLoad = async ({ fetch, params }) => {
	const a = await holeGespraeche(Number(params.id), fetch);
	if (a.art === 'ok') return { liste: a.daten };
	leiteUmBeimLaden(a, 'verwaltung');
	if (a.art === 'nicht-gefunden') error(404, 'Dieses Turnier gibt es nicht.');
	error(503, 'Die Nachrichten lassen sich gerade nicht laden.');
};
