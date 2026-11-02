import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Ohne Sitzung geht es zur Login-Seite.
export const load: PageLoad = async ({ fetch }) => {
	const antwort = await fetch('/api/sitzung');
	if (antwort.status === 401) redirect(307, '/login');
	if (!antwort.ok) error(503, 'Die Anmeldung lässt sich gerade nicht prüfen.');
	const { vorname } = (await antwort.json()) as { vorname: string };
	return { vorname };
};
