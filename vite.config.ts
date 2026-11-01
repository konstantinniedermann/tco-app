import { readFileSync } from 'node:fs';
import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
	version: string;
};

// SvelteKit 3 liest keine svelte.config.js mehr; die Konfiguration steht im Plugin.
const spa = process.env.MYTCO_SPA === '1';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: true
			},
			adapter: spa ? adapterStatic({ fallback: 'index.html' }) : adapterNode(),
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self'],
					// Hash des festen Styles von SvelteKits Screenreader-Hinweis (#svelte-announcer).
					// Ändert ein Kit-Update diesen Style, schlägt der E2E-Test (Konsolenfehler) an;
					// dann den Hash aus root.svelte neu berechnen.
					'style-src-attr': [
						'unsafe-hashes',
						'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo='
					],
					'img-src': ['self'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'object-src': ['none'],
					'frame-ancestors': ['none']
				}
			}
		})
	],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	}
});
