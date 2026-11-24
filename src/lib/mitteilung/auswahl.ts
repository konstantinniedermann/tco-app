// Empfänger-Auswahlen einer Mitteilung (FR-43). Ohne Server-Code, darum auch im Formular nutzbar.
import type { Rolle } from '../server/admin/rollen.ts';

/** Anlass: alle, oder nach der Antwort auf diesen Anlass. */
export type AnlassAuswahl = 'alle' | 'keine-antwort' | 'kommt' | 'kommt-nicht' | 'zu-pruefen';
export const ANLASS_AUSWAHLEN: readonly AnlassAuswahl[] = [
	'alle',
	'keine-antwort',
	'kommt',
	'kommt-nicht',
	'zu-pruefen'
];

/** Turnier: alle Mitglieder mit dem Thema CM, oder nach Stand der Anmeldung. */
export type TurnierAuswahl = 'alle' | 'angemeldet' | 'berechtigt' | 'sucht-partner';
export const TURNIER_AUSWAHLEN: readonly TurnierAuswahl[] = [
	'alle',
	'angemeldet',
	'berechtigt',
	'sucht-partner'
];

/** Verein: alle aktiven Mitglieder mit dem Thema Verein, oder nur die mit einer Rolle. */
export type VereinAuswahl =
	'alle' | 'rolle-mytco' | 'rolle-mitglieder' | 'rolle-cm' | 'rolle-lizenz';
export const VEREIN_AUSWAHLEN: readonly VereinAuswahl[] = [
	'alle',
	'rolle-mytco',
	'rolle-mitglieder',
	'rolle-cm',
	'rolle-lizenz'
];

/** Die Rolle hinter einer Verein-Auswahl; `null` bei `alle`. */
export function rolleAus(a: VereinAuswahl): Rolle | null {
	return a === 'alle' ? null : (a.slice('rolle-'.length) as Rolle);
}
