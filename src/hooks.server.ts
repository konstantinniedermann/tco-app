import { building } from '$app/env';
import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { riegel } from './lib/server/admin/ansicht.ts';
import { leseEinstellungen } from './lib/server/einstellungen.ts';
import { holeLoginDienst } from './lib/server/login/index.ts';
import { behandleFehler, ladeSitzungSicher } from './lib/server/login/schnittstellen.ts';

// Die App startet nicht ohne Schlüssel und Mail-Einstellungen. Beim Bauen läuft `init` mit
// (z. B. für die SPA-Rückfallseite), dort gibt es die Einstellungen nicht.
export const init: ServerInit = () => {
	if (!building) leseEinstellungen();
};

// SvelteKits Standard loggt den Stack samt Meldung; die kann Adressen und Codes enthalten.
export const handleError: HandleServerError = ({ kind, error }) => behandleFehler(kind, error);

function mitKoepfen(response: Response): Response {
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'same-origin');
	return response;
}

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/')) {
		await ladeSitzungSicher(holeLoginDienst, event);
		// «Ansicht als …» ist nur ansehen: Speichern weist der Server ab, bevor eine Schnittstelle läuft.
		const absage = riegel(
			event.request.method,
			event.url.pathname,
			event.locals.konto?.ansicht ?? null
		);
		if (absage) return mitKoepfen(absage);
	}
	return mitKoepfen(await resolve(event));
};
