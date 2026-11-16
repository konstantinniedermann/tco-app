// Zugang zur Verwaltung: Sitzung, Code, Rollen-Übersicht und «Ansicht als …» (Anfragen an
// `/api/admin/zugang`, `/rollen` und `/ansicht`). Antwort und Abruf stehen in `api.ts`.
import type { Holen } from '../abruf.ts';
import type { AnsichtRolle, RollenListe, VerwaltungsRolle } from '../server/admin/rollen.ts';
import { ADMIN, lese, schicke, type Antwort } from './api.ts';

export type { AnsichtRolle, RollenListe, VerwaltungsRolle };

export const ladeZugang = (holen: Holen = fetch) =>
	lese<{ bestaetigt: boolean; mitgliedId?: number; rollen: VerwaltungsRolle[] }>(
		`${ADMIN}/zugang`,
		holen
	);

export const fordereCodeAn = (holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/zugang/code`, {}, holen);

export const bestaetige = (code: string, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/zugang`, { code }, holen);

/** Regel 2: wer welche Rolle hat (nur MyTCO-Admin). */
export const ladeRollenListe = (holen: Holen = fetch) =>
	lese<RollenListe>(`${ADMIN}/rollen`, holen);

/**
 * Schaltet «Ansicht als …» ein. Läuft schon eine Ansicht, beendet die Seite sie zuerst: Von einer
 * Ansicht direkt in eine andere weist der Server ab (`nur-ansehen`).
 */
export async function schaueAls(
	rolle: AnsichtRolle,
	laufend: AnsichtRolle | null,
	holen: Holen = fetch
): Promise<Antwort<Record<string, never>>> {
	if (laufend !== null) {
		const ende = await beendeAnsicht(holen);
		if (ende.art !== 'ok') return ende;
	}
	return schicke<Record<string, never>>(`${ADMIN}/ansicht`, { rolle }, holen);
}

/** Beendet die Ansicht dieser Sitzung; geht immer, auch ohne laufende Ansicht. */
export const beendeAnsicht = (holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/ansicht/beenden`, {}, holen);
