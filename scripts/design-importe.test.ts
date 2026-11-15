import { readdirSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { parse, parseCss } from 'svelte/compiler';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// Prüft, wo die Design-Dateien unter src/lib/design/ importiert werden (Schritt 20a in
// docs/refactoring-analyse.md, H-07; Übergangsregel «Ab Schritt 18»): nur im Wurzel-Layout,
// vollständig und in der Reihenfolge von REIHENFOLGE; `brief.css` nur im Briefdruck. Eine Datei im
// Ordner, die in der Liste fehlt, und ein Eintrag ohne Datei sind ein Befund. Gelesen werden alle
// Dateien unter src/ (auch Tests): Importe in Skripten und Svelte-Bausteinen (statisch, `export …
// from`, `import()`, mit `?raw` und ähnlichem; in Bausteinen auch `import()` im Markup), dazu
// `@import` in CSS. Kommentare und Texte zählen nicht. Nicht erfasst: `import.meta.glob`, ein
// berechneter Pfad, `<link>` im Markup und Lesen per `readFileSync`; die vier Mockups unter
// docs/ui-mockups/ und das Leitbild bleiben Handarbeit.

const DESIGN = 'src/lib/design/';
const LAYOUT = 'src/routes/+layout.svelte';
const BRIEFDRUCK = 'src/lib/verwaltung/Briefdruck.svelte';
const BRIEF = 'brief.css';

/**
 * Die Design-Dateien in der Reihenfolge ihrer Importe im Wurzel-Layout; spätere Regeln übersteuern
 * frühere. Für die Prüfung steht die Liste nur hier. Eine neue Datei kommt hier und im Layout an
 * ihre Stelle, dazu von Hand in den Kopf von grundlagen.css, die Mockups und das Leitbild.
 */
const REIHENFOLGE = [
	'tokens.css',
	'grundlagen.css',
	'rahmen.css',
	'bedienelemente.css',
	'karten.css',
	'verwaltung.css',
	'anleitung.css',
	'uebergaenge.css',
	'pc-layout.css',
	'druck.css',
	'verlauf.css'
];

const ENDUNGEN = /\.(?:svelte|ts|js|mts|cts|mjs|cjs|css)$/;

type Stelle = { start: number; end: number };

/** Importierte Pfade einer Datei in der Reihenfolge, in der sie stehen. */
function importeVon(pfad: string, inhalt: string): string[] {
	// Ein Stück Quelltext ab `ab` als Skript gelesen; `pos` zählt ab dem Anfang der Datei.
	const ausSkript = (text: string, ab = 0) =>
		ts
			.preProcessFile(text, true, true)
			.importedFiles.map((f) => ({ pos: ab + f.pos, quelle: f.fileName }));
	if (pfad.endsWith('.css'))
		return parseCss(inhalt)
			.children.filter((k) => k.type === 'Atrule' && k.name === 'import')
			.map((k) => (k as { prelude: string }).prelude)
			.map((p) => /^(?:url\(\s*)?['"]?([^'")\s]+)/.exec(p)?.[1] ?? p);
	if (pfad.endsWith('.svelte')) {
		const ast = parse(inhalt, { modern: true, filename: pfad });
		const skripte = [ast.module, ast.instance]
			.filter((s) => s !== null && s !== undefined)
			// Der Parser setzt Anfang und Ende auch am Programm; die ESTree-Typen kennen sie nicht.
			.map((s) => s.content as unknown as Stelle);
		// Im Markup gibt es nur `import(…)` ({#await import(…)}, onclick={() => import(…)}); jeder
		// solche Ausdruck wird wie ein Skript gelesen, damit dieselben Schreibweisen gelten.
		return [...skripte, ...importAusdruecke(ast.fragment)]
			.flatMap(({ start, end }) => ausSkript(inhalt.slice(start, end), start))
			.sort((a, b) => a.pos - b.pos)
			.map((s) => s.quelle);
	}
	return ausSkript(inhalt).map((s) => s.quelle);
}

/** Die Ausdrücke `import(…)` im Markup eines Bausteins (Svelte-AST), in jeder Tiefe. */
function importAusdruecke(knoten: unknown, gefunden: Stelle[] = []): Stelle[] {
	if (typeof knoten !== 'object' || knoten === null) return gefunden;
	const k = knoten as Partial<Stelle> & { type?: unknown };
	if (k.type === 'ImportExpression' && k.start !== undefined && k.end !== undefined)
		gefunden.push({ start: k.start, end: k.end });
	else for (const wert of Object.values(knoten)) importAusdruecke(wert, gefunden);
	return gefunden;
}

/** Datei unter src/lib/design/, auf die ein Import zeigt, sonst null. */
function designZiel(pfad: string, quelle: string): string | null {
	const ohneZusatz = quelle.replace(/[?#].*$/, '');
	let ziel: string;
	if (ohneZusatz.startsWith('$lib/')) ziel = `src/lib/${ohneZusatz.slice('$lib/'.length)}`;
	else if (ohneZusatz.startsWith('/')) ziel = ohneZusatz.slice(1);
	// In CSS ist auch `@import 'x.css'` relativ.
	else if (ohneZusatz.startsWith('.') || pfad.endsWith('.css'))
		ziel = posix.join(posix.dirname(pfad), ohneZusatz);
	else return null;
	ziel = posix.normalize(ziel);
	return ziel.startsWith(DESIGN) ? ziel.slice(DESIGN.length) : null;
}

/** Befunde für die Dateien unter src/ (Pfad relativ zum Repo → Inhalt). */
function pruefeDesignImporte(dateien: Map<string, string>): string[] {
	const befunde: string[] = [];
	const imOrdner = [...dateien.keys()]
		.filter((p) => p.startsWith(DESIGN) && p.endsWith('.css'))
		.map((p) => p.slice(DESIGN.length));
	const bekannt = [...REIHENFOLGE, BRIEF];
	for (const d of imOrdner.filter((d) => !bekannt.includes(d)))
		befunde.push(
			`${DESIGN}${d}: neue Design-Datei fehlt in REIHENFOLGE (scripts/design-importe.test.ts) und im Wurzel-Layout`
		);
	for (const d of bekannt.filter((d) => !imOrdner.includes(d)))
		befunde.push(`${DESIGN}${d}: steht in der Liste, die Datei fehlt`);
	for (const p of [LAYOUT, BRIEFDRUCK].filter((p) => !dateien.has(p))) befunde.push(`${p}: fehlt`);

	for (const [pfad, inhalt] of dateien) {
		const importiert = importeVon(pfad, inhalt)
			.map((q) => designZiel(pfad, q))
			.filter((d): d is string => d !== null);
		if (pfad === LAYOUT) befunde.push(...pruefeFolge(pfad, importiert, REIHENFOLGE));
		else if (pfad === BRIEFDRUCK) befunde.push(...pruefeFolge(pfad, importiert, [BRIEF]));
		else
			for (const d of importiert)
				befunde.push(
					`${pfad}: importiert ${DESIGN}${d}; Design-Dateien importiert nur ${LAYOUT}, ${BRIEF} nur ${BRIEFDRUCK}`
				);
	}
	return befunde;
}

/** Die Design-Importe einer Datei sind genau `soll`, in dieser Reihenfolge, jede einmal. */
function pruefeFolge(pfad: string, ist: string[], soll: string[]): string[] {
	const befunde: string[] = [];
	for (const d of soll.filter((d) => !ist.includes(d)))
		befunde.push(`${pfad}: Import von ${DESIGN}${d} fehlt`);
	for (const [i, d] of ist.entries())
		if (!soll.includes(d) || ist.indexOf(d) !== i)
			befunde.push(`${pfad}: Import von ${DESIGN}${d} ist zu viel`);
	if (befunde.length === 0 && ist.join() !== soll.join())
		befunde.push(`${pfad}: Design-Importe in der Folge ${ist.join(', ')} statt ${soll.join(', ')}`);
	return befunde;
}

// Gestellte Dateien für die Proben: der Ordner, das Layout und der Briefdruck wie heute, dazu ein
// Baustein ohne Design-Import.
const layout = (zeilen: string[]) =>
	`<script lang="ts">\n${zeilen.join('\n')}\n\timport { onMount } from 'svelte';\n</script>\n\n<main></main>\n`;
const importZeile = (d: string) => `\timport '../lib/design/${d}';`;
const LAYOUT_HEUTE = layout(REIHENFOLGE.map(importZeile));
const BRIEFDRUCK_HEUTE = `<script lang="ts">\n\timport '../design/brief.css';\n</script>\n\n<article class="brief"></article>\n`;

function gestellt(aenderung: Record<string, string | null> = {}): Map<string, string> {
	const dateien = new Map<string, string>([
		...[...REIHENFOLGE, BRIEF].map((d) => [`${DESIGN}${d}`, `/* ${d} */\n.x {\n}\n`] as const),
		[LAYOUT, LAYOUT_HEUTE],
		[BRIEFDRUCK, BRIEFDRUCK_HEUTE],
		['src/lib/ui/Karte.svelte', `<script lang="ts">\n\tlet { titel } = $props();\n</script>\n`]
	]);
	for (const [pfad, inhalt] of Object.entries(aenderung))
		if (inhalt === null) dateien.delete(pfad);
		else dateien.set(pfad, inhalt);
	return dateien;
}

const ohne = (d: string) => REIHENFOLGE.filter((x) => x !== d);

describe('Importe der Design-Dateien', () => {
	it('der gestellte Stand von heute hat keinen Befund', () => {
		expect(pruefeDesignImporte(gestellt())).toEqual([]);
	});

	describe('im Wurzel-Layout', () => {
		it('meldet zwei vertauschte Zeilen', () => {
			const folge = [...REIHENFOLGE];
			[folge[3], folge[4]] = [folge[4], folge[3]];
			expect(pruefeDesignImporte(gestellt({ [LAYOUT]: layout(folge.map(importZeile)) }))).toEqual([
				expect.stringContaining(`${LAYOUT}: Design-Importe in der Folge`)
			]);
		});

		it('meldet eine fehlende Zeile', () => {
			expect(
				pruefeDesignImporte(gestellt({ [LAYOUT]: layout(ohne('druck.css').map(importZeile)) }))
			).toEqual([`${LAYOUT}: Import von ${DESIGN}druck.css fehlt`]);
		});

		it.each([
			['eine Zeile als Kommentar', "\t// import '../lib/design/druck.css';"],
			['eine Zeile im Blockkommentar', "\t/* import '../lib/design/druck.css'; */"],
			['eine Zeile als Text', '\tconst pfad = "import \'../lib/design/druck.css\'";']
		])('zählt %s nicht als Import', (_fall, zeile) => {
			const zeilen = REIHENFOLGE.map((d) => (d === 'druck.css' ? zeile : importZeile(d)));
			expect(pruefeDesignImporte(gestellt({ [LAYOUT]: layout(zeilen) }))).toEqual([
				`${LAYOUT}: Import von ${DESIGN}druck.css fehlt`
			]);
		});

		it.each([
			['eine doppelte Zeile', [...REIHENFOLGE, 'karten.css'], 'karten.css'],
			['brief.css', [...REIHENFOLGE, BRIEF], BRIEF],
			['eine Datei ausserhalb der Liste', [...REIHENFOLGE, 'neu.css'], 'neu.css']
		])('meldet eine zusätzliche Zeile: %s', (_fall, folge, zuViel) => {
			expect(pruefeDesignImporte(gestellt({ [LAYOUT]: layout(folge.map(importZeile)) }))).toEqual([
				`${LAYOUT}: Import von ${DESIGN}${zuViel} ist zu viel`
			]);
		});

		it('meldet ein import() im Markup des Layouts als zusätzliche Zeile', () => {
			const mitMarkup = `${LAYOUT_HEUTE}{#await import('../lib/design/karten.css')}{/await}\n`;
			expect(pruefeDesignImporte(gestellt({ [LAYOUT]: mitMarkup }))).toEqual([
				`${LAYOUT}: Import von ${DESIGN}karten.css ist zu viel`
			]);
		});

		it('liest die Schreibweisen $lib, /src und ?raw als dieselbe Datei', () => {
			const zeilen = REIHENFOLGE.map((d, i) =>
				i === 1
					? `\timport '$lib/design/${d}';`
					: i === 2
						? `\timport '/src/lib/design/${d}';`
						: i === 3
							? `\timport stil from '../lib/design/${d}?inline';`
							: importZeile(d)
			);
			expect(pruefeDesignImporte(gestellt({ [LAYOUT]: layout(zeilen) }))).toEqual([]);
		});

		it('meldet ein fehlendes Layout', () => {
			expect(pruefeDesignImporte(gestellt({ [LAYOUT]: null }))).toEqual([`${LAYOUT}: fehlt`]);
		});
	});

	describe('ausserhalb des Wurzel-Layouts', () => {
		it.each([
			[
				'ein Baustein',
				'src/lib/ui/Karte.svelte',
				'<script lang="ts">\n\timport \'$lib/design/karten.css\';\n</script>\n'
			],
			[
				'ein Modul-Skript',
				'src/lib/ui/Karte.svelte',
				"<script module>\n\timport '../design/karten.css';\n</script>\n"
			],
			[
				'ein Unter-Layout',
				'src/routes/verwaltung/+layout.svelte',
				'<script lang="ts">\n\timport \'../../lib/design/verwaltung.css\';\n</script>\n'
			],
			[
				'eine Ladefunktion mit ?raw',
				'src/routes/hilfe/+page.ts',
				"import stil from '$lib/design/anleitung.css?raw';\nexport const load = () => ({ stil });"
			],
			[
				'ein dynamischer Import',
				'src/lib/ui/stil.ts',
				"export const lade = () => import('../design/druck.css');"
			],
			[
				'ein Weiterreichen',
				'src/lib/ui/stil.ts',
				"export { default } from '../design/druck.css?url';"
			],
			[
				'ein import() im Markup ({#await})',
				'src/lib/ui/Karte.svelte',
				'<script lang="ts">\n\tlet { titel } = $props();\n</script>\n\n{#await import(\'$lib/design/karten.css\')}\n\t<p>{titel}</p>\n{/await}\n'
			],
			[
				'ein import() in einem Ereignis im Markup',
				'src/lib/ui/Karte.svelte',
				"<button onclick={() => import('../design/druck.css')}>Drucken</button>\n"
			],
			['ein Test', 'src/lib/ui/stil.test.ts', "import '../design/druck.css';"],
			[
				'ein @import in einer Design-Datei',
				`${DESIGN}grundlagen.css`,
				"@import 'rahmen.css';\n.x {\n}\n"
			],
			['ein @import mit url()', `${DESIGN}verlauf.css`, '@import url("./druck.css") print;\n']
		])('meldet %s', (_fall, pfad, inhalt) => {
			const befunde = pruefeDesignImporte(gestellt({ [pfad]: inhalt }));
			expect(befunde).toHaveLength(1);
			expect(befunde[0]).toMatch(
				new RegExp(`^${pfad.replace(/[.+$]/g, '\\$&')}: importiert ${DESIGN}`)
			);
		});

		it('meldet brief.css an einer zweiten Stelle', () => {
			const zweit = 'src/lib/verwaltung/Zweitdruck.svelte';
			expect(pruefeDesignImporte(gestellt({ [zweit]: BRIEFDRUCK_HEUTE }))).toEqual([
				`${zweit}: importiert ${DESIGN}brief.css; Design-Dateien importiert nur ${LAYOUT}, ${BRIEF} nur ${BRIEFDRUCK}`
			]);
		});

		it('meldet einen Briefdruck ohne brief.css oder mit einer weiteren Design-Datei', () => {
			const ohneBrief = `<script lang="ts">\n\tlet x = 1;\n</script>\n`;
			expect(pruefeDesignImporte(gestellt({ [BRIEFDRUCK]: ohneBrief }))).toEqual([
				`${BRIEFDRUCK}: Import von ${DESIGN}brief.css fehlt`
			]);
			const mitTokens = `<script lang="ts">\n\timport '../design/tokens.css';\n\timport '../design/brief.css';\n</script>\n`;
			expect(pruefeDesignImporte(gestellt({ [BRIEFDRUCK]: mitTokens }))).toEqual([
				`${BRIEFDRUCK}: Import von ${DESIGN}tokens.css ist zu viel`
			]);
		});

		it.each([
			[
				'eine fremde CSS-Datei',
				"<script>\n\timport 'paket/stil.css';\n\timport './eigen.css';\n</script>\n"
			],
			['ein Pfad im Text', "<script>\n\tconst pfad = '../design/karten.css';\n</script>\n"],
			['ein import() als Text im Markup', "<p>import('../design/karten.css')</p>\n"],
			[
				'ein import() einer anderen Datei im Markup',
				"{#await import('./Teil.svelte') then Teil}\n\t<Teil.default />\n{/await}\n"
			],
			[
				'ein Pfad im Kommentar',
				"<script>\n\t// import '../design/karten.css';\n</script>\n<!-- import '../design/karten.css' -->\n"
			],
			[
				'Lesen per readFileSync',
				"<script>\n\tconst stil = readFileSync('src/lib/design/brief.css', 'utf-8');\n</script>\n"
			]
		])('lässt zu: %s', (_fall, inhalt) => {
			expect(pruefeDesignImporte(gestellt({ 'src/lib/ui/Karte.svelte': inhalt }))).toEqual([]);
		});
	});

	describe('der Ordner und die Liste', () => {
		it('meldet eine neue Design-Datei, die in der Liste fehlt', () => {
			expect(pruefeDesignImporte(gestellt({ [`${DESIGN}neu.css`]: '.neu {\n}\n' }))).toEqual([
				`${DESIGN}neu.css: neue Design-Datei fehlt in REIHENFOLGE (scripts/design-importe.test.ts) und im Wurzel-Layout`
			]);
		});

		it('meldet einen Eintrag der Liste ohne Datei', () => {
			expect(pruefeDesignImporte(gestellt({ [`${DESIGN}verlauf.css`]: null }))).toEqual([
				`${DESIGN}verlauf.css: steht in der Liste, die Datei fehlt`
			]);
		});

		it('die Liste nennt jede Datei einmal und brief.css nicht', () => {
			expect(new Set(REIHENFOLGE).size).toBe(REIHENFOLGE.length);
			expect(REIHENFOLGE).not.toContain(BRIEF);
		});
	});

	it('das echte Repo hat keinen Befund', () => {
		const dateien = new Map<string, string>();
		for (const eintrag of readdirSync('src', { recursive: true, encoding: 'utf-8' })) {
			const pfad = posix.join('src', eintrag.replaceAll('\\', '/'));
			if (ENDUNGEN.test(pfad)) dateien.set(pfad, readFileSync(pfad, 'utf-8'));
		}
		expect(dateien.size).toBeGreaterThan(100);
		expect(dateien.has(LAYOUT)).toBe(true);
		expect(pruefeDesignImporte(dateien)).toEqual([]);
	});
});
