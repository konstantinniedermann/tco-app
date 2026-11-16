import { error, redirect } from '@sveltejs/kit';
import { ladeSitzung } from '../../../lib/login/sitzung.ts';
import { leiteUmBeimLaden } from '../../../lib/login/waechter.ts';
import { ladeAngaben, ladeKontakt } from '../../../lib/profil/angaben.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Ohne Sitzung zur Login-Seite; die bisherige Adresse
// braucht die Seite für Schritt 1 und 2. In der «Ansicht als …» lässt sich nichts ändern: zurück
// zum Profil.
export const load: PageLoad = async ({ fetch, parent }) => {
	const sitzung = await ladeSitzung(fetch, 'wurf');
	leiteUmBeimLaden(sitzung, 'ohne-mailcode');
	if (sitzung.art !== 'ok') error(503, 'Die Anmeldung lässt sich gerade nicht prüfen.');
	if ((await parent()).ansicht !== null) redirect(307, '/profil');
	const [angaben, kontakt] = await Promise.all([ladeAngaben(fetch), ladeKontakt(fetch)]);
	if (!angaben) error(503, 'Deine Angaben lassen sich gerade nicht laden.');
	return { bisher: angaben.email, kontakt };
};
