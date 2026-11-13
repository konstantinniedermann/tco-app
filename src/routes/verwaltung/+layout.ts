import { error, redirect } from '@sveltejs/kit';
import { ladeFairgate } from '../../lib/verwaltung/mitglieder-api.ts';
import { ladeZugang } from '../../lib/verwaltung/zugang-api.ts';
import { rechte, startziel, umleitung } from '../../lib/verwaltung/umleiten.ts';
import type { LayoutLoad } from './$types';

// Läuft nur im Browser (ssr = false). Ohne Sitzung zur Anmeldung, ohne Verwaltungsrolle zur
// Startseite (RR-07), ohne frische Code-Bestätigung zur Seite «Verwaltung öffnen» (SI-08, RR-09).
// Jede Rolle sieht nur ihre Bereiche (Regel 7); eine Seite ausserhalb führt zur ersten Seite, eine
// Seite zum Anlegen ohne Schreibrecht zur Liste. In der «Ansicht als …» liefert der Server schon
// die Rollen der Ansicht; geschrieben wird dann nirgends.
export const load: LayoutLoad = async ({ fetch, url, depends, parent }) => {
	depends('app:fairgate');
	const [z, { ansicht }] = await Promise.all([ladeZugang(fetch), parent()]);
	if (z.art === 'abgemeldet') redirect(307, '/login');
	if (z.art === 'kein-admin') redirect(307, '/');
	if (z.art !== 'ok') error(503, 'Die Verwaltung lässt sich gerade nicht öffnen.');
	const { bestaetigt, rollen } = z.daten;
	const aufBestaetigen = url.pathname === '/verwaltung/bestaetigen';
	if (!bestaetigt && !aufBestaetigen) redirect(307, '/verwaltung/bestaetigen');
	if (bestaetigt && aufBestaetigen) redirect(307, startziel(rollen));
	const ziel = umleitung(url.pathname, rollen, ansicht !== null);
	if (ziel !== null) redirect(307, ziel);
	const { darfLesen, darfSchreiben } = rechte(rollen, ansicht !== null);
	// Anzahl für die Seitenleiste (Bereich Mitglieder); ohne Zahl bleibt der Punkt ohne Klammer.
	const f = bestaetigt && darfLesen.mitglieder ? await ladeFairgate(fetch) : null;
	return {
		eigeneMitgliedId: z.daten.mitgliedId ?? null,
		fairgateAnzahl: f?.art === 'ok' ? f.daten.length : null,
		rollen,
		darfLesen,
		darfSchreiben
	};
};
