import { error } from '@sveltejs/kit';
import { leiteUmBeimLaden } from '../../../lib/login/waechter.ts';
import { ladeRollenListe } from '../../../lib/verwaltung/zugang-api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Regel 2: wer welche Rolle hat; nur der MyTCO-Admin (das
// Layout leitet die anderen schon um). Fehlt die Bestätigung mitten in der Sitzung, geht es zurück
// zur Seite «Verwaltung öffnen».
export const load: PageLoad = async ({ fetch }) => {
	const a = await ladeRollenListe(fetch);
	if (a.art === 'ok') return { liste: a.daten };
	leiteUmBeimLaden(a, 'verwaltung-rollen');
	error(503, 'Die Rollen lassen sich gerade nicht laden.');
};
