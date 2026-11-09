import { error, redirect } from '@sveltejs/kit';
import { holeAnlaesse } from '../lib/anlass/api.ts';
import { holeCmTurniere } from '../lib/cm/api.ts';
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
	const { vorname, rufname, passkeyHinweis, verwaltung, nachrichtenOffen } =
		(await antwort.json()) as {
			vorname: string;
			rufname: string | null;
			passkeyHinweis: boolean;
			verwaltung: boolean;
			nachrichtenOffen: number;
		};
	// Lassen sich Anlässe oder Turniere nicht laden, bleibt die Startseite trotzdem nutzbar.
	const [anlaesse, turniere] = await Promise.all([holeAnlaesse(fetch), holeCmTurniere(fetch)]);
	return {
		vorname,
		rufname,
		passkeyHinweis,
		verwaltung,
		nachrichtenOffen,
		anlaesse: anlaesse.art === 'ok' ? anlaesse.daten : [],
		turniere: turniere.art === 'ok' ? turniere.daten : []
	};
};
