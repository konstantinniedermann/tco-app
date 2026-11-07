// «Ansicht als …»: Der MyTCO-Admin sieht MyTCO wie jemand mit einer anderen Rolle, nur lesend.
// Die Ansicht ist ein Zustand der Sitzung; sie schreibt keinen Eintrag in den Änderungsverlauf.
import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { sitzung } from '../db/schema.ts';
import { antwort } from '../login/schnittstellen.ts';
import type { AnsichtRolle } from './rollen.ts';

// Was in der Ansicht noch speichern darf: sie beenden, abmelden und die Verwaltung per Mail-Code
// bestätigen (SI-08). Alles andere wird abgewiesen, auch Eigenes (eigene Angaben, eigene Anmeldung).
export const ERLAUBT_IN_ANSICHT = [
	'/api/admin/ansicht/beenden',
	'/api/logout',
	'/api/admin/zugang',
	'/api/admin/zugang/code'
] as const;

const NUR_LESEN = ['GET', 'HEAD'];

/**
 * Läuft in hooks.server.ts vor jeder Schnittstelle unter /api/. Gibt die Absage zurück, wenn die
 * Sitzung in einer Ansicht ist und die Anfrage etwas speichern könnte; sonst `null`.
 */
export function riegel(
	methode: string,
	pfad: string,
	ansicht: AnsichtRolle | null
): Response | null {
	if (ansicht === null || !pfad.startsWith('/api/')) return null;
	if (NUR_LESEN.includes(methode.toUpperCase())) return null;
	if ((ERLAUBT_IN_ANSICHT as readonly string[]).includes(pfad)) return null;
	return antwort(403, { fehler: 'nur-ansehen' });
}

/** Setzt oder beendet (`null`) die Ansicht dieser einen Sitzung. */
export async function setzeAnsicht(
	db: Db,
	sitzungHash: string,
	rolle: AnsichtRolle | null
): Promise<void> {
	await db.update(sitzung).set({ ansichtRolle: rolle }).where(eq(sitzung.kennungHash, sitzungHash));
}
