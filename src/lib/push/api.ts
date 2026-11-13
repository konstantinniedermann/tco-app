// Anfragen zu Benachrichtigungen (`/api/benachrichtigungen…`, FR-40, FR-41) und ihre Antworten
// als typisierte Ergebnisse. Die Oberfläche zeigt die Meldungen; hier steht nur, welche
// Fehlerwörter das Modul kennt (gedeutet im Abruf-Baustein).
import { rufeAb, type Holen, type Vertrag } from '../abruf.ts';
import { jsonPost } from '../json-post.ts';

export type Thema = 'anlaesse' | 'cm' | 'verein';
export type Themen = Record<Thema, boolean>;

/** Themen des Kontos, ob dieses Gerät Push hat, und der öffentliche Schlüssel (null: Push aus). */
export type Benachrichtigungen = { themen: Themen; pushHier: boolean; schluessel: string | null };

export type Ergebnis<T> =
	{ art: 'ok'; daten: T } | { art: 'abgemeldet' } | { art: 'push-aus' } | { art: 'stoerung' };

/** Die Fehlerwörter, die Push kennt; der Körper muss lesbar sein. */
type Wort = 'abgemeldet' | 'push-aus';
const VERTRAG: Vertrag<Wort> = { woerter: ['abgemeldet', 'push-aus'], koerper: 'pflicht' };

async function rufe<T>(pfad: string, init: RequestInit, holen: Holen): Promise<Ergebnis<T>> {
	const r = await rufeAb<T, Wort>(pfad, init, holen, VERTRAG);
	return r.art === 'ok' || r.art === 'stoerung' ? r : { art: r.art };
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
