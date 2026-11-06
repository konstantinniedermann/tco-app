// Schnittstellen für Turniere und Kategorien (FR-33 bis FR-35), offen für `admin` und `cm`.
import {
	aenderndCm,
	mitCm,
	type AdminDienste,
	type AdminEreignis
} from '../admin/schnittstellen.ts';
import { antwort } from '../login/schnittstellen.ts';
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
const jetzt = (d: AdminDienste) => (d.jetzt ?? (() => new Date()))();

export function getTurniere(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return mitCm(d, e, async () => antwort(200, await listeTurniere(d.db, jetzt(d))));
}

export function postTurniere(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return aenderndCm(d, e, async (_id, koerper) => {
		const p = pruefeTurnier(koerper);
		if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.felder });
		const r = await legeTurnierAn(d.db, p.werte);
		if (r.ergebnis === 'vergeben') return antwort(409, { fehler: 'vergeben', feld: 'jahr' });
		return antwort(201, { id: r.id });
	});
}

export function getTurnier(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return mitCm(d, e, async () => {
		const id = parseId(e.params.id);
		const t = id === null ? null : await ladeTurnier(d.db, id, jetzt(d));
		return t ? antwort(200, t) : nichtGefunden();
	});
}

export function postTurnier(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return aenderndCm(d, e, async (_id, koerper) => {
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
	return aenderndCm(d, e, async (_id, koerper) => {
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
	return aenderndCm(d, e, async (_id, koerper) => {
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
	return mitCm(d, e, async () => {
		const id = parseId(e.params.id);
		const k = id === null ? null : await ladeKategorie(d.db, id);
		return k ? antwort(200, k) : nichtGefunden();
	});
}

export function postKategorie(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return aenderndCm(d, e, async (_id, koerper) => {
		const id = parseId(e.params.id);
		const k = id === null ? null : await ladeKategorie(d.db, id);
		if (id === null || !k) return nichtGefunden();
		const p = pruefeKategorie(koerper, k.turnierjahr);
		if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.felder });
		const r = await aendereKategorie(d.db, id, p.werte);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r === 'abgesagt') return antwort(409, { fehler: 'abgesagt' });
		if (r === 'vergeben') return antwort(409, { fehler: 'vergeben', feld: 'name' });
		return antwort(200, {});
	});
}

export function postKategorieAbsagen(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return aenderndCm(d, e, async () => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		return (await sageKategorieAb(d.db, id)) === 'ok' ? antwort(200, {}) : nichtGefunden();
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
	postKategorieAbsagen
} satisfies Record<string, (d: AdminDienste, e: AdminEreignis) => Promise<Response>>;
