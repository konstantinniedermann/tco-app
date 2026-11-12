// Schnittstellen der Verwaltung zum Gespräch mit der Turnierleitung (A-TURNIER-04, FR-50 bis
// FR-53), Bereich `cm`: Liste, Verlauf, Antworten, Zustand; der MyTCO-Admin liest nur (Regel 3).
// Nur Routen unter `src/routes/api/admin/` nutzen diese Datei (Bauregel, Schutz am Pfad); die
// Schnittstellen der Mitglieder stehen in `schnittstellen.ts`.
import { liest, schreibt, type AdminEreignis, type AdminUrheber } from '../admin/rechte.ts';
import { antwort, eingabeFehler, jetzt, nichtGefunden } from '../http.ts';
import { meldeMitgliedern } from '../mitteilung/meldung.ts';
import type { MitteilungAdminDienste } from '../mitteilung/typen.ts';
import { parseId } from '../parse-id.ts';
import { antwortOderWeg, nurLesen, pruefeText, textFehler } from './antworten.ts';
import { antworte, ladeGespraech, listeGespraeche, setzeZustand } from './gespraech.ts';
import { ANTWORT_TEXT, MELDUNG_TITEL, pfadMitglied } from './meldung.ts';

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
		if (typeof nach !== 'number' || !Number.isSafeInteger(nach) || nach < 0) return eingabeFehler();
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
		if (z !== 'offen' && z !== 'erledigt') return eingabeFehler();
		const t = jetzt(d);
		const r = await setzeZustand(d.db, id, z, t);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r === 'nur-lesen') return nurLesen();
		return antwortOderWeg(await ladeGespraech(d.db, id, t));
	});
}

// Die Schnittstellen der Verwaltung zum Gespräch; die Grundprüfung, der Routen-Test und die
// Rechte-Matrix nehmen die Liste aus `tests/hilfen/verwaltungs-listen.ts`.
export const GESPRAECH_ADMIN_SCHNITTSTELLEN = {
	getGespraeche,
	getAdminGespraech,
	postAntwort,
	postZustand
} satisfies Record<string, (d: MitteilungAdminDienste, e: AdminEreignis) => Promise<Response>>;
