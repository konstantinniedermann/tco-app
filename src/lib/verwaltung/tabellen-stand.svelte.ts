// Zustand des Bausteins Tabellen-Steuerung (UI-Leitbild, #92): ein Objekt je Seite. Sortierung,
// Filter und Suche kommen aus dem Gedächtnis des Tabs, sonst aus der Adresse; jede Änderung geht
// ins Gedächtnis und – ohne Text – in die Adresse, ohne die Seite neu zu laden (shallow).
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import type { Attachment } from 'svelte/attachments';
import {
	ausAdresse,
	filtere,
	klemme,
	ladeBreiten,
	naechsteSortierung,
	sortiere,
	speichereBreiten,
	suchteil,
	type Filter,
	type FilterWert,
	type Sortierung,
	type Spalte
} from './tabelle.ts';
import { erinnere, merke } from './tabellen-gedaechtnis.ts';

const TAG = /^(\d{4})-(\d{2})-(\d{2})$/;
const tagText = (iso: string) => iso.replace(TAG, '$3.$2.$1');

function bereichText(f: { von: string | null; bis: string | null }, datum: boolean): string {
	const von = f.von === null ? null : datum ? tagText(f.von) : f.von;
	const bis = f.bis === null ? null : datum ? tagText(f.bis) : f.bis;
	if (von !== null && bis !== null) return `${von} – ${bis}`;
	return von !== null ? `ab ${von}` : `bis ${bis}`;
}

/** Seiten mit Tabellen-Steuerung (UI-Leitbild). */
export type Tabellenseite = '/verwaltung/mitglieder' | '/verwaltung/briefe' | '/verwaltung/verlauf';

export class Tabellenstand<Z> {
	readonly tabelle: string;
	readonly pfad: Tabellenseite;
	readonly spalten: readonly Spalte<Z>[];
	sortierung = $state<Sortierung>(null);
	filter = $state<Filter>({});
	suche = $state('');
	breiten = $state<Record<string, number>>({});

	/** `url`: die sichtbare Adresse der Seite (`page.url`). */
	constructor(
		tabelle: string,
		pfad: Tabellenseite,
		spalten: readonly Spalte<Z>[],
		url: { readonly searchParams: Pick<URLSearchParams, 'get'> }
	) {
		this.tabelle = tabelle;
		this.pfad = pfad;
		this.spalten = spalten;
		const stand = erinnere(tabelle) ?? { ...ausAdresse(url.searchParams, spalten), suche: '' };
		this.sortierung = stand.sortierung;
		this.filter = stand.filter;
		this.suche = stand.suche ?? '';
		this.breiten = ladeBreiten(tabelle, spalten);
	}

	spalte(schluessel: string): Spalte<Z> | undefined {
		return this.spalten.find((s) => s.schluessel === schluessel);
	}

	/** Filtern, dann sortieren. */
	zeige(zeilen: readonly Z[]): Z[] {
		return sortiere(filtere(zeilen, this.spalten, this.filter), this.spalten, this.sortierung);
	}

	/** Ob ein Filter wirkt (für die Anzahl «N von M» und «Filter zurücksetzen»). */
	get gefiltert(): boolean {
		return this.woerter().length > 0;
	}

	sortiere(schluessel: string): void {
		this.sortierung = naechsteSortierung(this.sortierung, schluessel);
		this.sichere();
	}

	setzeFilter(schluessel: string, wert: FilterWert | undefined): void {
		const neu: Record<string, FilterWert> = { ...this.filter };
		if (wert === undefined) delete neu[schluessel];
		else neu[schluessel] = wert;
		this.filter = neu;
		this.sichere();
	}

	leereFilter(): void {
		this.filter = {};
		this.sichere();
	}

	/** Für die Suche über der Tabelle: nur ins Gedächtnis, nie in die Adresse. */
	setzeSuche(text: string): void {
		this.suche = text;
		this.sichere();
	}

	setzeBreite(schluessel: string, rem: number): void {
		const spalte = this.spalte(schluessel);
		if (!spalte) return;
		this.breiten = {
			...this.breiten,
			[schluessel]: klemme(Math.round(rem * 4) / 4, spalte.breite)
		};
		speichereBreiten(this.tabelle, this.breiten);
	}

	leereBreiten(): void {
		this.breiten = Object.fromEntries(this.spalten.map((s) => [s.schluessel, s.breite.start]));
		speichereBreiten(this.tabelle, this.breiten);
	}

	/** Setzt die Breite einer Spalte als `--breite` an ihr `<col>` (gelesen nur ab 60rem). */
	breite(schluessel: string): Attachment<HTMLElement> {
		return (el) => {
			el.style.setProperty('--breite', `${this.breiten[schluessel]}rem`);
		};
	}

	/** Summe der Breiten als `--tabellenbreite` an der `<table>`. */
	readonly gesamtbreite: Attachment<HTMLElement> = (el) => {
		const summe = this.spalten.reduce(
			(s, x) => s + (this.breiten[x.schluessel] ?? x.breite.start),
			0
		);
		el.style.setProperty('--tabellenbreite', `${summe}rem`);
	};

	/** Je aktiver Filter ein Wort: «Konto: Brief offen, ohne Brief», «Jahrgang: 2008 – 2014». */
	woerter(): { schluessel: string; text: string }[] {
		return this.spalten.flatMap((s) => {
			const f = this.filter[s.schluessel];
			if (!f || !s.filter) return [];
			let text: string | null = null;
			if (f.art === 'text' && f.text.trim() !== '') text = f.text.trim();
			if (f.art === 'werte' && f.werte.length > 0 && s.filter.art === 'werte') {
				const art = s.filter;
				text = art.werte
					.filter((w) => f.werte.includes(w.wert))
					.map((w) => w.text)
					.join(', ');
			}
			if (f.art === 'bereich' && (f.von !== null || f.bis !== null))
				text = bereichText(f, s.filter.art === 'bereich' && s.filter.zahl === 'datum');
			return text ? [{ schluessel: s.schluessel, text: `${s.titel}: ${text}` }] : [];
		});
	}

	/** Gedächtnis und Adresse nachführen; die Seite ruft es auch einmal beim Einhängen auf. */
	sichere(): void {
		merke(this.tabelle, { sortierung: this.sortierung, filter: this.filter, suche: this.suche });
		const alt = location.search.replace(/^\?/, '');
		const neu = suchteil(alt, this.spalten, this.sortierung, this.filter);
		if (neu === alt) return;
		// Shallow: nur die Adresse ändert sich, `load` läuft nicht erneut.
		const ziel: Tabellenseite | `${Tabellenseite}?${string}` =
			neu === '' ? this.pfad : `${this.pfad}?${neu}`;
		void goto(resolve(ziel), { shallow: true, replace: true });
	}
}
