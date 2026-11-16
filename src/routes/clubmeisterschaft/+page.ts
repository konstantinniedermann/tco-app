import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { holeCmTurniere } from '../../lib/cm/api.ts';
import { cmEinstieg } from '../../lib/cm/einstieg.ts';
import { leiteUmBeimLaden } from '../../lib/login/waechter.ts';
import type { PageLoad } from './$types';

// Oberste Seite des Reiters CM (UI-Leitbild, Reiter CM). Läuft nur im Browser (ssr = false).
// Läuft genau eine CM, geht es direkt zu ihrer Seite; die Umleitung ersetzt den Eintrag im
// Verlauf, die Zurück-Taste führt also zur Seite vor dem Tipp auf «CM».
export const load: PageLoad = async ({ fetch }) => {
	const r = await holeCmTurniere(fetch);
	leiteUmBeimLaden(r, 'mitglied');
	if (r.art !== 'ok') error(503, 'Die Clubmeisterschaft lässt sich gerade nicht laden.');
	const einstieg = cmEinstieg(r.daten);
	if (einstieg.art === 'eine') {
		redirect(307, resolve('/clubmeisterschaft/[id]', { id: String(einstieg.id) }));
	}
	return { einstieg };
};
