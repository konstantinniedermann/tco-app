// Anfragen der Mitglieder an `/api/anlaesse/…` und ihre Antworten als typisierte Ergebnisse.
import { jsonPost } from '../json-post.ts';
import type { AnlassMitglied } from '../server/anlass/anlaesse.ts';
import type { Antwort as AntwortArt } from '../server/db/schema.ts';
import type { Holen, Json } from '../verwaltung/api.ts';

export type AnlassAnsicht = Json<Omit<AnlassMitglied, 'kalenderKennung'>> & { kalender: string };
export type { AntwortArt };

export type Ergebnis<T> =
	| { art: 'ok'; daten: T }
	| { art: 'abgemeldet' }
	| { art: 'nicht-gefunden' }
	| { art: 'geschlossen' }
	| { art: 'eingabe'; feld: 'antwort' | 'bemerkung' }
	| { art: 'stoerung' };

async function rufe<T>(pfad: string, init: RequestInit, holen: Holen): Promise<Ergebnis<T>> {
	try {
		const r = await holen(pfad, init);
		const k = (await r.json()) as { fehler?: unknown; feld?: unknown };
		if (r.ok) return { art: 'ok', daten: k as T };
		if (r.status === 401) return { art: 'abgemeldet' };
		if (r.status === 404) return { art: 'nicht-gefunden' };
		if (r.status === 409 && k.fehler === 'geschlossen') return { art: 'geschlossen' };
		if (r.status === 400 && (k.feld === 'antwort' || k.feld === 'bemerkung'))
			return { art: 'eingabe', feld: k.feld };
		return { art: 'stoerung' };
	} catch {
		return { art: 'stoerung' };
	}
}

export const holeAnlaesse = (holen: Holen = fetch) =>
	rufe<AnlassAnsicht[]>('/api/anlaesse', { method: 'GET' }, holen);

export const holeAnlass = (id: number, holen: Holen = fetch) =>
	rufe<AnlassAnsicht>(`/api/anlaesse/${id}`, { method: 'GET' }, holen);

export const sendeAntwort = (
	id: number,
	a: { antwort: AntwortArt; bemerkung: string | null },
	holen: Holen = fetch
) => rufe<AnlassAnsicht>(`/api/anlaesse/${id}/anmeldung`, jsonPost(a), holen);
