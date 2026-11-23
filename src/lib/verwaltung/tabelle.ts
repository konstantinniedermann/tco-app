// Baustein Tabellen-Steuerung (UI-Leitbild): Sortieren, Filtern, Adresse und Spaltenbreiten der
// langen Tabellen der Verwaltung. Rein gerechnet, ohne Svelte; den Zustand hält
// `tabellen-stand.svelte.ts`. Textfilter kommen nie in die Adresse (Datenschutz, #92).

export type Richtung = 'auf' | 'ab';
export type Sortierung = { spalte: string; richtung: Richtung } | null;

export type FilterArt =
	| { art: 'text' }
	/** Jahrgang als ganze Zahl, Zeit als ISO-Tag (JJJJ-MM-TT); beide Grenzen inklusiv. */
	| { art: 'bereich'; zahl: 'ganz' | 'datum' }
	| { art: 'werte'; werte: readonly { wert: string; text: string }[] };

export type FilterWert =
	| { art: 'text'; text: string }
	| { art: 'bereich'; von: string | null; bis: string | null }
	| { art: 'werte'; werte: readonly string[] };

export type Filter = Readonly<Record<string, FilterWert>>;

export type Breite = { start: number; min: number; max: number };

export type Spalte<Z> = {
	/** Auch der Name in der Adresse. */
	schluessel: string;
	titel: string;
	/** Fehlt: nicht sortierbar. */
	sortwert?: (z: Z) => string | number | null;
	filter?: FilterArt;
	/** Text, Zahl bzw. ISO-Tag oder die Werte der Zeile (Treffer = Schnittmenge). */
	filterwert?: (z: Z) => string | number | readonly string[] | null;
	/** In rem. */
	breite: Breite;
};

const VERGLEICH = new Intl.Collator('de-CH', { numeric: true, sensitivity: 'base' });

const leer = (w: unknown) => w === null || w === undefined || w === '';

function vergleiche(a: string | number, b: string | number): number {
	if (typeof a === 'number' && typeof b === 'number') return a - b;
	return VERGLEICH.compare(String(a), String(b));
}

/** Leere Werte stehen in beide Richtungen zuletzt; gleiche Werte behalten ihre Reihenfolge. */
export function sortiere<Z>(
	zeilen: readonly Z[],
	spalten: readonly Spalte<Z>[],
	s: Sortierung
): Z[] {
	const spalte = s ? spalten.find((x) => x.schluessel === s.spalte) : undefined;
	const wert = spalte?.sortwert;
	if (!s || !wert) return [...zeilen];
	const faktor = s.richtung === 'auf' ? 1 : -1;
	return zeilen
		.map((z, i) => ({ z, i, w: wert(z) }))
		.sort((a, b) => {
			const la = leer(a.w);
			const lb = leer(b.w);
			if (la || lb) return la === lb ? a.i - b.i : la ? 1 : -1;
			return faktor * vergleiche(a.w as string | number, b.w as string | number) || a.i - b.i;
		})
		.map((x) => x.z);
}

const klein = (t: string) => t.toLocaleLowerCase('de-CH');

function istAktiv(f: FilterWert): boolean {
	if (f.art === 'text') return f.text.trim() !== '';
	if (f.art === 'werte') return f.werte.length > 0;
	return f.von !== null || f.bis !== null;
}

function trifft<Z>(z: Z, spalte: Spalte<Z>, f: FilterWert): boolean {
	const w = spalte.filterwert?.(z);
	if (f.art === 'werte') {
		const werte = Array.isArray(w) ? (w as readonly string[]) : leer(w) ? [] : [String(w)];
		return werte.some((x) => f.werte.includes(x));
	}
	if (leer(w) || Array.isArray(w)) return false;
	if (f.art === 'text') return klein(String(w)).includes(klein(f.text.trim()));
	const zahl = spalte.filter?.art === 'bereich' && spalte.filter.zahl === 'ganz';
	const x = zahl ? Number(w) : String(w);
	const von = f.von === null ? null : zahl ? Number(f.von) : f.von;
	const bis = f.bis === null ? null : zahl ? Number(f.bis) : f.bis;
	return (von === null || x >= von) && (bis === null || x <= bis);
}

/** Mehrere Filter gelten zusammen (und). */
export function filtere<Z>(zeilen: readonly Z[], spalten: readonly Spalte<Z>[], f: Filter): Z[] {
	const aktiv = Object.entries(f).flatMap(([schluessel, wert]) => {
		const spalte = spalten.find((s) => s.schluessel === schluessel);
		return spalte?.filter && istAktiv(wert) ? [{ spalte, wert }] : [];
	});
	return zeilen.filter((z) => aktiv.every(({ spalte, wert }) => trifft(z, spalte, wert)));
}

/** Keine oder andere Spalte → aufsteigend, aufsteigend → absteigend, absteigend → aufsteigend. */
export function naechsteSortierung(s: Sortierung, spalte: string): Sortierung {
	return { spalte, richtung: s?.spalte === spalte && s.richtung === 'auf' ? 'ab' : 'auf' };
}

const SORT = 'sort';
const RICHTUNG = 'richtung';
const BIS = '..';

function gueltigerTag(t: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
	const d = new Date(`${t}T00:00:00Z`);
	return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t;
}

function grenze(art: 'ganz' | 'datum', t: string): string | null {
	if (art === 'ganz') return /^\d{1,4}$/.test(t) ? String(Number(t)) : null;
	return gueltigerTag(t) ? t : null;
}

/** Liest Sortierung, Häkchen- und Bereichsfilter; Unbekanntes und Kaputtes fällt still weg. */
export function ausAdresse<Z>(
	q: URLSearchParams,
	spalten: readonly Spalte<Z>[]
): { sortierung: Sortierung; filter: Filter } {
	const sortRoh = q.get(SORT);
	const sortSpalte = spalten.find((s) => s.schluessel === sortRoh && s.sortwert);
	const sortierung: Sortierung = sortSpalte
		? { spalte: sortSpalte.schluessel, richtung: q.get(RICHTUNG) === 'ab' ? 'ab' : 'auf' }
		: null;
	const filter: Record<string, FilterWert> = {};
	for (const s of spalten) {
		const roh = q.get(s.schluessel);
		if (roh === null || !s.filter) continue;
		if (s.filter.art === 'werte') {
			const erlaubt = new Set(s.filter.werte.map((w) => w.wert));
			const werte = roh.split(',').filter((w) => erlaubt.has(w));
			if (werte.length > 0) filter[s.schluessel] = { art: 'werte', werte };
		} else if (s.filter.art === 'bereich') {
			const teile = roh.split(BIS);
			if (teile.length !== 2) continue;
			const von = grenze(s.filter.zahl, teile[0]);
			const bis = grenze(s.filter.zahl, teile[1]);
			if (von !== null || bis !== null) filter[s.schluessel] = { art: 'bereich', von, bis };
		}
	}
	return { sortierung, filter };
}

/** Schreibt Sortierung und Häkchen-/Bereichsfilter; fremde Parameter bleiben, Text nie. */
export function inAdresse<Z>(
	q: URLSearchParams,
	spalten: readonly Spalte<Z>[],
	s: Sortierung,
	f: Filter
): URLSearchParams {
	const neu = new URLSearchParams(q);
	neu.delete(SORT);
	neu.delete(RICHTUNG);
	for (const spalte of spalten) neu.delete(spalte.schluessel);
	if (s) {
		neu.set(SORT, s.spalte);
		if (s.richtung === 'ab') neu.set(RICHTUNG, 'ab');
	}
	for (const spalte of spalten) {
		const wert = f[spalte.schluessel];
		if (!wert || !spalte.filter || !istAktiv(wert)) continue;
		if (wert.art === 'werte' && spalte.filter.art === 'werte')
			neu.set(spalte.schluessel, wert.werte.join(','));
		if (wert.art === 'bereich' && spalte.filter.art === 'bereich')
			neu.set(spalte.schluessel, `${wert.von ?? ''}${BIS}${wert.bis ?? ''}`);
	}
	return neu;
}

/** Steht etwas von dieser Tabelle in der Adresse (dann gilt die Adresse, nicht das Gedächtnis)? */
export function hatTabellenwerte<Z>(q: URLSearchParams, spalten: readonly Spalte<Z>[]): boolean {
	const a = ausAdresse(q, spalten);
	return a.sortierung !== null || Object.keys(a.filter).length > 0;
}

export const klemme = (rem: number, b: Breite): number => Math.min(b.max, Math.max(b.min, rem));

const speicherSchluessel = (tabelle: string) => `mytco.breiten.${tabelle}`;

/** Gespeicherte Breiten je Spalte, geklemmt; ohne oder mit kaputtem Speicher die Startbreite. */
export function ladeBreiten<Z>(
	tabelle: string,
	spalten: readonly Spalte<Z>[]
): Record<string, number> {
	let gespeichert: Record<string, unknown> = {};
	try {
		const roh = localStorage.getItem(speicherSchluessel(tabelle));
		const wert: unknown = roh === null ? {} : JSON.parse(roh);
		if (wert && typeof wert === 'object' && !Array.isArray(wert))
			gespeichert = wert as Record<string, unknown>;
	} catch {
		// Gesperrter oder kaputter Speicher: Startbreiten
	}
	return Object.fromEntries(
		spalten.map((s) => {
			const w = gespeichert[s.schluessel];
			return [
				s.schluessel,
				typeof w === 'number' && Number.isFinite(w) ? klemme(w, s.breite) : s.breite.start
			];
		})
	);
}

export function speichereBreiten(tabelle: string, breiten: Record<string, number>): void {
	try {
		localStorage.setItem(speicherSchluessel(tabelle), JSON.stringify(breiten));
	} catch {
		// Ohne Speicher gilt die Breite nur bis zum Neuladen
	}
}
