import { error, redirect } from '@sveltejs/kit';
import { holeCmAnsicht, holeCmTurniere } from '../../../lib/cm/api.ts';
import { cmEinstieg } from '../../../lib/cm/einstieg.ts';
import { leiteUmBeimLaden } from '../../../lib/login/waechter.ts';
import type { PageLoad } from './$types';

// Läuft nur im Browser (ssr = false). Ohne Sitzung geht es zur Login-Seite, wie beim Anlass.
// Lässt sich die Liste der laufenden CMs nicht laden, steht der Zurück-Link zur Übersicht.
// Ein unbekanntes Turnier (oder eines in Vorbereitung) führt zur Startseite.
export const load: PageLoad = async ({ fetch, params }) => {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id <= 0) redirect(307, '/');
	// Die Liste der laufenden CMs über das globale `fetch`: Das `fetch` von `load` würde sie zur
	// Abhängigkeit machen, und `invalidate('/api/cm')` nach dem Speichern lüde die ganze Seite neu.
	const [r, laufend] = await Promise.all([holeCmAnsicht(id, fetch), holeCmTurniere()]);
	leiteUmBeimLaden(r, 'mitglied');
	if (r.art === 'nicht-gefunden') redirect(307, '/');
	if (r.art !== 'ok') error(503, 'Die Clubmeisterschaft lässt sich gerade nicht laden.');
	// Läuft nur diese CM, ist ihre Seite die oberste des Reiters CM: ohne Zurück-Link, «CM»
	// nochmals antippen führt nach oben (UI-Leitbild, feste Ordnung).
	const einstieg = laufend.art === 'ok' ? cmEinstieg(laufend.daten) : null;
	const bereichsWurzel = einstieg?.art === 'eine' && einstieg.id === id;
	return { cm: r.daten, bereichsWurzel };
};
