import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			allowOnly: false,
			coverage: {
				provider: 'v8',
				include: ['src/lib/server/**'],
				thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 }
			},
			projects: [
				{
					extends: true,
					test: {
						name: 'einheit',
						include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
						exclude: ['src/**/*.db.test.ts']
					}
				},
				{
					extends: true,
					test: {
						name: 'datenbank',
						include: ['src/**/*.db.test.ts'],
						globalSetup: ['tests/setup/datenbank-global.ts'],
						setupFiles: ['tests/setup/datenbank-worker.ts']
					}
				}
			]
		}
	})
);
