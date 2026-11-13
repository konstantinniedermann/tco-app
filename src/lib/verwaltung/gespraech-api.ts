// Gespräche der Turnierleitung (Anfragen an `/api/admin/…/gespraeche`). Antwort und Abruf stehen in
// `api.ts`; `GespraechVerlauf` steht dort, weil die Antwort `inzwischen` es trägt.
import type { Holen, Json } from '../abruf.ts';
import type {
	GespraechZeile as ServerGespraechZeile,
	listeGespraeche as ServerListeGespraeche
} from '../server/gespraech/gespraech.ts';
import { ADMIN, lese, schicke, type GespraechVerlauf } from './api.ts';

export type GespraechListe = Json<NonNullable<Awaited<ReturnType<typeof ServerListeGespraeche>>>>;
export type GespraechZeile = Json<ServerGespraechZeile>;

/** FR-52: die Gespräche eines Turniers für den Posteingang der Turnierleitung. */
export const holeGespraeche = (turnierId: number, holen: Holen = fetch) =>
	lese<GespraechListe>(`${ADMIN}/turniere/${turnierId}/gespraeche`, holen);

/** Ein Gespräch mit Verlauf, mit den Namen der antwortenden Admins. */
export const holeGespraech = (id: number, holen: Holen = fetch) =>
	lese<GespraechVerlauf>(`${ADMIN}/gespraeche/${id}`, holen);

/** FR-50: Antwort der Turnierleitung; `nachLetzter`: Id der letzten Nachricht, die die Seite kennt. */
export const sendeAntwort = (
	id: number,
	antwort: { text: string; nachLetzter: number; trotzdem?: boolean },
	holen: Holen = fetch
) => schicke<GespraechVerlauf>(`${ADMIN}/gespraeche/${id}`, antwort, holen);

/** FR-52: Gespräch als erledigt markieren oder wieder öffnen. */
export const setzeZustand = (id: number, zustand: 'offen' | 'erledigt', holen: Holen = fetch) =>
	schicke<GespraechVerlauf>(`${ADMIN}/gespraeche/${id}/zustand`, { zustand }, holen);
