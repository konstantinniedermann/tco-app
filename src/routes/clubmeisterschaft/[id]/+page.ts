import { error, redirect } from '@sveltejs/kit';
import { holeCmAnsicht } from '../../../lib/cm/api.ts';
import { holeSpeicher, leseMailanfrage } from '../../../lib/login/mailanfrage.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Ohne Sitzung geht es zur Login-Seite, wie beim Anlass.
// Ein unbekanntes Turnier (oder eines in Vorbereitung) führt zur Startseite.
export const load: PageLoad = async ({ fetch, params }) => {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id <= 0) redirect(307, '/');
	const r = await holeCmAnsicht(id, fetch);
	if (r.art === 'abgemeldet') {
		const wartend = leseMailanfrage(holeSpeicher(), Date.now());
		redirect(307, wartend ? '/login/mail' : '/login');
	}
	if (r.art === 'nicht-gefunden') redirect(307, '/');
	if (r.art !== 'ok') error(503, 'Die Clubmeisterschaft lässt sich gerade nicht laden.');
	return { cm: r.daten };
};
