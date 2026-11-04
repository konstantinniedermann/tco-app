import type { RequestEvent } from '@sveltejs/kit';
import type { Db } from '../db/index.ts';
import {
	antwort,
	formatFehler,
	istJson,
	leseKoerper,
	type Ereignis
} from '../login/schnittstellen.ts';
import { pruefeAngaben } from './angaben.ts';
import {
	aendereAngaben,
	beendeSitzungenVon,
	legeMitgliedAn,
	ladeMitglied,
	listeMitglieder,
	type MitgliedStatus
} from './mitglieder.ts';
import { ROLLEN, setzeRollen, type Rolle } from './rollen.ts';
import { ladeVerlauf, type Urheber } from './verlauf.ts';
import type { ZugangDienst } from './zugang.ts';

export type AdminEreignis = Ereignis & Pick<RequestEvent, 'params'>;

export type AdminDienste = { db: Db; zugang: ZugangDienst; jetzt?: () => Date };

type AdminUrheber = Extract<Urheber, { art: 'admin' | 'mitglied' }> & { art: 'admin' };

const STATUS: readonly string[] = ['aktiv', 'ausgetreten', 'geloescht'];
const VERLAUF_STANDARD = 100;
const VERLAUF_MAX = 500;

const nichtGefunden = () => antwort(404, { fehler: 'nicht-gefunden' });
const eingabeFehler = () => antwort(400, { fehler: 'eingabe' });

const INTEGER_MAX = 2_147_483_647;

function parseId(roh: string | null | undefined): number | null {
	if (roh === null || roh === undefined || !/^[1-9]\d{0,14}$/.test(roh)) return null;
	const n = Number(roh);
	// Grösser als ein Postgres-integer würde die Abfrage mit 22003 abbrechen (500).
	return n <= INTEGER_MAX ? n : null;
}

const jetzt = (d: AdminDienste) => (d.jetzt ?? (() => new Date()))();

// Sitzung und Rolle genügen; die Bestätigung per Code ist hier noch nicht nötig.
async function mitKonto(
	d: AdminDienste,
	e: AdminEreignis,
	fn: (konto: NonNullable<AdminEreignis['locals']['konto']>) => Promise<Response>
): Promise<Response> {
	const konto = e.locals.konto;
	const z = await d.zugang.pruefe(konto);
	if (!konto || z.stufe === 'abgemeldet') return antwort(401, { fehler: 'abgemeldet' });
	if (z.stufe === 'kein-admin') return antwort(403, { fehler: 'kein-admin' });
	return fn(konto);
}

// RR-07, RR-09: nur Admins mit gültiger Code-Bestätigung.
export async function mitAdmin(
	d: AdminDienste,
	e: AdminEreignis,
	fn: (urheber: AdminUrheber) => Promise<Response>
): Promise<Response> {
	const z = await d.zugang.pruefe(e.locals.konto);
	switch (z.stufe) {
		case 'abgemeldet':
			return antwort(401, { fehler: 'abgemeldet' });
		case 'kein-admin':
			return antwort(403, { fehler: 'kein-admin' });
		case 'unbestaetigt':
			return antwort(403, { fehler: 'unbestaetigt' });
		default:
			return fn({ art: 'admin', mitgliedId: z.mitgliedId });
	}
}

// SI-10: ändernde Anfragen nur als JSON.
async function aendernd(
	d: AdminDienste,
	e: AdminEreignis,
	fn: (urheber: AdminUrheber, koerper: Record<string, unknown>) => Promise<Response>
): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitAdmin(d, e, async (u) => fn(u, await leseKoerper(e)));
}

export async function getZugang(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	const z = await d.zugang.pruefe(e.locals.konto);
	if (z.stufe === 'abgemeldet') return antwort(401, { fehler: 'abgemeldet' });
	if (z.stufe === 'kein-admin') return antwort(403, { fehler: 'kein-admin' });
	return antwort(200, { bestaetigt: z.stufe === 'bestaetigt' });
}

export async function postZugangCode(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitKonto(d, e, async (konto) => {
		// Nicht auf `arbeit` warten (wie beim Login-Code).
		const { annahme } = await d.zugang.fordereCodeAn(konto);
		return annahme === 'ok' ? antwort(202, {}) : antwort(429, { fehler: 'zu-viele' });
	});
}

export async function postZugang(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitKonto(d, e, async (konto) => {
		const { code } = await leseKoerper(e);
		const r = await d.zugang.bestaetige(konto, code);
		return r === 'ok' ? antwort(200, {}) : antwort(400, { fehler: 'falsch' });
	});
}

export function getMitglieder(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return mitAdmin(d, e, async () => {
		const suche = e.url.searchParams.get('suche') ?? undefined;
		// Leer heisst «Alle» (Filter der Oberfläche) und wirkt wie ein fehlender Status.
		const status = e.url.searchParams.get('status') || undefined;
		if (status !== undefined && !STATUS.includes(status)) return eingabeFehler();
		const zeilen = await listeMitglieder(
			d.db,
			{ suche, status: status as MitgliedStatus | undefined },
			jetzt(d)
		);
		return antwort(200, zeilen);
	});
}

export function postMitglieder(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return aendernd(d, e, async (urheber, koerper) => {
		const t = jetzt(d);
		const p = pruefeAngaben(koerper, { nummerPflicht: false, jahr: t.getFullYear() });
		if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.fehler });
		const r = await legeMitgliedAn(d.db, urheber, p.angaben, t);
		return r.ergebnis === 'ok'
			? antwort(201, { id: r.id })
			: antwort(409, { fehler: 'vergeben', feld: r.feld });
	});
}

export function getMitglied(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return mitAdmin(d, e, async () => {
		const id = parseId(e.params.id);
		const detail = id === null ? null : await ladeMitglied(d.db, id, jetzt(d));
		return detail ? antwort(200, detail) : nichtGefunden();
	});
}

export function postMitglied(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return aendernd(d, e, async (urheber, koerper) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const t = jetzt(d);
		const p = pruefeAngaben(koerper, { nummerPflicht: false, jahr: t.getFullYear() });
		if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.fehler });
		const r = await aendereAngaben(d.db, urheber, id, p.angaben, t);
		if (r.ergebnis === 'ok') return antwort(200, { geaendert: r.geaendert });
		return r.ergebnis === 'vergeben'
			? antwort(409, { fehler: 'vergeben', feld: r.feld })
			: nichtGefunden();
	});
}

// `setzeRollen` prüft die Namen nicht; sie müssen hier aus ROLLEN stammen und verschieden sein.
function leseRollen(roh: unknown): Rolle[] | null {
	if (!Array.isArray(roh)) return null;
	const erlaubt: readonly unknown[] = ROLLEN;
	if (!roh.every((r) => erlaubt.includes(r)) || new Set(roh).size !== roh.length) return null;
	return roh as Rolle[];
}

export function postRollen(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return aendernd(d, e, async (urheber, koerper) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const rollen = leseRollen(koerper.rollen);
		if (rollen === null) return eingabeFehler();
		const t = jetzt(d);
		const detail = await ladeMitglied(d.db, id, t);
		if (!detail) return nichtGefunden();
		const r = await setzeRollen(d.db, urheber, detail.kontoId, rollen, t);
		if (r === 'ok') return antwort(200, {});
		return r === 'letzter-admin' ? antwort(409, { fehler: 'letzter-admin' }) : nichtGefunden();
	});
}

export function postSitzungen(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return aendernd(d, e, async (urheber) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const r = await beendeSitzungenVon(d.db, urheber, id, jetzt(d));
		return r === 'ok' ? antwort(200, {}) : nichtGefunden();
	});
}

export function getVerlauf(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return mitAdmin(d, e, async () => {
		const q = e.url.searchParams;
		const mitgliedRoh = q.get('mitglied');
		const mitgliedId = mitgliedRoh === null ? undefined : parseId(mitgliedRoh);
		if (mitgliedId === null) return eingabeFehler();
		const grenzeRoh = q.get('grenze');
		const zahl = Number(grenzeRoh);
		const grenze =
			grenzeRoh === null || !Number.isInteger(zahl) || zahl < 1
				? VERLAUF_STANDARD
				: Math.min(zahl, VERLAUF_MAX);
		return antwort(200, await ladeVerlauf(d.db, { mitgliedId, grenze }));
	});
}

export const ADMIN_SCHNITTSTELLEN = {
	getZugang,
	postZugangCode,
	postZugang,
	getMitglieder,
	postMitglieder,
	getMitglied,
	postMitglied,
	postRollen,
	postSitzungen,
	getVerlauf
} satisfies Record<string, (d: AdminDienste, e: AdminEreignis) => Promise<Response>>;
