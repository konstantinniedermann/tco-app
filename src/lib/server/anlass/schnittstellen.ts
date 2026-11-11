// Schnittstellen der Mitglieder zu Anlässen (A-ANLASS-01). Ohne Sitzung nur die Kalenderdatei,
// über ihre nicht erratbare Kennung (SI-19).
import type { RequestEvent } from '@sveltejs/kit';
import { parseId } from '../parse-id.ts';
import type { Db } from '../db/index.ts';
import {
	antwort,
	formatFehler,
	istJson,
	leseKoerper,
	type Ereignis
} from '../login/schnittstellen.ts';
import type { AngemeldetesKonto } from '../login/sitzung.ts';
import { pruefeAntwort } from './angaben.ts';
import {
	kommendeAnlaesse,
	ladeAnlassFuerMitglied,
	ladeKalenderAnlass,
	melde,
	type AnlassMitglied
} from './anlaesse.ts';
import { baueKalender } from './kalender.ts';

export type AnlassDienste = { db: Db; jetzt?: () => Date };
export type AnlassEreignis = Ereignis & Pick<RequestEvent, 'params'>;

const jetzt = (d: AnlassDienste) => (d.jetzt ?? (() => new Date()))();
const nichtGefunden = () => antwort(404, { fehler: 'nicht-gefunden' });

/** Für den Browser: statt der Kennung der Link zur Kalenderdatei. */
export function fuerBrowser({ kalenderKennung, ...rest }: AnlassMitglied) {
	return { ...rest, kalender: `/api/kalender/${kalenderKennung}` };
}

async function mitSitzung(
	e: AnlassEreignis,
	fn: (konto: AngemeldetesKonto) => Promise<Response>
): Promise<Response> {
	const konto = e.locals.konto;
	if (!konto) return antwort(401, { fehler: 'abgemeldet' });
	return fn(konto);
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
		if (!p.ok) return antwort(400, { fehler: 'eingabe', feld: p.feld });
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
