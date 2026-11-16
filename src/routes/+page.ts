import { error } from '@sveltejs/kit';
import { holeAnlaesse } from '../lib/anlass/api.ts';
import { holeCmTurniere } from '../lib/cm/api.ts';
import { ladeSitzung } from '../lib/login/sitzung.ts';
import { leiteUmBeimLaden } from '../lib/login/waechter.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Ohne Sitzung geht es zur Login-Seite. Wartet noch ein
// Mail-Code (die Startbildschirm-App startet nach dem Wechsel in die Mail-App oft neu auf `/`),
// geht es gleich zum Feld «Code aus der Mail»; im Handy-Browser zuerst auf den Startbildschirm
// (A-HILFE-02). Ohne Netz die allgemeine Fehlerseite (Fall G).
export const load: PageLoad = async ({ fetch }) => {
	const r = await ladeSitzung(fetch, 'wurf');
	leiteUmBeimLaden(r, 'start');
	if (r.art !== 'ok') error(503, 'Die Anmeldung lässt sich gerade nicht prüfen.');
	const { vorname, rufname, passkeyHinweis, verwaltung, nachrichtenOffen } = r.daten;
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
