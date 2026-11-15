import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Prüft die Lint-Regel «kein Aufruf `fetch(…)` unter src/» (eslint.config.js, Schritt 20a in
// docs/refactoring-analyse.md, H-13): Seiten, Ladefunktionen und Bausteine holen Daten nur über die
// Abruf-Module ihres Themas, die `holen` an den Abruf-Baustein `src/lib/abruf.ts` weitergeben. Die
// Regel kennt keine erlaubte Stelle, auch `abruf.ts` ruft nur `holen(…)`. Die Grenzen der Regel
// stehen unten als eigene Fälle; sie sind bewusst nicht gefangen.

const eslint = new ESLint();

async function meldungen(datei: string, code: string): Promise<string[]> {
	const [ergebnis] = await eslint.lintText(code, { filePath: datei });
	return ergebnis.messages.filter((m) => m.ruleId === 'no-restricted-syntax').map((m) => m.message);
}

const svelte = (skript: string) => `<script lang="ts">\n${skript}\n</script>\n\n<p>Text</p>\n`;

describe('kein Aufruf fetch unter src/', () => {
	it.each([
		// Baustein und Ladefunktion: die zwei Fälle, für die es die Regel gibt.
		['src/lib/anlass/Neu.svelte', svelte("\tconst antwort = fetch('/api/anlass');")],
		[
			'src/routes/anlass/+page.ts',
			"export const load = async ({ fetch }) => {\n\tconst r = await fetch('/api/anlass');\n\treturn { r };\n};"
		],
		[
			'src/routes/anlass/+page.svelte',
			svelte("\tasync function neu() {\n\t\tawait fetch('/api/x');\n\t}")
		],
		['src/routes/+layout.ts', "export const load = ({ fetch }) => fetch('/api/sitzung');"],
		// Das Markup eines Bausteins: Ereignis und {#await}.
		['src/lib/anlass/Neu.svelte', "<button onclick={() => fetch('/api/anlass')}>Neu</button>\n"],
		[
			'src/routes/anlass/+page.svelte',
			"{#await fetch('/api/anlass') then antwort}\n\t<p>{antwort.status}</p>\n{/await}\n"
		],
		// Auch die Abruf-Module und der Abruf-Baustein: Sie rufen `holen`, nie `fetch`.
		['src/lib/anlass/api.ts', "export const hole = () => fetch('/api/anlass');"],
		['src/lib/abruf.ts', 'export const rufe = (pfad: string) => fetch(pfad);'],
		// Server, Service Worker und Tests unter src/: ohne Ausnahme.
		['src/lib/server/anlass/neu.ts', "export const x = () => fetch('https://example.org');"],
		['src/routes/api/neu/+server.ts', "export const GET = () => fetch('https://example.org');"],
		['src/service-worker/index.ts', "self.addEventListener('fetch', () => fetch('/x'));"],
		['src/hooks.client.ts', "fetch('/api/status');"],
		['src/lib/anlass/api.test.ts', "await fetch('/api/anlass');"],
		['src/lib/ui/neu.svelte.ts', "export const x = () => fetch('/x');"],
		['src/lib/ui/neu.js', "export const x = () => fetch('/x');"],
		// Schreibweisen desselben Aufrufs.
		['src/lib/anlass/neu.ts', "export const x = () => fetch?.('/x');"],
		['src/lib/anlass/neu.ts', "export const x = () => (fetch)('/x');"]
	])('meldet in %s: %s', async (datei, code) => {
		expect(await meldungen(datei, code)).toHaveLength(1);
	});

	it('die Meldung nennt den Weg für Oberfläche und Server und dass es keine Ausnahme gibt', async () => {
		const meldung =
			'Kein Aufruf von fetch unter src/. Oberfläche: Daten holen nur die Abruf-Module des Themas (src/lib/<thema>/) mit holen über src/lib/abruf.ts. Server und Service Worker: holen wird hineingereicht (im Server über die Dienste). Es gibt keine Ausnahme.';
		expect(await meldungen('src/lib/anlass/neu.ts', "fetch('/x');")).toEqual([meldung]);
		expect(
			await meldungen('src/lib/server/anlass/neu.ts', "export const x = () => fetch('/x');")
		).toEqual([meldung]);
	});

	it.each([
		// Weiterreichen ist der vorgesehene Weg: Vorgabe `holen = fetch`, Übergabe an ein Abruf-Modul.
		['src/lib/anlass/api.ts', "export const hole = (holen: typeof fetch = fetch) => holen('/x');"],
		['src/routes/anlass/+page.ts', 'export const load = ({ fetch }) => holeAnlaesse(fetch);'],
		['src/lib/abruf.ts', "export const rufe = (holen: typeof fetch) => holen('/x');"],
		// Name und Ereignis, kein Aufruf.
		['src/service-worker/index.ts', "self.addEventListener('fetch', () => {});"],
		['src/lib/anlass/neu.ts', "const fehler = new TypeError('Failed to fetch');"],
		// Ausserhalb von src/ gilt die Regel nicht (Skripte, E2E-Hilfen).
		['scripts/neu.ts', "await fetch('https://example.org');"],
		['tests/e2e/hilfen/neu.ts', "await fetch('http://127.0.0.1:58025/api/v1/messages');"]
	])('lässt in %s zu: %s', async (datei, code) => {
		expect(await meldungen(datei, code)).toEqual([]);
	});

	// Grenzen: Die Regel sucht den Namen `fetch` direkt vor der Klammer. Was ihn auf anderem Weg ruft,
	// fängt sie nicht; das hält nur das Review (Bericht zu Schritt 20a).
	it.each([
		['window.fetch', "window.fetch('/x');"],
		['globalThis.fetch', "globalThis.fetch('/x');"],
		['self.fetch', "self.fetch('/x');"],
		['ein weitergereichtes holen', "const holen = fetch;\nholen('/x');"],
		['fetch.call', "fetch.call(null, '/x');"],
		['fetch mit Typ-Zusatz', "(fetch as typeof fetch)('/x');\nfetch!('/x');"]
	])('fängt nicht: %s', async (_name, code) => {
		expect(await meldungen('src/lib/anlass/neu.ts', code)).toEqual([]);
	});

	// Das echte Repo, ohne Kommentare, die eine Regel abschalten: Ein `eslint-disable` für die Regel
	// zählt nicht, es gibt also auch keine Ausnahme per Kommentar.
	it('unter src/ steht kein Aufruf fetch, auch nicht hinter einem eslint-disable', async () => {
		const ohneKommentare = new ESLint({ allowInlineConfig: false });
		const ergebnisse = await ohneKommentare.lintFiles(['src']);
		const gefunden = ergebnisse.flatMap((e) =>
			e.messages
				.filter((m) => m.ruleId === 'no-restricted-syntax')
				.map((m) => `${e.filePath}:${m.line}`)
		);
		expect(gefunden).toEqual([]);
		expect(ergebnisse.length).toBeGreaterThan(100);
	}, 120_000);
});
