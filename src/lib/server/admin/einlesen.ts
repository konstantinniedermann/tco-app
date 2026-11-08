// A-MITGLIED-07, Etappe 2b: Mitglieder aus einer CSV-Datei im MyTCO-Schema einlesen. Die Datei
// lebt nur im Arbeitsspeicher; sie wird weder gespeichert noch geloggt (SI-05, DS-06).
import { FELDER, pruefeAngaben, type Angaben, type Feld } from './angaben.ts';
import { leseCsv } from './csv.ts';

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
