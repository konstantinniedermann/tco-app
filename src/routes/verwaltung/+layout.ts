import { error, redirect } from '@sveltejs/kit';
import { ladeFairgate, ladeZugang } from '../../lib/verwaltung/api.ts';
import { offenFuerCm, startziel } from '../../lib/verwaltung/umleiten.ts';
import type { LayoutLoad } from './$types';

// Läuft nur im Browser (ssr = false). Ohne Sitzung zur Anmeldung, ohne Verwaltungsrolle zur
// Startseite (RR-07), ohne frische Code-Bestätigung zur Seite «Verwaltung öffnen» (SI-08, RR-09).
// Wer nur `cm` hat, sieht nur die Clubmeisterschaft; jede andere Seite führt zu den Turnieren.
export const load: LayoutLoad = async ({ fetch, url, depends }) => {
	depends('app:fairgate');
	const z = await ladeZugang(fetch);
	if (z.art === 'abgemeldet') redirect(307, '/login');
	if (z.art === 'kein-admin') redirect(307, '/');
	if (z.art !== 'ok') error(503, 'Die Verwaltung lässt sich gerade nicht öffnen.');
	const { bestaetigt, rollen } = z.daten;
	const istAdmin = rollen.includes('admin');
	const aufBestaetigen = url.pathname === '/verwaltung/bestaetigen';
	if (!bestaetigt && !aufBestaetigen) redirect(307, '/verwaltung/bestaetigen');
	if (bestaetigt && aufBestaetigen) redirect(307, startziel(rollen));
	if (!istAdmin && !offenFuerCm(url.pathname)) redirect(307, '/verwaltung/turniere');
	// Anzahl für die Seitenleiste (nur Admins); ohne Zahl bleibt der Punkt ohne Klammer.
	const f = bestaetigt && istAdmin ? await ladeFairgate(fetch) : null;
	return {
		eigeneMitgliedId: z.daten.mitgliedId ?? null,
		fairgateAnzahl: f?.art === 'ok' ? f.daten.length : null,
		rollen
	};
};
