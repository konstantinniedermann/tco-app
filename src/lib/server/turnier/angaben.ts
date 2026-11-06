// Angaben eines Turniers und seiner Kategorien prüfen, ohne Datenbank.
import { istStufe, staerker, type Stufe } from '../../turnier/klassierung.ts';
import type { Art, Geschlecht } from '../db/schema.ts';

export type TurnierFeld = 'jahr' | 'name' | 'anmeldeschluss' | 'nummern';

export type TurnierWerte = {
	jahr: number;
	name: string;
	anmeldeschluss: string;
	nummern: { bezeichnung: string; nummer: string }[];
};

export type KategorieFeld =
	| 'name'
	| 'geschlecht'
	| 'art'
	| 'jahrgangVon'
	| 'jahrgangBis'
	| 'klassierungVon'
	| 'klassierungBis'
	| 'mindestsumme';

export type KategorieWerte = {
	name: string;
	geschlecht: Geschlecht;
	art: Art;
	jahrgangVon: number | null;
	jahrgangBis: number | null;
	klassierungVon: Stufe | null;
	klassierungBis: Stufe | null;
	mindestsumme: number | null;
};

export const MAX_TURNIERNAME = 120;
export const MAX_KATEGORIENAME = 60;
export const MAX_BEZEICHNUNG = 60;
export const MAX_NUMMER = 12;
export const JAHR_MIN = 2020;
export const JAHR_MAX = 2100;
export const JAHRGANG_MIN = 1900;
export const SUMME_MAX = 20;

const MELDUNG = {
	name: 'Bitte einen Namen angeben.',
	turniername: `Höchstens ${MAX_TURNIERNAME} Zeichen.`,
	kategoriename: `Höchstens ${MAX_KATEGORIENAME} Zeichen.`,
	jahr: `Bitte ein Jahr zwischen ${JAHR_MIN} und ${JAHR_MAX} angeben.`,
	datum: 'Bitte ein Datum angeben.',
	schluss: 'Der Anmeldeschluss muss im Turnierjahr liegen.',
	nummern: 'Die Turniernummern kommen als Liste mit Bezeichnung und Nummer.',
	bezeichnung: `Bitte eine Bezeichnung angeben (höchstens ${MAX_BEZEICHNUNG} Zeichen).`,
	nummer: `Turniernummern bestehen nur aus Ziffern (höchstens ${MAX_NUMMER}).`,
	geschlecht: 'Bitte Herren, Damen, Mixed oder Offen wählen.',
	art: 'Bitte Einzel oder Doppel wählen.',
	mixed: 'Mixed gibt es nur im Doppel.',
	klassierung: 'Bitte eine Klassierung von N1 bis R9 wählen.',
	klassierungEnde: 'Das Ende darf nicht stärker sein als der Anfang.',
	summe: `Bitte eine Zahl von 0 bis ${SUMME_MAX} angeben.`,
	jahrgang: (bis: number) => `Bitte ein Jahr zwischen ${JAHRGANG_MIN} und ${bis} angeben.`,
	jahrgangEnde: 'Das Ende darf nicht vor dem Anfang liegen.'
} as const;

const GESCHLECHTER: readonly Geschlecht[] = ['herren', 'damen', 'mixed', 'offen'];
const ARTEN: readonly Art[] = ['einzel', 'doppel'];

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Ganze Zahl aus Zahl oder Zahlentext; leer = `null`; alles andere = `'ungueltig'`. */
function zahl(v: unknown): number | null | 'ungueltig' {
	if (v === undefined || v === null) return null;
	if (typeof v === 'number') return Number.isInteger(v) ? v : 'ungueltig';
	if (typeof v !== 'string') return 'ungueltig';
	const t = v.trim();
	if (t === '') return null;
	return /^\d{1,6}$/.test(t) ? Number(t) : 'ungueltig';
}

function istDatum(v: string): boolean {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
	if (!m) return false;
	const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
	return d.toISOString().slice(0, 10) === v;
}

function pruefeNummern(
	v: unknown
): { ok: true; liste: TurnierWerte['nummern'] } | { ok: false; meldung: string } {
	if (!Array.isArray(v)) return { ok: false, meldung: MELDUNG.nummern };
	const liste: TurnierWerte['nummern'] = [];
	for (const e of v) {
		if (typeof e !== 'object' || e === null) return { ok: false, meldung: MELDUNG.nummern };
		const bezeichnung = text((e as Record<string, unknown>).bezeichnung);
		const nummer = text((e as Record<string, unknown>).nummer);
		if (!bezeichnung || bezeichnung.length > MAX_BEZEICHNUNG)
			return { ok: false, meldung: MELDUNG.bezeichnung };
		if (!new RegExp(`^\\d{1,${MAX_NUMMER}}$`).test(nummer))
			return { ok: false, meldung: MELDUNG.nummer };
		liste.push({ bezeichnung, nummer });
	}
	return { ok: true, liste };
}

export function pruefeTurnier(
	roh: Record<string, unknown>
): { ok: true; werte: TurnierWerte } | { ok: false; felder: Partial<Record<TurnierFeld, string>> } {
	const felder: Partial<Record<TurnierFeld, string>> = {};
	const name = text(roh.name);
	const jahrRoh = zahl(roh.jahr);
	const jahr = typeof jahrRoh === 'number' ? jahrRoh : null;
	const anmeldeschluss = text(roh.anmeldeschluss);
	const nummern = pruefeNummern(roh.nummern);

	if (!name) felder.name = MELDUNG.name;
	else if (name.length > MAX_TURNIERNAME) felder.name = MELDUNG.turniername;
	if (jahr === null || jahr < JAHR_MIN || jahr > JAHR_MAX) felder.jahr = MELDUNG.jahr;
	if (!istDatum(anmeldeschluss)) felder.anmeldeschluss = MELDUNG.datum;
	else if (jahr !== null && Number(anmeldeschluss.slice(0, 4)) !== jahr)
		felder.anmeldeschluss = MELDUNG.schluss;
	if (!nummern.ok) felder.nummern = nummern.meldung;

	if (Object.keys(felder).length > 0 || jahr === null || !nummern.ok) return { ok: false, felder };
	return { ok: true, werte: { jahr, name, anmeldeschluss, nummern: nummern.liste } };
}

export function pruefeKategorie(
	roh: Record<string, unknown>,
	turnierjahr: number
):
	| { ok: true; werte: KategorieWerte }
	| { ok: false; felder: Partial<Record<KategorieFeld, string>> } {
	const felder: Partial<Record<KategorieFeld, string>> = {};
	const name = text(roh.name);
	const geschlecht = GESCHLECHTER.find((g) => g === roh.geschlecht);
	const art = ARTEN.find((a) => a === roh.art);

	if (!name) felder.name = MELDUNG.name;
	else if (name.length > MAX_KATEGORIENAME) felder.name = MELDUNG.kategoriename;
	if (!geschlecht) felder.geschlecht = MELDUNG.geschlecht;
	if (!art) felder.art = MELDUNG.art;
	if (geschlecht === 'mixed' && art === 'einzel') felder.geschlecht = MELDUNG.mixed;

	// Jahrgang von/bis: freiwillig, 1900 bis Turnierjahr, von ≤ bis.
	const jahrgang = (feld: 'jahrgangVon' | 'jahrgangBis'): number | null => {
		const z = zahl(roh[feld]);
		if (z === null) return null;
		if (z === 'ungueltig' || z < JAHRGANG_MIN || z > turnierjahr) {
			felder[feld] = MELDUNG.jahrgang(turnierjahr);
			return null;
		}
		return z;
	};
	const jahrgangVon = jahrgang('jahrgangVon');
	const jahrgangBis = jahrgang('jahrgangBis');
	if (
		jahrgangVon !== null &&
		jahrgangBis !== null &&
		jahrgangVon > jahrgangBis &&
		!felder.jahrgangBis
	)
		felder.jahrgangBis = MELDUNG.jahrgangEnde;

	let klassierungVon: Stufe | null = null;
	let klassierungBis: Stufe | null = null;
	let mindestsumme: number | null = null;

	if (art === 'einzel') {
		if (istStufe(roh.klassierungVon)) klassierungVon = roh.klassierungVon;
		else felder.klassierungVon = MELDUNG.klassierung;
		if (istStufe(roh.klassierungBis)) klassierungBis = roh.klassierungBis;
		else felder.klassierungBis = MELDUNG.klassierung;
		if (klassierungVon && klassierungBis && staerker(klassierungBis, klassierungVon))
			felder.klassierungBis = MELDUNG.klassierungEnde;
	} else if (art === 'doppel') {
		const z = zahl(roh.mindestsumme);
		if (z === null || z === 'ungueltig' || z > SUMME_MAX) felder.mindestsumme = MELDUNG.summe;
		else mindestsumme = z;
	}

	if (Object.keys(felder).length > 0 || !geschlecht || !art) return { ok: false, felder };
	return {
		ok: true,
		werte: {
			name,
			geschlecht,
			art,
			jahrgangVon,
			jahrgangBis,
			klassierungVon,
			klassierungBis,
			mindestsumme
		}
	};
}
