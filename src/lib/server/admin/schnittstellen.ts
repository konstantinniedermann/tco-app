import type { RequestEvent } from '@sveltejs/kit';
import type { Db } from '../db/index.ts';
import {
	antwort,
	formatFehler,
	istJson,
	leseKoerper,
	type Ereignis
} from '../login/schnittstellen.ts';
import { utcZuZuerich } from '../../anlass/zeit.ts';
import { parseId } from '../parse-id.ts';
import { pruefeAnlass } from '../anlass/angaben.ts';
import {
	aendereAnlass,
	ladeAnlassAdmin,
	legeAnlassAn,
	listeAnlaesse,
	loescheAnlass
} from '../anlass/anlaesse.ts';
import { listeFuerFairgate, markiereUebertragen } from './fairgate.ts';
import { leseStand, pruefeAngaben } from './angaben.ts';
import {
	aendereAngaben,
	beendeSitzungenVon,
	legeMitgliedAn,
	ladeMitglied,
	listeMitglieder,
	type MitgliedStatus
} from './mitglieder.ts';
import { ROLLEN, setzeRollen, type Rolle, type VerwaltungsRolle } from './rollen.ts';
import { ladeVerlauf, type Urheber } from './verlauf.ts';
import type { ZugangDienst } from './zugang.ts';

export type AdminEreignis = Ereignis & Pick<RequestEvent, 'params'>;

export type AdminDienste = { db: Db; zugang: ZugangDienst; jetzt?: () => Date };

type AdminUrheber = Extract<Urheber, { art: 'admin' | 'mitglied' }> & { art: 'admin' };

// Record statt Liste: Kommt ein Status dazu, meldet der Compiler die Lücke hier.
const STATUS: Record<MitgliedStatus, true> = { aktiv: true, ausgetreten: true, geloescht: true };
const istStatus = (s: string): s is MitgliedStatus => Object.hasOwn(STATUS, s);
const VERLAUF_STANDARD = 100;
const VERLAUF_MAX = 500;

const nichtGefunden = () => antwort(404, { fehler: 'nicht-gefunden' });
const eingabeFehler = () => antwort(400, { fehler: 'eingabe' });

const jetzt = (d: AdminDienste) => (d.jetzt ?? (() => new Date()))();

// Sitzung und eine Verwaltungsrolle (admin oder cm) genügen; die Bestätigung per Code ist hier
// noch nicht nötig (SI-08: auch ein reiner CM muss den Code anfordern und einlösen können).
async function mitKonto(
	d: AdminDienste,
	e: AdminEreignis,
	fn: (konto: NonNullable<AdminEreignis['locals']['konto']>) => Promise<Response>
): Promise<Response> {
	const konto = e.locals.konto;
	const z = await d.zugang.pruefe(konto);
	if (!konto || z.stufe === 'abgemeldet') return antwort(401, { fehler: 'abgemeldet' });
	if (z.stufe === 'keine-rolle') return antwort(403, { fehler: 'kein-admin' });
	return fn(konto);
}

// RR-07, RR-09: bestätigte Sitzung mit einer der erlaubten Rollen. Die Rolle wird vor der Bestätigung
// geprüft: Wer den Bereich nicht hat, bekommt `kein-admin` (der Code für «dieser Bereich ist dir
// nicht offen»), nicht die Aufforderung zum Bestätigen.
async function mitRolle(
	d: AdminDienste,
	e: AdminEreignis,
	erlaubt: readonly VerwaltungsRolle[],
	fn: (mitgliedId: number) => Promise<Response>
): Promise<Response> {
	const z = await d.zugang.pruefe(e.locals.konto);
	if (z.stufe === 'abgemeldet') return antwort(401, { fehler: 'abgemeldet' });
	if (z.stufe === 'keine-rolle' || !z.rollen.some((r) => erlaubt.includes(r))) {
		return antwort(403, { fehler: 'kein-admin' });
	}
	if (z.stufe === 'unbestaetigt') return antwort(403, { fehler: 'unbestaetigt' });
	return fn(z.mitgliedId);
}

// RR-07, RR-09: nur Admins mit gültiger Code-Bestätigung; `cm` allein genügt nicht.
export function mitAdmin(
	d: AdminDienste,
	e: AdminEreignis,
	fn: (urheber: AdminUrheber) => Promise<Response>
): Promise<Response> {
	return mitRolle(d, e, ['admin'], (mitgliedId) => fn({ art: 'admin', mitgliedId }));
}

// RR-07, RR-09: Bereich Clubmeisterschaft — Admins und CMs mit gültiger Code-Bestätigung.
export function mitCm(
	d: AdminDienste,
	e: AdminEreignis,
	fn: (mitgliedId: number) => Promise<Response>
): Promise<Response> {
	return mitRolle(d, e, ['admin', 'cm'], fn);
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

// SI-10 wie `aendernd`, für den Bereich Clubmeisterschaft.
export async function aenderndCm(
	d: AdminDienste,
	e: AdminEreignis,
	fn: (mitgliedId: number, koerper: Record<string, unknown>) => Promise<Response>
): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitCm(d, e, async (id) => fn(id, await leseKoerper(e)));
}

// RR-07: `rollen` sagt der Oberfläche, welche Bereiche sie zeigt; durchgesetzt wird an den Schnittstellen.
export async function getZugang(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	const z = await d.zugang.pruefe(e.locals.konto);
	if (z.stufe === 'abgemeldet') return antwort(401, { fehler: 'abgemeldet' });
	if (z.stufe === 'keine-rolle') return antwort(403, { fehler: 'kein-admin' });
	// Nur die Nummer des Angemeldeten, damit die Seite eine Rückfrage beim eigenen Konto stellen kann.
	if (z.stufe === 'bestaetigt') {
		return antwort(200, { bestaetigt: true, mitgliedId: z.mitgliedId, rollen: z.rollen });
	}
	return antwort(200, { bestaetigt: false, rollen: z.rollen });
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
		if (status !== undefined && !istStatus(status)) return eingabeFehler();
		const zeilen = await listeMitglieder(d.db, { suche, status }, jetzt(d));
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
		// Der Stand, den die Seite geladen hat: schützt vor dem Überschreiben fremder Änderungen.
		const vorher = leseStand(koerper.vorher);
		if (vorher === null) return eingabeFehler();
		const r = await aendereAngaben(d.db, urheber, id, p.angaben, vorher, t);
		switch (r.ergebnis) {
			case 'ok':
				return antwort(200, { geaendert: r.geaendert });
			case 'vergeben':
				return antwort(409, { fehler: 'vergeben', feld: r.feld });
			case 'veraltet':
				return antwort(409, { fehler: 'veraltet' });
			default:
				return nichtGefunden();
		}
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

export function getFairgate(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return mitAdmin(d, e, async () => antwort(200, await listeFuerFairgate(d.db)));
}

export function postFairgate(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return aendernd(d, e, async (urheber, koerper) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const seit = typeof koerper.seit === 'string' ? new Date(koerper.seit) : null;
		if (seit === null || Number.isNaN(seit.getTime())) return eingabeFehler();
		const r = await markiereUebertragen(d.db, urheber, id, seit, jetzt(d));
		if (r === 'veraltet') return antwort(409, { fehler: 'veraltet' });
		return r === 'ok' ? antwort(200, {}) : nichtGefunden();
	});
}

export function getAdminAnlaesse(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return mitAdmin(d, e, async () => antwort(200, await listeAnlaesse(d.db)));
}

export function postAdminAnlaesse(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return aendernd(d, e, async (urheber, koerper) => {
		const p = pruefeAnlass(koerper);
		if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.felder });
		return antwort(201, { id: await legeAnlassAn(d.db, urheber.mitgliedId, p.werte) });
	});
}

export function getAdminAnlass(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return mitAdmin(d, e, async () => {
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
	return aendernd(d, e, async (_urheber, koerper) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const p = pruefeAnlass(koerper);
		if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.felder });
		const r = await aendereAnlass(d.db, id, p.werte, jetzt(d));
		return r === 'ok' ? antwort(200, {}) : nichtGefunden();
	});
}

export function postAdminAnlassLoeschen(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return aendernd(d, e, async () => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		return (await loescheAnlass(d.db, id)) === 'ok' ? antwort(200, {}) : nichtGefunden();
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
	getVerlauf,
	getFairgate,
	postFairgate,
	getAdminAnlaesse,
	postAdminAnlaesse,
	getAdminAnlass,
	postAdminAnlass,
	postAdminAnlassLoeschen
} satisfies Record<string, (d: AdminDienste, e: AdminEreignis) => Promise<Response>>;
