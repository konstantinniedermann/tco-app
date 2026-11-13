import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { holeInterclubTeam } from '../../../lib/interclub/api.ts';
import { holeSpeicher, leseMailanfrage } from '../../../lib/login/mailanfrage.ts';
import type { PageLoad } from './$types';

// Seite eines Teams (UI-Leitbild). Läuft nur im Browser (ssr = false). Ein unbekanntes Team führt
// zur Übersicht des Reiters IC, wie eine unbekannte CM zur Startseite.
export const load: PageLoad = async ({ fetch, params }) => {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id <= 0) redirect(307, resolve('/interclub'));
	const r = await holeInterclubTeam(id, fetch);
	if (r.art === 'abgemeldet') {
		const wartend = leseMailanfrage(holeSpeicher(), Date.now());
		redirect(307, wartend ? '/login/mail' : '/login');
	}
	if (r.art === 'nicht-gefunden') redirect(307, resolve('/interclub'));
	if (r.art !== 'ok') error(503, 'Das Team lässt sich gerade nicht laden.');
	return { team: r.daten };
};
