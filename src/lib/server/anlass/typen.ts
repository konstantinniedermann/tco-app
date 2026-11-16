// Dienst-Typ der Schnittstellen zu Anlässen. Keine Schnittstellen-Datei: Der Zusammenbau der
// Dienste holt ihn von hier.
import type { Db } from '../db/index.ts';

export type AnlassDienste = { db: Db; jetzt?: () => Date };
