import { error, redirect } from '@sveltejs/kit';
import { ladeAnlassAdmin } from '../../../../lib/verwaltung/anlass-api.ts';
import { ladeMitteilungen } from '../../../../lib/verwaltung/mitteilung-api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Fehlt die Bestätigung mitten in der Sitzung, geht es zurück
// zur Seite «Verwaltung öffnen». Lassen sich die Mitteilungen nicht laden, zeigt die Seite den
// Anlass trotzdem (`mitteilungen: null`).
export const load: PageLoad = async ({ fetch, params }) => {
	const id = Number(params.id);
	const [a, m] = await Promise.all([
		ladeAnlassAdmin(id, fetch),
		ladeMitteilungen({ art: 'anlass', anlassId: id }, fetch)
	]);
	if (a.art === 'ok') return { detail: a.daten, mitteilungen: m.art === 'ok' ? m.daten : null };
	if (a.art === 'abgemeldet') redirect(307, '/login');
	if (a.art === 'kein-admin') redirect(307, '/');
	if (a.art === 'unbestaetigt') redirect(307, '/verwaltung/bestaetigen');
	if (a.art === 'nicht-gefunden') error(404, 'Diesen Anlass gibt es nicht.');
	error(503, 'Der Anlass lässt sich gerade nicht laden.');
};
