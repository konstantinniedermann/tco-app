// Schnittstellen zum Gespräch mit der Turnierleitung (A-TURNIER-04, FR-50 bis FR-53). Mitglieder
// (nur mit Sitzung): lesen, schreiben, als gelesen markieren. Verwaltung (Bereich `cm`): Liste,
// Verlauf, Antworten, Zustand; der MyTCO-Admin liest nur (Regel 3).
import { liest, schreibt, type AdminEreignis, type AdminUrheber } from '../admin/schnittstellen.ts';
import type { CmDienste, CmEreignis } from '../cm/schnittstellen.ts';
import { aendernd, antwort, jetzt, leseKoerper, mitSitzung, nichtGefunden } from '../http.ts';
import type { MitteilungAdminDienste } from '../mitteilung/schnittstellen.ts';
import { meldeMitgliedern } from '../mitteilung/meldung.ts';
import { parseId } from '../parse-id.ts';
import {
	antworte,
	ladeEigenesGespraech,
	ladeGespraech,
	listeGespraeche,
	markiereGelesen,
	schreibeAlsMitglied,
	setzeZustand
} from './gespraech.ts';
import {
	ANTWORT_TEXT,
	MELDUNG_TITEL,
	NACHRICHT_TEXT,
	pfadMitglied,
	pfadVerwaltung
} from './meldung.ts';

/** FR-50: Länge einer Nachricht nach `trim`, in Unicode-Codepunkten (wie `char_length`). */
const TEXT_MIN = 1;
const TEXT_MAX = 1000;

/** 200 mit dem Gespräch; ist es inzwischen weg (Mitglied gelöscht), 404. */
const antwortOderWeg = (g: object | null) => (g ? antwort(200, g) : nichtGefunden());
const nurLesen = () => antwort(409, { fehler: 'nur-lesen' });
const textFehler = () =>
	antwort(400, { fehler: 'eingabe', felder: { text: 'Schreib 1 bis 1000 Zeichen.' } });

/** Der Text nach `trim`, oder `null`, wenn er nicht 1 bis 1000 Zeichen hat. */
export function pruefeText(roh: unknown): string | null {
	if (typeof roh !== 'string') return null;
	const text = roh.trim();
	const n = [...text].length;
	return n >= TEXT_MIN && n <= TEXT_MAX ? text : null;
}

// ---- Mitglied ----

export function getGespraech(d: CmDienste, e: CmEreignis): Promise<Response> {
	return mitSitzung(e, async (konto) => {
		const id = parseId(e.params.id);
		const g = id === null ? null : await ladeEigenesGespraech(d.db, id, konto.mitgliedId, jetzt(d));
		return g ? antwort(200, g) : nichtGefunden();
	});
}

export function postGespraech(d: CmDienste, e: CmEreignis): Promise<Response> {
	return aendernd(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const text = pruefeText((await leseKoerper(e)).text);
		if (text === null) return textFehler();
		const t = jetzt(d);
		const r = await schreibeAlsMitglied(d.db, id, konto.mitgliedId, text, t);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r === 'nur-lesen') return nurLesen();
		// FR-53: nur an die Kontaktperson, nach dem Speichern, ohne darauf zu warten.
		if (r.kontaktId !== konto.mitgliedId) {
			void d
				.melde([r.kontaktId], {
					titel: MELDUNG_TITEL,
					text: NACHRICHT_TEXT,
					pfad: pfadVerwaltung(id, r.gespraechId)
				})
				.catch(() => {});
		}
		return antwortOderWeg(await ladeEigenesGespraech(d.db, id, konto.mitgliedId, t));
	});
}

export function postGelesen(d: CmDienste, e: CmEreignis): Promise<Response> {
	return aendernd(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const roh = (await leseKoerper(e)).bis;
		const bis = typeof roh === 'string' ? new Date(roh) : null;
		if (bis === null || Number.isNaN(bis.getTime())) return antwort(400, { fehler: 'eingabe' });
		// Nie über «jetzt» hinaus: Die Marke geht nur vorwärts und würde spätere Antworten verdecken.
		const t = jetzt(d);
		await markiereGelesen(d.db, id, konto.mitgliedId, bis > t ? t : bis);
		return antwort(204);
	});
}

// ---- Verwaltung ----

export function getGespraeche(d: MitteilungAdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'cm', async () => {
		const id = parseId(e.params.id);
		const l = id === null ? null : await listeGespraeche(d.db, id);
		return l ? antwort(200, l) : nichtGefunden();
	});
}

export function getAdminGespraech(d: MitteilungAdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'cm', async () => {
		const id = parseId(e.params.id);
		const g = id === null ? null : await ladeGespraech(d.db, id, jetzt(d));
		return g ? antwort(200, g) : nichtGefunden();
	});
}

/** FR-53: Meldung ans Mitglied nach dem Speichern; entfällt, wenn der Antwortende selbst gemeint ist. */
function meldeAntwort(
	d: MitteilungAdminDienste,
	urheber: AdminUrheber,
	mitgliedId: number,
	turnierId: number
): void {
	if (mitgliedId === urheber.mitgliedId) return;
	void meldeMitgliedern(
		{ db: d.db, push: d.push, mailer: d.mailer, adresse: d.adresse },
		[mitgliedId],
		{ titel: MELDUNG_TITEL, text: ANTWORT_TEXT, pfad: pfadMitglied(turnierId) }
	).catch(() => {});
}

export function postAntwort(d: MitteilungAdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (urheber, koerper) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const text = pruefeText(koerper.text);
		if (text === null) return textFehler();
		const nach = koerper.nachLetzter;
		if (typeof nach !== 'number' || !Number.isSafeInteger(nach) || nach < 0)
			return antwort(400, { fehler: 'eingabe' });
		const t = jetzt(d);
		const r = await antworte(
			d.db,
			id,
			urheber.mitgliedId,
			text,
			nach,
			koerper.trotzdem === true,
			t
		);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r === 'nur-lesen') return nurLesen();
		if (r.ergebnis === 'inzwischen') {
			return antwort(409, {
				fehler: 'inzwischen',
				gespraech: (await ladeGespraech(d.db, id, t)) ?? null
			});
		}
		meldeAntwort(d, urheber, r.mitgliedId, r.turnierId);
		return antwortOderWeg(await ladeGespraech(d.db, id, t));
	});
}

export function postZustand(d: MitteilungAdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (_urheber, koerper) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const z = koerper.zustand;
		if (z !== 'offen' && z !== 'erledigt') return antwort(400, { fehler: 'eingabe' });
		const t = jetzt(d);
		const r = await setzeZustand(d.db, id, z, t);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r === 'nur-lesen') return nurLesen();
		return antwortOderWeg(await ladeGespraech(d.db, id, t));
	});
}

// Die Schnittstellen der Mitglieder zum Gespräch; die Grundprüfung
// (`src/lib/server/grundpruefung.db.test.ts`) läuft über jeden Eintrag. Die der Verwaltung stehen
// in TURNIER_SCHNITTSTELLEN.
export const GESPRAECH_SCHNITTSTELLEN = {
	getGespraech,
	postGespraech,
	postGelesen
} satisfies Record<string, (d: CmDienste, e: CmEreignis) => Promise<Response>>;
