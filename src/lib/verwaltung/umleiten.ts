// Gemeinsame Reaktion der Verwaltungsseiten, wenn die Sitzung oder die Code-Bestätigung fehlt.
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import type { Antwort } from './api.ts';

/** Leitet bei fehlender Anmeldung, Rolle oder Bestätigung um; `true`, wenn umgeleitet wurde. */
export async function leiteUm(a: Antwort<unknown>): Promise<boolean> {
	switch (a.art) {
		case 'abgemeldet':
			await goto(resolve('/login'));
			return true;
		case 'kein-admin':
			await goto(resolve('/'));
			return true;
		case 'unbestaetigt':
			await goto(resolve('/verwaltung/bestaetigen'));
			return true;
		default:
			return false;
	}
}
