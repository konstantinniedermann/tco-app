// Schnittstellen zum Verwalten der Anmeldungen der Clubmeisterschaft (A-ANMELDUNG-06, FR-08,
// FR-46, FR-47), Bereich `cm`: Der CM-Admin liest und schreibt, der MyTCO-Admin liest nur
// (Regel 3). Nur Routen unter `src/routes/api/admin/` nutzen diese Datei (Bauregel, Schutz am
// Pfad); die Schnittstellen der Mitglieder stehen in `schnittstellen.ts`.
import { istKlassierung } from '../../turnier/klassierung.ts';
import {
	liest,
	schreibt,
	type AdminDienste,
	type AdminEreignis,
	type AdminUrheber
} from '../admin/rechte.ts';
import { antwort, eingabeFehler, jetzt, nichtGefunden } from '../http.ts';
import type { MitteilungAdminDienste } from '../mitteilung/typen.ts';
import { parseId } from '../parse-id.ts';
import { ladeKategorie } from '../turnier/turniere.ts';
import {
	entscheide,
	korrigiereKlassierung,
	ladeAnmeldungen,
	loescheAnmeldung,
	meldeVonHandAn,
	sucheSpieler,
	verschiebe,
	type Warnung
} from './verwaltung.ts';
import {
	aenderePartner,
	artDerAnmeldung,
	ladeDoppel,
	legeZusammen,
	loescheAnfrage,
	loescheDoppel,
	meldeAnfrageAlsPaarAn,
	meldeDoppelVonHandAn,
	verschiebeDoppel,
	type Benachrichtigung,
	type DoppelAbgelehnt
} from './verwaltung-doppel.ts';
import { melde } from './verwaltung-meldung.ts';

/** Höchstlänge des Suchtexts für Spieler. */
const SUCHE_MAX = 100;
/** Höchstlänge des freiwilligen Grunds einer Ablehnung (nach `trim`). */
const GRUND_MAX = 200;

/** Nummer aus dem Körper, wie `parseId` für die Adresse: ganze Zahl im Bereich eines integer. */
const idAus = (v: unknown): number | null => (typeof v === 'number' ? parseId(String(v)) : null);

/** `trotzdem` ist freiwillig, aber wenn angegeben ein Wahrheitswert; sonst `null`. */
function trotzdemAus(koerper: Record<string, unknown>): boolean | null {
	const t = koerper.trotzdem;
	if (t === undefined) return false;
	return typeof t === 'boolean' ? t : null;
}

const warnung = (w: { warnungen: Warnung[] }) =>
	antwort(409, { fehler: 'warnung', warnungen: w.warnungen });

/** Meldungen eines Doppel-Ergebnisses, erst nach dem Speichern. */
function meldeAlle(
	d: MitteilungAdminDienste,
	urheber: AdminUrheber,
	turnierId: number,
	meldungen: Benachrichtigung[]
): void {
	for (const m of meldungen) melde(d, urheber, m.mitgliedId, turnierId, m.text);
}

/** Antwort auf eine Ablehnung aus der Doppel-Verwaltung: Warnung, 404 oder 409 mit Grund. */
function abgelehnt(r: DoppelAbgelehnt): Response {
	if (r === 'nicht-gefunden') return nichtGefunden();
	if (typeof r === 'string') return antwort(409, { fehler: r });
	return warnung(r);
}

/** A-ANMELDUNG-06: aktive Einzel-Anmeldungen der Kategorie. */
export function getAnmeldungen(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'cm', async () => {
		const id = parseId(e.params.id);
		const k = id === null ? null : await ladeKategorie(d.db, id);
		if (id === null || !k) return nichtGefunden();
		return antwort(200, await ladeAnmeldungen(d.db, id, jetzt(d)));
	});
}

/** FR-46: ein aktives Mitglied von Hand anmelden; Warnungen gelten erst mit `trotzdem`. */
export function postAnmeldungVonHand(
	d: MitteilungAdminDienste,
	e: AdminEreignis
): Promise<Response> {
	return schreibt(d, e, 'cm', async (urheber, koerper) => {
		const kategorieId = parseId(e.params.id);
		if (kategorieId === null) return nichtGefunden();
		const mitgliedId = idAus(koerper.mitgliedId);
		const trotzdem = trotzdemAus(koerper);
		if (mitgliedId === null || trotzdem === null) return eingabeFehler();
		const r = await meldeVonHandAn(d.db, urheber, kategorieId, mitgliedId, jetzt(d), trotzdem);
		if (typeof r === 'object') return warnung(r);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r !== 'ok') return antwort(409, { fehler: r });
		const k = await ladeKategorie(d.db, kategorieId);
		if (k) {
			melde(
				d,
				urheber,
				mitgliedId,
				k.turnierId,
				`Der CM-Admin hat dich in «${k.name}» angemeldet. Gegner sehen deine E-Mail und Telefonnummer.`
			);
		}
		return antwort(200, {});
	});
}

/** FR-46: eine Anmeldung in eine andere Einzel-Kategorie desselben Turniers verschieben. */
export function postVerschieben(d: MitteilungAdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (urheber, koerper) => {
		const anmeldungId = parseId(e.params.id);
		if (anmeldungId === null) return nichtGefunden();
		const kategorieId = idAus(koerper.kategorieId);
		const trotzdem = trotzdemAus(koerper);
		if (kategorieId === null || trotzdem === null) return eingabeFehler();
		const art = await artDerAnmeldung(d.db, anmeldungId);
		if (art === null) return nichtGefunden();
		if (art === 'doppel') {
			const dr = await verschiebeDoppel(
				d.db,
				urheber,
				anmeldungId,
				kategorieId,
				jetzt(d),
				trotzdem
			);
			if (typeof dr === 'string' || 'warnungen' in dr) return abgelehnt(dr);
			meldeAlle(d, urheber, dr.turnierId, dr.meldungen);
			return antwort(200, {});
		}
		const r = await verschiebe(d.db, urheber, anmeldungId, kategorieId, jetzt(d), trotzdem);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (typeof r === 'string') return antwort(409, { fehler: r });
		if ('warnungen' in r) return warnung(r);
		melde(
			d,
			urheber,
			r.mitgliedId,
			r.turnierId,
			`Der CM-Admin hat dich von «${r.von}» nach «${r.nach}» verschoben.`
		);
		return antwort(200, {});
	});
}

/** FR-46: Löschen zieht die Anmeldung zurück. */
export function postAnmeldungLoeschen(
	d: MitteilungAdminDienste,
	e: AdminEreignis
): Promise<Response> {
	return schreibt(d, e, 'cm', async (urheber) => {
		const anmeldungId = parseId(e.params.id);
		if (anmeldungId === null) return nichtGefunden();
		if ((await artDerAnmeldung(d.db, anmeldungId)) === 'doppel') {
			const dr = await loescheDoppel(d.db, urheber, anmeldungId, jetzt(d));
			if (dr === 'nicht-gefunden') return nichtGefunden();
			meldeAlle(d, urheber, dr.turnierId, dr.meldungen);
			return antwort(200, {});
		}
		const r = await loescheAnmeldung(d.db, urheber, anmeldungId, jetzt(d));
		if (r === 'nicht-gefunden') return nichtGefunden();
		melde(
			d,
			urheber,
			r.mitgliedId,
			r.turnierId,
			`Der CM-Admin hat deine Anmeldung für «${r.kategorie}» gelöscht.`
		);
		return antwort(200, {});
	});
}

/** A-ANMELDUNG-06: Paare, Suchende und offene Anfragen einer Doppel-Kategorie. */
export function getDoppel(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'cm', async () => {
		const id = parseId(e.params.id);
		const r = id === null ? null : await ladeDoppel(d.db, id, jetzt(d));
		return r ? antwort(200, r) : nichtGefunden();
	});
}

/** FR-46: ein Paar (zwei Mitglieder) oder einen Suchenden (eines) von Hand anmelden. */
export function postDoppelVonHand(d: MitteilungAdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (urheber, koerper) => {
		const kategorieId = parseId(e.params.id);
		if (kategorieId === null) return nichtGefunden();
		const ids = Array.isArray(koerper.mitgliedIds) ? koerper.mitgliedIds.map(idAus) : [];
		const trotzdem = trotzdemAus(koerper);
		if (
			trotzdem === null ||
			(ids.length !== 1 && ids.length !== 2) ||
			ids.some((i) => i === null) ||
			ids[0] === ids[1]
		) {
			return eingabeFehler();
		}
		const r = await meldeDoppelVonHandAn(
			d.db,
			urheber,
			kategorieId,
			ids as [number] | [number, number],
			jetzt(d),
			trotzdem
		);
		if (typeof r === 'string' || 'warnungen' in r) return abgelehnt(r);
		meldeAlle(d, urheber, r.turnierId, r.meldungen);
		return antwort(200, {});
	});
}

/** FR-46: zwei Suchende zu einem Paar zusammenlegen. */
export function postZusammenlegen(d: MitteilungAdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (urheber, koerper) => {
		const anmeldungId = parseId(e.params.id);
		if (anmeldungId === null) return nichtGefunden();
		const mitId = idAus(koerper.mitAnmeldungId);
		const trotzdem = trotzdemAus(koerper);
		if (mitId === null || trotzdem === null) return eingabeFehler();
		const r = await legeZusammen(d.db, urheber, anmeldungId, mitId, jetzt(d), trotzdem);
		if (typeof r === 'string' || 'warnungen' in r) return abgelehnt(r);
		meldeAlle(d, urheber, r.turnierId, r.meldungen);
		return antwort(200, {});
	});
}

/** FR-46: Partner eines Paars ändern, mit Ersatz (`neuId`) oder ohne (`null`). */
export function postPartnerAendern(d: MitteilungAdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (urheber, koerper) => {
		const anmeldungId = parseId(e.params.id);
		if (anmeldungId === null) return nichtGefunden();
		const bleibtId = idAus(koerper.bleibtId);
		const neuId = koerper.neuId === null ? null : idAus(koerper.neuId);
		const trotzdem = trotzdemAus(koerper);
		if (bleibtId === null || (koerper.neuId !== null && neuId === null) || trotzdem === null) {
			return eingabeFehler();
		}
		const r = await aenderePartner(d.db, urheber, anmeldungId, bleibtId, neuId, jetzt(d), trotzdem);
		if (r === 'eingabe') return eingabeFehler();
		if (typeof r === 'string' || 'warnungen' in r) return abgelehnt(r);
		meldeAlle(d, urheber, r.turnierId, r.meldungen);
		return antwort(200, {});
	});
}

/** FR-46: eine offene Anfrage als Paar anmelden. */
export function postAnfrageAlsPaar(d: MitteilungAdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (urheber, koerper) => {
		const anfrageId = parseId(e.params.id);
		if (anfrageId === null) return nichtGefunden();
		const trotzdem = trotzdemAus(koerper);
		if (trotzdem === null) return eingabeFehler();
		const r = await meldeAnfrageAlsPaarAn(d.db, urheber, anfrageId, jetzt(d), trotzdem);
		if (typeof r === 'string' || 'warnungen' in r) return abgelehnt(r);
		meldeAlle(d, urheber, r.turnierId, r.meldungen);
		return antwort(200, {});
	});
}

/** FR-46: eine offene Anfrage löschen; der Anfragende erfährt es. */
export function postAnfrageLoeschen(
	d: MitteilungAdminDienste,
	e: AdminEreignis
): Promise<Response> {
	return schreibt(d, e, 'cm', async (urheber) => {
		const anfrageId = parseId(e.params.id);
		const r = anfrageId === null ? null : await loescheAnfrage(d.db, anfrageId);
		if (r === null || r === 'nicht-gefunden') return nichtGefunden();
		meldeAlle(d, urheber, r.turnierId, r.meldungen);
		return antwort(200, {});
	});
}

/**
 * FR-08: über einen Wildcard-Antrag entscheiden. Der freiwillige Grund einer Ablehnung steht nur
 * in der Meldung und wird nicht gespeichert (Teil 4, Präzisierung).
 */
export function postEntscheid(d: MitteilungAdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (urheber, koerper) => {
		const anmeldungId = parseId(e.params.id);
		if (anmeldungId === null) return nichtGefunden();
		const { bestaetigt, grund: roh } = koerper;
		if (typeof bestaetigt !== 'boolean') return eingabeFehler();
		if (roh !== undefined && typeof roh !== 'string') return eingabeFehler();
		const grund = (roh ?? '').trim();
		if (grund.length > GRUND_MAX) return eingabeFehler();
		const r = await entscheide(d.db, urheber, anmeldungId, bestaetigt, jetzt(d));
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r === 'nicht-beantragt') return antwort(409, { fehler: r });
		const text = bestaetigt
			? `Deine Wildcard für «${r.kategorie}» ist bestätigt.`
			: `Deine Wildcard für «${r.kategorie}» ist abgelehnt.${grund ? ` Grund: ${grund}` : ''}`;
		melde(d, urheber, r.mitgliedId, r.turnierId, text);
		return antwort(200, {});
	});
}

/** A-ANMELDUNG-06: aktive Mitglieder nach Namen (`?suche=`), für das Anmelden von Hand. */
export function getSpieler(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'cm', async () => {
		const suche = e.url.searchParams.get('suche') ?? '';
		if (suche.length > SUCHE_MAX) return eingabeFehler();
		return antwort(200, await sucheSpieler(d.db, suche));
	});
}

/** Teil 4, Ziel 3: Klassierung eines Spielers korrigieren; ohne Meldung, im Verlauf (FR-26). */
export function postKlassierung(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (urheber, koerper) => {
		const mitgliedId = parseId(e.params.id);
		if (mitgliedId === null) return nichtGefunden();
		if (!istKlassierung(koerper.klassierung)) return eingabeFehler();
		const r = await korrigiereKlassierung(d.db, urheber, mitgliedId, koerper.klassierung, jetzt(d));
		return r === 'ok' ? antwort(200, {}) : nichtGefunden();
	});
}

// Die Schnittstellen der Anmeldungs-Verwaltung; die Grundprüfung, der Routen-Test und die
// Rechte-Matrix nehmen die Liste aus `tests/hilfen/verwaltungs-listen.ts`.
export const CM_ADMIN_SCHNITTSTELLEN = {
	getAnmeldungen,
	postAnmeldungVonHand,
	postVerschieben,
	postAnmeldungLoeschen,
	getDoppel,
	postDoppelVonHand,
	postZusammenlegen,
	postPartnerAendern,
	postAnfrageAlsPaar,
	postAnfrageLoeschen,
	postEntscheid,
	getSpieler,
	postKlassierung
} satisfies Record<string, (d: MitteilungAdminDienste, e: AdminEreignis) => Promise<Response>>;
