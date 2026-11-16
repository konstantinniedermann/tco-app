// Dienst-Typ der Schnittstellen zu Interclub. Keine Schnittstellen-Datei: Der Zusammenbau der
// Dienste holt ihn von hier.
import type { Db } from '../db/index.ts';

export type InterclubDienste = { db: Db; jetzt?: () => Date };
