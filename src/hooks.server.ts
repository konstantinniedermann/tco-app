import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { leseEinstellungen } from './lib/server/einstellungen.ts';
import { holeLoginDienst } from './lib/server/login/index.ts';
import { ladeSitzung } from './lib/server/login/schnittstellen.ts';

// Die App startet nicht ohne Schlüssel und Mail-Einstellungen.
export const init: ServerInit = () => {
	leseEinstellungen();
};

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/')) {
		await ladeSitzung(holeLoginDienst(), event);
	}
	const response = await resolve(event);
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'same-origin');
	return response;
};
