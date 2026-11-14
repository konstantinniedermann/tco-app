// Anfragen der Mitglieder an `/api/interclub/…` und ihre Antworten als typisierte Ergebnisse.
import { rufeAb, woerterAus, type Holen, type Json, type Vertrag } from '../abruf.ts';
import type {
	IcBegegnung,
	IcKachel,
	IcPartie,
	IcRangZeile,
	IcSpiel,
	IcTeam,
	IcUebersicht
} from '../server/interclub/ansicht.ts';

export type Begegnung = Json<IcBegegnung>;
export type Partie = Json<IcPartie>;
export type Uebersicht = Json<IcUebersicht>;
export type Team = Json<IcTeam>;
export type Spiel = Json<IcSpiel>;
export type Kachel = Json<IcKachel>;
export type RangZeile = Json<IcRangZeile>;

export type Ergebnis<T> =
	{ art: 'ok'; daten: T } | { art: 'abgemeldet' } | { art: 'nicht-gefunden' } | { art: 'stoerung' };

/** Die Fehlerwörter, die Interclub kennt; der Körper muss lesbar sein. */
type Wort = Exclude<Ergebnis<unknown>['art'], 'ok' | 'stoerung'>;
const VERTRAG: Vertrag<Wort> = {
	woerter: woerterAus<Wort>({ abgemeldet: true, 'nicht-gefunden': true }),
	koerper: 'pflicht'
};

async function hole<T>(pfad: string, holen: Holen): Promise<Ergebnis<T>> {
	const r = await rufeAb<T, Wort>(pfad, { method: 'GET' }, holen, VERTRAG);
	return r.art === 'ok' || r.art === 'stoerung' ? r : { art: r.art };
}

/** `nicht-gefunden`: Es gibt keine Interclub-Daten. */
export const holeInterclub = (holen: Holen = fetch) => hole<Uebersicht>('/api/interclub', holen);

export const holeInterclubTeam = (id: number, holen: Holen = fetch) =>
	hole<Team>(`/api/interclub/teams/${id}`, holen);

/** `nicht-gefunden`: keine eigene Begegnung dieses Teams. */
export const holeInterclubBegegnung = (teamId: number, begegnungId: number, holen: Holen = fetch) =>
	hole<Begegnung>(`/api/interclub/teams/${teamId}/begegnungen/${begegnungId}`, holen);
