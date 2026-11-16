// Schnittstellen der Verwaltung zu Anlässen (A-ANLASS-01). Rechte über `liest` und `schreibt` aus
// `admin/rechte.ts` (Bereich `mitglieder`). Nur Routen unter `src/routes/api/admin/` nutzen diese
// Datei (Bauregel, Schutz am Pfad); die Schnittstellen der Mitglieder stehen in `schnittstellen.ts`.
import { antwort, jetzt, nichtGefunden } from '../http.ts';
import { utcZuZuerich } from '../../anlass/zeit.ts';
import { parseId } from '../parse-id.ts';
import { liest, schreibt, type AdminDienste, type AdminEreignis } from '../admin/rechte.ts';
import { pruefeAnlass } from './angaben.ts';
import {
	aendereAnlass,
	ladeAnlassAdmin,
	legeAnlassAn,
	listeAnlaesse,
	loescheAnlass
} from './anlaesse.ts';

export function getAdminAnlaesse(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'mitglieder', async () => antwort(200, await listeAnlaesse(d.db)));
}

export function postAdminAnlaesse(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'mitglieder', async (urheber, koerper) => {
		const p = pruefeAnlass(koerper);
		if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.felder });
		return antwort(201, { id: await legeAnlassAn(d.db, urheber.mitgliedId, p.werte) });
	});
}

export function getAdminAnlass(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'mitglieder', async () => {
		const id = parseId(e.params.id);
		const a = id === null ? null : await ladeAnlassAdmin(d.db, id);
		if (!a) return nichtGefunden();
		// Für das Formular in Schweizer Zeit, wie <input type="datetime-local"> sie erwartet.
		return antwort(200, {
			...a,
			beginnLokal: utcZuZuerich(a.beginn),
			schlussLokal: utcZuZuerich(a.anmeldeschluss)
		});
	});
}

export function postAdminAnlass(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'mitglieder', async (_urheber, koerper) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const p = pruefeAnlass(koerper);
		if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.felder });
		const r = await aendereAnlass(d.db, id, p.werte, jetzt(d));
		return r === 'ok' ? antwort(200, {}) : nichtGefunden();
	});
}

export function postAdminAnlassLoeschen(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'mitglieder', async () => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		return (await loescheAnlass(d.db, id)) === 'ok' ? antwort(200, {}) : nichtGefunden();
	});
}

export const ANLASS_ADMIN_SCHNITTSTELLEN = {
	getAdminAnlaesse,
	postAdminAnlaesse,
	getAdminAnlass,
	postAdminAnlass,
	postAdminAnlassLoeschen
} satisfies Record<string, (d: AdminDienste, e: AdminEreignis) => Promise<Response>>;
