import { readFileSync } from 'node:fs';
import { leseDateien, meldeErgebnis, versionierteDateien } from './dateien.ts';

// Annahmen zu offenen Fragen an den Verein (K-NN in docs/abklaerungen.md) stehen dort, wo sie
// wirken: «Annahme K-NN», «Vorschlag K-NN» oder «hängt an K-NN», in Doku und Code-Kommentaren,
// dazu jeder Verweis in einem Abschnitt «Offene Fragen». Steht die Frage unter «Beantwortet»,
// schlägt die Prüfung fehl, bis jede Stelle angeschaut und aufgelöst ist.

export type Markierung = { pfad: string; zeile: number; id: string; text: string };
export type Fragenstand = { offen: Set<string>; beantwortet: Set<string> };

const ABKLAERUNGEN = 'docs/abklaerungen.md';
const ID = String.raw`K-\d+(?:\.\d+)?`;
const STICHWORT = new RegExp(
	String.raw`(?:Annahme|Vorschlag|hängt an)\s+(${ID}(?:(?:\s*,\s*|\s+und\s+)${ID})*)`,
	'g'
);
const EINZEL_ID = new RegExp(`(?<![\\w-])${ID}(?![\\w.-]*\\w)`, 'g');
const TEXTDATEI = /\.(md|ts|js|svelte|sh|ya?ml|sql|html|json)$/;
const HISTORIE = [ABKLAERUNGEN, 'docs/versionen.md', 'docs/beobachtungen.md'];
const HISTORIE_ORDNER = ['docs/superpowers/', 'docs/recherche/'];

const basis = (id: string) => id.replace(/\.\d+$/, '');

function ersteSpalte(zeile: string): string | undefined {
	if (!zeile.trimStart().startsWith('|')) return undefined;
	const zelle = zeile.trim().replace(/^\|/, '').split('|')[0]?.trim() ?? '';
	return new RegExp(`^${ID}$`).test(zelle) ? zelle : undefined;
}

/** Offene und beantwortete Fragen aus der ersten Tabellenspalte von abklaerungen.md. */
export function fragenstand(markdown: string): Fragenstand {
	const stand: Fragenstand = { offen: new Set(), beantwortet: new Set() };
	let imBeantwortet = false;
	for (const zeile of markdown.split('\n')) {
		if (/^#{1,6} /.test(zeile)) imBeantwortet = /^## Beantwortet\s*$/.test(zeile);
		const id = ersteSpalte(zeile);
		if (id) (imBeantwortet ? stand.beantwortet : stand.offen).add(id);
	}
	return stand;
}

/** Alle Markierungen; Abschnitte «Änderungsprotokoll» und «Änderungen an …» sind Historie. */
export function sammleMarkierungen(dateien: Map<string, string>): Markierung[] {
	const markierungen: Markierung[] = [];
	for (const [pfad, inhalt] of dateien) {
		let abschnitt: 'normal' | 'offen' | 'historie' = 'normal';
		inhalt.split('\n').forEach((text, index) => {
			const ueberschrift = /^#{1,6} (.*)$/.exec(text);
			if (ueberschrift) {
				const titel = ueberschrift[1];
				abschnitt = /Offene Fragen/i.test(titel)
					? 'offen'
					: /^Änderung/i.test(titel)
						? 'historie'
						: 'normal';
				return;
			}
			if (abschnitt === 'historie') return;
			const ids =
				abschnitt === 'offen'
					? [...text.matchAll(EINZEL_ID)].map((t) => t[0])
					: [...text.matchAll(STICHWORT)].flatMap((t) => t[1].match(new RegExp(ID, 'g')) ?? []);
			for (const id of ids) markierungen.push({ pfad, zeile: index + 1, id, text: text.trim() });
		});
	}
	return markierungen;
}

function istBeantwortet(id: string, beantwortet: Set<string>): boolean {
	if (beantwortet.has(id) || beantwortet.has(basis(id))) return true;
	// Annahme zur ganzen Frage, aber eine Unterfrage ist schon beantwortet: ebenfalls anschauen.
	return id === basis(id) && [...beantwortet].some((b) => basis(b) === id);
}

export function pruefeAnnahmen(markierungen: Markierung[], stand: Fragenstand): string[] {
	const bekannt = new Set([...stand.offen, ...stand.beantwortet].map(basis));
	return markierungen.flatMap(({ pfad, zeile, id, text }) => {
		if (!bekannt.has(basis(id))) return [`${pfad}:${zeile}: ${id} steht nicht in ${ABKLAERUNGEN}`];
		if (istBeantwortet(id, stand.beantwortet))
			return [`${pfad}:${zeile}: ${id} ist beantwortet — Annahme prüfen und auflösen: «${text}»`];
		return [];
	});
}

/** Übersicht pro Frage, für den Abgleich, wenn eine Antwort eintrifft (make annahmen). */
export function liste(markierungen: Markierung[], filter?: string): string {
	const proFrage = new Map<string, Markierung[]>();
	for (const m of markierungen) {
		if (filter && basis(m.id) !== basis(filter) && m.id !== filter) continue;
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

function geprueftDateien(): string[] {
	return versionierteDateien().filter(
		(pfad) =>
			TEXTDATEI.test(pfad) &&
			!HISTORIE.includes(pfad) &&
			!HISTORIE_ORDNER.some((ordner) => pfad.startsWith(ordner))
	);
}

if (import.meta.main) {
	const markierungen = sammleMarkierungen(leseDateien(geprueftDateien()));
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
