// Schnittstellen der Mitglieder zu Anlässen (A-ANLASS-01). Ohne Sitzung nur die Kalenderdatei,
// über ihre nicht erratbare Kennung (SI-19).
import type { RequestEvent } from '@sveltejs/kit';
import { parseId } from '../parse-id.ts';
import {
	antwort,
	formatFehler,
	istJson,
	jetzt,
	leseKoerper,
	mitSitzung,
	nichtGefunden,
	type Ereignis
} from '../http.ts';
import { ANTWORT_MELDUNG } from '../../anlass/antwort.ts';
import { pruefeAntwort } from './angaben.ts';
import {
	kommendeAnlaesse,
	ladeAnlassFuerMitglied,
	ladeKalenderAnlass,
	melde,
	type AnlassMitglied
} from './anlaesse.ts';
import { baueKalender } from './kalender.ts';
import type { AnlassDienste } from './typen.ts';

export type AnlassEreignis = Ereignis & Pick<RequestEvent, 'params'>;

/** Für den Browser: statt der Kennung der Link zur Kalenderdatei. */
export function fuerBrowser({ kalenderKennung, ...rest }: AnlassMitglied) {
	return { ...rest, kalender: `/api/kalender/${kalenderKennung}` };
}

export function getAnlaesse(d: AnlassDienste, e: AnlassEreignis): Promise<Response> {
	return mitSitzung(e, async (konto) =>
		antwort(200, (await kommendeAnlaesse(d.db, konto.mitgliedId, jetzt(d))).map(fuerBrowser))
	);
}

export function getAnlass(d: AnlassDienste, e: AnlassEreignis): Promise<Response> {
	return mitSitzung(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const a = await ladeAnlassFuerMitglied(d.db, id, konto.mitgliedId, jetzt(d));
		return a ? antwort(200, fuerBrowser(a)) : nichtGefunden();
	});
}

export async function postAnmeldung(d: AnlassDienste, e: AnlassEreignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitSitzung(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const p = pruefeAntwort(await leseKoerper(e));
		if (!p.ok)
			return antwort(400, { fehler: 'eingabe', felder: { [p.feld]: ANTWORT_MELDUNG[p.feld] } });
		const t = jetzt(d);
		const r = await melde(d.db, id, konto.mitgliedId, p, t);
		if (r === 'geschlossen') return antwort(409, { fehler: 'geschlossen' });
		if (r === 'nicht-gefunden') return nichtGefunden();
		const a = await ladeAnlassFuerMitglied(d.db, id, konto.mitgliedId, t);
		return a ? antwort(200, fuerBrowser(a)) : nichtGefunden();
	});
}

export async function getKalender(d: AnlassDienste, e: AnlassEreignis): Promise<Response> {
	const kennung = e.params.kennung ?? '';
	const a = /^[A-Za-z0-9_-]{43}$/.test(kennung) ? await ladeKalenderAnlass(d.db, kennung) : null;
	if (!a) return nichtGefunden();
	return new Response(baueKalender(a, jetzt(d)), {
		status: 200,
		headers: {
			'content-type': 'text/calendar; charset=utf-8',
			'content-disposition': 'inline; filename="anlass.ics"',
			'cache-control': 'no-store'
		}
	});
}

// Alle Schnittstellen der Mitglieder zu Anlässen; die Grundprüfung
// (`src/lib/server/grundpruefung.db.test.ts`) läuft über jeden Eintrag.
export const ANLASS_SCHNITTSTELLEN = {
	getAnlaesse,
	getAnlass,
	postAnmeldung,
	getKalender
} satisfies Record<string, (d: AnlassDienste, e: AnlassEreignis) => Promise<Response>>;
