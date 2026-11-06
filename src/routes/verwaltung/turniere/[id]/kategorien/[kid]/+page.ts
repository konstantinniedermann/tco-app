import { error, redirect } from '@sveltejs/kit';
import { ladeKategorie } from '../../../../../../lib/verwaltung/api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Eine Kategorie gibt es nur unter ihrem eigenen Turnier.
export const load: PageLoad = async ({ fetch, params }) => {
	const a = await ladeKategorie(Number(params.kid), fetch);
	if (a.art === 'ok' && a.daten.turnierId === Number(params.id)) return { kategorie: a.daten };
	if (a.art === 'abgemeldet') redirect(307, '/login');
	if (a.art === 'kein-admin') redirect(307, '/');
	if (a.art === 'unbestaetigt') redirect(307, '/verwaltung/bestaetigen');
	if (a.art === 'ok' || a.art === 'nicht-gefunden') error(404, 'Diese Kategorie gibt es nicht.');
	error(503, 'Die Kategorie lässt sich gerade nicht laden.');
};
