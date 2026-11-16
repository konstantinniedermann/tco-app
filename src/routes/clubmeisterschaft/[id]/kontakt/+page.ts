import { error, redirect } from '@sveltejs/kit';
import { holeGespraech } from '../../../../lib/cm/api.ts';
import { leiteUmBeimLaden } from '../../../../lib/login/waechter.ts';
import type { PageLoad } from './$types';

const istId = (n: number) => Number.isSafeInteger(n) && n > 0;

// Gespräch des Mitglieds mit der Turnierleitung (A-TURNIER-04). Lädt wie die CM-Seite nur im
// Browser. Ein unbekanntes oder noch nicht sichtbares Turnier führt zur Startseite.
export const load: PageLoad = async ({ fetch, params }) => {
	const id = Number(params.id);
	if (!istId(id)) redirect(307, '/');
	const r = await holeGespraech(id, fetch);
	leiteUmBeimLaden(r, 'mitglied');
	if (r.art === 'nicht-gefunden') redirect(307, '/');
	if (r.art !== 'ok') error(503, 'Das Gespräch lässt sich gerade nicht laden.');
	return { turnierId: id, gespraech: r.daten };
};
