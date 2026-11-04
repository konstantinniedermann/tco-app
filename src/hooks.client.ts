import type { ClientInit } from '@sveltejs/kit/hooks';
import { beobachteInstallation } from './lib/hilfe/installation.svelte.ts';

// Chrome meldet das Install-Angebot kurz nach dem Laden; darum schon beim Start horchen.
export const init: ClientInit = () => {
	beobachteInstallation(window);
};
