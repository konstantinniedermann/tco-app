import { error, redirect } from '@sveltejs/kit';
import { holeGespraech } from '../../../../lib/cm/api.ts';
import { holeSpeicher, leseMailanfrage } from '../../../../lib/login/mailanfrage.ts';
import type { PageLoad } from './$types';

const istId = (n: number) => Number.isSafeInteger(n) && n > 0;

// Gespräch des Mitglieds mit der Turnierleitung (A-TURNIER-04). Lädt wie die CM-Seite nur im
// Browser. Ein unbekanntes oder noch nicht sichtbares Turnier führt zur Startseite.
export const load: PageLoad = async ({ fetch, params }) => {
	const id = Number(params.id);
	if (!istId(id)) redirect(307, '/');
	const r = await holeGespraech(id, fetch);
	if (r.art === 'abgemeldet') {
		const wartend = leseMailanfrage(holeSpeicher(), Date.now());
		redirect(307, wartend ? '/login/mail' : '/login');
	}
	if (r.art === 'nicht-gefunden') redirect(307, '/');
	if (r.art !== 'ok') error(503, 'Das Gespräch lässt sich gerade nicht laden.');
	return { turnierId: id, gespraech: r.daten };
};
