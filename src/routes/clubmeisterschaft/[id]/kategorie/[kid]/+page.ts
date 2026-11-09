import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { holeCmAnsicht, kategorieZumAnsehen } from '../../../../../lib/cm/api.ts';
import { holeSpeicher, leseMailanfrage } from '../../../../../lib/login/mailanfrage.ts';
import type { PageLoad } from './$types';

const istId = (n: number) => Number.isSafeInteger(n) && n > 0;

// Seite einer Kategorie mit allen Anmeldungen. Lädt wie die CM-Seite (nur im Browser) aus derselben
// Antwort. Eine Kategorie, die die Übersicht nicht zeigt, führt zurück zur CM-Seite.
export const load: PageLoad = async ({ fetch, params }) => {
	const id = Number(params.id);
	const kategorieId = Number(params.kid);
	if (!istId(id)) redirect(307, '/');
	const r = await holeCmAnsicht(id, fetch);
	if (r.art === 'abgemeldet') {
		const wartend = leseMailanfrage(holeSpeicher(), Date.now());
		redirect(307, wartend ? '/login/mail' : '/login');
	}
	if (r.art === 'nicht-gefunden') redirect(307, '/');
	if (r.art !== 'ok') error(503, 'Die Clubmeisterschaft lässt sich gerade nicht laden.');
	const gefunden = istId(kategorieId) ? kategorieZumAnsehen(r.daten, kategorieId) : null;
	if (!gefunden) redirect(307, resolve('/clubmeisterschaft/[id]', { id: String(id) }));
	return { cm: r.daten, ...gefunden };
};
