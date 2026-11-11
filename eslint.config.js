import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

// Richtung der Importe zwischen den Server-Modulen unter src/lib/server/ (Zielbild 6.1 Punkt 8 in
// docs/refactoring-analyse.md, Befund B-14). Ebenen von unten nach oben:
//   1. `db/` importiert aus dem Server nichts; die Dateien direkt unter `src/lib/server/` importieren
//      nur `db/` (dazu kommt mit Schritt 06 `http.ts`).
//   2. `login/` importiert kein Thema.
//   3. Die Themen importieren nicht die Schnittstellen-Dateien (`schnittstellen.ts`,
//      `passkey-schnittstellen.ts`) eines anderen Moduls.
// Nicht erfasst: Fachlogik-Importe zwischen Themen (z. B. `cm` → `admin/mitglieder.ts`), die
// `index.ts` der Module (Zusammenbau, Schritt 07), Importe zwischen `src/lib/server/` und dem Rest
// von `src/lib/` (B-25) und Tests (`*.test.ts` überspannen die Module von Berufs wegen).
// Jede heutige Verletzung steht einzeln in AUSNAHMEN, mit dem Schritt, der sie abbaut. Schritt 12
// leert die Liste und stellt die Regel damit scharf. Im Code unter `src/` steht dafür kein
// `eslint-disable`.
const SERVER = 'src/lib/server';
const THEMEN = ['admin', 'anlass', 'brief', 'cm', 'gespraech', 'mitteilung', 'profil', 'turnier'];
const JEDE_DATEI = '[^/]+';
const SCHNITTSTELLEN = '(?:passkey-)?schnittstellen';

const S06_HTTP = '06: antwort, formatFehler, istJson, leseKoerper, Ereignis wandern nach http.ts';

/**
 * Heutige Verletzungen: `von` und `nach` sind Dateien relativ zu src/lib/server/. `schritt` nennt den
 * Schritt aus docs/refactoring-analyse.md, der die Ausnahme abbaut, oder «bleibt: …» mit Grund.
 * @type {{ von: string; nach: string; schritt: string }[]}
 */
export const AUSNAHMEN = [
	{
		von: 'admin/ansicht.ts',
		nach: 'login/schnittstellen.ts',
		schritt: S06_HTTP
	},
	{
		von: 'admin/schnittstellen.ts',
		nach: 'login/schnittstellen.ts',
		schritt: S06_HTTP
	},
	{
		von: 'anlass/schnittstellen.ts',
		nach: 'login/schnittstellen.ts',
		schritt: S06_HTTP
	},
	{
		von: 'cm/schnittstellen.ts',
		nach: 'login/schnittstellen.ts',
		schritt: S06_HTTP
	},
	{
		von: 'gespraech/schnittstellen.ts',
		nach: 'login/schnittstellen.ts',
		schritt: S06_HTTP
	},
	{
		von: 'mitteilung/schnittstellen.ts',
		nach: 'login/schnittstellen.ts',
		schritt: S06_HTTP
	},
	{
		von: 'profil/schnittstellen.ts',
		nach: 'login/schnittstellen.ts',
		schritt: S06_HTTP
	},
	{
		von: 'turnier/schnittstellen.ts',
		nach: 'login/schnittstellen.ts',
		schritt: S06_HTTP
	},
	{
		von: 'gespraech/schnittstellen.ts',
		nach: 'cm/schnittstellen.ts',
		schritt:
			'06 für aendernd und mitSitzung; die Typen CmDienste und CmEreignis bleiben offen (Entscheid vor Schritt 12)'
	},
	{
		von: 'admin/schnittstellen.ts',
		nach: 'mitteilung/schnittstellen.ts',
		schritt:
			'ohne Schritt: Entscheid des Projektleiters vor Schritt 12 offen (der Typ MitteilungAdminDienste gehört weder zu 06 noch zu 09 bis 11)'
	},
	{
		von: 'gespraech/schnittstellen.ts',
		nach: 'mitteilung/schnittstellen.ts',
		schritt:
			'ohne Schritt: Entscheid des Projektleiters vor Schritt 12 offen (der Typ MitteilungAdminDienste gehört weder zu 06 noch zu 09 bis 11)'
	},
	{
		von: 'turnier/schnittstellen.ts',
		nach: 'mitteilung/schnittstellen.ts',
		schritt:
			'ohne Schritt: Entscheid des Projektleiters vor Schritt 12 offen (der Typ MitteilungAdminDienste gehört weder zu 06 noch zu 09 bis 11)'
	},
	{
		von: 'gespraech/schnittstellen.ts',
		nach: 'admin/schnittstellen.ts',
		schritt:
			'ohne Schritt: Entscheid des Projektleiters vor Schritt 12 offen (liest, schreibt und die Typen AdminDienste, AdminEreignis, AdminUrheber gehören weder zu 06 noch zu 09 bis 11)'
	},
	{
		von: 'mitteilung/schnittstellen.ts',
		nach: 'admin/schnittstellen.ts',
		schritt:
			'ohne Schritt: Entscheid des Projektleiters vor Schritt 12 offen (liest, schreibt und die Typen AdminDienste, AdminEreignis, AdminUrheber gehören weder zu 06 noch zu 09 bis 11)'
	},
	{
		von: 'turnier/schnittstellen.ts',
		nach: 'admin/schnittstellen.ts',
		schritt:
			'ohne Schritt: Entscheid des Projektleiters vor Schritt 12 offen (liest, schreibt und die Typen AdminDienste, AdminEreignis, AdminUrheber gehören weder zu 06 noch zu 09 bis 11)'
	},
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
 * Gruppe einer Quelldatei: wer wohin nicht importieren darf, als [Modul, Dateimuster].
 * @param {string} modul Ordner unter src/lib/server/, `.` für die Dateien direkt darunter
 * @returns {{ ebene: string; ziele: string[][] }}
 */
function gruppe(modul) {
	if (modul === 'db')
		return {
			ebene: 'db importiert aus dem Server nichts',
			ziele: [['', JEDE_DATEI], ...['login', ...THEMEN].map((m) => [m, JEDE_DATEI])]
		};
	if (modul === '.')
		return {
			ebene: 'Dateien direkt unter src/lib/server/ importieren nur db',
			ziele: ['login', ...THEMEN].map((m) => [m, JEDE_DATEI])
		};
	if (modul === 'login')
		return {
			ebene: 'login importiert kein Thema',
			ziele: THEMEN.map((m) => [m, JEDE_DATEI])
		};
	return {
		ebene: 'ein Thema importiert nicht die Schnittstellen eines anderen Moduls',
		ziele: ['login', ...THEMEN].filter((m) => m !== modul).map((m) => [m, SCHNITTSTELLEN])
	};
}

/**
 * Eine no-restricted-imports-Regel für Dateien dieser Gruppe; `frei` = Zieldateien mit Ausnahme.
 * @param {string} modul
 * @param {string[]} frei
 * @returns {import('eslint').Linter.RulesRecord}
 */
function regel(modul, frei) {
	const { ebene, ziele } = gruppe(modul);
	const vorsatz = modul === '.' ? '\\./' : '\\.\\./';
	return {
		'no-restricted-imports': [
			'error',
			{
				patterns: ziele.map(([ziel, dateien]) => {
					const erlaubt = frei
						.filter((f) => f.startsWith(`${ziel}/`))
						.map((f) =>
							f
								.slice(ziel.length + 1)
								.replace(/\.ts$/, '')
								.replace(/\./g, '\\.')
						);
					const ausser = erlaubt.length ? `(?!(?:${erlaubt.join('|')})(?:\\.ts)?$)` : '';
					return {
						regex: `^(?:\\$lib/server/|${vorsatz})${ziel ? `${ziel}/` : ''}${ausser}${dateien}(?:\\.ts)?$`,
						message: `Falsche Richtung: ${ebene}. Heutige Verletzungen stehen in AUSNAHMEN (eslint.config.js).`
					};
				})
			}
		]
	};
}

/** @param {string} datei */
const modulVon = (datei) => (datei.includes('/') ? datei.split('/')[0] : '.');
const MIT_AUSNAHME = [...new Set(AUSNAHMEN.map((a) => a.von))];

/** @type {import('eslint').Linter.Config[]} */
const importrichtung = [
	...['db', 'login', ...THEMEN].map((modul) => ({
		files: [`${SERVER}/${modul}/**/*.ts`],
		ignores: ['**/*.test.ts', ...MIT_AUSNAHME.map((v) => `${SERVER}/${v}`)],
		rules: regel(modul, [])
	})),
	{
		files: [`${SERVER}/*.ts`],
		ignores: ['**/*.test.ts', ...MIT_AUSNAHME.map((v) => `${SERVER}/${v}`)],
		rules: regel('.', [])
	},
	...MIT_AUSNAHME.map((von) => ({
		files: [`${SERVER}/${von}`],
		rules: regel(
			modulVon(von),
			AUSNAHMEN.filter((a) => a.von === von).map((a) => a.nach)
		)
	}))
];

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
	...importrichtung
);
