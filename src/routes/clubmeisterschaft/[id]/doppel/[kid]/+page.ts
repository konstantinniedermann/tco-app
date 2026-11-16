import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { doppelZurWahl, holeCmAnsicht } from '../../../../../lib/cm/api.ts';
import { leiteUmBeimLaden } from '../../../../../lib/login/waechter.ts';
import type { PageLoad } from './$types';

const istId = (n: number) => Number.isSafeInteger(n) && n > 0;

// Anmelde-Seite eines Doppels (A-ANMELDUNG-04). Lädt wie die CM-Seite (nur im Browser). Ohne
// offene Anmeldung, ohne Angaben oder schon zu zweit gibt es hier nichts zu tun: zurück zur
// CM-Seite, die es erklärt.
export const load: PageLoad = async ({ fetch, params }) => {
	const id = Number(params.id);
	const kategorieId = Number(params.kid);
	if (!istId(id)) redirect(307, '/');
	const r = await holeCmAnsicht(id, fetch);
	leiteUmBeimLaden(r, 'mitglied');
	if (r.art === 'nicht-gefunden') redirect(307, '/');
	if (r.art !== 'ok') error(503, 'Die Clubmeisterschaft lässt sich gerade nicht laden.');
	const kategorie = istId(kategorieId) ? doppelZurWahl(r.daten, kategorieId) : null;
	if (!kategorie) redirect(307, resolve('/clubmeisterschaft/[id]', { id: String(id) }));
	return { cm: r.daten, kategorie };
};
