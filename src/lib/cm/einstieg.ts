import type { CmStand } from './api.ts';

/** Was die oberste Seite des Reiters CM zeigt (UI-Leitbild, Reiter CM). */
export type CmEinstieg =
	{ art: 'keine' } | { art: 'eine'; id: number } | { art: 'mehrere'; turniere: CmStand[] };

/** Keine laufende CM: Hinweis; genau eine: direkt ihre Seite; mehrere: Kacheln zur Auswahl. */
export function cmEinstieg(turniere: CmStand[]): CmEinstieg {
	if (turniere.length === 0) return { art: 'keine' };
	if (turniere.length === 1) return { art: 'eine', id: turniere[0].id };
	return { art: 'mehrere', turniere };
}
