// Schnittstellen der Mitglieder zum Gespräch mit der Turnierleitung (A-TURNIER-04, FR-50 bis
// FR-53), nur mit Sitzung: lesen, schreiben, als gelesen markieren. Die der Verwaltung stehen in
// `verwaltung-schnittstellen.ts`.
import type { CmDienste, CmEreignis } from '../cm/typen.ts';
import {
	aendernd,
	antwort,
	eingabeFehler,
	jetzt,
	leseKoerper,
	mitSitzung,
	nichtGefunden
} from '../http.ts';
import { parseId } from '../parse-id.ts';
import { antwortOderWeg, nurLesen, pruefeText, textFehler } from './antworten.ts';
import { ladeEigenesGespraech, markiereGelesen, schreibeAlsMitglied } from './gespraech.ts';
import { MELDUNG_TITEL, NACHRICHT_TEXT, pfadVerwaltung } from './meldung.ts';

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
		if (bis === null || Number.isNaN(bis.getTime())) return eingabeFehler();
		// Nie über «jetzt» hinaus: Die Marke geht nur vorwärts und würde spätere Antworten verdecken.
		const t = jetzt(d);
		await markiereGelesen(d.db, id, konto.mitgliedId, bis > t ? t : bis);
		return antwort(204);
	});
}

// Die Schnittstellen der Mitglieder zum Gespräch; die Grundprüfung
// (`src/lib/server/grundpruefung.db.test.ts`) läuft über jeden Eintrag. Die der Verwaltung stehen
// in GESPRAECH_ADMIN_SCHNITTSTELLEN (`verwaltung-schnittstellen.ts`).
export const GESPRAECH_SCHNITTSTELLEN = {
	getGespraech,
	postGespraech,
	postGelesen
} satisfies Record<string, (d: CmDienste, e: CmEreignis) => Promise<Response>>;
