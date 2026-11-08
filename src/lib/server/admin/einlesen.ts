// A-MITGLIED-07, Etappe 2b: Mitglieder aus einer CSV-Datei im MyTCO-Schema einlesen. Die Datei
// lebt nur im Arbeitsspeicher; sie wird weder gespeichert noch geloggt (SI-05, DS-06).
import { inArray, sql } from 'drizzle-orm';
import { jahrInZuerich } from '../datum.ts';
import type { Db, DbOderTx } from '../db/index.ts';
import { konto, mitglied } from '../db/schema.ts';
import { FELDER, pruefeAngaben, type Angaben, type Feld } from './angaben.ts';
import { leseCsv } from './csv.ts';
import { vergebenesFeld } from './mitglieder.ts';
import { schreibeVerlaufFuer, type Urheber } from './verlauf.ts';

// Unter der Grenze des Servers für eine Anfrage (512 KB), samt JSON-Hülle (Projektleiter, 08.11.2026).
export const MAX_BYTES = 400 * 1024;
export const MAX_ZEILEN = 2000;

export const PFLICHT_SPALTEN: readonly Feld[] = [
	'mitgliedernummer',
	'vorname',
	'nachname',
	'strasse',
	'plz',
	'ort',
	'email'
];

export type DateiFehler =
	| {
			grund:
				| 'leer'
				| 'zu-gross'
				| 'zu-viele-zeilen'
				| 'kodierung'
				| 'anfuehrungszeichen'
				| 'keine-zeilen';
	  }
	| { grund: 'spalten'; unbekannt: string[]; fehlend: string[]; doppelt: string[] };

export type GueltigeZeile = { zeile: number; angaben: Angaben };

/** Fehler je Feld ohne den Wert; `zeile` für eine falsche Zahl der Felder. */
export type FehlerZeile = {
	zeile: number;
	name: string;
	fehler: Partial<Record<Feld | 'zeile', string>>;
};

export type Dateipruefung =
	{ ok: true; gueltig: GueltigeZeile[]; fehlerhaft: FehlerZeile[] } | ({ ok: false } & DateiFehler);

const MEHRFACH = 'kommt in der Datei mehrfach vor';
const MAX_NAME = 100;
const BEKANNT = new Set<string>(FELDER);

function pruefeKopf(kopf: string[]): DateiFehler | null {
	const unbekannt = [...new Set(kopf.filter((s) => !BEKANNT.has(s)))];
	const fehlend = PFLICHT_SPALTEN.filter((s) => !kopf.includes(s));
	const doppelt = [...new Set(kopf.filter((s, i) => kopf.indexOf(s) !== i))];
	if (unbekannt.length + fehlend.length + doppelt.length === 0) return null;
	return { grund: 'spalten', unbekannt, fehlend, doppelt };
}

/** Zeilen mit einem Wert, der in der Datei mehrfach vorkommt (ohne Gross-/Kleinschreibung). */
function mehrfache(zeilen: GueltigeZeile[], wert: (a: Angaben) => string | null): Set<number> {
	const nach = new Map<string, number[]>();
	for (const z of zeilen) {
		const w = wert(z.angaben)?.toLowerCase();
		if (w) nach.set(w, [...(nach.get(w) ?? []), z.zeile]);
	}
	return new Set([...nach.values()].filter((l) => l.length > 1).flat());
}

/** Prüft die Datei als Ganzes und jede Zeile mit derselben Prüfung wie das Formular. */
export function pruefeDatei(text: string, jahr: number): Dateipruefung {
	if (new TextEncoder().encode(text).length > MAX_BYTES) return { ok: false, grund: 'zu-gross' };
	// Excel speichert «CSV» ohne «UTF-8» in Windows-1252; der Browser macht aus Umlauten U+FFFD.
	if (text.includes('�')) return { ok: false, grund: 'kodierung' };
	const csv = leseCsv(text);
	if (!csv.ok) return { ok: false, grund: csv.grund };

	const kopf = [...csv.kopf];
	while (kopf.length > 0 && kopf.at(-1) === '') kopf.pop();
	const kopfFehler = pruefeKopf(kopf);
	if (kopfFehler) return { ok: false, ...kopfFehler };
	if (csv.zeilen.length === 0) return { ok: false, grund: 'keine-zeilen' };
	if (csv.zeilen.length > MAX_ZEILEN) return { ok: false, grund: 'zu-viele-zeilen' };

	const gueltig: GueltigeZeile[] = [];
	const fehlerhaft: FehlerZeile[] = [];
	for (const { nummer, felder } of csv.zeilen) {
		const roh = Object.fromEntries(kopf.map((s, i) => [s, felder[i] ?? '']));
		const name = `${(roh.vorname ?? '').trim()} ${(roh.nachname ?? '').trim()}`
			.trim()
			.slice(0, MAX_NAME);
		const zuViel = felder.slice(kopf.length).some((f) => f.trim() !== '');
		if (felder.length < kopf.length || zuViel) {
			const fehler = { zeile: `${felder.length} Felder statt ${kopf.length}` };
			fehlerhaft.push({ zeile: nummer, name, fehler });
			continue;
		}
		const p = pruefeAngaben(roh, { nummerPflicht: true, jahr });
		if (p.ok) gueltig.push({ zeile: nummer, angaben: p.angaben });
		else fehlerhaft.push({ zeile: nummer, name, fehler: p.fehler });
	}

	const nummern = mehrfache(gueltig, (a) => a.mitgliedernummer);
	const emails = mehrfache(gueltig, (a) => a.email);
	const eindeutig: GueltigeZeile[] = [];
	for (const z of gueltig) {
		if (!nummern.has(z.zeile) && !emails.has(z.zeile)) {
			eindeutig.push(z);
			continue;
		}
		const fehler: FehlerZeile['fehler'] = {};
		if (nummern.has(z.zeile)) fehler.mitgliedernummer = MEHRFACH;
		if (emails.has(z.zeile)) fehler.email = MEHRFACH;
		const name = `${z.angaben.vorname} ${z.angaben.nachname}`.slice(0, MAX_NAME);
		fehlerhaft.push({ zeile: z.zeile, name, fehler });
	}
	fehlerhaft.sort((a, b) => a.zeile - b.zeile);
	return { ok: true, gueltig: eindeutig, fehlerhaft };
}

export type Vorschau = {
	neu: { zeile: number; name: string }[];
	fehlerhaft: FehlerZeile[];
	vorhanden: { zeile: number; name: string; grund: 'nummer' | 'email' | 'beides' }[];
};

type Aufteilung = Vorschau & { anzulegen: Angaben[] };

/** Nur der Fehler der Datei, ohne `ok` oder `ergebnis` (für Antworten). */
export function nurFehler(f: DateiFehler): DateiFehler {
	return f.grund === 'spalten'
		? { grund: 'spalten', unbekannt: f.unbekannt, fehlend: f.fehlend, doppelt: f.doppelt }
		: { grund: f.grund };
}

// Bekannte Nummern und Adressen (klein) unter allen Mitgliedern, jeder Status: Wer schon da ist,
// wird nicht geändert (Abgleich erst in #46).
async function bekannte(db: DbOderTx, gueltig: GueltigeZeile[]) {
	const nummern = gueltig.flatMap((z) =>
		z.angaben.mitgliedernummer ? [z.angaben.mitgliedernummer.toLowerCase()] : []
	);
	const emails = gueltig.map((z) => z.angaben.email);
	const kleinNummer = sql<string>`lower(${mitglied.mitgliedernummer})`;
	const kleinEmail = sql<string>`lower(${mitglied.email})`;
	const [n, e] = await Promise.all([
		nummern.length
			? db.select({ wert: kleinNummer }).from(mitglied).where(inArray(kleinNummer, nummern))
			: [],
		db.select({ wert: kleinEmail }).from(mitglied).where(inArray(kleinEmail, emails))
	]);
	return { nummern: new Set(n.map((x) => x.wert)), emails: new Set(e.map((x) => x.wert)) };
}

async function teileAuf(
	db: DbOderTx,
	text: string,
	jetzt: Date
): Promise<({ ok: true } & Aufteilung) | ({ ok: false } & DateiFehler)> {
	const p = pruefeDatei(text, jahrInZuerich(jetzt));
	if (!p.ok) return p;
	const schon = await bekannte(db, p.gueltig);
	const neu: Vorschau['neu'] = [];
	const vorhanden: Vorschau['vorhanden'] = [];
	const anzulegen: Angaben[] = [];
	for (const { zeile, angaben } of p.gueltig) {
		const name = `${angaben.vorname} ${angaben.nachname}`.slice(0, MAX_NAME);
		const nummer = schon.nummern.has(angaben.mitgliedernummer?.toLowerCase() ?? '');
		const email = schon.emails.has(angaben.email);
		if (nummer || email) {
			vorhanden.push({
				zeile,
				name,
				grund: nummer && email ? 'beides' : nummer ? 'nummer' : 'email'
			});
		} else {
			neu.push({ zeile, name });
			anzulegen.push(angaben);
		}
	}
	return { ok: true, neu, fehlerhaft: p.fehlerhaft, vorhanden, anzulegen };
}

/** Vorschau in drei Gruppen; liest nur. */
export async function zeigeVorschau(
	db: DbOderTx,
	text: string,
	jetzt: Date
): Promise<({ ok: true } & Vorschau) | ({ ok: false } & DateiFehler)> {
	const a = await teileAuf(db, text, jetzt);
	if (!a.ok) return a;
	return { ok: true, neu: a.neu, fehlerhaft: a.fehlerhaft, vorhanden: a.vorhanden };
}

/**
 * FR-01: legt alle neuen Zeilen in einer Transaktion an (Mitglied und Konto ohne Brief-Code).
 * Die Datei wird dafür erneut geprüft; stimmt die Zahl der neuen Zeilen nicht mehr mit der
 * Vorschau überein (`erwartet`) oder kommt ein anderer zuvor, entsteht nichts (`veraltet`).
 */
export async function liesEin(
	db: Db,
	urheber: Urheber,
	text: string,
	erwartet: number,
	jetzt: Date
): Promise<
	| { ergebnis: 'ok'; angelegt: number }
	| { ergebnis: 'veraltet' }
	| ({ ergebnis: 'datei' } & DateiFehler)
> {
	const VERALTET = { ergebnis: 'veraltet' } as const;
	try {
		return await db.transaction(async (tx) => {
			const a = await teileAuf(tx, text, jetzt);
			if (!a.ok) return { ergebnis: 'datei' as const, ...nurFehler(a) };
			if (erwartet < 1 || a.anzulegen.length !== erwartet) return VERALTET;
			const ids = await tx.insert(mitglied).values(a.anzulegen).returning({ id: mitglied.id });
			await tx.insert(konto).values(ids.map(({ id }) => ({ mitgliedId: id })));
			await schreibeVerlaufFuer(
				tx,
				ids.map(({ id }) => id),
				urheber,
				{ aktion: 'angelegt', detail: 'einlesen' },
				jetzt
			);
			return { ergebnis: 'ok' as const, angelegt: ids.length };
		});
	} catch (fehler) {
		if (vergebenesFeld(fehler) !== null) return VERALTET;
		throw fehler;
	}
}
