import { readdirSync } from 'node:fs';
import { ESLint } from 'eslint';
import ts from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import { AUSNAHMEN, MODULE, baueImportrichtung } from '../eslint.config.js';

// Prüft die Lint-Regeln zur Richtung der Importe zwischen den Server-Modulen (eslint.config.js,
// Schritt 05/12 in docs/refactoring-analyse.md): dass sie falsche Importe melden, dass eine
// Ausnahme genau ihre Datei und ihr Ziel freigibt und dass keine Ausnahme veraltet ist.

const SERVER = 'src/lib/server';
const eslint = new ESLint();

async function meldungen(datei: string, code: string): Promise<string[]> {
	const [ergebnis] = await eslint.lintText(code, { filePath: `${SERVER}/${datei}` });
	return ergebnis.messages
		.filter((m) => m.ruleId === 'no-restricted-imports')
		.map((m) => m.message);
}

describe('Richtung der Importe zwischen den Server-Modulen', () => {
	// Dateien ohne Ausnahme: jede Schicht einmal.
	it.each([
		['anlass/neu.ts', "import { x } from '../cm/schnittstellen.ts';"],
		['anlass/neu.ts', "import { x } from '$lib/server/admin/schnittstellen';"],
		['anlass/neu.ts', "import type { X } from '../login/passkey-schnittstellen.ts';"],
		['anlass/neu.ts', "export { x } from '../turnier/schnittstellen.ts';"],
		['login/neu.ts', "import { x } from '../admin/rollen.ts';"],
		['datum.ts', "import { x } from './login/sitzung.ts';"],
		['db/neu.ts', "import { x } from '../datum.ts';"],
		['db/neu.ts', "import { x } from '../login/sitzung.ts';"],
		// Ordner-Import ohne Datei = index.ts des Moduls
		['login/neu.ts', "import { x } from '../admin';"],
		['login/neu.ts', "import { x } from '$lib/server/admin';"],
		['datum.ts', "import { x } from './admin';"],
		['db/neu.ts', "import { x } from '../admin';"],
		['db/neu.ts', "import { x } from '..';"],
		// Endung .js wie .ts
		['anlass/neu.ts', "import { x } from '../cm/schnittstellen.js';"],
		['login/neu.ts', "import { x } from '../admin/rollen.js';"]
	])('meldet in %s den Import %s', async (datei, code) => {
		// Mehr als eine Meldung ist möglich (`../admin` aus db: als Datei und als Modul).
		expect((await meldungen(datei, code)).length).toBeGreaterThan(0);
	});

	it.each([
		['anlass/neu.ts', "import { x } from '../cm/angaben.ts';"],
		['anlass/neu.ts', "import { x } from './schnittstellen.ts';"],
		['anlass/neu.ts', "import { x } from '../../turnier/zeit.ts';"],
		['login/neu.ts', "import { x } from '../db/index.ts';"],
		['datum.ts', "import { x } from './db/index.ts';"]
	])('lässt in %s den Import %s zu', async (datei, code) => {
		expect(await meldungen(datei, code)).toEqual([]);
	});

	// Oberste Schicht (Schritt 07): kein Modul unter src/lib/server/ importiert dienste.ts, auch eine
	// Datei mit Ausnahme nicht; die Meldung nennt dienste.ts (db meldet ihn mit seiner eigenen Regel).
	it.each([
		['anlass/neu.ts', "import { x } from '../dienste.ts';"],
		['anlass/neu.ts', "import { x } from '$lib/server/dienste';"],
		['anlass/neu.ts', "export { x } from '../dienste.js';"],
		['login/neu.ts', "import { x } from '../dienste.ts';"],
		['login/neu.ts', "import { x } from '../dienste';"],
		['datum.ts', "import { x } from './dienste.ts';"],
		['datum.ts', "import { x } from '$lib/server/dienste.js';"],
		['login/sitzung.ts', "import { x } from '../dienste.ts';"]
	])('meldet in %s den Import von dienste.ts: %s', async (datei, code) => {
		expect(await meldungen(datei, code)).toEqual([
			expect.stringContaining('kein Modul unter src/lib/server/ importiert dienste.ts')
		]);
	});

	it('meldet in db den Import von dienste.ts', async () => {
		expect((await meldungen('db/neu.ts', "import { x } from '../dienste.ts';")).length).toBe(1);
	});

	it.each([
		"import { x } from './login/dienst.ts';",
		"import { x } from './admin/zugang.ts';",
		"import { x } from './cm/schnittstellen.ts';",
		"import { x } from './login/passkey-schnittstellen.ts';"
	])('lässt in dienste.ts jeden Import zu: %s', async (code) => {
		expect(await meldungen('dienste.ts', code)).toEqual([]);
	});

	it('Tests sind von der Richtungsregel ausgenommen', async () => {
		expect(
			await meldungen('anlass/neu.test.ts', "import { x } from '../cm/schnittstellen.ts';")
		).toEqual([]);
	});

	it('eine Ausnahme gibt nur ihre Datei und ihr Ziel frei', async () => {
		// login/sitzung.ts → admin/rollen.ts ist Ausnahme (Schritt 10), aber kein anderes Admin-Ziel.
		expect(await meldungen('login/sitzung.ts', "import { x } from '../admin/rollen.ts';")).toEqual(
			[]
		);
		expect(
			await meldungen('login/sitzung.ts', "import { x } from '../admin/mitglieder.ts';")
		).toHaveLength(1);
		expect(await meldungen('login/neu.ts', "import { x } from '../admin/rollen.ts';")).toHaveLength(
			1
		);
	});

	it('db, login und die Themen sind genau die Ordner unter src/lib/server/', () => {
		const ordner = readdirSync(SERVER, { withFileTypes: true })
			.filter((e) => e.isDirectory())
			.map((e) => e.name)
			.sort();
		expect(ordner).toEqual([...MODULE].sort());
	});

	// Die Muster erfassen nur Dateien direkt in einem Modulordner (`../modul/datei`). Ein Unterordner
	// bräuchte Muster für beliebige Tiefe; das ist unverhältnismässig, solange es keinen gibt.
	it('unter den Modulordnern gibt es keine Unterordner', () => {
		for (const modul of MODULE) {
			const unter = readdirSync(`${SERVER}/${modul}`, { withFileTypes: true }).filter((e) =>
				e.isDirectory()
			);
			expect(
				unter.map((e) => e.name),
				`${modul}/`
			).toEqual([]);
		}
	});

	// Ohne die Ausnahme muss genau diese Datei wegen genau diesem Ziel gemeldet werden; ein
	// auskommentierter oder entfernter Import zählt nicht als «gebraucht».
	it.each(AUSNAHMEN.map((a) => [a.von, a.nach, a] as const))(
		'Ausnahme %s → %s ist noch nötig',
		async (von, nach, a) => {
			const ohne = new ESLint({
				overrideConfigFile: true,
				overrideConfig: [
					{ languageOptions: { parser: ts.parser } },
					...baueImportrichtung(AUSNAHMEN.filter((x) => x !== a))
				]
			});
			const [ergebnis] = await ohne.lintFiles([`${SERVER}/${von}`]);
			const ziel = nach.replace(/\.ts$/, '');
			const gemeldet = ergebnis.messages.some(
				(m) => m.ruleId === 'no-restricted-imports' && m.message.includes(`${ziel}`)
			);
			expect(gemeldet, `${von} importiert ${nach} nicht mehr: Ausnahme streichen`).toBe(true);
		}
	);

	it('jede Ausnahme nennt einen Schritt', () => {
		for (const a of AUSNAHMEN) expect(a.schritt, `${a.von} → ${a.nach}`).toMatch(/\S/);
	});
});
