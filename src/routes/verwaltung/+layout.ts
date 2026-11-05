import { error, redirect } from '@sveltejs/kit';
import { ladeFairgate, ladeZugang } from '../../lib/verwaltung/api.ts';
import type { LayoutLoad } from './$types';

// Läuft nur im Browser (ssr = false). Ohne Sitzung zur Anmeldung, ohne Admin-Rolle zur Startseite
// (RR-07), ohne frische Code-Bestätigung zur Seite «Verwaltung öffnen» (SI-08, RR-09).
export const load: LayoutLoad = async ({ fetch, url, depends }) => {
	depends('app:fairgate');
	const z = await ladeZugang(fetch);
	if (z.art === 'abgemeldet') redirect(307, '/login');
	if (z.art === 'kein-admin') redirect(307, '/');
	if (z.art !== 'ok') error(503, 'Die Verwaltung lässt sich gerade nicht öffnen.');
	const aufBestaetigen = url.pathname === '/verwaltung/bestaetigen';
	if (!z.daten.bestaetigt && !aufBestaetigen) redirect(307, '/verwaltung/bestaetigen');
	if (z.daten.bestaetigt && aufBestaetigen) redirect(307, '/verwaltung/mitglieder');
	// Anzahl für die Seitenleiste; ohne Zahl bleibt der Punkt ohne Klammer.
	const f = z.daten.bestaetigt ? await ladeFairgate(fetch) : null;
	return {
		eigeneMitgliedId: z.daten.mitgliedId ?? null,
		fairgateAnzahl: f?.art === 'ok' ? f.daten.length : null
	};
};
