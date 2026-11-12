// Schnittstellen für Turniere und Kategorien (FR-33 bis FR-35), Bereich `cm`: Der CM-Admin liest
// und schreibt, der MyTCO-Admin liest nur (Regel 3). Die Anmeldungs-Verwaltung steht in
// `cm/verwaltung-schnittstellen.ts`, die des Gesprächs in `gespraech/verwaltung-schnittstellen.ts`.
import {
	liest,
	schreibt,
	type AdminDienste,
	type AdminEreignis,
	type AdminUrheber
} from '../admin/rechte.ts';
import { anfrageGeloeschtText } from '../cm/doppel-meldung.ts';
import { melde } from '../cm/verwaltung-meldung.ts';
import { antwort, eingabeFehler, jetzt, nichtGefunden } from '../http.ts';
import type { MitteilungAdminDienste } from '../mitteilung/typen.ts';
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
	setzeStatus,
	type HinfaelligeAnfrage
} from './turniere.ts';

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
		if (r === 'kontakt-ungueltig')
			return antwort(400, {
				fehler: 'eingabe',
				felder: { kontakt: 'Diese Person ist nicht CM-Admin.' }
			});
		if (r === 'vergeben') return antwort(409, { fehler: 'vergeben', feld: 'jahr' });
		return antwort(200, {});
	});
}

export function postTurnierStatus(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (_urheber, koerper) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const ziel = koerper.status;
		if (ziel !== 'offen' && ziel !== 'geschlossen') return eingabeFehler();
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

export function postKategorie(d: MitteilungAdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'cm', async (urheber, koerper) => {
		const id = parseId(e.params.id);
		const k = id === null ? null : await ladeKategorie(d.db, id);
		if (id === null || !k) return nichtGefunden();
		const p = pruefeKategorie(koerper, k.turnierjahr);
		if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.felder });
		const r = await aendereKategorie(d.db, id, p.werte, koerper.trotzdem === true);
		if (typeof r === 'object' && 'unpassend' in r) {
			return antwort(409, { fehler: 'unpassend', anzahl: r.unpassend });
		}
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r === 'abgesagt' || r === 'art-gesperrt') return antwort(409, { fehler: r });
		if (r === 'vergeben') return antwort(409, { fehler: 'vergeben', feld: 'name' });
		meldeHinfaellige(d, urheber, r.hinfaellig);
		return antwort(200, {});
	});
}

export function postKategorieAbsagen(
	d: MitteilungAdminDienste,
	e: AdminEreignis
): Promise<Response> {
	return schreibt(d, e, 'cm', async (urheber) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const r = await sageKategorieAb(d.db, id);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if ('aktiv' in r) return antwort(409, { fehler: 'hat-anmeldungen', anzahl: r.aktiv });
		meldeHinfaellige(d, urheber, r.hinfaellig);
		return antwort(200, {});
	});
}

/** FR-46: Meldung an jeden, dessen offene Partner-Anfrage durch Absagen oder Art-Wechsel wegfiel. */
function meldeHinfaellige(
	d: MitteilungAdminDienste,
	urheber: AdminUrheber,
	hinfaellig: HinfaelligeAnfrage[]
): void {
	for (const h of hinfaellig) {
		melde(d, urheber, h.vonId, h.turnierId, anfrageGeloeschtText(h.an, h.kategorie));
	}
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
	postKategorieAbsagen
} satisfies Record<string, (d: MitteilungAdminDienste, e: AdminEreignis) => Promise<Response>>;
