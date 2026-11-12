import type { AdminEreignis } from '../../src/lib/server/admin/rechte.ts';
import { ADMIN_SCHNITTSTELLEN } from '../../src/lib/server/admin/schnittstellen.ts';
import { ANLASS_ADMIN_SCHNITTSTELLEN } from '../../src/lib/server/anlass/verwaltung-schnittstellen.ts';
import { MITTEILUNG_ADMIN_SCHNITTSTELLEN } from '../../src/lib/server/mitteilung/schnittstellen.ts';
import type { MitteilungAdminDienste } from '../../src/lib/server/mitteilung/typen.ts';
import { TURNIER_SCHNITTSTELLEN } from '../../src/lib/server/turnier/schnittstellen.ts';

/** Eine Schnittstelle der Verwaltung; die Dienste der Mitteilungs-Verwaltung genügen jeder Liste. */
export type VerwaltungsSchnittstelle = (
	d: MitteilungAdminDienste,
	e: AdminEreignis
) => Promise<Response>;

/**
 * Die Listen der Verwaltung, an einer Stelle für die Tests (B-37): Grundprüfung (Rechte-Schleife,
 * 415), Routen-Test und Rechte-Matrix nehmen sie von hier. Eine neue Liste kommt hier hinein und in
 * die Bauregel (`scripts/pruefungen/bauregel.ts`). Fehlt sie hier, wird der Routen-Test rot, sobald
 * eine Admin-Route eine ihrer Funktionen ruft. Schlüssel: Name des Moduls in den Meldungen.
 */
export const VERWALTUNGS_LISTEN: Record<string, Record<string, VerwaltungsSchnittstelle>> = {
	admin: ADMIN_SCHNITTSTELLEN,
	turnier: TURNIER_SCHNITTSTELLEN,
	'mitteilung-admin': MITTEILUNG_ADMIN_SCHNITTSTELLEN,
	'anlass-admin': ANLASS_ADMIN_SCHNITTSTELLEN
};

/** Alle Einträge aller Listen der Verwaltung in einem Objekt (Name → Funktion). */
export const alleVerwaltung = (): Record<string, VerwaltungsSchnittstelle> =>
	Object.assign({}, ...Object.values(VERWALTUNGS_LISTEN));
