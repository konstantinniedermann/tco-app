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
				// Fachlogik, die auch im Browser läuft, zählt mit (Testkonzept, Abdeckung).
				include: [
					'src/lib/server/**',
					'src/lib/turnier/**',
					'src/lib/anlass/stand.ts',
					'src/lib/anlass/zeit.ts'
				],
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
