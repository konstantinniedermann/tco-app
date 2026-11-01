import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);
const datenbankUrl =
	process.env.DATABASE_URL ?? 'postgres://mytco:mytco_lokal@localhost:55432/mytco';

export default defineConfig({
	// Entspricht E2E in scripts/pruefungen/testmuster.ts.
	testDir: 'tests/e2e',
	testMatch: '**/*.test.ts',
	outputDir: 'test-results',
	forbidOnly: !!process.env.CI,
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
