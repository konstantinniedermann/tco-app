import { readFileSync } from 'node:fs';
import { meldeErgebnis } from './dateien.ts';

const LEITBILD = 'docs/ui-leitbild.md';
const TOKENS = 'src/lib/design/tokens.css';

/** Gross/klein und Leerzeichen spielen beim Vergleich keine Rolle. */
function normalisiere(wert: string): string {
	return wert.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Tabellenzeilen mit genau einem `--token` in Zelle 1 und dem Wert in Backticks in Zelle 2. */
export function leseLeitbildTokens(markdown: string): Map<string, string> {
	const tokens = new Map<string, string>();
	for (const zeile of markdown.split('\n')) {
		if (!zeile.trimStart().startsWith('|')) continue;
		const zellen = zeile
			.trim()
			.replace(/^\||\|$/g, '')
			.split('|')
			.map((zelle) => zelle.trim());
		const name = /^`(--[a-z0-9-]+)`$/.exec(zellen[0] ?? '');
		const wert = /^`([^`]+)`$/.exec(zellen[1] ?? '');
		if (name && wert) tokens.set(name[1], wert[1]);
	}
	return tokens;
}

/** Deklarationen `--name: wert;` aus der Token-Datei, ohne Kommentare. */
export function leseCssTokens(css: string): Map<string, string> {
	const ohneKommentare = css.replace(/\/\*[\s\S]*?\*\//g, '');
	const tokens = new Map<string, string>();
	for (const treffer of ohneKommentare.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
		tokens.set(treffer[1], treffer[2].trim());
	}
	return tokens;
}

/** Leitbild und tokens.css müssen dieselben Tokens mit denselben Werten haben. */
export function pruefeDesignTokens(leitbild: string, css: string): string[] {
	const soll = leseLeitbildTokens(leitbild);
	const ist = leseCssTokens(css);
	const befunde: string[] = [];
	for (const [name, wert] of soll) {
		const cssWert = ist.get(name);
		if (cssWert === undefined) befunde.push(`${name} steht im Leitbild, fehlt in ${TOKENS}`);
		else if (normalisiere(cssWert) !== normalisiere(wert)) {
			befunde.push(`${name}: Leitbild «${wert}», ${TOKENS} «${cssWert}»`);
		}
	}
	for (const name of ist.keys()) {
		if (!soll.has(name)) befunde.push(`${name} steht in ${TOKENS}, fehlt in ${LEITBILD}`);
	}
	return befunde;
}

if (import.meta.main) {
	meldeErgebnis(
		'design-tokens',
		pruefeDesignTokens(readFileSync(LEITBILD, 'utf-8'), readFileSync(TOKENS, 'utf-8'))
	);
}
