import { ladeSitzung } from '../lib/login/sitzung.ts';
import type { LayoutLoad } from './$types';

export const ssr = false;
export const prerender = false;

// «Ansicht als …» für das Band über der Kopfleiste (UI-Leitbild): Die Ansicht ist ein Zustand der
// Sitzung auf dem Server, darum fragt die App `/api/sitzung`. Ohne Sitzung oder bei einer Störung
// gibt es kein Band. Läuft keine Ansicht, lädt das Layout erst nach `refreshAll()` wieder (die
// Taste «Ansehen» löst es aus). Läuft eine, prüft jeder Seitenwechsel neu: So verschwindet das
// Band auch nach dem Abmelden oder wenn jemand die Sitzungen beendet hat.
// `interclub`: Reiter IC nur, wenn es Interclub-Daten gibt. Ohne Sitzung prüft jeder
// Seitenwechsel neu, damit der Reiter gleich nach dem Login steht (die Login-Seiten wechseln
// ohne `refreshAll()` zur Startseite).
export const load: LayoutLoad = async ({ fetch, url }) => {
	// Netz weg: kein Band; die Seiten melden die Störung selbst. Angemeldet heisst: Erfolg mit
	// lesbarem Körper, der nicht `null` ist (sonst prüft der nächste Wechsel neu, wie vorher).
	const r = await ladeSitzung(fetch);
	const sitzung = r.art === 'ok' && r.daten !== undefined && r.daten !== null ? r.daten : null;
	const ansicht = sitzung?.ansicht ?? null;
	const interclub = sitzung?.interclub === true;
	if (ansicht !== null || sitzung === null) void url.pathname;
	return { ansicht, interclub };
};
