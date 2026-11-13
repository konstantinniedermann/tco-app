import { error, redirect } from '@sveltejs/kit';
import { ladeRollenListe } from '../../../lib/verwaltung/zugang-api.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Regel 2: wer welche Rolle hat; nur der MyTCO-Admin (das
// Layout leitet die anderen schon um). Fehlt die Bestätigung mitten in der Sitzung, geht es zurück
// zur Seite «Verwaltung öffnen».
export const load: PageLoad = async ({ fetch }) => {
	const a = await ladeRollenListe(fetch);
	if (a.art === 'ok') return { liste: a.daten };
	if (a.art === 'abgemeldet') redirect(307, '/login');
	if (a.art === 'kein-admin') redirect(307, '/verwaltung');
	if (a.art === 'unbestaetigt') redirect(307, '/verwaltung/bestaetigen');
	error(503, 'Die Rollen lassen sich gerade nicht laden.');
};
