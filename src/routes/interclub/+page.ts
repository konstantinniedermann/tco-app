import { error, redirect } from '@sveltejs/kit';
import { holeInterclub } from '../../lib/interclub/api.ts';
import { holeSpeicher, leseMailanfrage } from '../../lib/login/mailanfrage.ts';
import type { PageLoad } from './$types';

// Oberste Seite des Reiters IC (UI-Leitbild, Reiter IC). Läuft nur im Browser (ssr = false).
// `uebersicht: null` heisst: Es gibt keine Interclub-Daten (die Seite wurde direkt aufgerufen).
// Nicht `interclub` nennen: Das Layout meldet unter diesem Namen, ob der Reiter IC steht.
export const load: PageLoad = async ({ fetch }) => {
	const r = await holeInterclub(fetch);
	if (r.art === 'abgemeldet') {
		const wartend = leseMailanfrage(holeSpeicher(), Date.now());
		redirect(307, wartend ? '/login/mail' : '/login');
	}
	if (r.art === 'stoerung') error(503, 'Die Interclub-Resultate lassen sich gerade nicht laden.');
	return { uebersicht: r.art === 'ok' ? r.daten : null };
};
