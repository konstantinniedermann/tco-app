import { error, redirect } from '@sveltejs/kit';
import { holeSpeicher, leseMailanfrage } from '../../lib/login/mailanfrage.ts';
import { ladePasskeys } from '../../lib/login/passkey.ts';
import { ladeKontakt, ladeProfil } from '../../lib/profil/angaben.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Ohne Sitzung geht es zur Login-Seite, wie auf der Startseite.
// `null` bei Passkeys oder Angaben heisst: liess sich nicht laden (Störung).
export const load: PageLoad = async ({ fetch, url }) => {
	const antwort = await fetch('/api/sitzung');
	if (antwort.status === 401) {
		const wartend = leseMailanfrage(holeSpeicher(), Date.now());
		redirect(307, wartend ? '/login/mail' : '/login');
	}
	if (!antwort.ok) error(503, 'Die Anmeldung lässt sich gerade nicht prüfen.');
	const [passkeys, profil, kontakt] = await Promise.all([
		ladePasskeys(fetch),
		ladeProfil(fetch),
		ladeKontakt(fetch)
	]);
	// Nach dem E-Mail-Wechsel (Unterseite /profil/email) zeigt das Profil einen Hinweis.
	const emailGeaendert = url.searchParams.get('email') === 'geaendert';
	return {
		passkeys,
		angaben: profil?.angaben ?? null,
		klassierung: profil?.klassierung ?? null,
		rufname: profil?.rufname ?? null,
		kontakt,
		emailGeaendert
	};
};
