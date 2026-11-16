import { error } from '@sveltejs/kit';
import { leiteUmBeimLaden } from '../../../../../../lib/login/waechter.ts';
import { ladeTurnier } from '../../../../../../lib/verwaltung/turnier-api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Die Seite braucht den Namen des Turniers für den Rückweg.
export const load: PageLoad = async ({ fetch, params }) => {
	const a = await ladeTurnier(Number(params.id), fetch);
	if (a.art === 'ok') return { turnier: { id: a.daten.id, name: a.daten.name } };
	leiteUmBeimLaden(a, 'verwaltung');
	if (a.art === 'nicht-gefunden') error(404, 'Dieses Turnier gibt es nicht.');
	error(503, 'Das Turnier lässt sich gerade nicht laden.');
};
