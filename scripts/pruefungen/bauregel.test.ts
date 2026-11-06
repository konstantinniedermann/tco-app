import { describe, expect, it } from 'vitest';
import { betrifftBauregel, pruefeBauregel } from './bauregel.ts';

describe('pruefeBauregel', () => {
	it('meldet Server-Dateien neben Seiten', () => {
		expect(pruefeBauregel(new Map([['src/routes/+page.server.ts', '']]))).toHaveLength(1);
		expect(pruefeBauregel(new Map([['src/routes/a/+layout.server.js', '']]))).toHaveLength(1);
	});
	it('lässt +server.ts zu', () => {
		expect(pruefeBauregel(new Map([['src/routes/api/x/+server.ts', '']]))).toEqual([]);
		expect(pruefeBauregel(new Map([['src/routes/api/x/+server.js', '']]))).toEqual([]);
	});
	it('meldet Form Actions', () => {
		expect(
			pruefeBauregel(new Map([['src/routes/+page.ts', 'export const actions = {}']]))
		).toHaveLength(1);
	});
	it.each([
		'export let actions = {}',
		'export var actions = {}',
		'export function actions() {}',
		'export async function actions() {}',
		'export { actions }',
		'export { x as actions }',
		'export { a, x as actions, b }',
		'export {\n\ta,\n\tactions\n}'
	])('meldet Form Actions als %j', (code) => {
		expect(pruefeBauregel(new Map([['src/routes/+page.ts', code]]))).toHaveLength(1);
	});
	it('meldet keine ähnlichen Namen', () => {
		expect(
			pruefeBauregel(
				new Map([['src/routes/+page.ts', 'export const actionsList = 1\nexport { other }']])
			)
		).toEqual([]);
	});
	it('meldet Remote Functions', () => {
		expect(pruefeBauregel(new Map([['src/lib/a.remote.ts', '']]))).toHaveLength(1);
		expect(pruefeBauregel(new Map([['src/routes/a.remote.js', '']]))).toHaveLength(1);
		expect(
			pruefeBauregel(
				new Map([['vite.config.ts', 'sveltekit({ experimental: { remoteFunctions: true } })']])
			)
		).toHaveLength(1);
		expect(
			pruefeBauregel(new Map([['svelte.config.js', 'export default { remoteFunctions: true }']]))
		).toHaveLength(1);
	});
	it('lässt eine saubere Konfiguration durch', () => {
		expect(pruefeBauregel(new Map([['vite.config.ts', 'sveltekit({})']]))).toEqual([]);
		expect(pruefeBauregel(new Map([['src/routes/+page.svelte', '<p>hi</p>']]))).toEqual([]);
	});
});

describe('Admin-Routen', () => {
	const route = 'src/routes/api/admin/mitglieder/[id]/+server.ts';
	const liste = [
		'src/lib/server/admin/schnittstellen.ts',
		[
			'export const ADMIN_SCHNITTSTELLEN = {',
			'\tgetMitglied,',
			'\tpostMitglied',
			'} satisfies Record<string, unknown>;'
		].join('\n')
	] as const;
	const gut = [
		"import { holeAdminDienste } from '../../../../../lib/server/admin/index.ts';",
		"import { getMitglied } from '../../../../../lib/server/admin/schnittstellen.ts';",
		"import type { RequestHandler } from './$types';",
		'export const GET: RequestHandler = (e) => getMitglied(holeAdminDienste(), e);'
	].join('\n');
	const pruefe = (inhalt: string, weitere: [string, string][] = []) =>
		pruefeBauregel(new Map([liste, [route, inhalt], ...weitere]));
	it('jede +server.ts unter api/admin importiert nur aus admin/index.ts und admin/schnittstellen.ts', () => {
		expect(pruefe(gut)).toEqual([]);
		for (const schlecht of [
			"import { holeDb } from '../../../lib/server/db/index.ts';",
			"import { listeMitglieder } from '../../../lib/server/admin/mitglieder.ts';",
			"import { x } from '../../../lib/server/admin/index.ts.evil';",
			"export { y } from '../../../lib/server/login/index.ts';",
			"import '../../../lib/server/db/schema.ts';"
		]) {
			expect(pruefe(`${gut}\n${schlecht}`)).toHaveLength(1);
		}
	});
	it('erkennt dynamische Importe in Admin-Routen', () => {
		for (const schlecht of [
			"const m = await import('../../../lib/server/db/index.ts');",
			'const m = await import("../../../lib/server/admin/mitglieder.ts");',
			"const m = await import(\n\t'../../../lib/server/db/schema.ts'\n);"
		]) {
			expect(pruefe(`${gut}\n${schlecht}`)).toHaveLength(1);
		}
		// Auch die Schnittstellen nicht dynamisch: Dann liesse sich nicht prüfen, welche Funktion
		// die Route nutzt.
		const dynamisch = "const m = await import('../../../lib/server/admin/schnittstellen.ts');";
		expect(pruefe(`${gut}\n${dynamisch}`)).toHaveLength(1);
	});

	it('RR-07: Einträge aus TURNIER_SCHNITTSTELLEN sind erlaubt, andere aus turnier/schnittstellen.ts nicht', () => {
		const turnierRoute = 'src/routes/api/admin/turniere/+server.ts';
		const turnierListe: [string, string] = [
			'src/lib/server/turnier/schnittstellen.ts',
			'export const TURNIER_SCHNITTSTELLEN = {\n\tgetTurniere\n} satisfies Record<string, unknown>;'
		];
		const rumpf = (namen: string) =>
			[
				"import { holeAdminDienste } from '../../../../lib/server/admin/index.ts';",
				`import { ${namen} } from '../../../../lib/server/turnier/schnittstellen.ts';`,
				'export const GET = (e) => getTurniere(holeAdminDienste(), e);'
			].join('\n');
		const mit = (inhalt: string) =>
			pruefeBauregel(new Map([liste, turnierListe, [turnierRoute, inhalt]]));
		expect(mit(rumpf('getTurniere'))).toEqual([]);
		expect(mit(rumpf('getTurniere, hilfe'))).toEqual([
			`${turnierRoute}: Admin-Route nutzt 'hilfe'; erlaubt sind nur Einträge aus ADMIN_SCHNITTSTELLEN`
		]);
	});
	it('RR-07: Mitteilungen der Verwaltung nur aus MITTEILUNG_ADMIN_SCHNITTSTELLEN mit ihren Diensten', () => {
		const mRoute = 'src/routes/api/admin/mitteilungen/+server.ts';
		const mListe: [string, string] = [
			'src/lib/server/mitteilung/schnittstellen.ts',
			'export const MITTEILUNG_ADMIN_SCHNITTSTELLEN = {\n\tgetVereinMitteilungen\n} satisfies Record<string, unknown>;'
		];
		const rumpf = (namen: string, dienst = 'holeMitteilungAdminDienste', zeile = '') =>
			[
				`import { ${dienst} } from '../../../../lib/server/mitteilung/index.ts';`,
				`import { ${namen} } from '../../../../lib/server/mitteilung/schnittstellen.ts';`,
				`export const GET = (e) => getVereinMitteilungen(${dienst}(), e);`,
				zeile
			].join('\n');
		const mit = (inhalt: string) => pruefeBauregel(new Map([liste, mListe, [mRoute, inhalt]]));
		expect(mit(rumpf('getVereinMitteilungen'))).toEqual([]);
		// Die Schnittstellen der Mitglieder prüfen keine Verwaltungsrolle.
		expect(mit(rumpf('getVereinMitteilungen, postThemen'))).toEqual([
			`${mRoute}: Admin-Route nutzt 'postThemen'; erlaubt sind nur Einträge aus ADMIN_SCHNITTSTELLEN`
		]);
		expect(mit(rumpf('getVereinMitteilungen', 'holeMitteilungDienste'))).toEqual([
			`${mRoute}: Admin-Route importiert 'holeMitteilungDienste' aus ../../../../lib/server/mitteilung/index.ts; erlaubt ist nur holeMitteilungAdminDienste`
		]);
		expect(
			mit(rumpf('getVereinMitteilungen', undefined, 'const db = holeMitteilungAdminDienste().db;'))
		).toEqual([
			`${mRoute}: holeMitteilungAdminDienste() nur direkt als erstes Argument einer Schnittstelle übergeben`
		]);
		// Aus admin/index.ts bleibt nur holeAdminDienste erlaubt.
		const quer = rumpf('getVereinMitteilungen').replace('mitteilung/index.ts', 'admin/index.ts');
		expect(mit(quer)).toEqual([
			`${mRoute}: Admin-Route importiert 'holeMitteilungAdminDienste' aus ../../../../lib/server/admin/index.ts; erlaubt ist nur holeAdminDienste`
		]);
	});
	it('RR-07: nur Funktionen aus ADMIN_SCHNITTSTELLEN (die der Rechte-Test abdeckt)', () => {
		const fremd = gut.replace('{ getMitglied }', '{ getMitglied, liest }');
		expect(pruefe(fremd)).toEqual([
			`${route}: Admin-Route nutzt 'liest'; erlaubt sind nur Einträge aus ADMIN_SCHNITTSTELLEN`
		]);
		const umbenannt = gut
			.replace('{ getMitglied }', '{ getMitglied as get, postMitglied }')
			.replace('getMitglied(holeAdminDienste()', 'get(holeAdminDienste()');
		expect(pruefe(umbenannt)).toEqual([]);
		// Ein Kommentar mit Apostroph im Import verschluckt den Import nicht.
		const mitKommentar = gut.replace('{ getMitglied }', "{\n\tgetMitglied, // geht's\n\tliest\n}");
		expect(pruefe(mitKommentar)).toEqual([
			`${route}: Admin-Route nutzt 'liest'; erlaubt sind nur Einträge aus ADMIN_SCHNITTSTELLEN`
		]);
		for (const schlecht of [
			"import * as s from '../../../../../lib/server/admin/schnittstellen.ts';",
			"import s from '../../../../../lib/server/admin/schnittstellen.ts';",
			"import { holeDb } from '../../../../../lib/server/admin/index.ts';"
		]) {
			expect(pruefe(`${gut}\n${schlecht}`)).toHaveLength(1);
		}
	});

	it('RR-07: holeAdminDienste() nur als erstes Argument einer Schnittstelle, nie die Datenbank daraus', () => {
		for (const schlecht of [
			'const db = holeAdminDienste().db;',
			'const { db } = holeAdminDienste();',
			"const x = holeAdminDienste()['db'];",
			'const h = holeAdminDienste;',
			'const raus = (d) => d.db;\nexport const POST = () => raus(holeAdminDienste()).execute();'
		]) {
			expect(pruefe(`${gut}\n${schlecht}`)).toEqual([
				`${route}: holeAdminDienste() nur direkt als erstes Argument einer Schnittstelle übergeben`
			]);
		}
	});

	it('RR-07: dynamischer Import mit berechnetem Pfad wird gemeldet', () => {
		const schlecht = "const p = '../../../lib/server/db/index.ts';\nconst m = await import(p);";
		expect(pruefe(`${gut}\n${schlecht}`)).toEqual([
			`${route}: Admin-Route lädt '(berechnet)' dynamisch; nur statische Importe`
		]);
		const ausserhalb = 'src/routes/api/x/+server.ts';
		expect(pruefeBauregel(new Map([[ausserhalb, 'const m = await import(p);']]))).toEqual([
			`${ausserhalb}: dynamischer Import mit berechnetem Pfad lässt sich nicht prüfen`
		]);
	});

	it('meldet eine fehlende Liste ADMIN_SCHNITTSTELLEN', () => {
		expect(pruefeBauregel(new Map([[route, gut]]))).toEqual([
			'src/lib/server/admin/schnittstellen.ts: ADMIN_SCHNITTSTELLEN nicht gefunden'
		]);
	});
	it('gilt nur unter api/admin', () => {
		const fremd = "import { holeDb } from '../../../lib/server/db/index.ts';";
		expect(pruefeBauregel(new Map([['src/routes/api/sitzung/+server.ts', fremd]]))).toEqual([]);
	});

	it('RR-07: ausserhalb von api/admin importiert keine Route aus lib/server/admin', () => {
		for (const [pfad, inhalt] of [
			[
				'src/routes/api/verwaltung/+server.ts',
				"import { holeAdminDienste } from '../../../lib/server/admin/index.ts';"
			],
			[
				'src/routes/verwaltung/+page.ts',
				"import { listeMitglieder } from '$lib/server/admin/mitglieder.ts';"
			],
			[
				'src/routes/api/x/+server.ts',
				"const m = await import('../../../lib/server/admin/rollen.ts');"
			],
			// Ordner-Import: Vite löst ihn auf index.ts auf.
			['src/routes/api/y/+server.ts', "import { holeAdminDienste } from '$lib/server/admin';"],
			[
				'src/routes/api/z/+server.ts',
				"import { holeAdminDienste } from '../../../lib/server/admin';"
			]
		]) {
			expect(pruefeBauregel(new Map([[pfad, inhalt]]))).toEqual([
				`${pfad}: nur Routen unter src/routes/api/admin/ dürfen lib/server/admin nutzen`
			]);
		}
		// Typen der Verwaltungsseiten (lib/verwaltung) sind kein Server-Zugriff.
		expect(
			pruefeBauregel(
				new Map([
					[
						'src/routes/verwaltung/+page.ts',
						"import { ladeMitglieder } from '../../lib/verwaltung/api.ts';"
					]
				])
			)
		).toEqual([]);
	});
});

describe('betrifftBauregel', () => {
	it.each([
		'src/routes/+page.ts',
		'vite.config.ts',
		'src/lib/a.remote.ts',
		'lib/b.remote.js',
		'src/lib/server/admin/schnittstellen.ts'
	])('prüft %s', (pfad) => {
		expect(betrifftBauregel(pfad)).toBe(true);
	});
	it('lässt andere Dateien aus', () => {
		expect(betrifftBauregel('src/lib/server/status.ts')).toBe(false);
	});
});
