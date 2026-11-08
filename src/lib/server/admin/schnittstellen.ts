import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { mitglied } from '../db/schema.ts';
import {
	antwort,
	formatFehler,
	istJson,
	leseKoerper,
	type Ereignis
} from '../login/schnittstellen.ts';
import { utcZuZuerich } from '../../anlass/zeit.ts';
import { jahrInZuerich } from '../datum.ts';
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
import { listeBriefEmpfaenger, MAX_BRIEFE, stelleBriefeAus, type BriefAbh } from './briefe.ts';
import { ladeAuskunft } from './auskunft.ts';
import { setzeAnsicht } from './ansicht.ts';
import {
	erfasseAustritt,
	erfasseWiedereintritt,
	merkeZumLoeschenVor,
	nimmLoeschungZurueck
} from './mitgliedschaft.ts';
import { ROLLEN, istAnsichtRolle, listeRollen, setzeRollen, type Rolle } from './rollen.ts';
import { ladeVerlauf, schreibeVerlauf, type Urheber } from './verlauf.ts';
import type { ZugangDienst } from './zugang.ts';
import { darf, type Art, type Bereich } from '../../verwaltung/bereiche.ts';

export type AdminEreignis = Ereignis & Pick<RequestEvent, 'params'>;

export type AdminDienste = {
	db: Db;
	zugang: ZugangDienst;
	// SI-09: Hinweis an die alte Adresse; wirft nie.
	hinweis: (an: string) => Promise<void>;
	// Schlüssel, Adresse und Kontakt für die Briefe (Brief-Code, Text).
	brief: BriefAbh;
	jetzt?: () => Date;
};

export type AdminUrheber = Extract<Urheber, { art: 'admin' | 'mitglied' }> & { art: 'admin' };

// Record statt Liste: Kommt ein Status dazu, meldet der Compiler die Lücke hier.
const STATUS: Record<MitgliedStatus, true> = {
	aktiv: true,
	ausgetreten: true,
	vorgemerkt: true,
	geloescht: true
};
const istStatus = (s: string): s is MitgliedStatus => Object.hasOwn(STATUS, s);
const VERLAUF_STANDARD = 100;
const VERLAUF_MAX = 500;

const nichtGefunden = () => antwort(404, { fehler: 'nicht-gefunden' });
const eingabeFehler = () => antwort(400, { fehler: 'eingabe' });

const jetzt = (d: AdminDienste) => (d.jetzt ?? (() => new Date()))();

// Sitzung und eine Verwaltungsrolle (mytco, mitglieder oder cm) genügen; die Bestätigung per Code ist hier
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

// RR-07, RR-09: bestätigte Sitzung mit einer Rolle, die den Bereich so nutzen darf. Reihenfolge:
// Wer den Bereich nicht einmal lesen darf, bekommt `kein-admin` (der Code für «dieser Bereich ist
// dir nicht offen»), nicht die Aufforderung zum Bestätigen. Wer ihn nur lesen darf und schreiben
// will, bekommt nach der Bestätigung `kein-recht` (Regel 3: der MyTCO-Admin liest).
// In der «Ansicht als …» schreibt keine Schnittstelle, auch ohne den Riegel im Hook (zweite Schicht).
async function mitRolle(
	d: AdminDienste,
	e: AdminEreignis,
	bereich: Bereich,
	art: Art,
	fn: (mitgliedId: number) => Promise<Response>
): Promise<Response> {
	const z = await d.zugang.pruefe(e.locals.konto);
	if (z.stufe === 'abgemeldet') return antwort(401, { fehler: 'abgemeldet' });
	if (art === 'schreiben' && e.locals.konto?.ansicht != null) {
		return antwort(403, { fehler: 'nur-ansehen' });
	}
	if (z.stufe === 'keine-rolle' || !darf(z.rollen, bereich, 'lesen')) {
		return antwort(403, { fehler: 'kein-admin' });
	}
	if (z.stufe === 'unbestaetigt') return antwort(403, { fehler: 'unbestaetigt' });
	if (!darf(z.rollen, bereich, art)) return antwort(403, { fehler: 'kein-recht' });
	return fn(z.mitgliedId);
}

/** Lesende Schnittstelle eines Bereichs (BEREICHE). */
export function liest(
	d: AdminDienste,
	e: AdminEreignis,
	bereich: Bereich,
	fn: (mitgliedId: number) => Promise<Response>
): Promise<Response> {
	return mitRolle(d, e, bereich, 'lesen', fn);
}

/**
 * Schreibende Schnittstelle eines Bereichs (BEREICHE), mit dem Angemeldeten als Urheber für den
 * Änderungsverlauf. SI-10: nur als JSON; der Körper wird erst nach der Prüfung der Rechte gelesen.
 */
export async function schreibt(
	d: AdminDienste,
	e: AdminEreignis,
	bereich: Bereich,
	fn: (urheber: AdminUrheber, koerper: Record<string, unknown>) => Promise<Response>
): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitRolle(d, e, bereich, 'schreiben', async (mitgliedId) =>
		fn({ art: 'admin', mitgliedId }, await leseKoerper(e))
	);
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

// «Ansicht als …»: nur der MyTCO-Admin mit bestätigter Sitzung, geprüft mit den echten Rollen,
// nicht mit denen einer laufenden Ansicht. Kein Verlaufseintrag: Es ändert sich nur diese Sitzung.
export async function postAnsicht(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	const konto = e.locals.konto;
	if (!konto) return antwort(401, { fehler: 'abgemeldet' });
	const z = await d.zugang.pruefe({ ...konto, ansicht: null });
	if (z.stufe === 'abgemeldet') return antwort(401, { fehler: 'abgemeldet' });
	if (z.stufe === 'keine-rolle' || !z.rollen.includes('mytco')) {
		return antwort(403, { fehler: 'kein-admin' });
	}
	if (z.stufe === 'unbestaetigt') return antwort(403, { fehler: 'unbestaetigt' });
	const { rolle } = await leseKoerper(e);
	if (!istAnsichtRolle(rolle)) return eingabeFehler();
	await setzeAnsicht(d.db, konto.sitzungHash, rolle);
	return antwort(200, {});
}

// Beenden geht immer, auch ohne Rolle und ohne laufende Ansicht: Es kann nur zurück zu den echten Rollen.
export async function postAnsichtBeenden(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	const konto = e.locals.konto;
	if (!konto) return antwort(401, { fehler: 'abgemeldet' });
	await setzeAnsicht(d.db, konto.sitzungHash, null);
	return antwort(200, {});
}

export function getMitglieder(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'mitglieder', async () => {
		const suche = e.url.searchParams.get('suche') ?? undefined;
		// Leer heisst «Alle» (Filter der Oberfläche) und wirkt wie ein fehlender Status.
		const status = e.url.searchParams.get('status') || undefined;
		if (status !== undefined && !istStatus(status)) return eingabeFehler();
		const zeilen = await listeMitglieder(d.db, { suche, status }, jetzt(d));
		return antwort(200, zeilen);
	});
}

export function postMitglieder(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'mitglieder', async (urheber, koerper) => {
		const t = jetzt(d);
		const p = pruefeAngaben(koerper, { nummerPflicht: false, jahr: jahrInZuerich(t) });
		if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.fehler });
		const r = await legeMitgliedAn(d.db, urheber, p.angaben, t);
		return r.ergebnis === 'ok'
			? antwort(201, { id: r.id })
			: antwort(409, { fehler: 'vergeben', feld: r.feld });
	});
}

export function getMitglied(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'mitglieder', async () => {
		const id = parseId(e.params.id);
		const detail = id === null ? null : await ladeMitglied(d.db, id, jetzt(d));
		return detail ? antwort(200, detail) : nichtGefunden();
	});
}

export function postMitglied(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'mitglieder', async (urheber, koerper) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const t = jetzt(d);
		const p = pruefeAngaben(koerper, { nummerPflicht: false, jahr: jahrInZuerich(t) });
		if (!p.ok) return antwort(400, { fehler: 'eingabe', felder: p.fehler });
		// Der Stand, den die Seite geladen hat: schützt vor dem Überschreiben fremder Änderungen.
		const vorher = leseStand(koerper.vorher);
		if (vorher === null) return eingabeFehler();
		const r = await aendereAngaben(d.db, urheber, id, p.angaben, vorher, t);
		switch (r.ergebnis) {
			case 'ok':
				// Nach dem Commit und ohne Warten: Die Antwortzeit verrät nichts, ein Mailfehler ändert sie nicht.
				if (r.alteEmail !== null) void d.hinweis(r.alteEmail);
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

// Nur der MyTCO-Admin vergibt und entzieht Rollen (#43). `vorher`: die Rollen, wie die
// Seite sie geladen hat; schützt vor dem Überschreiben fremder Änderungen.
export function postRollen(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'rollen', async (urheber, koerper) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const rollen = leseRollen(koerper.rollen);
		const vorher = leseRollen(koerper.vorher);
		if (rollen === null || vorher === null) return eingabeFehler();
		const t = jetzt(d);
		const detail = await ladeMitglied(d.db, id, t);
		if (!detail) return nichtGefunden();
		const r = await setzeRollen(d.db, urheber, detail.kontoId, rollen, vorher, t);
		switch (r) {
			case 'ok':
				return antwort(200, {});
			case 'letzter-mytco':
			case 'veraltet':
				return antwort(409, { fehler: r });
			default:
				return nichtGefunden();
		}
	});
}

// Regel 2: Übersicht, wer welche Rolle hat; nur für den, der die Rollen vergibt.
export function getRollen(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'rollen', async () => antwort(200, await listeRollen(d.db)));
}

export function postSitzungen(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'mitglieder', async (urheber) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const r = await beendeSitzungenVon(d.db, urheber, id, jetzt(d));
		return r === 'ok' ? antwort(200, {}) : nichtGefunden();
	});
}

// A-LOGIN-01: Empfänger der Brief-Serie. Die Antworten der Brief-Schnittstellen enthalten Codes im
// Klartext und werden nirgends geloggt (SI-05).
export function getBriefe(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'mitglieder', async () =>
		antwort(200, await listeBriefEmpfaenger(d.db, jetzt(d)))
	);
}

// 1 bis MAX_BRIEFE verschiedene ganze Zahlen > 0.
function leseIds(roh: unknown): number[] | null {
	if (!Array.isArray(roh) || roh.length < 1 || roh.length > MAX_BRIEFE) return null;
	if (!roh.every((x) => typeof x === 'number' && Number.isInteger(x) && x > 0)) return null;
	return new Set(roh).size === roh.length ? (roh as number[]) : null;
}

export function postBriefe(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'mitglieder', async (urheber, koerper) => {
		const ids = leseIds(koerper.ids);
		if (ids === null) return eingabeFehler();
		const r = await stelleBriefeAus(d.db, d.brief, urheber, ids, jetzt(d));
		return r.ergebnis === 'ok'
			? antwort(200, { briefe: r.briefe })
			: antwort(409, { fehler: 'nicht-moeglich', anzahl: r.anzahl });
	});
}

export function postBrief(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'mitglieder', async (urheber) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const [m] = await d.db
			.select({ status: mitglied.status })
			.from(mitglied)
			.where(eq(mitglied.id, id));
		if (!m || m.status === 'geloescht') return nichtGefunden();
		const r = await stelleBriefeAus(d.db, d.brief, urheber, [id], jetzt(d));
		return r.ergebnis === 'ok'
			? antwort(200, { briefe: r.briefe })
			: antwort(409, { fehler: 'nicht-moeglich', anzahl: r.anzahl });
	});
}

// Die vier Übergänge der Mitgliedschaft: leerer JSON-Körper, die Funktion prüft den Ausgangszustand.
function uebergang<E extends string>(
	d: AdminDienste,
	e: AdminEreignis,
	fn: (
		db: Db,
		urheber: AdminUrheber,
		id: number,
		jetzt: Date
	) => Promise<'ok' | 'nicht-gefunden' | E>
): Promise<Response> {
	return schreibt(d, e, 'mitglieder', async (urheber) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const r = await fn(d.db, urheber, id, jetzt(d));
		if (r === 'ok') return antwort(200, {});
		return r === 'nicht-gefunden' ? nichtGefunden() : antwort(409, { fehler: r });
	});
}

export const postAustritt = (d: AdminDienste, e: AdminEreignis) => uebergang(d, e, erfasseAustritt);
export const postWiedereintritt = (d: AdminDienste, e: AdminEreignis) =>
	uebergang(d, e, erfasseWiedereintritt);
export const postLoeschen = (d: AdminDienste, e: AdminEreignis) =>
	uebergang(d, e, merkeZumLoeschenVor);
export const postLoeschenRueckgaengig = (d: AdminDienste, e: AdminEreignis) =>
	uebergang(d, e, nimmLoeschungZurueck);

// DS-07: alles, was MyTCO zur Person speichert. Der Aufruf steht im Änderungsverlauf.
export function getAuskunft(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'mitglieder', async (leseId) => {
		const id = parseId(e.params.id);
		const t = jetzt(d);
		const auskunft = id === null ? null : await ladeAuskunft(d.db, id, t);
		if (id === null || !auskunft) return nichtGefunden();
		await schreibeVerlauf(
			d.db,
			id,
			{ art: 'admin', mitgliedId: leseId },
			[{ aktion: 'auskunft-erstellt' }],
			t
		);
		return antwort(200, auskunft);
	});
}

export function getVerlauf(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return liest(d, e, 'mitglieder', async () => {
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
	return liest(d, e, 'mitglieder', async () => antwort(200, await listeFuerFairgate(d.db)));
}

export function postFairgate(d: AdminDienste, e: AdminEreignis): Promise<Response> {
	return schreibt(d, e, 'mitglieder', async (urheber, koerper) => {
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

export const ADMIN_SCHNITTSTELLEN = {
	getZugang,
	postZugangCode,
	postZugang,
	postAnsicht,
	postAnsichtBeenden,
	getMitglieder,
	postMitglieder,
	getMitglied,
	postMitglied,
	postRollen,
	getRollen,
	postSitzungen,
	getBriefe,
	postBriefe,
	postBrief,
	postAustritt,
	postWiedereintritt,
	postLoeschen,
	postLoeschenRueckgaengig,
	getAuskunft,
	getVerlauf,
	getFairgate,
	postFairgate,
	getAdminAnlaesse,
	postAdminAnlaesse,
	getAdminAnlass,
	postAdminAnlass,
	postAdminAnlassLoeschen
} satisfies Record<string, (d: AdminDienste, e: AdminEreignis) => Promise<Response>>;
