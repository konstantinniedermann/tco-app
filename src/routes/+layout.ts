import type { AnsichtRolle } from '../lib/verwaltung/api.ts';
import type { LayoutLoad } from './$types';

export const ssr = false;
export const prerender = false;

// «Ansicht als …» für das Band über der Kopfleiste (UI-Leitbild): Die Ansicht ist ein Zustand der
// Sitzung auf dem Server, darum fragt die App `/api/sitzung`. Ohne Sitzung oder bei einer Störung
// gibt es kein Band. Läuft keine Ansicht, lädt das Layout erst nach `refreshAll()` wieder (die
// Taste «Ansehen» löst es aus). Läuft eine, prüft jeder Seitenwechsel neu: So verschwindet das
// Band auch nach dem Abmelden oder wenn jemand die Sitzungen beendet hat.
export const load: LayoutLoad = async ({ fetch, url }) => {
	let ansicht: AnsichtRolle | null = null;
	try {
		const antwort = await fetch('/api/sitzung');
		if (antwort.ok)
			ansicht = ((await antwort.json()) as { ansicht?: AnsichtRolle }).ansicht ?? null;
	} catch {
		// Netz weg: kein Band; die Seiten melden die Störung selbst.
	}
	if (ansicht !== null) void url.pathname;
	return { ansicht };
};
