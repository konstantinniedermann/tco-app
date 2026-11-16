import { error } from '@sveltejs/kit';
import { leiteUmBeimLaden } from '../../../lib/login/waechter.ts';
import { ladeMitteilungen } from '../../../lib/verwaltung/mitteilung-api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Mitteilungen an den ganzen Verein (FR-42): Verlauf für
// Mitglieder- und MyTCO-Admin, das Formular nur für den Mitglieder-Admin.
export const load: PageLoad = async ({ fetch }) => {
	const a = await ladeMitteilungen({ art: 'verein' }, fetch);
	if (a.art === 'ok') return { verlauf: a.daten.verlauf };
	leiteUmBeimLaden(a, 'verwaltung');
	error(503, 'Die Mitteilungen lassen sich gerade nicht laden.');
};
