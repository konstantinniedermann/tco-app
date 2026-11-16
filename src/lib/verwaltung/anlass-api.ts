// Anlässe in der Verwaltung (Anfragen an `/api/admin/anlaesse`). Antwort und Abruf stehen in `api.ts`.
import type { Holen, Json } from '../abruf.ts';
import type { AnlassAdmin, AnlassListe } from '../server/anlass/anlaesse.ts';
import { ADMIN, lese, schicke } from './api.ts';

export type AnlassZeile = Json<AnlassListe>;
export type AnlassDetail = Json<AnlassAdmin> & { beginnLokal: string; schlussLokal: string };

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
