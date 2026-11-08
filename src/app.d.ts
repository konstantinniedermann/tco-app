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
		interface PageState {
			/** Rückmeldung, die die CM-Seite nach dem Wechsel von der Doppel-Anmelde-Seite zeigt. */
			cmMeldung?: string;
		}
		// interface Platform {}
	}
}

export {};
