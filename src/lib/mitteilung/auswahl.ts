// Empfänger-Auswahlen einer Mitteilung (FR-43). Ohne Server-Code, darum auch im Formular nutzbar.

/** Anlass: alle, oder nach der Antwort auf diesen Anlass. */
export type AnlassAuswahl = 'alle' | 'keine-antwort' | 'kommt' | 'kommt-nicht' | 'zu-pruefen';
export const ANLASS_AUSWAHLEN: readonly AnlassAuswahl[] = [
	'alle',
	'keine-antwort',
	'kommt',
	'kommt-nicht',
	'zu-pruefen'
];

/** Verein: nur alle aktiven Mitglieder mit dem Thema Verein. */
export type VereinAuswahl = 'alle';
export const VEREIN_AUSWAHLEN: readonly VereinAuswahl[] = ['alle'];
