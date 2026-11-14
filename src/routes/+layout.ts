import type { AnsichtRolle } from '../lib/verwaltung/zugang-api.ts';
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
	let ansicht: AnsichtRolle | null = null;
	let interclub = false;
	let angemeldet = false;
	try {
		const antwort = await fetch('/api/sitzung');
		if (antwort.ok) {
			const sitzung = (await antwort.json()) as { ansicht?: AnsichtRolle; interclub?: boolean };
			ansicht = sitzung.ansicht ?? null;
			interclub = sitzung.interclub === true;
			angemeldet = true;
		}
	} catch {
		// Netz weg: kein Band; die Seiten melden die Störung selbst.
	}
	if (ansicht !== null || !angemeldet) void url.pathname;
	return { ansicht, interclub };
};
