import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { holeInterclubBegegnung } from '../../../../lib/interclub/api.ts';
import { leiteUmBeimLaden } from '../../../../lib/login/waechter.ts';
import type { PageLoad } from './$types';

// Seite einer Begegnung (UI-Leitbild). Läuft nur im Browser (ssr = false). Eine unbekannte oder
// fremde Begegnung führt zur Seite des Teams, wie ein unbekanntes Team zur Übersicht.
export const load: PageLoad = async ({ fetch, params }) => {
	const id = Number(params.id);
	const begegnung = Number(params.begegnung);
	if (!Number.isSafeInteger(id) || id <= 0) redirect(307, resolve('/interclub'));
	const zumTeam = resolve('/interclub/[id]', { id: String(id) });
	if (!Number.isSafeInteger(begegnung) || begegnung <= 0) redirect(307, zumTeam);
	const r = await holeInterclubBegegnung(id, begegnung, fetch);
	leiteUmBeimLaden(r, 'mitglied');
	if (r.art === 'nicht-gefunden') redirect(307, zumTeam);
	if (r.art !== 'ok') error(503, 'Die Begegnung lässt sich gerade nicht laden.');
	return { begegnung: r.daten };
};
