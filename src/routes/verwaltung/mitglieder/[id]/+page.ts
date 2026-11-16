import { error } from '@sveltejs/kit';
import { leiteUmBeimLaden } from '../../../../lib/login/waechter.ts';
import { ladeMitglied } from '../../../../lib/verwaltung/mitglieder-api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Fehlt die Bestätigung mitten in der Sitzung, geht es zurück
// zur Seite «Verwaltung öffnen».
export const load: PageLoad = async ({ fetch, params }) => {
	const a = await ladeMitglied(Number(params.id), fetch);
	if (a.art === 'ok') return { detail: a.daten };
	leiteUmBeimLaden(a, 'verwaltung');
	if (a.art === 'nicht-gefunden') error(404, 'Dieses Mitglied gibt es nicht.');
	error(503, 'Das Mitglied lässt sich gerade nicht laden.');
};
