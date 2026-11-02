import { describe, expect, it } from 'vitest';
import { pruefeDesignFestwerte } from './design-festwerte.ts';

const css = (inhalt: string) => pruefeDesignFestwerte(new Map([['src/x.css', inhalt]]));
const svelte = (inhalt: string, pfad = 'src/routes/+page.svelte') =>
	pruefeDesignFestwerte(new Map([[pfad, inhalt]]));

describe('pruefeDesignFestwerte', () => {
	it.each([
		'.a { color: #fff; }',
		'.a { background: #a84f1f; }',
		'.a { color: rgb(0 0 0); }',
		'.a { color: rgba(0,0,0,.1); }',
		'.a { color: hsl(1 2% 3%); }',
		'.a { padding: 12px; }',
		'.a { font-size: 0.5px; }',
		'.a { color: white; }',
		'.a { background: black }',
		'.a { background: color-mix(in srgb, var(--a), var(--b)); }',
		'.a { color: light-dark(var(--a), var(--b)); }',
		'.a { font-size: 12pt; }',
		'.a { width: 3cm; }'
	])('meldet Festwert in CSS: %j', (inhalt) => {
		expect(css(inhalt)).toHaveLength(1);
	});

	it.each(['<div style="color: red">x</div>', '<div style:color={c}>x</div>'])(
		'meldet style-Attribut im Markup: %j',
		(inhalt) => {
			expect(svelte(inhalt)).toHaveLength(1);
		}
	);

	it('meldet Farbwert im style-Block einer Svelte-Datei mit Zeilennummer', () => {
		const befunde = svelte('<p>x</p>\n<style>\n\tp { color: #fff; }\n</style>', 'src/a.svelte');
		expect(befunde).toHaveLength(1);
		expect(befunde[0]).toContain('src/a.svelte:3');
	});

	it('meldet nichts bei Svelte-Blöcken, Ankern und Kommentaren', () => {
		expect(
			svelte(
				'{#each xs as x}{#if a}<a href="#inhalt">x</a>{/if}{/each}\n<style>\n\t/* 12px #fff */\n\tp { margin: 0; }\n</style>'
			)
		).toEqual([]);
	});

	it('meldet nichts bei Tokens und relativen Einheiten', () => {
		expect(
			css(
				'.a { padding: var(--abstand-2); font-size: 1rem; width: 100%; margin: 0; }\n@media (min-width: 60em) { .a { gap: 1em; } }'
			)
		).toEqual([]);
	});

	it('erlaubt Schlüsselwörter ohne eigene Farbe und Farbwörter in Selektoren', () => {
		expect(
			css(
				'.a { color: currentColor; background: transparent; border-color: inherit; fill: none; }\n.red:not(.white) { color: var(--farbe-text); }'
			)
		).toEqual([]);
	});

	it('hält die Zeilennummer trotz mehrzeiliger Kommentare', () => {
		expect(css('/*\n * Kommentar\n */\n.a { padding: 12px; }')[0]).toContain('src/x.css:4');
	});

	it('ignoriert tokens.css und Dateien ausserhalb von src/', () => {
		expect(
			pruefeDesignFestwerte(
				new Map([
					['src/lib/design/tokens.css', ':root { --farbe-marke: #0f6b4f; --radius: 10px; }'],
					['docs/ui-mockups/mockup.css', '.handy { width: 360px; border-color: #222; }'],
					['src/lib/x.ts', "const farbe = '#fff';"]
				])
			)
		).toEqual([]);
	});
});
