import { defineConfig, devices } from '@playwright/test';
import { DATENBANK_URL, e2eEinstellungen } from './tests/e2e/hilfen/umgebung.ts';

// `make e2e` wählt einen freien Port; leer oder ungültig gilt als nicht gesetzt.
const e2ePort = process.env.E2E_PORT ?? '';
const port =
	/^\d{1,5}$/.test(e2ePort) && Number(e2ePort) > 0 && Number(e2ePort) < 65536
		? Number(e2ePort)
		: 4173;
const baseURL = `http://localhost:${port}`;

const PROXY_KOPF = { 'x-forwarded-proto': 'http' };

export default defineConfig({
	// Entspricht E2E in scripts/pruefungen/testmuster.ts.
	testDir: 'tests/e2e',
	testMatch: '**/*.test.ts',
	outputDir: 'test-results',
	forbidOnly: true,
	use: {
		baseURL,
		screenshot: 'on'
	},
	projects: [
		// Ohne Proxy-Kopf nimmt adapter-node https an: SvelteKit setzt dann `Secure` (WebKit speichert
		// das auf http://localhost nicht) und `url.origin` wäre https://localhost, nicht die Herkunft
		// http://localhost des Browsers, gegen die Passkeys geprüft werden. Darum meldet ein Kopf wie
		// von einem Reverse Proxy in allen Projekten http.
		{
			name: 'iphone',
			use: { ...devices['iPhone 15'], extraHTTPHeaders: PROXY_KOPF }
		},
		{ name: 'android', use: { ...devices['Pixel 7'], extraHTTPHeaders: PROXY_KOPF } },
		{ name: 'desktop', use: { ...devices['Desktop Chrome'], extraHTTPHeaders: PROXY_KOPF } }
	],
	webServer: {
		// Mailpit (`make db`) fängt die Code-Mails; die Tests lesen sie über seine API.
		command: 'npm run build && node scripts/migrate.ts && node build',
		url: baseURL,
		env: {
			PORT: String(port),
			PROTOCOL_HEADER: 'x-forwarded-proto',
			DATABASE_URL: DATENBANK_URL,
			...e2eEinstellungen(baseURL)
		},
		reuseExistingServer: false,
		timeout: 180_000
	}
});
