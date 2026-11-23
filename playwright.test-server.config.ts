import { defineConfig, devices } from '@playwright/test';

// Prüflauf gegen den echten Test-Server, nur über `make test-pruefung` (scripts/test-pruefung.ts):
// Er holt den Zugang per SSH und reicht ihn als Umgebungsvariable herein. Entspricht TESTSERVER in
// scripts/pruefungen/testmuster.ts; nie Teil von make check, E2E oder CI.
const url = process.env.MYTCO_TEST_URL ?? '';
const zugang = process.env.MYTCO_TEST_ZUGANG ?? '';
if (
	!url.startsWith('https://') ||
	zugang === '' ||
	!process.env.MYTCO_TEST_ERWARTET_VERSION ||
	!process.env.MYTCO_TEST_ERWARTET_DEV
) {
	throw new Error('Prüflauf nur über make test-pruefung starten.');
}

export default defineConfig({
	testDir: 'tests/test-server',
	testMatch: '**/*.test.ts',
	outputDir: 'test-results/test-server/laeufe',
	forbidOnly: true,
	retries: 0,
	workers: 1,
	timeout: 90_000,
	use: {
		baseURL: url,
		screenshot: 'on',
		serviceWorkers: 'block',
		storageState: {
			cookies: [
				{
					// Zugang zu Test wie nach dem Passwort-Formular (betrieb/caddy/umgebungen/test.caddy).
					name: 'mytco_test_zugang',
					value: zugang,
					domain: new URL(url).hostname,
					path: '/',
					expires: -1,
					httpOnly: true,
					secure: true,
					sameSite: 'Lax'
				}
			],
			origins: []
		}
	},
	// Handygrösse genügt; das installierte Chrome wie in den übrigen Nachweisen gegen Test.
	projects: [{ name: 'test-server', use: { ...devices['Pixel 7'], channel: 'chrome' } }]
});
