import { error, redirect } from '@sveltejs/kit';
import { ladeAngaben, ladeKontakt } from '../../../lib/profil/angaben.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Ohne Sitzung zur Login-Seite; die bisherige Adresse
// braucht die Seite für Schritt 1 und 2. In der «Ansicht als …» lässt sich nichts ändern: zurück
// zum Profil.
export const load: PageLoad = async ({ fetch, parent }) => {
	const sitzung = await fetch('/api/sitzung');
	if (sitzung.status === 401) redirect(307, '/login');
	if (!sitzung.ok) error(503, 'Die Anmeldung lässt sich gerade nicht prüfen.');
	if ((await parent()).ansicht !== null) redirect(307, '/profil');
	const [angaben, kontakt] = await Promise.all([ladeAngaben(fetch), ladeKontakt(fetch)]);
	if (!angaben) error(503, 'Deine Angaben lassen sich gerade nicht laden.');
	return { bisher: angaben.email, kontakt };
};
