// Die Gründe, aus denen der Server eine Anmeldung oder Anfrage der Clubmeisterschaft ablehnt (N-10).
// Eine Liste für beide Seiten: Der Server sendet nur diese Wörter (`src/lib/server/cm/schnittstellen.ts`,
// dort gegen die Ergebnisse der Fachfunktionen getippt), die Oberfläche kennt sie alle
// (`src/lib/cm/api.ts`). Diese Datei holt aus `fehler.ts` nur einen Typ.
import type { Fehlerwort } from '../fehler.ts';

export const ABLEHNUNGEN = [
	'geschlossen',
	'voll',
	'passt-nicht',
	'keine-wildcard',
	'schon-angemeldet',
	'schon-angefragt',
	'anfrage-offen',
	'hinfaellig',
	'angaben-fehlen'
] as const satisfies readonly Fehlerwort[];
