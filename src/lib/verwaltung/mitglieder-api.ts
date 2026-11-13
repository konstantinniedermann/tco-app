// Mitglieder in der Verwaltung: Liste, Angaben, Rollen, Mitgliedschaft, Auskunft, Verlauf, Briefe,
// Einlesen und Fairgate (Anfragen an `/api/admin/mitglieder` und Verwandtes). Antwort und Abruf
// stehen in `api.ts`.
import type { Holen, Json } from '../abruf.ts';
import type { Angaben } from '../server/admin/angaben.ts';
import type { FairgateZeile as ServerFairgateZeile } from '../server/admin/fairgate.ts';
import type { Auskunft } from '../server/admin/auskunft.ts';
import type { AusgestellterBrief, BriefZeile } from '../server/admin/briefe.ts';
import type { Vorschau } from '../server/admin/einlesen.ts';
import type { Detail, Listenzeile, MitgliedStatus } from '../server/admin/mitglieder.ts';
import type { Rolle } from '../server/admin/rollen.ts';
import type { VerlaufZeile } from '../server/admin/verlauf.ts';
import { ADMIN, lese, schicke, type Antwort } from './api.ts';

export type MitgliedDetail = Json<Detail>;
export type AuskunftAnsicht = Json<Auskunft>;
export type MitgliedZeile = Json<Listenzeile>;
export type VerlaufEintrag = Json<VerlaufZeile>;
export type FairgateZeile = Json<ServerFairgateZeile>;
export type BriefListe = Json<BriefZeile>[];
export type { AusgestellterBrief };
export type { Vorschau };
export type { Angaben, MitgliedStatus, Rolle };

export function ladeMitglieder(
	filter: { suche?: string; status?: string },
	holen: Holen = fetch
): Promise<Antwort<MitgliedZeile[]>> {
	const q = new URLSearchParams();
	if (filter.suche) q.set('suche', filter.suche);
	if (filter.status) q.set('status', filter.status);
	const abfrage = q.size > 0 ? `?${q}` : '';
	return lese(`${ADMIN}/mitglieder${abfrage}`, holen);
}

/** A-LOGIN-01: aktive Mitglieder, die MyTCO noch nie geöffnet haben. */
export const ladeBriefe = (holen: Holen = fetch) => lese<BriefListe>(`${ADMIN}/briefe`, holen);

/**
 * A-LOGIN-01: stellt für jedes Mitglied einen neuen Brief-Code aus (alles oder nichts). Die Antwort
 * enthält die Codes im Klartext (RR-04: nur für die Druckansicht, nie speichern).
 */
export const erzeugeBriefe = (ids: number[], holen: Holen = fetch) =>
	schicke<{ briefe: AusgestellterBrief[] }>(`${ADMIN}/briefe`, { ids }, holen);

/** Wie `erzeugeBriefe`, für ein einzelnes Mitglied. */
export const erzeugeBrief = (id: number, holen: Holen = fetch) =>
	schicke<{ briefe: AusgestellterBrief[] }>(`${ADMIN}/mitglieder/${id}/brief`, {}, holen);

/** A-MITGLIED-07: Vorschau einer Datei; nichts wird gespeichert. */
export const zeigeEinleseVorschau = (text: string, holen: Holen = fetch) =>
	schicke<Vorschau>(`${ADMIN}/einlesen/vorschau`, { text }, holen);

/** A-MITGLIED-07: legt die neuen Zeilen an, wenn es noch `erwartet` sind (sonst `veraltet`). */
export const liesMitgliederEin = (text: string, erwartet: number, holen: Holen = fetch) =>
	schicke<{ angelegt: number }>(`${ADMIN}/einlesen`, { text, erwartet }, holen);

export const legeMitgliedAn = (angaben: object, holen: Holen = fetch) =>
	schicke<{ id: number }>(`${ADMIN}/mitglieder`, angaben, holen);

export const ladeMitglied = (id: number, holen: Holen = fetch) =>
	lese<MitgliedDetail>(`${ADMIN}/mitglieder/${id}`, holen);

/** `vorher`: die Angaben, wie die Seite sie geladen hat; der Server speichert nur, wenn sie noch gelten. */
export const speichereAngaben = (
	id: number,
	angaben: object,
	vorher: object,
	holen: Holen = fetch
) => schicke<{ geaendert: string[] }>(`${ADMIN}/mitglieder/${id}`, { ...angaben, vorher }, holen);

/** `vorher`: die Rollen, wie die Seite sie geladen hat; der Server speichert nur, wenn sie noch gelten. */
export const speichereRollen = (
	id: number,
	rollen: Rolle[],
	vorher: Rolle[],
	holen: Holen = fetch
) => schicke<Record<string, never>>(`${ADMIN}/mitglieder/${id}/rollen`, { rollen, vorher }, holen);

export const beendeSitzungen = (id: number, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/mitglieder/${id}/sitzungen`, {}, holen);

/** Austritt, Wiedereintritt, Löschen und Zurücknehmen: ändern den Stand der Mitgliedschaft (FR-04). */
const mitgliedschaft =
	(aktion: string) =>
	(id: number, holen: Holen = fetch) =>
		schicke<Record<string, never>>(`${ADMIN}/mitglieder/${id}/${aktion}`, {}, holen);

export const erfasseAustritt = mitgliedschaft('austritt');
export const erfasseWiedereintritt = mitgliedschaft('wiedereintritt');
export const loescheMitglied = mitgliedschaft('loeschen');
export const nimmLoeschungZurueck = mitgliedschaft('loeschen-rueckgaengig');

/** DS-07: alles, was MyTCO zu dem Mitglied speichert. */
export const ladeAuskunft = (id: number, holen: Holen = fetch) =>
	lese<AuskunftAnsicht>(`${ADMIN}/mitglieder/${id}/auskunft`, holen);

export function ladeVerlauf(
	filter: { mitglied?: number },
	holen: Holen = fetch
): Promise<Antwort<VerlaufEintrag[]>> {
	const abfrage = filter.mitglied === undefined ? '' : `?mitglied=${filter.mitglied}`;
	return lese(`${ADMIN}/verlauf${abfrage}`, holen);
}

export const ladeFairgate = (holen: Holen = fetch) =>
	lese<FairgateZeile[]>(`${ADMIN}/fairgate`, holen);

/** `seit`: der Stand der Zeile, wie die Liste ihn zeigte; hat das Mitglied inzwischen mehr geändert, antwortet der Server «veraltet». */
export const uebertrageFairgate = (id: number, seit: string, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/fairgate/${id}`, { seit }, holen);
