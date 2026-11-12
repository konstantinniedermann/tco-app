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
		"import { holeAdminDienste } from '../../../../../lib/server/dienste.ts';",
		"import { getMitglied } from '../../../../../lib/server/admin/schnittstellen.ts';",
		"import type { RequestHandler } from './$types';",
		'export const GET: RequestHandler = (e) => getMitglied(holeAdminDienste(), e);'
	].join('\n');
	const pruefe = (inhalt: string, weitere: [string, string][] = []) =>
		pruefeBauregel(new Map([liste, [route, inhalt], ...weitere]));
	it('jede +server.ts unter api/admin importiert nur aus dienste.ts und admin/schnittstellen.ts', () => {
		expect(pruefe(gut)).toEqual([]);
		for (const schlecht of [
			"import { holeDb } from '../../../lib/server/db/index.ts';",
			"import { listeMitglieder } from '../../../lib/server/admin/mitglieder.ts';",
			"import { x } from '../../../lib/server/dienste.ts.evil';",
			"export { y } from '../../../lib/server/login/dienst.ts';",
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
				"import { holeAdminDienste } from '../../../../lib/server/dienste.ts';",
				`import { ${namen} } from '../../../../lib/server/turnier/schnittstellen.ts';`,
				'export const GET = (e) => getTurniere(holeAdminDienste(), e);'
			].join('\n');
		const mit = (inhalt: string) =>
			pruefeBauregel(new Map([liste, turnierListe, [turnierRoute, inhalt]]));
		expect(mit(rumpf('getTurniere'))).toEqual([]);
		expect(mit(rumpf('getTurniere, hilfe'))).toEqual([
			`${turnierRoute}: Admin-Route nutzt 'hilfe'; erlaubt sind nur Einträge aus ADMIN_SCHNITTSTELLEN, TURNIER_SCHNITTSTELLEN und MITTEILUNG_ADMIN_SCHNITTSTELLEN`
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
				`import { ${dienst} } from '../../../../lib/server/dienste.ts';`,
				`import { ${namen} } from '../../../../lib/server/mitteilung/schnittstellen.ts';`,
				`export const GET = (e) => getVereinMitteilungen(${dienst}(), e);`,
				zeile
			].join('\n');
		const mit = (inhalt: string) => pruefeBauregel(new Map([liste, mListe, [mRoute, inhalt]]));
		/** Weitere Namen im Import aus dienste.ts, die Route nutzt weiter den Einstieg. */
		const mitImport = (namen: string) =>
			rumpf('getVereinMitteilungen').replace(
				'{ holeMitteilungAdminDienste }',
				`{ holeMitteilungAdminDienste, ${namen} }`
			);
		expect(mit(rumpf('getVereinMitteilungen'))).toEqual([]);
		// Die Schnittstellen der Mitglieder prüfen keine Verwaltungsrolle.
		expect(mit(rumpf('getVereinMitteilungen, postThemen'))).toEqual([
			`${mRoute}: Admin-Route nutzt 'postThemen'; erlaubt sind nur Einträge aus ADMIN_SCHNITTSTELLEN, TURNIER_SCHNITTSTELLEN und MITTEILUNG_ADMIN_SCHNITTSTELLEN`
		]);
		// Aus dienste.ts nur die Einstiege der Verwaltung, keiner der Mitglieder (Schritt 07).
		for (const fremd of ['holeMitteilungDienste', 'holeLoginDienst', 'holeCmDienste']) {
			expect(mit(mitImport(fremd))).toEqual([
				`${mRoute}: Admin-Route importiert '${fremd}' aus ../../../../lib/server/dienste.ts; erlaubt sind nur holeAdminDienste und holeMitteilungAdminDienste`
			]);
		}
		expect(
			mit(rumpf('getVereinMitteilungen', undefined, 'const db = holeMitteilungAdminDienste().db;'))
		).toEqual([
			`${mRoute}: holeMitteilungAdminDienste() nur direkt als erstes Argument einer Schnittstelle übergeben`
		]);
		// Beide Einstiege der Verwaltung kommen aus derselben Datei.
		expect(mit(mitImport('holeAdminDienste'))).toEqual([]);
		// Die Einstiege der Verwaltung kommen nur noch aus dienste.ts (Schritt 07).
		for (const alt of ['admin/index.ts', 'mitteilung/index.ts']) {
			const quer = rumpf('getVereinMitteilungen').replace('dienste.ts', alt);
			expect(mit(quer)).toEqual([
				`${mRoute}: Admin-Route importiert '../../../../lib/server/${alt}'; erlaubt sind nur dienste.ts und die Schnittstellen aus admin/, turnier/ und mitteilung/`
			]);
		}
	});
	it('RR-07: nur Funktionen aus ADMIN_SCHNITTSTELLEN (die der Rechte-Test abdeckt)', () => {
		const fremd = gut.replace('{ getMitglied }', '{ getMitglied, liest }');
		expect(pruefe(fremd)).toEqual([
			`${route}: Admin-Route nutzt 'liest'; erlaubt sind nur Einträge aus ADMIN_SCHNITTSTELLEN, TURNIER_SCHNITTSTELLEN und MITTEILUNG_ADMIN_SCHNITTSTELLEN`
		]);
		const umbenannt = gut
			.replace('{ getMitglied }', '{ getMitglied as get, postMitglied }')
			.replace('getMitglied(holeAdminDienste()', 'get(holeAdminDienste()');
		expect(pruefe(umbenannt)).toEqual([]);
		// Ein Kommentar mit Apostroph im Import verschluckt den Import nicht.
		const mitKommentar = gut.replace('{ getMitglied }', "{\n\tgetMitglied, // geht's\n\tliest\n}");
		expect(pruefe(mitKommentar)).toEqual([
			`${route}: Admin-Route nutzt 'liest'; erlaubt sind nur Einträge aus ADMIN_SCHNITTSTELLEN, TURNIER_SCHNITTSTELLEN und MITTEILUNG_ADMIN_SCHNITTSTELLEN`
		]);
		for (const schlecht of [
			"import * as s from '../../../../../lib/server/admin/schnittstellen.ts';",
			"import s from '../../../../../lib/server/admin/schnittstellen.ts';",
			"import { holeDb } from '../../../../../lib/server/dienste.ts';",
			"import * as d from '../../../../../lib/server/dienste.ts';"
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

describe('Einstiege der Verwaltung ausserhalb von api/admin (Schritt 07)', () => {
	const pfad = 'src/routes/api/profil/+server.ts';
	const gut = [
		"import { holeProfilDienste } from '../../../lib/server/dienste.ts';",
		"import { getProfil } from '../../../lib/server/profil/schnittstellen.ts';",
		'export const GET = (e) => getProfil(holeProfilDienste(), e);'
	].join('\n');
	it('RR-07: Mitglieder-Routen holen ihre Einstiege aus dienste.ts', () => {
		expect(pruefeBauregel(new Map([[pfad, gut]]))).toEqual([]);
	});
	// Heute schützte der Pfad lib/server/admin den Einstieg der Verwaltung; in dienste.ts schützt
	// ihn sein Name.
	it.each(['holeAdminDienste', 'holeMitteilungAdminDienste'])(
		'RR-07: keine Route ausserhalb von api/admin holt %s aus dienste.ts',
		(einstieg) => {
			const nutzt = `${pfad}: nur Routen unter src/routes/api/admin/ dürfen '${einstieg}' nutzen`;
			for (const zeile of [
				`import { ${einstieg} } from '../../../lib/server/dienste.ts';`,
				`import { holeProfilDienste, ${einstieg} as h } from '../../../lib/server/dienste.ts';`,
				`import { type holeProfilDienste, ${einstieg} } from '../../../lib/server/dienste.ts';`,
				`import { ${einstieg} } from '../../../lib/server/dienste';`,
				`import { ${einstieg} } from '../../../lib/server/dienste.js';`,
				`import { ${einstieg} } from '$lib/server/dienste';`,
				`import { ${einstieg} } from '$lib/server/dienste.ts';`,
				`export { ${einstieg} } from '../../../lib/server/dienste.ts';`
			]) {
				expect(pruefeBauregel(new Map([[pfad, `${gut}\n${zeile}`]])), zeile).toEqual([nutzt]);
			}
		}
	);
	// Ausserhalb von api/admin eine Erlaubt-Liste: Was nicht genau ein Einstieg der Mitglieder ist,
	// ist ein Befund (gesperrt im Zweifel).
	const fremd = (name: string) =>
		`${pfad}: aus dienste.ts nur Einstiege der Mitglieder, nicht '${name}'; erlaubt sind nur holeLoginDienst, holePasskeyDienst, holeProfilDienste, holeCmDienste, holeMitteilungDienste, holeAnlassDienste`;
	const mit = (zeile: string) => pruefeBauregel(new Map([[pfad, `${gut}\n${zeile}`]]));
	it('RR-07: ausserhalb von api/admin sind alle sechs Einstiege der Mitglieder erlaubt', () => {
		expect(
			mit(
				"import { holeLoginDienst, holePasskeyDienst as p, holeProfilDienste, holeCmDienste, holeMitteilungDienste, holeAnlassDienste } from '$lib/server/dienste';"
			)
		).toEqual([]);
	});
	it('RR-07: ein Kommentar statt Leerzeichen um as ist ein Befund', () => {
		// Ohne Kommentare liest die Prüfung «holeAdminDiensteash»: kein Einstieg der Mitglieder.
		expect(
			mit("import { holeAdminDienste/**/as/**/h } from '../../../lib/server/dienste.ts';")
		).toEqual([fremd('holeAdminDiensteash')]);
		expect(
			mit("import { holeProfilDienste/* x */as/* y */p } from '../../../lib/server/dienste.ts';")
		).toEqual([fremd('holeProfilDiensteasp')]);
	});
	it('RR-07: ein Unicode-Escape im Bezeichner ist ein Befund', () => {
		for (const name of ['holeAdminDienst\\u0065', 'holeProfilDienst\\u0065']) {
			expect(mit(`import { ${name} } from '../../../lib/server/dienste.ts';`), name).toEqual([
				fremd(name)
			]);
		}
		// Mit geschweifter Klammer liest die Prüfung keine Namensliste: ebenfalls ein Befund.
		expect(mit("import { holeAdminDienst\\u{65} } from '../../../lib/server/dienste.ts';")).toEqual(
			[`${pfad}: '../../../lib/server/dienste.ts' nur statisch und mit Namen importieren`]
		);
	});
	it('RR-07: ein Name, den dienste.ts heute nicht exportiert, ist ein Befund', () => {
		for (const name of ['holeBremsen', 'holeMailer', 'holeDb']) {
			const zeile = `import { ${name} as x } from '../../../lib/server/dienste.ts';`;
			expect(mit(zeile), zeile).toEqual([fremd(name)]);
		}
		expect(mit("import { type Bremsen } from '../../../lib/server/dienste.ts';")).toEqual([
			fremd('Bremsen')
		]);
	});
	it('RR-07: dienste.ts ausserhalb von api/admin nur statisch und mit Namen', () => {
		for (const [zeile, quelle] of [
			["import * as d from '../../../lib/server/dienste.ts';", '../../../lib/server/dienste.ts'],
			["import d from '$lib/server/dienste';", '$lib/server/dienste'],
			["export * from '../../../lib/server/dienste.ts';", '../../../lib/server/dienste.ts'],
			[
				"const d = await import('../../../lib/server/dienste.ts');",
				'../../../lib/server/dienste.ts'
			]
		]) {
			expect(pruefeBauregel(new Map([[pfad, `${gut}\n${zeile}`]])), zeile).toEqual([
				`${pfad}: '${quelle}' nur statisch und mit Namen importieren`
			]);
		}
	});
});

describe('Mitteilungen ausserhalb von api/admin', () => {
	const mListe: [string, string] = [
		'src/lib/server/mitteilung/schnittstellen.ts',
		'export const MITTEILUNG_ADMIN_SCHNITTSTELLEN = {\n\tgetVereinMitteilungen,\n\tpostVereinSenden\n} satisfies Record<string, AdminHandler>;'
	];
	const pfad = 'src/routes/api/benachrichtigungen/+server.ts';
	const pruefe = (inhalt: string) => pruefeBauregel(new Map([mListe, [pfad, inhalt]]));
	const gut = [
		"import { holeMitteilungDienste } from '../../../lib/server/dienste.ts';",
		"import { getBenachrichtigungen } from '../../../lib/server/mitteilung/schnittstellen.ts';",
		'export const GET = (e) => getBenachrichtigungen(holeMitteilungDienste(), e);'
	].join('\n');
	it('RR-07: Mitglieder-Routen nutzen die Dienste und Schnittstellen der Mitglieder', () => {
		expect(pruefe(gut)).toEqual([]);
	});
	it('RR-07: keine Dienste und Schnittstellen der Verwaltung ausserhalb von api/admin', () => {
		expect(
			pruefe(gut.replace('{ holeMitteilungDienste }', '{ holeMitteilungAdminDienste as h }'))
		).toEqual([
			`${pfad}: nur Routen unter src/routes/api/admin/ dürfen 'holeMitteilungAdminDienste' nutzen`
		]);
		expect(
			pruefe(
				gut.replace('{ getBenachrichtigungen }', '{ getBenachrichtigungen, postVereinSenden }')
			)
		).toEqual([`${pfad}: nur Routen unter src/routes/api/admin/ dürfen 'postVereinSenden' nutzen`]);
		expect(pruefe("import { holeMitteilungAdminDienste } from '$lib/server/dienste';")).toEqual([
			`${pfad}: nur Routen unter src/routes/api/admin/ dürfen 'holeMitteilungAdminDienste' nutzen`
		]);
		// Ohne Namen liesse sich nicht prüfen, was die Route nutzt.
		for (const quelle of [
			"import * as m from '../../../lib/server/dienste.ts';",
			"const m = await import('../../../lib/server/mitteilung/schnittstellen.ts');",
			"export * from '../../../lib/server/mitteilung/schnittstellen.ts';"
		]) {
			expect(pruefe(quelle)).toHaveLength(1);
		}
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
