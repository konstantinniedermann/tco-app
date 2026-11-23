// Turniere in der Verwaltung: Turniere, Kategorien, Anmeldungen, Spielersuche, Klassierung und Doppel
// (Anfragen an `/api/admin/turniere`, `/kategorien`, `/anmeldungen`, `/spieler` und `/anfragen`).
// Antwort und Abruf stehen in `api.ts`. `benachrichtigen` ist das Häkchen «Mitglied benachrichtigen»
// bzw. «Spieler benachrichtigen» der Rückfrage (FR-56); es geht immer mit, auch beim Weg «Trotzdem …».
import type { Holen, Json } from '../abruf.ts';
import type { AnmeldungZeile, SpielerTreffer } from '../server/cm/verwaltung.ts';
import type { DoppelVerwaltung as ServerDoppelVerwaltung } from '../server/cm/verwaltung-doppel.ts';
import type { TurnierStatus } from '../server/db/schema.ts';
import type {
	KategorieZeile,
	TurnierDetail,
	TurnierZeile,
	ladeKategorie as ServerLadeKategorie
} from '../server/turnier/turniere.ts';
import type { Klassierung } from '../turnier/klassierung.ts';
import { ADMIN, lese, schicke } from './api.ts';

export type TurnierListe = Json<TurnierZeile>[];
export type TurnierAnsicht = Json<TurnierDetail>;
export type KategorieAnsicht = Json<NonNullable<Awaited<ReturnType<typeof ServerLadeKategorie>>>>;
export type { KategorieZeile, TurnierStatus };
export type { AnmeldungZeile, SpielerTreffer };
export type DoppelVerwaltung = Json<ServerDoppelVerwaltung>;

const mitTrotzdem = (inhalt: object, trotzdem: boolean) =>
	trotzdem ? { ...inhalt, trotzdem: true } : inhalt;

export const ladeTurniere = (holen: Holen = fetch) =>
	lese<TurnierListe>(`${ADMIN}/turniere`, holen);

/** `angaben`: Jahr, Name, Anmeldeschluss (`YYYY-MM-DD`) und die ganze Liste der Turniernummern. */
export const legeTurnierAn = (angaben: object, holen: Holen = fetch) =>
	schicke<{ id: number }>(`${ADMIN}/turniere`, angaben, holen);

export const ladeTurnier = (id: number, holen: Holen = fetch) =>
	lese<TurnierAnsicht>(`${ADMIN}/turniere/${id}`, holen);

export const aendereTurnier = (id: number, angaben: object, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/turniere/${id}`, angaben, holen);

export const setzeTurnierStatus = (
	id: number,
	status: 'offen' | 'geschlossen',
	holen: Holen = fetch
) => schicke<Record<string, never>>(`${ADMIN}/turniere/${id}/status`, { status }, holen);

export const legeKategorieAn = (turnierId: number, angaben: object, holen: Holen = fetch) =>
	schicke<{ id: number }>(`${ADMIN}/turniere/${turnierId}/kategorien`, angaben, holen);

export const ladeKategorie = (id: number, holen: Holen = fetch) =>
	lese<KategorieAnsicht>(`${ADMIN}/kategorien/${id}`, holen);

/**
 * `trotzdem`: speichert auch, wenn aktive Anmeldungen nach der Änderung nicht mehr passen (FR-36);
 * Einzel oder Doppel wechseln geht mit aktiven Anmeldungen nie (`art-gesperrt`).
 */
export const aendereKategorie = (
	id: number,
	angaben: object,
	trotzdem = false,
	holen: Holen = fetch
) =>
	schicke<Record<string, never>>(
		`${ADMIN}/kategorien/${id}`,
		trotzdem ? { ...angaben, trotzdem: true } : angaben,
		holen
	);

export const sageKategorieAb = (id: number, benachrichtigen: boolean, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/kategorien/${id}/absagen`, { benachrichtigen }, holen);

/** A-ANMELDUNG-06: aktive Einzel-Anmeldungen der Kategorie, sortiert nach Nachname, Vorname. */
export const ladeAnmeldungen = (kategorieId: number, holen: Holen = fetch) =>
	lese<AnmeldungZeile[]>(`${ADMIN}/kategorien/${kategorieId}/anmeldungen`, holen);

/** FR-46: von Hand anmelden; `trotzdem` nach der Rückfrage zu den Warnungen. */
export const meldeVonHandAn = (
	kategorieId: number,
	mitgliedId: number,
	trotzdem: boolean,
	benachrichtigen: boolean,
	holen: Holen = fetch
) =>
	schicke<Record<string, never>>(
		`${ADMIN}/kategorien/${kategorieId}/anmeldungen`,
		mitTrotzdem({ mitgliedId, benachrichtigen }, trotzdem),
		holen
	);

/** FR-46: in eine andere Einzel-Kategorie desselben Turniers verschieben. */
export const verschiebeAnmeldung = (
	anmeldungId: number,
	kategorieId: number,
	trotzdem: boolean,
	benachrichtigen: boolean,
	holen: Holen = fetch
) =>
	schicke<Record<string, never>>(
		`${ADMIN}/anmeldungen/${anmeldungId}`,
		mitTrotzdem({ kategorieId, benachrichtigen }, trotzdem),
		holen
	);

/** FR-46: Löschen zieht die Anmeldung zurück. */
export const loescheAnmeldung = (
	anmeldungId: number,
	benachrichtigen: boolean,
	holen: Holen = fetch
) =>
	schicke<Record<string, never>>(
		`${ADMIN}/anmeldungen/${anmeldungId}/loeschen`,
		{ benachrichtigen },
		holen
	);

/** FR-08: über einen Wildcard-Antrag entscheiden; der freiwillige Grund gilt nur bei Ablehnung. */
export function entscheideAntrag(
	anmeldungId: number,
	bestaetigt: boolean,
	grund: string,
	holen: Holen = fetch
) {
	const text = grund.trim();
	const inhalt = !bestaetigt && text ? { bestaetigt, grund: text } : { bestaetigt };
	return schicke<Record<string, never>>(
		`${ADMIN}/anmeldungen/${anmeldungId}/entscheid`,
		inhalt,
		holen
	);
}

/** A-ANMELDUNG-06: aktive Mitglieder nach Namen, für das Anmelden von Hand. */
export const sucheSpieler = (suche: string, holen: Holen = fetch) =>
	lese<SpielerTreffer[]>(`${ADMIN}/spieler?${new URLSearchParams({ suche })}`, holen);

/** Klassierung eines Spielers korrigieren (Teil 4, Ziel 3). */
export const korrigiereKlassierung = (
	mitgliedId: number,
	klassierung: Klassierung,
	benachrichtigen: boolean,
	holen: Holen = fetch
) =>
	schicke<Record<string, never>>(
		`${ADMIN}/spieler/${mitgliedId}/klassierung`,
		{ klassierung, benachrichtigen },
		holen
	);

/** A-ANMELDUNG-06: Paare, Suchende und offene Anfragen einer Doppel-Kategorie. */
export const ladeDoppel = (kategorieId: number, holen: Holen = fetch) =>
	lese<DoppelVerwaltung>(`${ADMIN}/kategorien/${kategorieId}/doppel`, holen);

/** FR-46: ein Paar (zwei Mitglieder) oder einen Suchenden (eines) von Hand anmelden. */
export const meldeDoppelAn = (
	kategorieId: number,
	mitgliedIds: [number] | [number, number],
	trotzdem: boolean,
	benachrichtigen: boolean,
	holen: Holen = fetch
) =>
	schicke<Record<string, never>>(
		`${ADMIN}/kategorien/${kategorieId}/doppel`,
		mitTrotzdem({ mitgliedIds, benachrichtigen }, trotzdem),
		holen
	);

/** FR-46: zwei Suchende zu einem Paar zusammenlegen. */
export const legeZusammen = (
	anmeldungId: number,
	mitAnmeldungId: number,
	trotzdem: boolean,
	benachrichtigen: boolean,
	holen: Holen = fetch
) =>
	schicke<Record<string, never>>(
		`${ADMIN}/anmeldungen/${anmeldungId}/zusammenlegen`,
		mitTrotzdem({ mitAnmeldungId, benachrichtigen }, trotzdem),
		holen
	);

/** FR-46: Partner eines Paars ändern; `neuId` `null`: Der Bleibende sucht danach selbst. */
export const aenderePartner = (
	anmeldungId: number,
	bleibtId: number,
	neuId: number | null,
	trotzdem: boolean,
	benachrichtigen: boolean,
	holen: Holen = fetch
) =>
	schicke<Record<string, never>>(
		`${ADMIN}/anmeldungen/${anmeldungId}/partner`,
		mitTrotzdem({ bleibtId, neuId, benachrichtigen }, trotzdem),
		holen
	);

/** FR-46, FR-48: eine offene Partner-Anfrage als Paar anmelden. */
export const meldeAnfrageAlsPaarAn = (
	anfrageId: number,
	trotzdem: boolean,
	benachrichtigen: boolean,
	holen: Holen = fetch
) =>
	schicke<Record<string, never>>(
		`${ADMIN}/anfragen/${anfrageId}/paar`,
		mitTrotzdem({ benachrichtigen }, trotzdem),
		holen
	);

/** FR-46, FR-48: eine offene Partner-Anfrage löschen; mit Häkchen erfährt es der Anfragende. */
export const loescheAnfrage = (anfrageId: number, benachrichtigen: boolean, holen: Holen = fetch) =>
	schicke<Record<string, never>>(
		`${ADMIN}/anfragen/${anfrageId}/loeschen`,
		{ benachrichtigen },
		holen
	);
