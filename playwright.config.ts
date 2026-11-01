import { defineConfig, devices } from '@playwright/test';

// `make e2e` wählt einen freien Port; leer oder ungültig gilt als nicht gesetzt.
const e2ePort = process.env.E2E_PORT ?? '';
const port =
	/^\d{1,5}$/.test(e2ePort) && Number(e2ePort) > 0 && Number(e2ePort) < 65536
		? Number(e2ePort)
		: 4173;
const datenbankUrl =
	process.env.DATABASE_URL ?? 'postgres://mytco:mytco_lokal@localhost:55432/mytco';

export default defineConfig({
	// Entspricht E2E in scripts/pruefungen/testmuster.ts.
	testDir: 'tests/e2e',
	testMatch: '**/*.test.ts',
	outputDir: 'test-results',
	forbidOnly: true,
	use: {
		baseURL: `http://localhost:${port}`,
		screenshot: 'on'
	},
	projects: [
		{ name: 'iphone', use: { ...devices['iPhone 15'] } },
		{ name: 'android', use: { ...devices['Pixel 7'] } },
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }
	],
	webServer: {
		command: 'npm run build && node build',
		url: `http://localhost:${port}`,
		env: { PORT: String(port), DATABASE_URL: datenbankUrl },
		reuseExistingServer: false,
		timeout: 180_000
	}
});
