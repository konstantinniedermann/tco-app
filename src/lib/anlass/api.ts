// Anfragen der Mitglieder an `/api/anlaesse/…` und ihre Antworten als typisierte Ergebnisse.
import { rufeAb, woerterAus, type Holen, type Json, type Vertrag } from '../abruf.ts';
import { jsonPost } from '../json-post.ts';
import type { AnlassMitglied } from '../server/anlass/anlaesse.ts';
import type { Antwort as AntwortArt } from '../server/db/schema.ts';

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

/** Die Fehlerwörter, die der Anlass kennt; der Körper muss lesbar sein. */
type Wort = Exclude<Ergebnis<unknown>['art'], 'ok' | 'stoerung'>;
const VERTRAG: Vertrag<Wort> = {
	woerter: woerterAus<Wort>({
		abgemeldet: true,
		'nicht-gefunden': true,
		geschlossen: true,
		eingabe: true
	}),
	koerper: 'pflicht'
};

async function rufe<T>(pfad: string, init: RequestInit, holen: Holen): Promise<Ergebnis<T>> {
	const r = await rufeAb<T, Wort>(pfad, init, holen, VERTRAG);
	switch (r.art) {
		case 'ok':
		case 'stoerung':
			return r;
		case 'eingabe': {
			const feld = feldAus(r.koerper.felder);
			return feld ? { art: 'eingabe', feld } : { art: 'stoerung' };
		}
		default:
			return { art: r.art };
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
