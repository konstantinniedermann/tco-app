import { error, redirect } from '@sveltejs/kit';
import { holeAnlass } from '../../../lib/anlass/api.ts';
import { holeSpeicher, leseMailanfrage } from '../../../lib/login/mailanfrage.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Ohne Sitzung geht es zur Login-Seite, wie auf der Startseite.
// `anlass: null` heisst: Diesen Anlass gibt es nicht (mehr).
export const load: PageLoad = async ({ fetch, params }) => {
	const id = Number(params.id);
	const r = Number.isSafeInteger(id) && id > 0 ? await holeAnlass(id, fetch) : null;
	if (r?.art === 'abgemeldet') {
		const wartend = leseMailanfrage(holeSpeicher(), Date.now());
		redirect(307, wartend ? '/login/mail' : '/login');
	}
	if (r?.art === 'stoerung') error(503, 'Der Anlass lässt sich gerade nicht laden.');
	return { anlass: r?.art === 'ok' ? r.daten : null };
};
