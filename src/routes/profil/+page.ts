import { error } from '@sveltejs/kit';
import { ladePasskeys } from '../../lib/login/passkey.ts';
import { ladeSitzung } from '../../lib/login/sitzung.ts';
import { leiteUmBeimLaden } from '../../lib/login/waechter.ts';
import { ladeKontakt, ladeProfil } from '../../lib/profil/angaben.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Ohne Sitzung geht es zur Login-Seite, wie auf der Startseite.
// `null` bei Passkeys oder Angaben heisst: liess sich nicht laden (Störung).
export const load: PageLoad = async ({ fetch, url }) => {
	const sitzung = await ladeSitzung(fetch, 'wurf');
	leiteUmBeimLaden(sitzung, 'mitglied');
	if (sitzung.art !== 'ok') error(503, 'Die Anmeldung lässt sich gerade nicht prüfen.');
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
