import { defineConfig, mergeConfig } from 'vitest/config';
import { DATENBANK, EINHEIT } from './scripts/pruefungen/testmuster.ts';
import viteConfig from './vite.config.ts';

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			allowOnly: false,
			coverage: {
				provider: 'v8',
				include: ['src/lib/server/**'],
				// Dünner Anschluss an @simplewebauthn/server; belegt durch tests/e2e/passkey.test.ts
				// (echte Registrierung und Anmeldung mit virtuellem Authenticator).
				exclude: ['src/lib/server/login/passkey-pruefer.ts'],
				thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 }
			},
			projects: [
				{
					extends: true,
					test: {
						name: 'einheit',
						...EINHEIT
					}
				},
				{
					extends: true,
					test: {
						name: 'datenbank',
						...DATENBANK,
						globalSetup: ['tests/setup/datenbank-global.ts'],
						setupFiles: ['tests/setup/datenbank-worker.ts']
					}
				}
			]
		}
	})
);
