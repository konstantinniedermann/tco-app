// Anfragen der Verwaltungsseiten an `/api/admin/…` und ihre Antworten als typisierte Ergebnisse.
// Die Seiten zeigen die Meldungen; hier steht nur, was die Statuscodes bedeuten.
import { jsonPost } from '../json-post.ts';
import type { Angaben, Feld } from '../server/admin/angaben.ts';
import type { AnlassFeld } from '../server/anlass/angaben.ts';
import type { AnlassAdmin, AnlassListe } from '../server/anlass/anlaesse.ts';
import type { FairgateZeile as ServerFairgateZeile } from '../server/admin/fairgate.ts';
import type { Detail, Listenzeile, MitgliedStatus } from '../server/admin/mitglieder.ts';
import type { AnsichtRolle, Rolle, RollenListe, VerwaltungsRolle } from '../server/admin/rollen.ts';
import type { TurnierStatus } from '../server/db/schema.ts';
import type { MitteilungFeld } from '../server/mitteilung/angaben.ts';
import type { KategorieFeld, TurnierFeld } from '../server/turnier/angaben.ts';
import type {
	KategorieZeile,
	TurnierDetail,
	TurnierZeile,
	ladeKategorie as ServerLadeKategorie
} from '../server/turnier/turniere.ts';
import type { VerlaufZeile } from '../server/admin/verlauf.ts';

// Was nach JSON im Browser ankommt: Zeitpunkte sind Zeichenketten.
export type Json<T> = T extends Date
	? string
	: T extends (infer U)[]
		? Json<U>[]
		: T extends object
			? { [K in keyof T]: Json<T[K]> }
			: T;

export type MitgliedDetail = Json<Detail>;
export type MitgliedZeile = Json<Listenzeile>;
export type VerlaufEintrag = Json<VerlaufZeile>;
export type AnlassZeile = Json<AnlassListe>;
export type AnlassDetail = Json<AnlassAdmin> & { beginnLokal: string; schlussLokal: string };
export type { AnlassFeld };
export type TurnierListe = Json<TurnierZeile>[];
export type TurnierAnsicht = Json<TurnierDetail>;
export type KategorieAnsicht = Json<NonNullable<Awaited<ReturnType<typeof ServerLadeKategorie>>>>;
export type { KategorieZeile, KategorieFeld, TurnierFeld, TurnierStatus, VerwaltungsRolle };
type AlleFelder = Feld | AnlassFeld | TurnierFeld | KategorieFeld | MitteilungFeld;
export type FairgateZeile = Json<ServerFairgateZeile>;
export type { Angaben, AnsichtRolle, Feld, MitgliedStatus, Rolle, RollenListe };

export type Antwort<T> =
	| { art: 'ok'; daten: T }
	| { art: 'abgemeldet' }
	| { art: 'kein-admin' }
	| { art: 'unbestaetigt' }
	| { art: 'kein-recht' }
	| { art: 'nur-ansehen' }
	| { art: 'falsch' }
	| { art: 'zu-viele' }
	| { art: 'nicht-gefunden' }
	| { art: 'eingabe'; felder: Partial<Record<AlleFelder, string>> }
	| { art: 'vergeben'; feld: Feld | 'jahr' | 'name' }
	| { art: 'letzter-mytco' }
	| { art: 'veraltet' }
	| { art: 'schluss-vorbei' }
	| { art: 'keine-kategorie' }
	| { art: 'unzulaessig' }
	| { art: 'abgesagt' }
	| { art: 'stoerung' };

export type Holen = (pfad: string, init: RequestInit) => Promise<Response>;

const STOERUNG: Antwort<never> = { art: 'stoerung' };

function deute<T>(status: number, koerper: unknown): Antwort<T> {
	const k = (koerper ?? {}) as { fehler?: unknown; felder?: unknown; feld?: unknown };
	if (status >= 200 && status < 300) return { art: 'ok', daten: koerper as T };
	if (status === 401) return { art: 'abgemeldet' };
	if (status === 403) {
		if (k.fehler === 'kein-admin') return { art: 'kein-admin' };
		if (k.fehler === 'unbestaetigt') return { art: 'unbestaetigt' };
		if (k.fehler === 'kein-recht') return { art: 'kein-recht' };
		if (k.fehler === 'nur-ansehen') return { art: 'nur-ansehen' };
	}
	if (status === 404) return { art: 'nicht-gefunden' };
	if (status === 429) return { art: 'zu-viele' };
	if (status === 400) {
		if (k.fehler === 'falsch') return { art: 'falsch' };
		if (k.fehler === 'eingabe' && k.felder && typeof k.felder === 'object')
			return { art: 'eingabe', felder: k.felder as Partial<Record<AlleFelder, string>> };
	}
	if (status === 409) {
		if (k.fehler === 'letzter-mytco') return { art: 'letzter-mytco' };
		if (k.fehler === 'veraltet') return { art: 'veraltet' };
		if (k.fehler === 'schluss-vorbei') return { art: 'schluss-vorbei' };
		if (k.fehler === 'keine-kategorie') return { art: 'keine-kategorie' };
		if (k.fehler === 'unzulaessig') return { art: 'unzulaessig' };
		if (k.fehler === 'abgesagt') return { art: 'abgesagt' };
		if (k.fehler === 'vergeben' && typeof k.feld === 'string')
			return { art: 'vergeben', feld: k.feld as Feld | 'jahr' | 'name' };
	}
	return STOERUNG;
}

async function rufe<T>(pfad: string, init: RequestInit, holen: Holen): Promise<Antwort<T>> {
	try {
		const antwort = await holen(pfad, init);
		return deute<T>(antwort.status, await antwort.json());
	} catch {
		// Netz weg oder Körper nicht lesbar.
		return STOERUNG;
	}
}

export const lese = <T>(pfad: string, holen: Holen) => rufe<T>(pfad, { method: 'GET' }, holen);

export const schicke = <T>(pfad: string, inhalt: object, holen: Holen) =>
	rufe<T>(pfad, jsonPost(inhalt), holen);

const ADMIN = '/api/admin';

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

export const ladeAnlaesseAdmin = (holen: Holen = fetch) =>
	lese<AnlassZeile[]>(`${ADMIN}/anlaesse`, holen);

export const ladeAnlassAdmin = (id: number, holen: Holen = fetch) =>
	lese<AnlassDetail>(`${ADMIN}/anlaesse/${id}`, holen);

/** `angaben`: Titel, Ort, Einladung und Zeiten in Schweizer Zeit (`YYYY-MM-DDTHH:MM`). */
export const legeAnlassAn = (angaben: object, holen: Holen = fetch) =>
	schicke<{ id: number }>(`${ADMIN}/anlaesse`, angaben, holen);

export const aendereAnlass = (id: number, angaben: object, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/anlaesse/${id}`, angaben, holen);

export const loescheAnlass = (id: number, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/anlaesse/${id}/loeschen`, {}, holen);

export const ladeTurniere = (holen: Holen = fetch) =>
	lese<TurnierListe>(`${ADMIN}/turniere`, holen);

/** `angaben`: Jahr, Name, Anmeldeschluss (`YYYY-MM-DD`) und die ganze Liste der Turniernummern. */
export const legeTurnierAn = (angaben: object, holen: Holen = fetch) =>
	schicke<{ id: number }>(`${ADMIN}/turniere`, angaben, holen);

export const ladeTurnier = (id: number, holen: Holen = fetch) =>
	lese<TurnierAnsicht>(`${ADMIN}/turniere/${id}`, holen);

export const aendereTurnier = (id: number, angaben: object, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/turniere/${id}`, angaben, holen);

export const setzeTurnierStatus = (
	id: number,
	status: 'offen' | 'geschlossen',
	holen: Holen = fetch
) => schicke<Record<string, never>>(`${ADMIN}/turniere/${id}/status`, { status }, holen);

export const legeKategorieAn = (turnierId: number, angaben: object, holen: Holen = fetch) =>
	schicke<{ id: number }>(`${ADMIN}/turniere/${turnierId}/kategorien`, angaben, holen);

export const ladeKategorie = (id: number, holen: Holen = fetch) =>
	lese<KategorieAnsicht>(`${ADMIN}/kategorien/${id}`, holen);

export const aendereKategorie = (id: number, angaben: object, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/kategorien/${id}`, angaben, holen);

export const sageKategorieAb = (id: number, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/kategorien/${id}/absagen`, {}, holen);
