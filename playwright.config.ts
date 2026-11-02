import { defineConfig, devices } from '@playwright/test';
import { DATENBANK_URL, e2eEinstellungen } from './tests/e2e/hilfen/umgebung.ts';

// `make e2e` wählt einen freien Port; leer oder ungültig gilt als nicht gesetzt.
const e2ePort = process.env.E2E_PORT ?? '';
const port =
	/^\d{1,5}$/.test(e2ePort) && Number(e2ePort) > 0 && Number(e2ePort) < 65536
		? Number(e2ePort)
		: 4173;
const baseURL = `http://localhost:${port}`;

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
		// WebKit speichert Cookies mit `Secure` auf http://localhost nicht. adapter-node nimmt ohne
		// Proxy-Kopf https an (dann setzt SvelteKit `Secure`); hier meldet ein Kopf wie von einem
		// Reverse Proxy http. Chromium prüft weiter mit `Secure` wie in Produktion.
		{
			name: 'iphone',
			use: { ...devices['iPhone 15'], extraHTTPHeaders: { 'x-forwarded-proto': 'http' } }
		},
		{ name: 'android', use: { ...devices['Pixel 7'] } },
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }
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
