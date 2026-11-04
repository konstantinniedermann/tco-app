import { error, redirect } from '@sveltejs/kit';
import { laeuftVomSymbol, zeigeEinstieg } from '../lib/hilfe/geraet.ts';
import { holeSpeicher, leseMailanfrage } from '../lib/login/mailanfrage.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Ohne Sitzung geht es zur Login-Seite. Wartet noch ein
// Mail-Code (die Startbildschirm-App startet nach dem Wechsel in die Mail-App oft neu auf `/`),
// geht es gleich zum Feld «Code aus der Mail».
export const load: PageLoad = async ({ fetch }) => {
	const antwort = await fetch('/api/sitzung');
	if (antwort.status === 401) {
		const wartend = leseMailanfrage(holeSpeicher(), Date.now());
		if (wartend) redirect(307, '/login/mail');
		// Im Handy-Browser zuerst auf den Startbildschirm, dann anmelden (A-HILFE-02).
		const einstieg = zeigeEinstieg(navigator.userAgent, laeuftVomSymbol(window));
		redirect(307, einstieg ? '/willkommen' : '/login');
	}
	if (!antwort.ok) error(503, 'Die Anmeldung lässt sich gerade nicht prüfen.');
	const { vorname, passkeyHinweis, verwaltung } = (await antwort.json()) as {
		vorname: string;
		passkeyHinweis: boolean;
		verwaltung: boolean;
	};
	return { vorname, passkeyHinweis, verwaltung };
};
