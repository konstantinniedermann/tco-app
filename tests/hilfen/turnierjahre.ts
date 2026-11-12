/** Bereich der Turnierjahre einer Testdatei, beide Grenzen eingeschlossen. */
export type Jahresbereich = readonly [von: number, bis: number];

/**
 * Turnierjahre der Datenbanktests, die Turniere in der gemeinsamen Test-Datenbank anlegen
 * (`turnier_jahr_unique`). Jede Datei hat ihren eigenen Bereich, kein Jahr gehört zwei Dateien;
 * innerhalb der Datei zählt `turnierjahre` fortlaufend. So trifft kein Test das Jahr eines anderen,
 * auch nicht parallel. Ein Lauf hat immer eine frische Datenbank (`tests/setup/datenbank-global.ts`):
 * Jahre aus früheren Läufen gibt es dort nicht.
 *
 * Schlüssel: Pfad ab dem Repo. Eine neue Datei bekommt hier einen freien Bereich, sonst bricht
 * `turnierjahre` ab. Vierstellige Jahre, wo ein Test daraus ein Datum für `new Date` baut; die
 * Grenzen 9100 bis 9999 hatten die zwei Dateien schon vorher.
 */
export const TURNIERJAHRE: Record<string, Jahresbereich> = {
	'src/lib/server/turnier/turniere.db.test.ts': [3000, 3599],
	'src/lib/server/cm/verwaltung-schnittstellen.db.test.ts': [3600, 4199],
	'src/lib/server/gespraech/gespraech.db.test.ts': [4200, 4799],
	'src/lib/server/cm/verwaltung-doppel.db.test.ts': [4800, 5399],
	'src/lib/server/cm/verwaltung.db.test.ts': [5400, 5999],
	'src/lib/server/cm/doppel.db.test.ts': [6000, 6599],
	'src/lib/server/cm/anmeldungen.db.test.ts': [6600, 7199],
	'src/lib/server/cm/schnittstellen.db.test.ts': [7200, 7799],
	'src/lib/server/admin/schnittstellen.db.test.ts': [7800, 8399],
	'src/lib/server/gespraech/schnittstellen.db.test.ts': [9100, 9899],
	'src/routes/api/mail-nur-an.db.test.ts': [9960, 9999],
	'src/lib/server/db/schema.db.test.ts': [10000, 92999]
};

/**
 * Baut die Vergabe über `bereiche` (eigene Funktion, damit sich die Vergabe ohne die echte Tabelle
 * prüfen lässt). Der Stand gilt je Bereich, nicht je Aufruf: Holt eine Datei an zwei Stellen eine
 * Vergabe, zählen beide weiter, statt dasselbe Jahr zweimal zu geben.
 */
export function jahresvergabe(bereiche: Record<string, Jahresbereich>) {
	const stand = new Map<string, number>();
	return (datei: string) => {
		const schluessel = Object.keys(bereiche).find((k) => datei.endsWith(`/${k}`) || datei === k);
		if (schluessel === undefined) {
			throw new Error(
				`Keine Turnierjahre für ${datei}: Bereich in tests/hilfen/turnierjahre.ts eintragen`
			);
		}
		const [von, bis] = bereiche[schluessel];
		/** Erstes von `anzahl` aufeinanderfolgenden Jahren, die noch kein Test dieser Datei hatte. */
		return (anzahl = 1): number => {
			const erstes = stand.get(schluessel) ?? von;
			if (erstes + anzahl - 1 > bis) {
				throw new Error(`Turnierjahre für ${schluessel} aufgebraucht (${von} bis ${bis})`);
			}
			stand.set(schluessel, erstes + anzahl);
			return erstes;
		};
	};
}

/** Vergabe für eine Testdatei: `const naechstesJahr = turnierjahre(import.meta.url)`. */
export const turnierjahre = jahresvergabe(TURNIERJAHRE);
