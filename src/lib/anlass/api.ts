// Anfragen der Mitglieder an `/api/anlaesse/…` und ihre Antworten als typisierte Ergebnisse.
import { istFehlerwort } from '../fehler.ts';
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

/** Welches der zwei Felder der Server in `felder` meldet; die Seite schreibt den Satz selbst. */
function feldAus(felder: unknown): 'antwort' | 'bemerkung' | null {
	if (typeof felder !== 'object' || felder === null) return null;
	const f = felder as Record<string, unknown>;
	if (typeof f.antwort === 'string') return 'antwort';
	if (typeof f.bemerkung === 'string') return 'bemerkung';
	return null;
}

async function rufe<T>(pfad: string, init: RequestInit, holen: Holen): Promise<Ergebnis<T>> {
	try {
		const r = await holen(pfad, init);
		const k = (await r.json()) as { fehler?: unknown; felder?: unknown };
		if (r.ok) return { art: 'ok', daten: k as T };
		const fehler = istFehlerwort(k.fehler) ? k.fehler : null;
		if (r.status === 401) return { art: 'abgemeldet' };
		if (r.status === 404) return { art: 'nicht-gefunden' };
		if (r.status === 409 && fehler === 'geschlossen') return { art: 'geschlossen' };
		if (r.status === 400 && fehler === 'eingabe') {
			const feld = feldAus(k.felder);
			if (feld) return { art: 'eingabe', feld };
		}
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
