// Schnittstellen der Mitglieder zu den Interclub-Resultaten des Vereins und zum Folgen von Teams.
import type { RequestEvent } from '@sveltejs/kit';
import {
	antwort,
	eingabeFehler,
	formatFehler,
	istJson,
	jetzt,
	leseKoerper,
	mitSitzung,
	nichtGefunden,
	type Ereignis
} from '../http.ts';
import { parseId } from '../parse-id.ts';
import { ladeBegegnung, ladeTeam, ladeUebersicht } from './ansicht.ts';
import { ladeFolgenStand, ladeGefolgteTeams, setzeFolgen } from './folgen.ts';
import type { InterclubDienste } from './typen.ts';

export type InterclubEreignis = Ereignis & Pick<RequestEvent, 'params'>;

export function getInterclub(d: InterclubDienste, e: InterclubEreignis): Promise<Response> {
	return mitSitzung(e, async () => {
		const u = await ladeUebersicht(d.db, jetzt(d));
		return u ? antwort(200, u) : nichtGefunden();
	});
}

export function getInterclubTeam(d: InterclubDienste, e: InterclubEreignis): Promise<Response> {
	return mitSitzung(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const t = await ladeTeam(d.db, id);
		if (!t) return nichtGefunden();
		return antwort(200, { ...t, folgen: await ladeFolgenStand(d.db, konto.kontoId, id) });
	});
}

export async function postInterclubFolgen(
	d: InterclubDienste,
	e: InterclubEreignis
): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitSitzung(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const folgen = (await leseKoerper(e)).folgen;
		if (typeof folgen !== 'boolean') return eingabeFehler();
		const r = await setzeFolgen(d.db, konto.kontoId, id, folgen, jetzt(d));
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r === 'kein-push') return antwort(409, { fehler: 'kein-push' });
		return antwort(200, { folgt: folgen });
	});
}

export function getInterclubFolgen(d: InterclubDienste, e: InterclubEreignis): Promise<Response> {
	return mitSitzung(e, async (konto) => antwort(200, await ladeGefolgteTeams(d.db, konto.kontoId)));
}

export function getInterclubBegegnung(
	d: InterclubDienste,
	e: InterclubEreignis
): Promise<Response> {
	return mitSitzung(e, async () => {
		const id = parseId(e.params.id);
		const begegnung = parseId(e.params.begegnung);
		if (id === null || begegnung === null) return nichtGefunden();
		const b = await ladeBegegnung(d.db, id, begegnung, jetzt(d));
		return b ? antwort(200, b) : nichtGefunden();
	});
}

// Alle Schnittstellen der Mitglieder zu Interclub; die Grundprüfung
// (`src/lib/server/grundpruefung.db.test.ts`) läuft über jeden Eintrag.
export const INTERCLUB_SCHNITTSTELLEN = {
	getInterclub,
	getInterclubTeam,
	postInterclubFolgen,
	getInterclubFolgen,
	getInterclubBegegnung
} satisfies Record<string, (d: InterclubDienste, e: InterclubEreignis) => Promise<Response>>;
