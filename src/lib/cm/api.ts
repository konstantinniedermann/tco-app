// Anfragen der Mitglieder an `/api/cm/…` und `/api/profil/klassierung` und ihre Antworten als
// typisierte Ergebnisse. Die Seiten zeigen die Meldungen; hier steht nur, was die Statuscodes bedeuten.
import { jsonPost } from '../json-post.ts';
import type {
	CmAnsicht as ServerCmAnsicht,
	CmStand as ServerCmStand
} from '../server/cm/anmeldungen.ts';
import type { PartnerTreffer as ServerPartnerTreffer } from '../server/cm/doppel.ts';
import type { Klassierung } from '../turnier/klassierung.ts';
import type { CmAngabe } from '../turnier/passung.ts';
import type { Holen, Json } from '../verwaltung/api.ts';

export type CmStand = Json<ServerCmStand>;
export type CmAnsicht = Json<ServerCmAnsicht>;
export type CmKategorie = CmAnsicht['kategorien'][number];
export type CmAnfrage = CmAnsicht['anfragen'][number];
export type PartnerTreffer = Json<ServerPartnerTreffer>;

/**
 * A-ANMELDUNG-04: die Doppel-Kategorie, für die die Anmelde-Seite gilt: Anmeldung offen, alle
 * Angaben da und noch ohne Partner (allein suchen darf man schon). Sonst `null`.
 */
export function doppelZurWahl(cm: CmAnsicht, kategorieId: number): CmKategorie | null {
	if (cm.turnier.status !== 'offen' || cm.fehlt.length > 0) return null;
	const k = cm.kategorien.find((x) => x.id === kategorieId && x.art === 'doppel');
	return k && k.eigen?.art !== 'paar' ? k : null;
}

/**
 * Seite einer Kategorie: die Kategorie, wie die Übersicht sie zeigt (auch eine Wildcard-Kategorie),
 * sonst `null`.
 */
export function kategorieZumAnsehen(
	cm: CmAnsicht,
	kategorieId: number
): { kategorie: CmKategorie; wildcard: boolean } | null {
	const k = cm.kategorien.find((x) => x.id === kategorieId);
	if (k) return { kategorie: k, wildcard: false };
	const w = cm.wildcard.find((x) => x.id === kategorieId);
	return w ? { kategorie: w, wildcard: true } : null;
}

/** Gründe, aus denen der Server eine Anmeldung oder Anfrage ablehnt (409). */
const ABGELEHNT = [
	'geschlossen',
	'voll',
	'passt-nicht',
	'schon-angemeldet',
	'schon-angefragt',
	'anfrage-offen',
	'hinfaellig',
	'angaben-fehlen',
	'keine-wildcard'
] as const;
type Abgelehnt = (typeof ABGELEHNT)[number];

/** Felder, die der Server bei 400 melden kann. */
export type CmFelder = Partial<Record<CmAngabe | 'kommentar' | 'suchtext', string>>;

export type Ergebnis<T> =
	| { art: 'ok'; daten: T }
	| { art: 'abgemeldet' }
	| { art: 'nicht-gefunden' }
	| { art: Abgelehnt }
	| { art: 'eingabe'; felder: CmFelder }
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
			return { art: 'eingabe', felder: k.felder as CmFelder };
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

/** Anmelden; im Doppel allein, dann mit dem freiwilligen Kommentar *sucht Partner* (FR-49). */
export const meldeAn = (
	kategorieId: number,
	suchtext: string | null = null,
	holen: Holen = fetch
) =>
	rufe<CmAnsicht>(
		`/api/cm/kategorien/${kategorieId}/anmeldung`,
		jsonPost(suchtext === null ? {} : { suchtext }),
		holen
	);

/** FR-08: Wildcard für eine stärkere Kategorie beantragen; der Kommentar ist Pflicht. */
export const beantrageWildcard = (kategorieId: number, kommentar: string, holen: Holen = fetch) =>
	rufe<CmAnsicht>(`/api/cm/kategorien/${kategorieId}/wildcard`, jsonPost({ kommentar }), holen);

export const meldeAb = (anmeldungId: number, holen: Holen = fetch) =>
	rufe<CmAnsicht>(`/api/cm/anmeldungen/${anmeldungId}/abmelden`, jsonPost({}), holen);

/** FR-37: Klassierung im Profil ändern. */
export const speichereKlassierung = (klassierung: Klassierung | '', holen: Holen = fetch) =>
	rufe<Record<string, never>>('/api/profil/klassierung', jsonPost({ klassierung }), holen);

/** FR-48: Partner für ein Doppel suchen; `signal` bricht eine veraltete Suche ab. */
export const sucheDoppelPartner = (
	kategorieId: number,
	suche: string,
	holen: Holen = fetch,
	signal?: AbortSignal
) =>
	rufe<PartnerTreffer[]>(
		`/api/cm/kategorien/${kategorieId}/partner?suche=${encodeURIComponent(suche)}`,
		{ method: 'GET', signal },
		holen
	);

/** FR-48: einen Partner anfragen. */
export const stelleAnfrage = (kategorieId: number, anId: number, holen: Holen = fetch) =>
	rufe<CmAnsicht>(`/api/cm/kategorien/${kategorieId}/anfragen`, jsonPost({ anId }), holen);

/** FR-48: eine Anfrage an einen selbst annehmen. */
export const nimmAnfrageAn = (anfrageId: number, holen: Holen = fetch) =>
	rufe<CmAnsicht>(`/api/cm/anfragen/${anfrageId}/annehmen`, jsonPost({}), holen);

/** FR-48: eine Anfrage an einen selbst ablehnen. */
export const lehneAnfrageAb = (anfrageId: number, holen: Holen = fetch) =>
	rufe<CmAnsicht>(`/api/cm/anfragen/${anfrageId}/ablehnen`, jsonPost({}), holen);

/** FR-48: eine eigene Anfrage zurückziehen. */
export const zieheAnfrageZurueck = (anfrageId: number, holen: Holen = fetch) =>
	rufe<CmAnsicht>(`/api/cm/anfragen/${anfrageId}/zurueckziehen`, jsonPost({}), holen);

/** FR-49: Kommentar *sucht Partner* der eigenen Anmeldung ändern; leer löscht ihn. */
export const setzeSuchtext = (anmeldungId: number, suchtext: string, holen: Holen = fetch) =>
	rufe<CmAnsicht>(`/api/cm/anmeldungen/${anmeldungId}/suchtext`, jsonPost({ suchtext }), holen);
