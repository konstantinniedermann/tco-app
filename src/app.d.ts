// Siehe https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	/** App-Version aus package.json, von Vite beim Bauen eingesetzt. */
	const __APP_VERSION__: string;

	namespace App {
		// interface Error {}
		interface Locals {
			konto?: import('./lib/server/login/sitzung.ts').AngemeldetesKonto;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
