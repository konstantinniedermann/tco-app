import { expect, test } from '@playwright/test';
import { legeKontoMitBriefCodeAn, schliesseLoginHilfen } from './hilfen/login.ts';

// SI-06: Der Produktions-Build schickt das Login-Cookie nur über HTTPS. `make dev-handy` ruft
// den Entwicklungsserver per http über die WLAN-Adresse auf; dort setzt SvelteKit `Secure`
// nicht. Dieser Test stellt dieselbe Lage am fertigen Build nach: keine localhost-Adresse,
// http laut Proxy-Kopf. Fehlt `Secure` hier, ginge das Cookie in Produktion unverschlüsselt.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

test('SI-06: Login-Cookie trägt Secure auch bei http über eine Netzadresse', async ({
	playwright
}, info) => {
	const basis = new URL(info.project.use.baseURL ?? '');
	basis.hostname = '127.0.0.1';
	const anfrage = await playwright.request.newContext({
		baseURL: basis.origin,
		extraHTTPHeaders: { 'x-forwarded-proto': 'http' }
	});
	try {
		const konto = await legeKontoMitBriefCodeAn('Nora');
		const login = await anfrage.post('/api/login/brief', { data: { code: konto.code } });
		expect(login.status()).toBe(200);
		const gesetzt = login.headersArray().find((k) => k.name.toLowerCase() === 'set-cookie');
		expect(gesetzt?.value).toMatch(/;\s*Secure/i);

		const logout = await anfrage.post('/api/logout', { data: {} });
		expect(logout.status()).toBe(204);
		const geloescht = logout.headersArray().find((k) => k.name.toLowerCase() === 'set-cookie');
		expect(geloescht?.value).toMatch(/;\s*Secure/i);
	} finally {
		await anfrage.dispose();
	}
});
