import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

// Richtung der Importe zwischen den Server-Modulen unter src/lib/server/ (Zielbild 6.1 Punkt 8 in
// docs/refactoring-analyse.md, Befund B-14). Ebenen von unten nach oben:
//   1. `db/` importiert aus dem Server nichts; die Dateien direkt unter `src/lib/server/` importieren
//      nur `db/` (dazu gehört `http.ts`).
//   2. `login/` importiert kein Thema.
//   3. Die Themen importieren nicht die Schnittstellen-Dateien (`schnittstellen.ts` und jede
//      `<vorsatz>-schnittstellen.ts` wie `passkey-` oder `verwaltung-`) eines anderen Moduls.
//   4. `dienste.ts` (Zusammenbau der Dienste) ist die oberste Schicht, in beide Richtungen: Sie darf
//      alles importieren und steht darum in keinem Block, und kein Modul unter `src/lib/server/`
//      importiert sie (eigenes Muster in `gruppe()`; `db` meldet sie mit seiner eigenen Regel).
// Nicht erfasst: Fachlogik-Importe zwischen Themen (z. B. `cm` → `admin/mitglieder.ts`), nicht
// normalisierte Pfade wie `./../cm/…`, `import()`, Importe zwischen `src/lib/server/` und dem Rest
// von `src/lib/` (B-25) und Tests (`*.test.ts` überspannen die Module von Berufs wegen). Unterordner
// in Modulen gibt es nicht; der Test meldet sie.
// Jede heutige Verletzung steht einzeln in AUSNAHMEN, mit dem Schritt, der sie abbaut. Schritt 12
// leert die Liste und stellt die Regel damit scharf. Im Code unter `src/` steht dafür kein
// `eslint-disable`.
const SERVER = 'src/lib/server';
const THEMEN = ['admin', 'anlass', 'brief', 'cm', 'gespraech', 'mitteilung', 'profil', 'turnier'];
const JEDE_DATEI = '[^/]+';
// Vorsatz aus Kleinbuchstaben mit Bindestrich: `passkey-schnittstellen`, `verwaltung-schnittstellen`.
const SCHNITTSTELLEN = '(?:[a-z]+-)?schnittstellen';
const ENDUNG = '(?:\\.(?:ts|js))?';
const DIENSTE = 'dienste';

/** Alle Ordner unter src/lib/server/; der Test hält sie mit der Platte gleich. */
export const MODULE = ['db', 'login', ...THEMEN];

/**
 * Heutige Verletzungen: `von` und `nach` sind Dateien relativ zu src/lib/server/. `schritt` nennt den
 * Schritt aus docs/refactoring-analyse.md, der die Ausnahme abbaut, oder «bleibt: …» mit Grund.
 * Eine Ausnahme gilt je Datei und Zieldatei, nicht je importiertem Namen.
 * @type {{ von: string; nach: string; schritt: string }[]}
 */
export const AUSNAHMEN = [
	{
		von: 'turnier/schnittstellen.ts',
		nach: 'gespraech/schnittstellen.ts',
		schritt: '11: die Gesprächs-Schnittstellen ziehen von turnier nach gespraech'
	},
	{
		von: 'login/schnittstellen.ts',
		nach: 'admin/rollen.ts',
		schritt: '10: getSitzung wird ausserhalb von login gebaut'
	},
	{
		von: 'login/schnittstellen.ts',
		nach: 'gespraech/gespraech.ts',
		schritt: '10: getSitzung wird ausserhalb von login gebaut'
	},
	{
		von: 'login/sitzung.ts',
		nach: 'admin/rollen.ts',
		schritt: '10: nur der Typ AnsichtRolle; Schritt 10 muss ihn mitnehmen (nicht im Plan genannt)'
	}
];

/**
 * Gruppe einer Quelldatei: wer wohin nicht importieren darf. `ziele` sind [Modul, Dateimuster];
 * `ordner` heisst, dass auch der Import des Moduls ohne Datei (= seine index.ts) gemeldet wird;
 * `zusatz` sind weitere Muster für Importpfade, je mit der Ebene, die ihre Meldung nennt (ohne:
 * die Ebene der Gruppe).
 * @param {string} modul Ordner unter src/lib/server/, `.` für die Dateien direkt darunter
 * @returns {{ ebene: string; ziele: string[][]; ordner: boolean; zusatz: { regex: string; ebene?: string }[] }}
 */
function gruppe(modul) {
	if (modul === 'db')
		return {
			ebene: 'db importiert aus dem Server nichts',
			ziele: [['', JEDE_DATEI], ...['login', ...THEMEN].map((m) => [m, JEDE_DATEI])],
			ordner: true,
			zusatz: [{ regex: '^(?:\\.\\.|\\$lib/server)/?$' }]
		};
	// Oberste Schicht: Kein Modul importiert den Zusammenbau der Dienste (relativ, über $lib, .ts/.js).
	const vorsatz = modul === '.' ? '\\./' : '\\.\\./';
	const dienste = {
		regex: `^(?:\\$lib/server/|${vorsatz})${DIENSTE}${ENDUNG}$`,
		ebene: 'kein Modul unter src/lib/server/ importiert dienste.ts (oberste Schicht)'
	};
	if (modul === '.')
		return {
			ebene: 'Dateien direkt unter src/lib/server/ importieren nur db',
			ziele: ['login', ...THEMEN].map((m) => [m, JEDE_DATEI]),
			ordner: true,
			zusatz: [dienste]
		};
	if (modul === 'login')
		return {
			ebene: 'login importiert kein Thema',
			ziele: THEMEN.map((m) => [m, JEDE_DATEI]),
			ordner: true,
			zusatz: [dienste]
		};
	return {
		ebene: 'ein Thema importiert nicht die Schnittstellen eines anderen Moduls',
		ziele: ['login', ...THEMEN].filter((m) => m !== modul).map((m) => [m, SCHNITTSTELLEN]),
		ordner: false,
		zusatz: [dienste]
	};
}

/**
 * Eine no-restricted-imports-Regel für Dateien dieser Gruppe; `frei` = Zieldateien mit Ausnahme.
 * @param {string} modul
 * @param {string[]} frei
 * @returns {import('eslint').Linter.RulesRecord}
 */
function regel(modul, frei) {
	const { ebene, ziele, ordner, zusatz } = gruppe(modul);
	const vorsatz = modul === '.' ? '\\./' : '\\.\\./';
	/** @param {string} e */
	const meldung = (e) =>
		`Falsche Richtung: ${e}. Heutige Verletzungen stehen in AUSNAHMEN (eslint.config.js).`;
	const message = meldung(ebene);
	return {
		'no-restricted-imports': [
			'error',
			{
				patterns: [
					...ziele.map(([ziel, dateien]) => {
						const erlaubt = frei
							.filter((f) => f.startsWith(`${ziel}/`))
							.map((f) =>
								f
									.slice(ziel.length + 1)
									.replace(/\.ts$/, '')
									.replace(/\./g, '\\.')
							);
						const ausser = erlaubt.length ? `(?!(?:${erlaubt.join('|')})${ENDUNG}$)` : '';
						const datei = `${ziel ? `${ziel}/` : ''}${ausser}${dateien}${ENDUNG}`;
						const pfad = ordner && ziel ? `${ziel}(?:/${ausser}${dateien}${ENDUNG})?/?` : datei;
						return { regex: `^(?:\\$lib/server/|${vorsatz})${pfad}$`, message };
					}),
					...zusatz.map((z) => ({ regex: z.regex, message: meldung(z.ebene ?? ebene) }))
				]
			}
		]
	};
}

/** @param {string} datei */
const modulVon = (datei) => (datei.includes('/') ? datei.split('/')[0] : '.');

/**
 * Die Konfigurationsblöcke der Regel für eine Liste von Ausnahmen (der Test baut sie auch ohne eine).
 * @param {{ von: string; nach: string; schritt: string }[]} ausnahmen
 * @returns {import('eslint').Linter.Config[]}
 */
export function baueImportrichtung(ausnahmen) {
	const mitAusnahme = [...new Set(ausnahmen.map((a) => a.von))];
	// dienste.ts darf alles importieren (oberste Schicht) und steht darum in keinem Block.
	const ignores = [
		'**/*.test.ts',
		`${SERVER}/${DIENSTE}.ts`,
		...mitAusnahme.map((v) => `${SERVER}/${v}`)
	];
	return [
		...MODULE.map((modul) => ({
			files: [`${SERVER}/${modul}/**/*.ts`],
			ignores,
			rules: regel(modul, [])
		})),
		{ files: [`${SERVER}/*.ts`], ignores, rules: regel('.', []) },
		...mitAusnahme.map((von) => ({
			files: [`${SERVER}/${von}`],
			rules: regel(
				modulVon(von),
				ausnahmen.filter((a) => a.von === von).map((a) => a.nach)
			)
		}))
	];
}

export default defineConfig(
	{
		ignores: [
			'.svelte-kit/',
			'build/',
			'.e2e-build/',
			'coverage/',
			'node_modules/',
			'playwright-report/',
			'test-results/',
			'intern/',
			'.claude/',
			'.superpowers/'
		]
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		linterOptions: {
			reportUnusedDisableDirectives: 'error'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	...baueImportrichtung(AUSNAHMEN)
);
