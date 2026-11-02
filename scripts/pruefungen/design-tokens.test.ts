import { describe, expect, it } from 'vitest';
import { leseCssTokens, leseLeitbildTokens, pruefeDesignTokens } from './design-tokens.ts';

const LEITBILD = [
	'| Token | Wert | Verwendung |',
	'|-------|------|------------|',
	'| `--farbe-marke` | `#0f6b4f` | Kopfleiste |',
	'| `--schrift-text` | `system-ui, "Segoe UI", sans-serif` | Fliesstext |',
	'',
	'| Baustein | Klasse | Regel |',
	'|----------|--------|-------|',
	'| Haupttaste | `.taste-haupt` | eine pro Bildschirm |'
].join('\n');

const CSS = [
	':root {',
	'\t--farbe-marke: #0f6b4f; /* Annahme K-13.2 */',
	'\t--schrift-text: system-ui, "Segoe UI", sans-serif;',
	'}'
].join('\n');

describe('leseLeitbildTokens', () => {
	it('liest Token-Zeilen aus Markdown-Tabellen und ignoriert andere Tabellen', () => {
		expect(leseLeitbildTokens(LEITBILD)).toEqual(
			new Map([
				['--farbe-marke', '#0f6b4f'],
				['--schrift-text', 'system-ui, "Segoe UI", sans-serif']
			])
		);
	});
});

describe('leseCssTokens', () => {
	it('liest Tokens aus :root ohne Kommentare', () => {
		expect(leseCssTokens(CSS)).toEqual(
			new Map([
				['--farbe-marke', '#0f6b4f'],
				['--schrift-text', 'system-ui, "Segoe UI", sans-serif']
			])
		);
	});
});

describe('pruefeDesignTokens', () => {
	it('meldet nichts bei Übereinstimmung', () => {
		expect(pruefeDesignTokens(LEITBILD, CSS)).toEqual([]);
	});

	it('ignoriert Gross-/Kleinschreibung und Mehrfach-Leerzeichen im Wert', () => {
		const css = CSS.replace('#0f6b4f', '#0F6B4F').replace('system-ui, ', 'system-ui,   ');
		expect(pruefeDesignTokens(LEITBILD, css)).toEqual([]);
	});

	it('meldet abweichenden Wert mit Name und beiden Werten', () => {
		const befunde = pruefeDesignTokens(LEITBILD, CSS.replace('#0f6b4f', '#095d5d'));
		expect(befunde).toHaveLength(1);
		expect(befunde[0]).toContain('--farbe-marke');
		expect(befunde[0]).toContain('#0f6b4f');
		expect(befunde[0]).toContain('#095d5d');
	});

	it('meldet Token, das nur im Leitbild steht', () => {
		const befunde = pruefeDesignTokens(
			LEITBILD,
			CSS.replace('\t--farbe-marke: #0f6b4f; /* Annahme K-13.2 */\n', '')
		);
		expect(befunde).toHaveLength(1);
		expect(befunde[0]).toContain('--farbe-marke');
		expect(befunde[0]).toContain('tokens.css');
	});

	it('meldet Token, das nur in tokens.css steht', () => {
		const befunde = pruefeDesignTokens(LEITBILD, CSS.replace('}', '\t--radius: 10px;\n}'));
		expect(befunde).toHaveLength(1);
		expect(befunde[0]).toContain('--radius');
		expect(befunde[0]).toContain('ui-leitbild.md');
	});
});
