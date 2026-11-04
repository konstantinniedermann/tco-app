import { error, redirect } from '@sveltejs/kit';
import { holeSpeicher, leseMailanfrage } from '../../lib/login/mailanfrage.ts';
import { ladePasskeys } from '../../lib/login/passkey.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Ohne Sitzung geht es zur Login-Seite, wie auf der Startseite.
export const load: PageLoad = async ({ fetch }) => {
	const antwort = await fetch('/api/sitzung');
	if (antwort.status === 401) {
		const wartend = leseMailanfrage(holeSpeicher(), Date.now());
		redirect(307, wartend ? '/login/mail' : '/login');
	}
	if (!antwort.ok) error(503, 'Die Anmeldung lässt sich gerade nicht prüfen.');
	const passkeys = await ladePasskeys(fetch);
	return { passkeys };
};
