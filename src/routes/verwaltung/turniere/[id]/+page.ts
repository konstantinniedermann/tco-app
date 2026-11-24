import { error } from '@sveltejs/kit';
import { leiteUmBeimLaden } from '../../../../lib/login/waechter.ts';
import { ladeMitteilungen } from '../../../../lib/verwaltung/mitteilung-api.ts';
import { ladeTurnier } from '../../../../lib/verwaltung/turnier-api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Fehlt die Bestätigung mitten in der Sitzung, geht es zurück
// zur Seite «Verwaltung öffnen». Lassen sich die Mitteilungen nicht laden, zeigt die Seite das
// Turnier trotzdem (`mitteilungen: null`).
export const load: PageLoad = async ({ fetch, params }) => {
	const id = Number(params.id);
	const [a, m] = await Promise.all([
		ladeTurnier(id, fetch),
		ladeMitteilungen({ art: 'turnier', turnierId: id }, fetch)
	]);
	if (a.art === 'ok') return { detail: a.daten, mitteilungen: m.art === 'ok' ? m.daten : null };
	leiteUmBeimLaden(a, 'verwaltung');
	if (a.art === 'nicht-gefunden') error(404, 'Dieses Turnier gibt es nicht.');
	error(503, 'Das Turnier lässt sich gerade nicht laden.');
};
