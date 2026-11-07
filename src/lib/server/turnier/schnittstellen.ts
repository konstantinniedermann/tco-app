// Schnittstellen für Turniere und Kategorien (FR-33 bis FR-35) und zum Verwalten der Anmeldungen
// (A-ANMELDUNG-06, FR-08, FR-46, FR-47), Bereich `cm`: Der CM-Admin liest und schreibt, der
// MyTCO-Admin liest nur (Regel 3).
import { istKlassierung } from '../../turnier/klassierung.ts';
import { liest, schreibt, type AdminDienste, type AdminEreignis } from '../admin/schnittstellen.ts';
import {
	entscheide,
	korrigiereKlassierung,
	ladeAnmeldungen,
	loescheAnmeldung,
	meldeVonHandAn,
	sucheSpieler,
	verschiebe,
	type Warnung
} from '../cm/verwaltung.ts';
import { antwort } from '../login/schnittstellen.ts';
import { meldeMitgliedern } from '../mitteilung/meldung.ts';
import type { MitteilungAdminDienste } from '../mitteilung/schnittstellen.ts';
import { parseId } from '../parse-id.ts';
import { pruefeKategorie, pruefeTurnier } from './angaben.ts';
import {
	aendereKategorie,
	aendereTurnier,
	ladeKategorie,
	ladeTurnier,
	legeKategorieAn,
	legeTurnierAn,
	listeTurniere,
	sageKategorieAb,
	setzeStatus
} from './turniere.ts';

const nichtGefunden = () => antwort(404, { fehler: 'nicht-gefunden' });
const eingabeFehler = () => antwort(400, { fehler: 'eingabe' });
const jetzt = (d: AdminDienste) => (d.jetzt ?? (() => new Date()))();

/** Höchstlänge des Suchtexts für Spieler. */
const SUCHE_MAX = 100;
/** Höchstlänge des freiwilligen Grunds einer Ablehnung (nach `trim`). */
const GRUND_MAX = 200;

export function getTurniere(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'cm', async () => antwort(200, await listeTurniere(d.db, jetzt(d))));
}

export function postTurniere(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (_urheber, koerper) => {
		const p = pruefeTurnier(koerper);
		if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.felder });
		const r = await legeTurnierAn(d.db, p.werte);
		if (r.ergebnis === 'vergeben') return antwort(409, { fehler: 'vergeben', feld: 'jahr' });
		return antwort(201, { id: r.id });
	});
}

export function getTurnier(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'cm', async () => {
		const id = parseId(e.params.id);
		const t = id === null ? null : await ladeTurnier(d.db, id, jetzt(d));
		return t ? antwort(200, t) : nichtGefunden();
	});
}

export function postTurnier(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (_urheber, koerper) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const p = pruefeTurnier(koerper);
		if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.felder });
		const r = await aendereTurnier(d.db, id, p.werte);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r === 'vergeben') return antwort(409, { fehler: 'vergeben', feld: 'jahr' });
		return antwort(200, {});
	});
}

export function postTurnierStatus(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (_urheber, koerper) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const ziel = koerper.status;
		if (ziel !== 'offen' && ziel !== 'geschlossen') return antwort(400, { fehler: 'eingabe' });
		const r = await setzeStatus(d.db, id, ziel, jetzt(d));
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r !== 'ok') return antwort(409, { fehler: r });
		return antwort(200, {});
	});
}

export function postKategorien(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (_urheber, koerper) => {
		const turnierId = parseId(e.params.id);
		const t = turnierId === null ? null : await ladeTurnier(d.db, turnierId, jetzt(d));
		if (turnierId === null || !t) return nichtGefunden();
		const p = pruefeKategorie(koerper, t.jahr);
		if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.felder });
		const r = await legeKategorieAn(d.db, turnierId, p.werte);
		if (r.ergebnis === 'ok') return antwort(201, { id: r.id });
		if (r.ergebnis === 'vergeben') return antwort(409, { fehler: 'vergeben', feld: 'name' });
		return nichtGefunden();
	});
}

export function getKategorie(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'cm', async () => {
		const id = parseId(e.params.id);
		const k = id === null ? null : await ladeKategorie(d.db, id);
		return k ? antwort(200, k) : nichtGefunden();
	});
}

export function postKategorie(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (_urheber, koerper) => {
		const id = parseId(e.params.id);
		const k = id === null ? null : await ladeKategorie(d.db, id);
		if (id === null || !k) return nichtGefunden();
		const p = pruefeKategorie(koerper, k.turnierjahr);
		if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.felder });
		const r = await aendereKategorie(d.db, id, p.werte, koerper.trotzdem === true);
		if (typeof r === 'object') return antwort(409, { fehler: 'unpassend', anzahl: r.unpassend });
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r === 'abgesagt') return antwort(409, { fehler: 'abgesagt' });
		if (r === 'vergeben') return antwort(409, { fehler: 'vergeben', feld: 'name' });
		return antwort(200, {});
	});
}

export function postKategorieAbsagen(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async () => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const r = await sageKategorieAb(d.db, id);
		if (typeof r === 'object') return antwort(409, { fehler: 'hat-anmeldungen', anzahl: r.aktiv });
		return r === 'ok' ? antwort(200, {}) : nichtGefunden();
	});
}

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

/**
 * FR-47: persönliche Meldung an den Spieler, erst nach dem Speichern. DS-05: ohne Namen anderer
 * Mitglieder, auch nicht des CM-Admins. Wirft nie.
 */
const melde = (d: MitteilungAdminDienste, mitgliedId: number, turnierId: number, text: string) =>
	meldeMitgliedern({ db: d.db, push: d.push, mailer: d.mailer, adresse: d.adresse }, [mitgliedId], {
		titel: 'Clubmeisterschaft',
		text,
		pfad: `/clubmeisterschaft/${turnierId}`
	});

/** A-ANMELDUNG-06: aktive Einzel-Anmeldungen der Kategorie. */
export function getAnmeldungen(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'cm', async () => {
		const id = parseId(e.params.id);
		const k = id === null ? null : await ladeKategorie(d.db, id);
		if (id === null || !k) return nichtGefunden();
		return antwort(200, await ladeAnmeldungen(d.db, id));
	});
}

/** FR-46: ein aktives Mitglied von Hand anmelden; Warnungen gelten erst mit `trotzdem`. */
export function postAnmeldungVonHand(
	d: MitteilungAdminDienste,
	e: AdminEreignis
): Promise<Response> {
	return schreibt(d, e, 'cm', async (_urheber, koerper) => {
		const kategorieId = parseId(e.params.id);
		if (kategorieId === null) return nichtGefunden();
		const mitgliedId = idAus(koerper.mitgliedId);
		const trotzdem = trotzdemAus(koerper);
		if (mitgliedId === null || trotzdem === null) return eingabeFehler();
		const r = await meldeVonHandAn(d.db, kategorieId, mitgliedId, jetzt(d), trotzdem);
		if (typeof r === 'object') return warnung(r);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r !== 'ok') return antwort(409, { fehler: r });
		const k = await ladeKategorie(d.db, kategorieId);
		if (k) {
			await melde(
				d,
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
	return schreibt(d, e, 'cm', async (_urheber, koerper) => {
		const anmeldungId = parseId(e.params.id);
		if (anmeldungId === null) return nichtGefunden();
		const kategorieId = idAus(koerper.kategorieId);
		const trotzdem = trotzdemAus(koerper);
		if (kategorieId === null || trotzdem === null) return eingabeFehler();
		const r = await verschiebe(d.db, anmeldungId, kategorieId, jetzt(d), trotzdem);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (typeof r === 'string') return antwort(409, { fehler: r });
		if ('warnungen' in r) return warnung(r);
		await melde(
			d,
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
	return schreibt(d, e, 'cm', async () => {
		const anmeldungId = parseId(e.params.id);
		const r = anmeldungId === null ? null : await loescheAnmeldung(d.db, anmeldungId, jetzt(d));
		if (r === null || r === 'nicht-gefunden') return nichtGefunden();
		await melde(
			d,
			r.mitgliedId,
			r.turnierId,
			`Der CM-Admin hat deine Anmeldung für «${r.kategorie}» gelöscht.`
		);
		return antwort(200, {});
	});
}

/**
 * FR-08: über einen Wildcard-Antrag entscheiden. Der freiwillige Grund einer Ablehnung steht nur
 * in der Meldung und wird nicht gespeichert (Teil 4, Präzisierung).
 */
export function postEntscheid(d: MitteilungAdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (_urheber, koerper) => {
		const anmeldungId = parseId(e.params.id);
		if (anmeldungId === null) return nichtGefunden();
		const { bestaetigt, grund: roh } = koerper;
		if (typeof bestaetigt !== 'boolean') return eingabeFehler();
		if (roh !== undefined && typeof roh !== 'string') return eingabeFehler();
		const grund = (roh ?? '').trim();
		if (grund.length > GRUND_MAX) return eingabeFehler();
		const r = await entscheide(d.db, anmeldungId, bestaetigt, jetzt(d));
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r === 'nicht-beantragt') return antwort(409, { fehler: r });
		const text = bestaetigt
			? `Deine Wildcard für «${r.kategorie}» ist bestätigt.`
			: `Deine Wildcard für «${r.kategorie}» ist abgelehnt.${grund ? ` Grund: ${grund}` : ''}`;
		await melde(d, r.mitgliedId, r.turnierId, text);
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

export const TURNIER_SCHNITTSTELLEN = {
	getTurniere,
	postTurniere,
	getTurnier,
	postTurnier,
	postTurnierStatus,
	postKategorien,
	getKategorie,
	postKategorie,
	postKategorieAbsagen,
	getAnmeldungen,
	postAnmeldungVonHand,
	postVerschieben,
	postAnmeldungLoeschen,
	postEntscheid,
	getSpieler,
	postKlassierung
} satisfies Record<string, (d: MitteilungAdminDienste, e: AdminEreignis) => Promise<Response>>;
