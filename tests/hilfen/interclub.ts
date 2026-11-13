import { beispielAbruf } from '../../scripts/beispiel-interclub.ts';
import type { Db } from '../../src/lib/server/db/index.ts';
import { importiereSaison } from '../../src/lib/server/interclub/import.ts';
import type { Wettbewerb } from '../../src/lib/server/interclub/swiss-tennis.ts';

export const TCO_VEREIN = 2202;

/** Spielt die Beispieldaten (Saison 2026 von Swiss Tennis) unter dem Jahr `jahr` ein. */
export async function importiereBeispiel(
	db: Db,
	jahr: number,
	jetzt: Date,
	o: { nichtFreigeschaltet?: { jahr: number; wettbewerb: Wettbewerb }[] } = {}
) {
	return importiereSaison(
		{ db, holen: beispielAbruf(o), jetzt: () => jetzt, pause: async () => {} },
		jahr,
		TCO_VEREIN
	);
}
