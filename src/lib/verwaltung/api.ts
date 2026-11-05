// Anfragen der Verwaltungsseiten an `/api/admin/…` und ihre Antworten als typisierte Ergebnisse.
// Die Seiten zeigen die Meldungen; hier steht nur, was die Statuscodes bedeuten.
import { jsonPost } from '../json-post.ts';
import type { Angaben, Feld } from '../server/admin/angaben.ts';
import type { FairgateZeile as ServerFairgateZeile } from '../server/admin/fairgate.ts';
import type { Detail, Listenzeile, MitgliedStatus } from '../server/admin/mitglieder.ts';
import type { Rolle } from '../server/admin/rollen.ts';
import type { VerlaufZeile } from '../server/admin/verlauf.ts';

// Was nach JSON im Browser ankommt: Zeitpunkte sind Zeichenketten.
type Json<T> = T extends Date
	? string
	: T extends (infer U)[]
		? Json<U>[]
		: T extends object
			? { [K in keyof T]: Json<T[K]> }
			: T;

export type MitgliedDetail = Json<Detail>;
export type MitgliedZeile = Json<Listenzeile>;
export type VerlaufEintrag = Json<VerlaufZeile>;
export type FairgateZeile = Json<ServerFairgateZeile>;
export type { Angaben, Feld, MitgliedStatus, Rolle };

export type Antwort<T> =
	| { art: 'ok'; daten: T }
	| { art: 'abgemeldet' }
	| { art: 'kein-admin' }
	| { art: 'unbestaetigt' }
	| { art: 'falsch' }
	| { art: 'zu-viele' }
	| { art: 'nicht-gefunden' }
	| { art: 'eingabe'; felder: Partial<Record<Feld, string>> }
	| { art: 'vergeben'; feld: Feld }
	| { art: 'letzter-admin' }
	| { art: 'veraltet' }
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
	}
	if (status === 404) return { art: 'nicht-gefunden' };
	if (status === 429) return { art: 'zu-viele' };
	if (status === 400) {
		if (k.fehler === 'falsch') return { art: 'falsch' };
		if (k.fehler === 'eingabe' && k.felder && typeof k.felder === 'object')
			return { art: 'eingabe', felder: k.felder as Partial<Record<Feld, string>> };
	}
	if (status === 409) {
		if (k.fehler === 'letzter-admin') return { art: 'letzter-admin' };
		if (k.fehler === 'veraltet') return { art: 'veraltet' };
		if (k.fehler === 'vergeben' && typeof k.feld === 'string')
			return { art: 'vergeben', feld: k.feld as Feld };
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

const lese = <T>(pfad: string, holen: Holen) => rufe<T>(pfad, { method: 'GET' }, holen);

const schicke = <T>(pfad: string, inhalt: object, holen: Holen) =>
	rufe<T>(pfad, jsonPost(inhalt), holen);

const ADMIN = '/api/admin';

export const ladeZugang = (holen: Holen = fetch) =>
	lese<{ bestaetigt: boolean; mitgliedId?: number }>(`${ADMIN}/zugang`, holen);

export const fordereCodeAn = (holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/zugang/code`, {}, holen);

export const bestaetige = (code: string, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/zugang`, { code }, holen);

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

export const speichereRollen = (id: number, rollen: Rolle[], holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/mitglieder/${id}/rollen`, { rollen }, holen);

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
