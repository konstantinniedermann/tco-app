import { building } from '$app/env';
import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { leseEinstellungen } from './lib/server/einstellungen.ts';
import { holeLoginDienst } from './lib/server/login/index.ts';
import { behandleFehler, ladeSitzungSicher } from './lib/server/login/schnittstellen.ts';

// Die App startet nicht ohne Schlüssel und Mail-Einstellungen. Beim Bauen läuft `init` mit
// (z. B. für die SPA-Rückfallseite), dort gibt es die Einstellungen nicht.
export const init: ServerInit = () => {
	if (!building) leseEinstellungen();
};

// SvelteKits Standard loggt den Stack samt Meldung; die kann Adressen und Codes enthalten.
export const handleError: HandleServerError = () => behandleFehler();

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/')) {
		await ladeSitzungSicher(holeLoginDienst, event);
	}
	const response = await resolve(event);
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'same-origin');
	return response;
};
