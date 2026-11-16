// Hilfen der zwei Schnittstellen-Dateien des Gesprächs (Mitglieder in `schnittstellen.ts`,
// Verwaltung in `verwaltung-schnittstellen.ts`): Prüfung des Texts und die gemeinsamen Antworten.
// Keine Fachlogik; sie steht in `gespraech.ts`.
import { antwort, nichtGefunden } from '../http.ts';

/** FR-50: Länge einer Nachricht nach `trim`, in Unicode-Codepunkten (wie `char_length`). */
const TEXT_MIN = 1;
const TEXT_MAX = 1000;

/** 200 mit dem Gespräch; ist es inzwischen weg (Mitglied gelöscht), 404. */
export const antwortOderWeg = (g: object | null) => (g ? antwort(200, g) : nichtGefunden());
export const nurLesen = () => antwort(409, { fehler: 'nur-lesen' });
export const textFehler = () =>
	antwort(400, { fehler: 'eingabe', felder: { text: 'Schreib 1 bis 1000 Zeichen.' } });

/** Der Text nach `trim`, oder `null`, wenn er nicht 1 bis 1000 Zeichen hat. */
export function pruefeText(roh: unknown): string | null {
	if (typeof roh !== 'string') return null;
	const text = roh.trim();
	const n = [...text].length;
	return n >= TEXT_MIN && n <= TEXT_MAX ? text : null;
}
