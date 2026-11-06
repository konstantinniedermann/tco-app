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

/** Erste Seite der Verwaltung: Admins beginnen bei den Mitgliedern, nur `cm` bei den Turnieren. */
export const startziel = (rollen: readonly string[]) =>
	rollen.includes('admin')
		? ('/verwaltung/mitglieder' as const)
		: ('/verwaltung/turniere' as const);

/** Seiten, die auch `cm` ohne Admin-Rolle öffnen darf. */
export const offenFuerCm = (pfad: string) =>
	pfad === '/verwaltung/bestaetigen' ||
	pfad === '/verwaltung/turniere' ||
	pfad.startsWith('/verwaltung/turniere/');
