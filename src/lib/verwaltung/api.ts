// Anfragen der Verwaltungsseiten an `/api/admin/…` und ihre Antworten als typisierte Ergebnisse.
// Die Seiten zeigen die Meldungen; hier steht nur, welche Fehlerwörter das Modul kennt (gedeutet im
// Abruf-Baustein) und welche Zusatzangaben sie tragen.
import { rufeAb, type Holen, type Json, type Vertrag } from '../abruf.ts';
import { jsonPost } from '../json-post.ts';
import type { Angaben, Feld } from '../server/admin/angaben.ts';
import type { AnlassFeld } from '../server/anlass/angaben.ts';
import type { AnlassAdmin, AnlassListe } from '../server/anlass/anlaesse.ts';
import type { FairgateZeile as ServerFairgateZeile } from '../server/admin/fairgate.ts';
import type { Auskunft } from '../server/admin/auskunft.ts';
import type { AusgestellterBrief, BriefZeile } from '../server/admin/briefe.ts';
import type { DateiFehler, Vorschau } from '../server/admin/einlesen.ts';
import type { Detail, Listenzeile, MitgliedStatus } from '../server/admin/mitglieder.ts';
import type { AnsichtRolle, Rolle, RollenListe, VerwaltungsRolle } from '../server/admin/rollen.ts';
import type { AnmeldungZeile, SpielerTreffer, Warnung } from '../server/cm/verwaltung.ts';
import type {
	GespraechZeile as ServerGespraechZeile,
	ladeGespraech as ServerLadeGespraech,
	listeGespraeche as ServerListeGespraeche
} from '../server/gespraech/gespraech.ts';
import type { DoppelVerwaltung as ServerDoppelVerwaltung } from '../server/cm/verwaltung-doppel.ts';
import type { TurnierStatus } from '../server/db/schema.ts';
import type { MitteilungFeld } from '../server/mitteilung/angaben.ts';
import type { KategorieFeld, TurnierFeld } from '../server/turnier/angaben.ts';
import type {
	KategorieZeile,
	TurnierDetail,
	TurnierZeile,
	ladeKategorie as ServerLadeKategorie
} from '../server/turnier/turniere.ts';
import type { VerlaufZeile } from '../server/admin/verlauf.ts';
import type { Klassierung } from '../turnier/klassierung.ts';

export type MitgliedDetail = Json<Detail>;
export type AuskunftAnsicht = Json<Auskunft>;
export type MitgliedZeile = Json<Listenzeile>;
export type VerlaufEintrag = Json<VerlaufZeile>;
export type AnlassZeile = Json<AnlassListe>;
export type AnlassDetail = Json<AnlassAdmin> & { beginnLokal: string; schlussLokal: string };
export type { AnlassFeld };
export type TurnierListe = Json<TurnierZeile>[];
export type TurnierAnsicht = Json<TurnierDetail>;
export type KategorieAnsicht = Json<NonNullable<Awaited<ReturnType<typeof ServerLadeKategorie>>>>;
export type { KategorieZeile, KategorieFeld, TurnierFeld, TurnierStatus, VerwaltungsRolle };
export type { AnmeldungZeile, SpielerTreffer, Warnung };
export type DoppelVerwaltung = Json<ServerDoppelVerwaltung>;
export type GespraechListe = Json<NonNullable<Awaited<ReturnType<typeof ServerListeGespraeche>>>>;
export type GespraechVerlauf = Json<NonNullable<Awaited<ReturnType<typeof ServerLadeGespraech>>>>;
export type GespraechZeile = Json<ServerGespraechZeile>;
type AlleFelder = Feld | AnlassFeld | TurnierFeld | KategorieFeld | MitteilungFeld | 'text';
export type FairgateZeile = Json<ServerFairgateZeile>;
export type BriefListe = Json<BriefZeile>[];
export type { AusgestellterBrief };
export type { DateiFehler, Vorschau };
export type { Angaben, AnsichtRolle, Feld, MitgliedStatus, Rolle, RollenListe };

export type Antwort<T> =
	| { art: 'ok'; daten: T }
	| { art: 'abgemeldet' }
	| { art: 'kein-admin' }
	| { art: 'unbestaetigt' }
	| { art: 'kein-recht' }
	| { art: 'nur-ansehen' }
	| { art: 'falsch' }
	| { art: 'zu-viele' }
	| { art: 'nicht-gefunden' }
	| { art: 'eingabe'; felder: Partial<Record<AlleFelder, string>> }
	| { art: 'vergeben'; feld: Feld | 'jahr' | 'name' }
	| { art: 'letzter-mytco' }
	| { art: 'eigenes-konto' }
	| { art: 'veraltet' }
	| { art: 'frist-abgelaufen' }
	| { art: 'schluss-vorbei' }
	| { art: 'keine-kategorie' }
	| { art: 'unzulaessig' }
	| { art: 'abgesagt' }
	| { art: 'art-gesperrt' }
	| { art: 'unpassend'; anzahl: number }
	| { art: 'hat-anmeldungen'; anzahl: number }
	| { art: 'nicht-moeglich'; anzahl: number }
	| { art: 'datei'; datei: DateiFehler }
	| { art: 'warnung'; warnungen: Warnung[] }
	| { art: 'schon-angemeldet' }
	| { art: 'vorbereitung' }
	| { art: 'nicht-beantragt' }
	| { art: 'nur-lesen' }
	| { art: 'inzwischen'; gespraech: GespraechVerlauf }
	| { art: 'stoerung' };

const STOERUNG: Antwort<never> = { art: 'stoerung' };

/** Die Fehlerwörter, die die Verwaltung kennt: genau die Arten von `Antwort` ausser ok und Störung. */
type Wort = Exclude<Antwort<unknown>['art'], 'ok' | 'stoerung'>;
const WOERTER: Record<Wort, true> = {
	abgemeldet: true,
	'kein-admin': true,
	unbestaetigt: true,
	'kein-recht': true,
	'nur-ansehen': true,
	falsch: true,
	'zu-viele': true,
	'nicht-gefunden': true,
	eingabe: true,
	vergeben: true,
	'letzter-mytco': true,
	'eigenes-konto': true,
	veraltet: true,
	'frist-abgelaufen': true,
	'schluss-vorbei': true,
	'keine-kategorie': true,
	unzulaessig: true,
	abgesagt: true,
	'art-gesperrt': true,
	unpassend: true,
	'hat-anmeldungen': true,
	'nicht-moeglich': true,
	datei: true,
	warnung: true,
	'schon-angemeldet': true,
	vorbereitung: true,
	'nicht-beantragt': true,
	'nur-lesen': true,
	inzwischen: true
};

/** Körper Pflicht; JSON `null` als Fehlerkörper gilt als `{}` (so war es hier immer). */
const VERTRAG: Vertrag<Wort> = {
	woerter: Object.keys(WOERTER) as Wort[],
	koerper: 'pflicht',
	nullAlsLeer: true
};

/** Ein Objekt, auch eine Liste (so liess es die Verwaltung immer durch). */
const istObjektOderListe = (x: unknown): x is object => typeof x === 'object' && x !== null;

async function rufe<T>(pfad: string, init: RequestInit, holen: Holen): Promise<Antwort<T>> {
	const r = await rufeAb<T, Wort>(pfad, init, holen, VERTRAG);
	if (r.art === 'ok' || r.art === 'stoerung') return r;
	const k = r.koerper;
	switch (r.art) {
		case 'eingabe':
			return istObjektOderListe(k.felder)
				? { art: 'eingabe', felder: k.felder as Partial<Record<AlleFelder, string>> }
				: STOERUNG;
		case 'datei':
			return istObjektOderListe(k.datei)
				? { art: 'datei', datei: k.datei as DateiFehler }
				: STOERUNG;
		case 'vergeben':
			return typeof k.feld === 'string'
				? { art: 'vergeben', feld: k.feld as Feld | 'jahr' | 'name' }
				: STOERUNG;
		case 'unpassend':
		case 'hat-anmeldungen':
		case 'nicht-moeglich':
			return typeof k.anzahl === 'number' ? { art: r.art, anzahl: k.anzahl } : STOERUNG;
		case 'warnung':
			return Array.isArray(k.warnungen)
				? { art: 'warnung', warnungen: k.warnungen as Warnung[] }
				: STOERUNG;
		case 'inzwischen':
			return istObjektOderListe(k.gespraech)
				? { art: 'inzwischen', gespraech: k.gespraech as GespraechVerlauf }
				: STOERUNG;
		default:
			return { art: r.art };
	}
}

export const lese = <T>(pfad: string, holen: Holen) => rufe<T>(pfad, { method: 'GET' }, holen);

export const schicke = <T>(pfad: string, inhalt: object, holen: Holen) =>
	rufe<T>(pfad, jsonPost(inhalt), holen);

const ADMIN = '/api/admin';

export const ladeZugang = (holen: Holen = fetch) =>
	lese<{ bestaetigt: boolean; mitgliedId?: number; rollen: VerwaltungsRolle[] }>(
		`${ADMIN}/zugang`,
		holen
	);

export const fordereCodeAn = (holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/zugang/code`, {}, holen);

export const bestaetige = (code: string, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/zugang`, { code }, holen);

/** Regel 2: wer welche Rolle hat (nur MyTCO-Admin). */
export const ladeRollenListe = (holen: Holen = fetch) =>
	lese<RollenListe>(`${ADMIN}/rollen`, holen);

/**
 * Schaltet «Ansicht als …» ein. Läuft schon eine Ansicht, beendet die Seite sie zuerst: Von einer
 * Ansicht direkt in eine andere weist der Server ab (`nur-ansehen`).
 */
export async function schaueAls(
	rolle: AnsichtRolle,
	laufend: AnsichtRolle | null,
	holen: Holen = fetch
): Promise<Antwort<Record<string, never>>> {
	if (laufend !== null) {
		const ende = await beendeAnsicht(holen);
		if (ende.art !== 'ok') return ende;
	}
	return schicke<Record<string, never>>(`${ADMIN}/ansicht`, { rolle }, holen);
}

/** Beendet die Ansicht dieser Sitzung; geht immer, auch ohne laufende Ansicht. */
export const beendeAnsicht = (holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/ansicht/beenden`, {}, holen);

export function ladeMitglieder(
	filter: { suche?: string; status?: string },
	holen: Holen = fetch
): Promise<Antwort<MitgliedZeile[]>> {
	const q = new URLSearchParams();
	if (filter.suche) q.set('suche', filter.suche);
	if (filter.status) q.set('status', filter.status);
	const abfrage = q.size > 0 ? `?${q}` : '';
	return lese(`${ADMIN}/mitglieder${abfrage}`, holen);
}

/** A-LOGIN-01: aktive Mitglieder, die MyTCO noch nie geöffnet haben. */
export const ladeBriefe = (holen: Holen = fetch) => lese<BriefListe>(`${ADMIN}/briefe`, holen);

/**
 * A-LOGIN-01: stellt für jedes Mitglied einen neuen Brief-Code aus (alles oder nichts). Die Antwort
 * enthält die Codes im Klartext (RR-04: nur für die Druckansicht, nie speichern).
 */
export const erzeugeBriefe = (ids: number[], holen: Holen = fetch) =>
	schicke<{ briefe: AusgestellterBrief[] }>(`${ADMIN}/briefe`, { ids }, holen);

/** Wie `erzeugeBriefe`, für ein einzelnes Mitglied. */
export const erzeugeBrief = (id: number, holen: Holen = fetch) =>
	schicke<{ briefe: AusgestellterBrief[] }>(`${ADMIN}/mitglieder/${id}/brief`, {}, holen);

/** A-MITGLIED-07: Vorschau einer Datei; nichts wird gespeichert. */
export const zeigeEinleseVorschau = (text: string, holen: Holen = fetch) =>
	schicke<Vorschau>(`${ADMIN}/einlesen/vorschau`, { text }, holen);

/** A-MITGLIED-07: legt die neuen Zeilen an, wenn es noch `erwartet` sind (sonst `veraltet`). */
export const liesMitgliederEin = (text: string, erwartet: number, holen: Holen = fetch) =>
	schicke<{ angelegt: number }>(`${ADMIN}/einlesen`, { text, erwartet }, holen);

export const legeMitgliedAn = (angaben: object, holen: Holen = fetch) =>
	schicke<{ id: number }>(`${ADMIN}/mitglieder`, angaben, holen);

export const ladeMitglied = (id: number, holen: Holen = fetch) =>
	lese<MitgliedDetail>(`${ADMIN}/mitglieder/${id}`, holen);

/** `vorher`: die Angaben, wie die Seite sie geladen hat; der Server speichert nur, wenn sie noch gelten. */
export const speichereAngaben = (
	id: number,
	angaben: object,
	vorher: object,
	holen: Holen = fetch
) => schicke<{ geaendert: string[] }>(`${ADMIN}/mitglieder/${id}`, { ...angaben, vorher }, holen);

/** `vorher`: die Rollen, wie die Seite sie geladen hat; der Server speichert nur, wenn sie noch gelten. */
export const speichereRollen = (
	id: number,
	rollen: Rolle[],
	vorher: Rolle[],
	holen: Holen = fetch
) => schicke<Record<string, never>>(`${ADMIN}/mitglieder/${id}/rollen`, { rollen, vorher }, holen);

export const beendeSitzungen = (id: number, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/mitglieder/${id}/sitzungen`, {}, holen);

/** Austritt, Wiedereintritt, Löschen und Zurücknehmen: ändern den Stand der Mitgliedschaft (FR-04). */
const mitgliedschaft =
	(aktion: string) =>
	(id: number, holen: Holen = fetch) =>
		schicke<Record<string, never>>(`${ADMIN}/mitglieder/${id}/${aktion}`, {}, holen);

export const erfasseAustritt = mitgliedschaft('austritt');
export const erfasseWiedereintritt = mitgliedschaft('wiedereintritt');
export const loescheMitglied = mitgliedschaft('loeschen');
export const nimmLoeschungZurueck = mitgliedschaft('loeschen-rueckgaengig');

/** DS-07: alles, was MyTCO zu dem Mitglied speichert. */
export const ladeAuskunft = (id: number, holen: Holen = fetch) =>
	lese<AuskunftAnsicht>(`${ADMIN}/mitglieder/${id}/auskunft`, holen);

export function ladeVerlauf(
	filter: { mitglied?: number },
	holen: Holen = fetch
): Promise<Antwort<VerlaufEintrag[]>> {
	const abfrage = filter.mitglied === undefined ? '' : `?mitglied=${filter.mitglied}`;
	return lese(`${ADMIN}/verlauf${abfrage}`, holen);
}

export const ladeFairgate = (holen: Holen = fetch) =>
	lese<FairgateZeile[]>(`${ADMIN}/fairgate`, holen);

/** `seit`: der Stand der Zeile, wie die Liste ihn zeigte; hat das Mitglied inzwischen mehr geändert, antwortet der Server «veraltet». */
export const uebertrageFairgate = (id: number, seit: string, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/fairgate/${id}`, { seit }, holen);

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

export const sageKategorieAb = (id: number, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/kategorien/${id}/absagen`, {}, holen);

/** A-ANMELDUNG-06: aktive Einzel-Anmeldungen der Kategorie, sortiert nach Nachname, Vorname. */
export const ladeAnmeldungen = (kategorieId: number, holen: Holen = fetch) =>
	lese<AnmeldungZeile[]>(`${ADMIN}/kategorien/${kategorieId}/anmeldungen`, holen);

/** FR-46: von Hand anmelden; `trotzdem` nach der Rückfrage zu den Warnungen. */
export const meldeVonHandAn = (
	kategorieId: number,
	mitgliedId: number,
	trotzdem = false,
	holen: Holen = fetch
) =>
	schicke<Record<string, never>>(
		`${ADMIN}/kategorien/${kategorieId}/anmeldungen`,
		trotzdem ? { mitgliedId, trotzdem: true } : { mitgliedId },
		holen
	);

/** FR-46: in eine andere Einzel-Kategorie desselben Turniers verschieben. */
export const verschiebeAnmeldung = (
	anmeldungId: number,
	kategorieId: number,
	trotzdem = false,
	holen: Holen = fetch
) =>
	schicke<Record<string, never>>(
		`${ADMIN}/anmeldungen/${anmeldungId}`,
		trotzdem ? { kategorieId, trotzdem: true } : { kategorieId },
		holen
	);

/** FR-46: Löschen zieht die Anmeldung zurück. */
export const loescheAnmeldung = (anmeldungId: number, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/anmeldungen/${anmeldungId}/loeschen`, {}, holen);

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
	holen: Holen = fetch
) =>
	schicke<Record<string, never>>(
		`${ADMIN}/spieler/${mitgliedId}/klassierung`,
		{ klassierung },
		holen
	);

/** A-ANMELDUNG-06: Paare, Suchende und offene Anfragen einer Doppel-Kategorie. */
export const ladeDoppel = (kategorieId: number, holen: Holen = fetch) =>
	lese<DoppelVerwaltung>(`${ADMIN}/kategorien/${kategorieId}/doppel`, holen);

const mitTrotzdem = (inhalt: object, trotzdem: boolean) =>
	trotzdem ? { ...inhalt, trotzdem: true } : inhalt;

/** FR-46: ein Paar (zwei Mitglieder) oder einen Suchenden (eines) von Hand anmelden. */
export const meldeDoppelAn = (
	kategorieId: number,
	mitgliedIds: [number] | [number, number],
	trotzdem = false,
	holen: Holen = fetch
) =>
	schicke<Record<string, never>>(
		`${ADMIN}/kategorien/${kategorieId}/doppel`,
		mitTrotzdem({ mitgliedIds }, trotzdem),
		holen
	);

/** FR-46: zwei Suchende zu einem Paar zusammenlegen. */
export const legeZusammen = (
	anmeldungId: number,
	mitAnmeldungId: number,
	trotzdem = false,
	holen: Holen = fetch
) =>
	schicke<Record<string, never>>(
		`${ADMIN}/anmeldungen/${anmeldungId}/zusammenlegen`,
		mitTrotzdem({ mitAnmeldungId }, trotzdem),
		holen
	);

/** FR-46: Partner eines Paars ändern; `neuId` `null`: Der Bleibende sucht danach selbst. */
export const aenderePartner = (
	anmeldungId: number,
	bleibtId: number,
	neuId: number | null,
	trotzdem = false,
	holen: Holen = fetch
) =>
	schicke<Record<string, never>>(
		`${ADMIN}/anmeldungen/${anmeldungId}/partner`,
		mitTrotzdem({ bleibtId, neuId }, trotzdem),
		holen
	);

/** FR-46, FR-48: eine offene Partner-Anfrage als Paar anmelden. */
export const meldeAnfrageAlsPaarAn = (anfrageId: number, trotzdem = false, holen: Holen = fetch) =>
	schicke<Record<string, never>>(
		`${ADMIN}/anfragen/${anfrageId}/paar`,
		mitTrotzdem({}, trotzdem),
		holen
	);

/** FR-46, FR-48: eine offene Partner-Anfrage löschen; der Anfragende erfährt es. */
export const loescheAnfrage = (anfrageId: number, holen: Holen = fetch) =>
	schicke<Record<string, never>>(`${ADMIN}/anfragen/${anfrageId}/loeschen`, {}, holen);

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
