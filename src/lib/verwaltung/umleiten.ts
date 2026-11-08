// Gemeinsame Reaktion der Verwaltungsseiten, wenn die Sitzung oder die Code-Bestätigung fehlt,
// und welche Seite welchem Bereich angehört (RR-07, Design Rollen schärfen Regeln 3 und 7).
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import type { Antwort, VerwaltungsRolle } from './api.ts';
import { darf, type Bereich } from './bereiche.ts';

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

const BEREICHE_IN_REIHE: readonly Bereich[] = ['mitglieder', 'cm', 'rollen'];

// Seiten unter /verwaltung je Bereich (erster Pfadteil nach /verwaltung).
const SEITEN: Record<string, Bereich> = {
	mitglieder: 'mitglieder',
	einlesen: 'mitglieder',
	briefe: 'mitglieder',
	anlaesse: 'mitglieder',
	fairgate: 'mitglieder',
	verlauf: 'mitglieder',
	mitteilungen: 'mitglieder',
	turniere: 'cm',
	rollen: 'rollen'
};

/** Bereich einer Seite der Verwaltung; `null` für die Bestätigung und die Einstiegsseite. */
export function bereichVon(pfad: string): Bereich | null {
	const teil = /^\/verwaltung\/([^/]+)/.exec(pfad)?.[1];
	return teil !== undefined && Object.hasOwn(SEITEN, teil) ? SEITEN[teil] : null;
}

export type Rechte = {
	darfLesen: Record<Bereich, boolean>;
	darfSchreiben: Record<Bereich, boolean>;
};

/** Was die Rollen lesen und schreiben dürfen; in der «Ansicht als …» schreibt niemand. */
export function rechte(rollen: readonly VerwaltungsRolle[], ansicht: boolean): Rechte {
	const je = (fn: (b: Bereich) => boolean) =>
		Object.fromEntries(BEREICHE_IN_REIHE.map((b) => [b, fn(b)])) as Record<Bereich, boolean>;
	return {
		darfLesen: je((b) => darf(rollen, b, 'lesen')),
		darfSchreiben: je((b) => !ansicht && darf(rollen, b, 'schreiben'))
	};
}

/**
 * Erste Seite der Verwaltung: MyTCO- und Mitglieder-Admins beginnen bei den Mitgliedern, nur `cm`
 * bei den Turnieren.
 */
export const startziel = (rollen: readonly VerwaltungsRolle[]) =>
	darf(rollen, 'mitglieder', 'lesen')
		? ('/verwaltung/mitglieder' as const)
		: ('/verwaltung/turniere' as const);

/**
 * Wohin eine Seite umleitet, oder `null`, wenn sie bleibt: Ausserhalb der lesbaren Bereiche zur
 * ersten Seite, eine Seite zum Anlegen ohne Schreibrecht zur Liste ihres Bereichs.
 */
export function umleitung(
	pfad: string,
	rollen: readonly VerwaltungsRolle[],
	ansicht: boolean
): string | null {
	const bereich = bereichVon(pfad);
	if (bereich === null) return null;
	const { darfLesen, darfSchreiben } = rechte(rollen, ansicht);
	if (!darfLesen[bereich]) return startziel(rollen);
	if (pfad.endsWith('/neu') && !darfSchreiben[bereich]) {
		return pfad.replace(/(\/kategorien)?\/neu$/, '');
	}
	return null;
}

/**
 * Bereich, für den die Seite den Hinweis «Nur ansehen» zeigt: Die Rolle liest ihn, schreibt aber
 * nicht. Nicht im Verlauf (dort schreibt niemand) und nicht in der Ansicht (dort sagt es das Band).
 */
export function nurAnsehen(
	pfad: string,
	rollen: readonly VerwaltungsRolle[],
	ansicht: boolean
): Bereich | null {
	const bereich = bereichVon(pfad);
	if (bereich === null || ansicht || pfad.startsWith('/verwaltung/verlauf')) return null;
	const { darfLesen, darfSchreiben } = rechte(rollen, false);
	return darfLesen[bereich] && !darfSchreiben[bereich] ? bereich : null;
}
