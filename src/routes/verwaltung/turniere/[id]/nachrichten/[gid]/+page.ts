import { error, redirect } from '@sveltejs/kit';
import { holeGespraech } from '../../../../../../lib/verwaltung/gespraech-api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Ein Gespräch gibt es nur unter seinem eigenen Turnier;
// unter einem anderen führt der Weg zurück zum Posteingang.
export const load: PageLoad = async ({ fetch, params }) => {
	const turnierId = Number(params.id);
	const a = await holeGespraech(Number(params.gid), fetch);
	if (a.art === 'ok' && a.daten.turnier.id === turnierId) return { gespraech: a.daten };
	if (a.art === 'abgemeldet') redirect(307, '/login');
	if (a.art === 'kein-admin') redirect(307, '/');
	if (a.art === 'unbestaetigt') redirect(307, '/verwaltung/bestaetigen');
	if (a.art === 'ok' || a.art === 'nicht-gefunden')
		redirect(307, `/verwaltung/turniere/${turnierId}/nachrichten`);
	error(503, 'Das Gespräch lässt sich gerade nicht laden.');
};
