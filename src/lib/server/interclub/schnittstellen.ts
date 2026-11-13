// Schnittstellen der Mitglieder zu den Interclub-Resultaten des Vereins (nur lesend).
import type { RequestEvent } from '@sveltejs/kit';
import { antwort, jetzt, mitSitzung, nichtGefunden, type Ereignis } from '../http.ts';
import { parseId } from '../parse-id.ts';
import { ladeTeam, ladeUebersicht } from './ansicht.ts';
import type { InterclubDienste } from './typen.ts';

export type InterclubEreignis = Ereignis & Pick<RequestEvent, 'params'>;

export function getInterclub(d: InterclubDienste, e: InterclubEreignis): Promise<Response> {
	return mitSitzung(e, async () => {
		const u = await ladeUebersicht(d.db, jetzt(d));
		return u ? antwort(200, u) : nichtGefunden();
	});
}

export function getInterclubTeam(d: InterclubDienste, e: InterclubEreignis): Promise<Response> {
	return mitSitzung(e, async () => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const t = await ladeTeam(d.db, id);
		return t ? antwort(200, t) : nichtGefunden();
	});
}

// Alle Schnittstellen der Mitglieder zu Interclub; die Grundprüfung
// (`src/lib/server/grundpruefung.db.test.ts`) läuft über jeden Eintrag.
export const INTERCLUB_SCHNITTSTELLEN = {
	getInterclub,
	getInterclubTeam
} satisfies Record<string, (d: InterclubDienste, e: InterclubEreignis) => Promise<Response>>;
