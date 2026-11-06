// Anfragen zu Benachrichtigungen (`/api/benachrichtigungen…`, FR-40, FR-41) und ihre Antworten
// als typisierte Ergebnisse. Die Oberfläche zeigt die Meldungen; hier steht nur, was die
// Statuscodes bedeuten.
import { jsonPost } from '../json-post.ts';
import type { Holen } from '../verwaltung/api.ts';

export type Thema = 'anlaesse' | 'cm' | 'verein';
export type Themen = Record<Thema, boolean>;

/** Themen des Kontos, ob dieses Gerät Push hat, und der öffentliche Schlüssel (null: Push aus). */
export type Benachrichtigungen = { themen: Themen; pushHier: boolean; schluessel: string | null };

export type Ergebnis<T> =
	{ art: 'ok'; daten: T } | { art: 'abgemeldet' } | { art: 'push-aus' } | { art: 'stoerung' };

async function rufe<T>(pfad: string, init: RequestInit, holen: Holen): Promise<Ergebnis<T>> {
	try {
		const r = await holen(pfad, init);
		const k = (await r.json()) as { fehler?: unknown };
		if (r.ok) return { art: 'ok', daten: k as T };
		if (r.status === 401) return { art: 'abgemeldet' };
		if (r.status === 409 && k.fehler === 'push-aus') return { art: 'push-aus' };
		return { art: 'stoerung' };
	} catch {
		return { art: 'stoerung' };
	}
}

export const holeBenachrichtigungen = (holen: Holen = fetch) =>
	rufe<Benachrichtigungen>('/api/benachrichtigungen', { method: 'GET' }, holen);

export const speichereThemen = (themen: Themen, holen: Holen = fetch) =>
	rufe<Benachrichtigungen>('/api/benachrichtigungen', jsonPost({ themen }), holen);

/** Meldet das Abo dieses Geräts (`PushSubscription.toJSON()`). */
export const sendeAbo = (abo: PushSubscriptionJSON, holen: Holen = fetch) =>
	rufe<{ pushHier: boolean }>('/api/benachrichtigungen/abo', jsonPost(abo), holen);

/** Löscht das Abo dieses Geräts auf dem Server; der Server verlangt einen JSON-Körper. */
export const loescheAbo = (holen: Holen = fetch) =>
	rufe<{ pushHier: boolean }>('/api/benachrichtigungen/abo/loeschen', jsonPost({}), holen);
