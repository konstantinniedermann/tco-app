// Anfragen der Mitglieder an `/api/interclub/…` und ihre Antworten als typisierte Ergebnisse.
import { rufeAb, woerterAus, type Holen, type Json, type Vertrag } from '../abruf.ts';
import { jsonPost } from '../json-post.ts';
import type {
	IcBegegnung,
	IcKachel,
	IcPartie,
	IcSpiel,
	IcTeam,
	IcUebersicht
} from '../server/interclub/ansicht.ts';
import type { FolgenStand, GefolgtesTeam } from '../server/interclub/folgen.ts';

export type Begegnung = Json<IcBegegnung>;
export type Partie = Json<IcPartie>;
export type Uebersicht = Json<IcUebersicht>;
/** Mit `folgen`: ob das Konto dem Team folgt und ob es auf irgendeinem Gerät Push hat. */
export type Team = Json<IcTeam & { folgen: FolgenStand }>;
/** Die gefolgten Teams der neuesten Saison und ob das Konto auf irgendeinem Gerät Push hat. */
export type GefolgteTeams = { teams: GefolgtesTeam[]; push: boolean };
export type Spiel = Json<IcSpiel>;
export type Kachel = Json<IcKachel>;

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

/** Die Teams der neuesten Saison, denen das Konto folgt. */
export const holeGefolgteTeams = (holen: Holen = fetch) =>
	hole<GefolgteTeams>('/api/interclub/folgen', holen);

export type FolgenErgebnis =
	| { art: 'ok'; daten: { folgt: boolean } }
	| { art: 'abgemeldet' }
	| { art: 'nicht-gefunden' }
	| { art: 'kein-push' }
	| { art: 'stoerung' };

/** Nur das Folgen kennt `kein-push`; die Lese-Anfragen bleiben bei ihrem Vertrag. */
type FolgenWort = Exclude<FolgenErgebnis['art'], 'ok' | 'stoerung'>;
const FOLGEN_VERTRAG: Vertrag<FolgenWort> = {
	woerter: woerterAus<FolgenWort>({ abgemeldet: true, 'nicht-gefunden': true, 'kein-push': true }),
	koerper: 'pflicht'
};

/**
 * Folgen oder entfolgen. `kein-push`: Das Konto hat auf keinem Gerät Push (nur beim Folgen;
 * entfolgen geht immer).
 */
export async function setzeFolgen(
	teamId: number,
	folgen: boolean,
	holen: Holen = fetch
): Promise<FolgenErgebnis> {
	const r = await rufeAb<{ folgt: boolean }, FolgenWort>(
		`/api/interclub/teams/${teamId}/folgen`,
		jsonPost({ folgen }),
		holen,
		FOLGEN_VERTRAG
	);
	return r.art === 'ok' || r.art === 'stoerung' ? r : { art: r.art };
}
