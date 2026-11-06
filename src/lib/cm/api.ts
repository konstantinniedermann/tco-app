// Anfragen der Mitglieder an `/api/cm/…` und `/api/profil/klassierung` und ihre Antworten als
// typisierte Ergebnisse. Die Seiten zeigen die Meldungen; hier steht nur, was die Statuscodes bedeuten.
import { jsonPost } from '../json-post.ts';
import type {
	CmAnsicht as ServerCmAnsicht,
	CmStand as ServerCmStand
} from '../server/cm/anmeldungen.ts';
import type { Klassierung } from '../turnier/klassierung.ts';
import type { CmAngabe } from '../turnier/passung.ts';
import type { Holen, Json } from '../verwaltung/api.ts';

export type CmStand = Json<ServerCmStand>;
export type CmAnsicht = Json<ServerCmAnsicht>;
export type CmKategorie = CmAnsicht['kategorien'][number];

/** Gründe, aus denen der Server eine Anmeldung ablehnt (409). */
const ABGELEHNT = [
	'geschlossen',
	'voll',
	'passt-nicht',
	'schon-angemeldet',
	'angaben-fehlen'
] as const;
type Abgelehnt = (typeof ABGELEHNT)[number];

export type Ergebnis<T> =
	| { art: 'ok'; daten: T }
	| { art: 'abgemeldet' }
	| { art: 'nicht-gefunden' }
	| { art: Abgelehnt }
	| { art: 'eingabe'; felder: Partial<Record<CmAngabe, string>> }
	| { art: 'stoerung' };

const istAbgelehnt = (x: unknown): x is Abgelehnt =>
	typeof x === 'string' && (ABGELEHNT as readonly string[]).includes(x);

const istObjekt = (x: unknown): x is Record<string, unknown> =>
	typeof x === 'object' && x !== null && !Array.isArray(x);

async function rufe<T>(pfad: string, init: RequestInit, holen: Holen): Promise<Ergebnis<T>> {
	try {
		const r = await holen(pfad, init);
		const k = (await r.json()) as { fehler?: unknown; felder?: unknown };
		if (r.ok) return { art: 'ok', daten: k as T };
		if (r.status === 401) return { art: 'abgemeldet' };
		if (r.status === 404) return { art: 'nicht-gefunden' };
		if (r.status === 409 && istAbgelehnt(k.fehler)) return { art: k.fehler };
		if (r.status === 400 && k.fehler === 'eingabe' && istObjekt(k.felder))
			return { art: 'eingabe', felder: k.felder as Partial<Record<CmAngabe, string>> };
		return { art: 'stoerung' };
	} catch {
		return { art: 'stoerung' };
	}
}

const GET: RequestInit = { method: 'GET' };

export const holeCmTurniere = (holen: Holen = fetch) => rufe<CmStand[]>('/api/cm', GET, holen);

export const holeCmAnsicht = (id: number, holen: Holen = fetch) =>
	rufe<CmAnsicht>(`/api/cm/${id}`, GET, holen);

/** FR-37: fehlende Angaben nachtragen; Geschlecht und Jahrgang nur, wenn sie fehlen. */
export const sendeCmAngaben = (
	angaben: { klassierung: string; geschlecht?: string; jahrgang?: string },
	holen: Holen = fetch
) => rufe<Record<string, never>>('/api/cm/angaben', jsonPost(angaben), holen);

export const meldeAn = (kategorieId: number, holen: Holen = fetch) =>
	rufe<CmAnsicht>(`/api/cm/kategorien/${kategorieId}/anmeldung`, jsonPost({}), holen);

export const meldeAb = (anmeldungId: number, holen: Holen = fetch) =>
	rufe<CmAnsicht>(`/api/cm/anmeldungen/${anmeldungId}/abmelden`, jsonPost({}), holen);

/** FR-37: Klassierung im Profil ändern. */
export const speichereKlassierung = (klassierung: Klassierung | '', holen: Holen = fetch) =>
	rufe<Record<string, never>>('/api/profil/klassierung', jsonPost({ klassierung }), holen);
