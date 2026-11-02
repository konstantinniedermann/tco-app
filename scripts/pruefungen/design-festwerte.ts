import { leseDateien, meldeErgebnis, versionierteDateien } from './dateien.ts';

const TOKENS = 'src/lib/design/tokens.css';

const REGELN: { muster: RegExp; grund: string }[] = [
	{ muster: /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi, grund: 'Farbwert' },
	{ muster: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/gi, grund: 'Farbfunktion' },
	{ muster: /(?<![\w.])\d*\.?\d+px\b/gi, grund: 'px-Angabe' }
];

/** Ersetzt jedes Zeichen ausser Zeilenumbrüchen durch ein Leerzeichen (Zeilen bleiben erhalten). */
function leere(text: string): string {
	return text.replace(/[^\n]/g, ' ');
}

function ohneKommentare(css: string): string {
	return css.replace(/\/\*[\s\S]*?\*\//g, leere);
}

/** Nur die Inhalte der <style>-Blöcke, alles andere geleert. */
function styleBloecke(svelte: string): string {
	let ergebnis = '';
	let rest = svelte;
	for (;;) {
		const start = rest.search(/<style[^>]*>/);
		if (start < 0) return ergebnis + leere(rest);
		const oeffnen = rest.slice(start).indexOf('>') + start + 1;
		const ende = rest.indexOf('</style>', oeffnen);
		const schluss = ende < 0 ? rest.length : ende;
		ergebnis += leere(rest.slice(0, oeffnen)) + rest.slice(oeffnen, schluss);
		rest = rest.slice(schluss);
	}
}

/** Markup ohne <style>- und <script>-Blöcke. */
function markup(svelte: string): string {
	return svelte.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/g, leere);
}

function zeileVon(text: string, index: number): number {
	return text.slice(0, index).split('\n').length;
}

/**
 * Farbwerte, Farbfunktionen und px stehen in src/ nur in tokens.css; style-Attribute im
 * Markup sind verboten (UI-Leitbild, CSP). Befunde als `pfad:zeile: Grund «Treffer»`.
 */
export function pruefeDesignFestwerte(dateien: Map<string, string>): string[] {
	const befunde: string[] = [];
	for (const [pfad, inhalt] of dateien) {
		if (!pfad.startsWith('src/') || pfad === TOKENS) continue;
		const istSvelte = pfad.endsWith('.svelte');
		if (!istSvelte && !pfad.endsWith('.css')) continue;

		const stil = ohneKommentare(istSvelte ? styleBloecke(inhalt) : inhalt);
		for (const { muster, grund } of REGELN) {
			for (const treffer of stil.matchAll(muster)) {
				befunde.push(`${pfad}:${zeileVon(stil, treffer.index)}: ${grund} «${treffer[0]}»`);
			}
		}
		if (istSvelte) {
			const html = markup(inhalt);
			for (const treffer of html.matchAll(/\sstyle[=:]/g)) {
				befunde.push(`${pfad}:${zeileVon(html, treffer.index)}: style-Attribut`);
			}
		}
	}
	return befunde;
}

if (import.meta.main) {
	const pfade = versionierteDateien().filter((pfad) => /^src\/.*\.(css|svelte)$/.test(pfad));
	meldeErgebnis('design-festwerte', pruefeDesignFestwerte(leseDateien(pfade)));
}
