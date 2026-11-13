// Grenze und Sätze zur Antwort eines Mitglieds auf einen Anlass, geteilt von Server und Seite (N-09):
// Der Server prüft und meldet mit ihnen (`src/lib/server/anlass/`), die Seite des Anlasses prüft im
// Browser und zeigt denselben Satz. Diese Datei importiert nichts.

/** Höchstlänge der Bemerkung (nach `trim`). */
export const MAX_BEMERKUNG = 500;

/** Satz je Feld, wenn eine Antwort nicht passt. */
export const ANTWORT_MELDUNG = {
	antwort: 'Bitte wähle «Ich komme» oder «Ich komme nicht».',
	bemerkung: `Die Bemerkung darf höchstens ${MAX_BEMERKUNG} Zeichen lang sein.`
} as const;
