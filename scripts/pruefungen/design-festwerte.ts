import { leseDateien, meldeErgebnis, versionierteDateien } from './dateien.ts';

const TOKENS = 'src/lib/design/tokens.css';

const REGELN: { muster: RegExp; grund: string }[] = [
	{ muster: /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi, grund: 'Farbwert' },
	{
		muster: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/gi,
		grund: 'Farbfunktion'
	},
	{ muster: /(?<![\w.])\d*\.?\d+(?:px|pt|pc|cm|mm|in|q)\b/gi, grund: 'absolute Grösse' }
];

/** Benannte CSS-Farben (ohne transparent/currentColor, die keine eigene Farbe setzen). */
const FARBNAMEN = new Set(
	(
		'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue ' +
		'blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk ' +
		'crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki ' +
		'darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen ' +
		'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue ' +
		'dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite ' +
		'gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
		'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan ' +
		'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen ' +
		'lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen ' +
		'magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen ' +
		'mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream ' +
		'mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid ' +
		'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum ' +
		'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown ' +
		'seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen ' +
		'steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'
	).split(' ')
);

/** Farbnamen nur in Werten von Deklarationen (`eigenschaft: wert;`), nicht in Selektoren. */
function farbnamen(stil: string): { index: number; name: string }[] {
	const treffer: { index: number; name: string }[] = [];
	for (const dekl of stil.matchAll(/([a-z-]+)\s*:([^;{}]*)(?=[;}])/gi)) {
		const start = dekl.index + dekl[0].length - dekl[2].length;
		for (const wort of dekl[2].matchAll(/(?<![\w-])[a-z]+(?![\w-])/gi)) {
			if (FARBNAMEN.has(wort[0].toLowerCase())) {
				treffer.push({ index: start + wort.index, name: wort[0] });
			}
		}
	}
	return treffer;
}

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
		for (const { index, name } of farbnamen(stil)) {
			befunde.push(`${pfad}:${zeileVon(stil, index)}: Farbname «${name}»`);
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
