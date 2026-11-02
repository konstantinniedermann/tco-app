import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { leseDateien, meldeErgebnis, versionierteDateien } from './dateien.ts';

// Annahmen zu offenen Fragen an den Verein (K-NN in docs/abklaerungen.md) stehen dort, wo sie
// wirken: «Annahme K-NN», «Vorschlag K-NN», «Vermutung K-NN» oder «hängt an K-NN», in Doku
// und Code-Kommentaren, dazu jeder Verweis in einem Markdown-Abschnitt «Offene Fragen». Steht
// die Frage unter «Beantwortet», schlägt die Prüfung fehl, bis jede Stelle aufgelöst ist.

export type Markierung = { pfad: string; zeile: number; id: string; text: string };
export type Fragenstand = { offen: Set<string>; beantwortet: Set<string>; fehler: string[] };

const ABKLAERUNGEN = 'docs/abklaerungen.md';
const ID = String.raw`K-\d+(?:\.\d+)?`;
const ID_GANZ = new RegExp(`^${ID}$`);
const ID_FREI = new RegExp(`(?<![\\w-])${ID}(?![\\w-]|\\.\\d)`, 'gi');
// Stichwort, danach Hervorhebung/Doppelpunkt, dann eine Liste von IDs — auch über Zeilenumbrüche.
const STICHWORT = new RegExp(
	String.raw`(?:Annahmen?|Vorschlag|Vermutung|hängt an)[*_:]*\s+[*_]*(${ID}(?:(?:\s*,\s*|\s+und\s+)${ID})*)`,
	'gi'
);
const TEXTDATEI = /\.(md|ts|js|svelte|sh|ya?ml|sql|html|json|example)$/;
const TEXTNAMEN = ['Dockerfile', 'Makefile'];
const HISTORIE = [ABKLAERUNGEN, 'docs/versionen.md', 'docs/beobachtungen.md'];
const HISTORIE_ORDNER = ['docs/superpowers/', 'docs/recherche/'];

const basis = (id: string) => id.replace(/\.\d+$/, '');

function tabellenzellen(zeile: string): string[] | undefined {
	if (!zeile.trimStart().startsWith('|')) return undefined;
	return zeile
		.trim()
		.replace(/^\||\|$/g, '')
		.split('|')
		.map((zelle) => zelle.trim());
}

/** Offene und beantwortete Fragen aus der ersten Tabellenspalte von abklaerungen.md. */
export function fragenstand(markdown: string): Fragenstand {
	const stand: Fragenstand = { offen: new Set(), beantwortet: new Set(), fehler: [] };
	let imBeantwortet = false;
	let beantwortetGefunden = false;
	markdown.split('\n').forEach((zeile, index) => {
		if (/^#{1,6} /.test(zeile)) {
			imBeantwortet = /^## Beantwortet\s*$/.test(zeile);
			beantwortetGefunden ||= imBeantwortet;
			return;
		}
		const erste = tabellenzellen(zeile)?.[0];
		if (erste === undefined || erste === 'ID' || /^:?-+:?$/.test(erste)) return;
		if (ID_GANZ.test(erste)) (imBeantwortet ? stand.beantwortet : stand.offen).add(erste);
		else if (imBeantwortet)
			stand.fehler.push(
				`${ABKLAERUNGEN}:${index + 1}: «${erste}» ist keine einzelne ID — eine Zeile pro Frage oder Unterfrage (K-16.2)`
			);
	});
	if (!beantwortetGefunden) stand.fehler.push(`${ABKLAERUNGEN}: Abschnitt «## Beantwortet» fehlt`);
	return stand;
}

type Abschnitt = 'normal' | 'offen' | 'historie';

/** Abschnitt jeder Zeile; nur Markdown hat Überschriften, Codeblöcke zählen nicht. */
function abschnitte(pfad: string, zeilen: string[]): Abschnitt[] {
	if (!pfad.endsWith('.md')) return zeilen.map(() => 'normal');
	let abschnitt: Abschnitt = 'normal';
	let imCode = false;
	return zeilen.map((zeile) => {
		if (/^\s*(```|~~~)/.test(zeile)) imCode = !imCode;
		const titel = !imCode && /^#{1,6} (.*)$/.exec(zeile)?.[1];
		if (titel)
			abschnitt = /Offene Fragen/i.test(titel)
				? 'offen'
				: /^Änderung/i.test(titel)
					? 'historie'
					: 'normal';
		return abschnitt;
	});
}

/** Alle Markierungen; Abschnitte «Änderungsprotokoll» und «Änderungen an …» sind Historie. */
export function sammleMarkierungen(dateien: Map<string, string>): Markierung[] {
	const markierungen: Markierung[] = [];
	for (const [pfad, inhalt] of dateien) {
		const zeilen = inhalt.split('\n');
		const abschnitt = abschnitte(pfad, zeilen);
		const gesehen = new Set<string>();
		const merke = (zeile: number, id: string) => {
			const schluessel = `${zeile}:${id.toUpperCase()}`;
			if (abschnitt[zeile - 1] === 'historie' || gesehen.has(schluessel)) return;
			gesehen.add(schluessel);
			markierungen.push({ pfad, zeile, id: id.toUpperCase(), text: zeilen[zeile - 1].trim() });
		};
		// Links wie [K-34](abklaerungen.md#…) zählen wie die blosse ID; Zeilenumbrüche bleiben.
		const text = inhalt.replace(new RegExp(`\\[(${ID})\\]\\([^)\\n]*\\)`, 'gi'), '$1');
		const zeileBei = (stelle: number) => text.slice(0, stelle).split('\n').length;
		for (const treffer of text.matchAll(STICHWORT)) {
			const listeAb = treffer.index + treffer[0].length - treffer[1].length;
			for (const id of treffer[1].matchAll(ID_FREI)) merke(zeileBei(listeAb + id.index), id[0]);
		}
		zeilen.forEach((zeile, index) => {
			if (abschnitt[index] !== 'offen') return;
			for (const id of zeile.matchAll(ID_FREI)) merke(index + 1, id[0]);
		});
	}
	return markierungen.sort((a, b) => a.pfad.localeCompare(b.pfad) || a.zeile - b.zeile);
}

function istBeantwortet(id: string, beantwortet: Set<string>): boolean {
	if (beantwortet.has(id) || beantwortet.has(basis(id))) return true;
	// Annahme zur ganzen Frage, aber eine Unterfrage ist schon beantwortet: ebenfalls anschauen.
	return id === basis(id) && [...beantwortet].some((b) => basis(b) === id);
}

export function pruefeAnnahmen(markierungen: Markierung[], stand: Fragenstand): string[] {
	const bekannt = new Set([...stand.offen, ...stand.beantwortet].map(basis));
	return [
		...stand.fehler,
		...markierungen.flatMap(({ pfad, zeile, id, text }) => {
			if (!bekannt.has(basis(id)))
				return [`${pfad}:${zeile}: ${id} steht nicht in ${ABKLAERUNGEN}`];
			if (istBeantwortet(id, stand.beantwortet))
				return [`${pfad}:${zeile}: ${id} ist beantwortet — Annahme prüfen und auflösen: «${text}»`];
			return [];
		})
	];
}

/** Ob eine Markierung zur gesuchten Frage gehört: Unterfrage oder die ganze Frage dazu. */
function gehoertZu(id: string, filter: string): boolean {
	const gesucht = filter.toUpperCase();
	return gesucht === basis(gesucht)
		? basis(id) === gesucht
		: id === gesucht || id === basis(gesucht);
}

/** Übersicht pro Frage, für den Abgleich, wenn eine Antwort eintrifft (make annahmen). */
export function liste(markierungen: Markierung[], filter?: string): string {
	const proFrage = new Map<string, Markierung[]>();
	for (const m of markierungen) {
		if (filter && !gehoertZu(m.id, filter)) continue;
		proFrage.set(m.id, [...(proFrage.get(m.id) ?? []), m]);
	}
	const reihenfolge = [...proFrage.keys()].sort((a, b) =>
		a.localeCompare(b, 'de', { numeric: true })
	);
	if (reihenfolge.length === 0) return filter ? `Keine Annahmen zu ${filter}.` : 'Keine Annahmen.';
	return reihenfolge
		.map((id) =>
			[id, ...proFrage.get(id)!.map((m) => `  ${m.pfad}:${m.zeile}  ${m.text}`)].join('\n')
		)
		.join('\n\n');
}

function gepruefteDateien(): string[] {
	return versionierteDateien().filter(
		(pfad) =>
			(TEXTDATEI.test(pfad) ||
				TEXTNAMEN.includes(basename(pfad)) ||
				basename(pfad).startsWith('Dockerfile') ||
				pfad.startsWith('.githooks/')) &&
			!HISTORIE.includes(pfad) &&
			!HISTORIE_ORDNER.some((ordner) => pfad.startsWith(ordner))
	);
}

if (import.meta.main) {
	const markierungen = sammleMarkierungen(leseDateien(gepruefteDateien()));
	const argumente = process.argv.slice(2);
	if (argumente[0] === '--liste') {
		console.log(liste(markierungen, argumente[1] || undefined));
		process.exit(0);
	}
	meldeErgebnis(
		'annahmen',
		pruefeAnnahmen(markierungen, fragenstand(readFileSync(ABKLAERUNGEN, 'utf-8')))
	);
}
