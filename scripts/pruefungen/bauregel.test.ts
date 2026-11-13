import { describe, expect, it } from 'vitest';
import { betrifftBauregel, betrifftRechteImporte, pruefeBauregel } from './bauregel.ts';

// Die Meldungstexte mit der Menge der Verwaltungs-Listen, einmal für alle Fälle.
const LISTEN =
	'erlaubt sind nur Einträge aus ADMIN_SCHNITTSTELLEN, TURNIER_SCHNITTSTELLEN, CM_ADMIN_SCHNITTSTELLEN, GESPRAECH_ADMIN_SCHNITTSTELLEN, MITTEILUNG_ADMIN_SCHNITTSTELLEN und ANLASS_ADMIN_SCHNITTSTELLEN';
const DATEIEN =
	'erlaubt sind nur dienste.ts, admin/schnittstellen.ts, turnier/schnittstellen.ts, cm/verwaltung-schnittstellen.ts, gespraech/verwaltung-schnittstellen.ts, mitteilung/verwaltung-schnittstellen.ts und anlass/verwaltung-schnittstellen.ts';
const VERWALTUNG =
	'liest, schreibt und mitKonto nur in admin/schnittstellen.ts, turnier/schnittstellen.ts, cm/verwaltung-schnittstellen.ts, gespraech/verwaltung-schnittstellen.ts, mitteilung/verwaltung-schnittstellen.ts und anlass/verwaltung-schnittstellen.ts';
/** Befund der Regel für die Rechteprüfung in einer Datei ausserhalb der Tabelle. */
const rechteBefund = (pfad: string, name: string) =>
	`${pfad}: '${name}' aus admin/rechte.ts; ${VERWALTUNG}`;

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
	// Schritt 12a, Punkt 3 (N-05): Namen in Anführungszeichen (ES2022) und Namen mit Escape.
	it.each([
		"export { x as 'actions' }",
		'export { x as "actions" }',
		"export { a, x as 'actions', b }",
		"export { 'actions' } from './a.ts'",
		"export { x as 'acti\\u006fns' }",
		'export { x as acti\\u006fns }'
	])('meldet Form Actions mit Namen in Anführungszeichen oder Escape als %j', (code) => {
		expect(pruefeBauregel(new Map([['src/routes/+page.ts', code]]))).toEqual([
			'src/routes/+page.ts: Form Actions sind nicht vorgesehen'
		]);
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
			`${turnierRoute}: Admin-Route nutzt 'hilfe'; ${LISTEN}`
		]);
	});
	it('RR-07: Mitteilungen der Verwaltung nur aus MITTEILUNG_ADMIN_SCHNITTSTELLEN mit ihren Diensten', () => {
		const mRoute = 'src/routes/api/admin/mitteilungen/+server.ts';
		const mListe: [string, string] = [
			'src/lib/server/mitteilung/verwaltung-schnittstellen.ts',
			'export const MITTEILUNG_ADMIN_SCHNITTSTELLEN = {\n\tgetVereinMitteilungen\n} satisfies Record<string, unknown>;'
		];
		const rumpf = (namen: string, dienst = 'holeMitteilungAdminDienste', zeile = '') =>
			[
				`import { ${dienst} } from '../../../../lib/server/dienste.ts';`,
				`import { ${namen} } from '../../../../lib/server/mitteilung/verwaltung-schnittstellen.ts';`,
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
			`${mRoute}: Admin-Route nutzt 'postThemen'; ${LISTEN}`
		]);
		// Die Datei der Mitglieder ist für Admin-Routen keine erlaubte Quelle (Schritt 11).
		const mitglieder =
			"import { postThemen } from '../../../../lib/server/mitteilung/schnittstellen.ts';";
		expect(mit(`${rumpf('getVereinMitteilungen')}\n${mitglieder}`)).toEqual([
			`${mRoute}: Admin-Route importiert '../../../../lib/server/mitteilung/schnittstellen.ts'; ${DATEIEN}`
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
				`${mRoute}: Admin-Route importiert '../../../../lib/server/${alt}'; ${DATEIEN}`
			]);
		}
	});
	it('RR-07: nur Funktionen aus ADMIN_SCHNITTSTELLEN (die der Rechte-Test abdeckt)', () => {
		const fremd = gut.replace('{ getMitglied }', '{ getMitglied, liest }');
		expect(pruefe(fremd)).toEqual([`${route}: Admin-Route nutzt 'liest'; ${LISTEN}`]);
		const umbenannt = gut
			.replace('{ getMitglied }', '{ getMitglied as get, postMitglied }')
			.replace('getMitglied(holeAdminDienste()', 'get(holeAdminDienste()');
		expect(pruefe(umbenannt)).toEqual([]);
		// Ein Kommentar mit Apostroph im Import verschluckt den Import nicht.
		const mitKommentar = gut.replace('{ getMitglied }', "{\n\tgetMitglied, // geht's\n\tliest\n}");
		expect(pruefe(mitKommentar)).toEqual([`${route}: Admin-Route nutzt 'liest'; ${LISTEN}`]);
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
		`${pfad}: aus dienste.ts nur Einstiege der Mitglieder, nicht '${name}'; erlaubt sind nur holeLoginDienst, holePasskeyDienst, holeProfilDienste, holeCmDienste, holeMitteilungDienste, holeAnlassDienste, holeInterclubDienste`;
	const mit = (zeile: string) => pruefeBauregel(new Map([[pfad, `${gut}\n${zeile}`]]));
	it('RR-07: ausserhalb von api/admin sind alle sieben Einstiege der Mitglieder erlaubt', () => {
		expect(
			mit(
				"import { holeLoginDienst, holePasskeyDienst as p, holeProfilDienste, holeCmDienste, holeMitteilungDienste, holeAnlassDienste, holeInterclubDienste } from '$lib/server/dienste';"
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
		'src/lib/server/mitteilung/verwaltung-schnittstellen.ts',
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
		// Seit Schritt 11 am Pfad der Datei der Verwaltung, nicht mehr am Namen.
		expect(
			pruefe(
				`${gut}\nimport { postVereinSenden } from '../../../lib/server/mitteilung/verwaltung-schnittstellen.ts';`
			)
		).toEqual([
			`${pfad}: nur Routen unter src/routes/api/admin/ dürfen lib/server/mitteilung/verwaltung-schnittstellen.ts nutzen`
		]);
		expect(pruefe("import { holeMitteilungAdminDienste } from '$lib/server/dienste';")).toEqual([
			`${pfad}: nur Routen unter src/routes/api/admin/ dürfen 'holeMitteilungAdminDienste' nutzen`
		]);
		// Ohne Namen liesse sich nicht prüfen, was die Route nutzt; die Datei der Verwaltung ist ganz
		// gesperrt.
		for (const quelle of [
			"import * as m from '../../../lib/server/dienste.ts';",
			"const m = await import('../../../lib/server/mitteilung/verwaltung-schnittstellen.ts');",
			"export * from '../../../lib/server/mitteilung/verwaltung-schnittstellen.ts';"
		]) {
			expect(pruefe(quelle)).toHaveLength(1);
		}
	});
	// Die eine erwartete Lockerung von Schritt 11 (D.11): Die Datei der Mitglieder enthält keine
	// Schnittstelle der Verwaltung mehr und ist ausserhalb von api/admin frei wie jede andere.
	it('RR-07: die Datei der Mitglieder ist ausserhalb von api/admin in jeder Form frei', () => {
		const m = '../../../lib/server/mitteilung/schnittstellen';
		for (const quelle of [
			`import * as m from '${m}.ts';`,
			`const m = await import('${m}.ts');`,
			`export * from '${m}';`,
			`export { postThemen } from '$lib/server/mitteilung/schnittstellen';`
		]) {
			expect(pruefe(`${gut}\n${quelle}`), quelle).toEqual([]);
		}
	});
});

// Reine Verwaltungs-Datei ausserhalb von lib/server/admin (Schritt 09): Admin-Routen nehmen aus ihr
// nur Einträge der Liste, alle anderen Routen nichts; der Schutz hängt am Pfad der Datei.
describe('Verwaltung der Anlässe (anlass/verwaltung-schnittstellen.ts)', () => {
	const aListe: [string, string] = [
		'src/lib/server/anlass/verwaltung-schnittstellen.ts',
		'export const ANLASS_ADMIN_SCHNITTSTELLEN = {\n\tgetAdminAnlaesse\n} satisfies Record<string, unknown>;'
	];
	const adminListe: [string, string] = [
		'src/lib/server/admin/schnittstellen.ts',
		'export const ADMIN_SCHNITTSTELLEN = {\n\tgetMitglied\n} satisfies Record<string, unknown>;'
	];
	const admin = 'src/routes/api/admin/anlaesse/+server.ts';
	const rumpf = (namen: string) =>
		[
			"import { holeAdminDienste } from '../../../../lib/server/dienste.ts';",
			`import { ${namen} } from '../../../../lib/server/anlass/verwaltung-schnittstellen.ts';`,
			'export const GET = (e) => getAdminAnlaesse(holeAdminDienste(), e);'
		].join('\n');
	const mit = (pfad: string, inhalt: string) =>
		pruefeBauregel(new Map([adminListe, aListe, [pfad, inhalt]]));
	it('RR-07: Admin-Routen nutzen Einträge aus ANLASS_ADMIN_SCHNITTSTELLEN, sonst nichts daraus', () => {
		expect(mit(admin, rumpf('getAdminAnlaesse'))).toEqual([]);
		expect(mit(admin, rumpf('getAdminAnlaesse, hilfe'))).toEqual([
			`${admin}: Admin-Route nutzt 'hilfe'; ${LISTEN}`
		]);
		expect(
			mit(
				admin,
				`${rumpf('getAdminAnlaesse')}\nimport * as a from '../../../../lib/server/anlass/verwaltung-schnittstellen.ts';`
			)
		).toEqual([
			`${admin}: Admin-Route importiert '../../../../lib/server/anlass/verwaltung-schnittstellen.ts' nicht mit Namen`
		]);
	});
	it('eine andere Datei, deren Name so beginnt, ist nicht gesperrt', () => {
		const pfad = 'src/routes/api/anlaesse/+server.ts';
		const zeile =
			"import { x } from '../../../lib/server/anlass/verwaltung-schnittstellen-alt.ts';";
		expect(mit(pfad, zeile)).toEqual([]);
	});
	it('RR-07: ausserhalb von api/admin nutzt keine Route anlass/verwaltung-schnittstellen.ts', () => {
		const pfad = 'src/routes/api/anlaesse/+server.ts';
		const gut = [
			"import { holeAnlassDienste } from '../../../lib/server/dienste.ts';",
			"import { getAnlaesse } from '../../../lib/server/anlass/schnittstellen.ts';",
			'export const GET = (e) => getAnlaesse(holeAnlassDienste(), e);'
		].join('\n');
		expect(mit(pfad, gut)).toEqual([]);
		const v = '../../../lib/server/anlass/verwaltung-schnittstellen';
		for (const zeile of [
			`import { getAdminAnlaesse } from '${v}.ts';`,
			`import { getAdminAnlaesse } from '${v}';`,
			`import { getAdminAnlaesse } from '${v}.js';`,
			`import { getAdminAnlaesse } from '${v}.ts?x';`,
			`import { getAdminAnlaesse } from '${v}.mjs';`,
			`import { getAdminAnlaesse } from '${v}.d.ts';`,
			`import { getAdminAnlaesse } from '${v}#a';`,
			"import { getAdminAnlaesse } from '$lib/server/anlass/verwaltung-schnittstellen';",
			`import { getAdminAnlaesse as g } from '${v}.ts';`,
			`import { 'getAdminAnlaesse' as g } from '${v}.ts';`,
			`import type { ANLASS_ADMIN_SCHNITTSTELLEN } from '${v}.ts';`,
			`import * as a from '${v}.ts';`,
			`export { getAdminAnlaesse } from '${v}.ts';`,
			`export * from '${v}.ts';`,
			`const a = await import('${v}.ts');`,
			// Auch ein Name, der nicht in der Liste steht: Die ganze Datei ist der Verwaltung vorbehalten.
			`import { hilfe } from '${v}.ts';`
		]) {
			expect(mit(pfad, `${gut}\n${zeile}`), zeile).toEqual([
				`${pfad}: nur Routen unter src/routes/api/admin/ dürfen lib/server/anlass/verwaltung-schnittstellen.ts nutzen`
			]);
		}
	});
});

// Die übrigen reinen Verwaltungs-Dateien am Pfad (Schritt 11): je Zeile der Tabelle mit `pfad` ein
// Fall, wie bei den Anlässen. Admin-Routen nehmen nur Einträge der Liste, andere Routen nichts.
describe.each([
	['turnier/schnittstellen.ts', 'TURNIER_SCHNITTSTELLEN', 'getTurniere'],
	['cm/verwaltung-schnittstellen.ts', 'CM_ADMIN_SCHNITTSTELLEN', 'getAnmeldungen'],
	['gespraech/verwaltung-schnittstellen.ts', 'GESPRAECH_ADMIN_SCHNITTSTELLEN', 'getGespraeche'],
	[
		'mitteilung/verwaltung-schnittstellen.ts',
		'MITTEILUNG_ADMIN_SCHNITTSTELLEN',
		'getVereinMitteilungen'
	]
])('Verwaltung am Pfad gesperrt: %s', (datei, konstante, name) => {
	const listen: [string, string][] = [
		[
			'src/lib/server/admin/schnittstellen.ts',
			'export const ADMIN_SCHNITTSTELLEN = {\n\tgetMitglied\n} satisfies Record<string, unknown>;'
		],
		[
			`src/lib/server/${datei}`,
			`export const ${konstante} = {\n\t${name}\n} satisfies Record<string, unknown>;`
		]
	];
	const mit = (pfad: string, inhalt: string) =>
		pruefeBauregel(new Map([...listen, [pfad, inhalt]]));
	const ohneEndung = datei.replace(/\.ts$/, '');
	it(`RR-07: Admin-Routen nutzen Einträge aus ${konstante}, sonst nichts daraus`, () => {
		const admin = 'src/routes/api/admin/x/+server.ts';
		const rumpf = (namen: string) =>
			[
				"import { holeMitteilungAdminDienste } from '../../../../lib/server/dienste.ts';",
				`import { ${namen} } from '../../../../lib/server/${datei}';`,
				`export const GET = (e) => ${name}(holeMitteilungAdminDienste(), e);`
			].join('\n');
		expect(mit(admin, rumpf(name))).toEqual([]);
		expect(mit(admin, rumpf(`${name}, hilfe`))).toEqual([
			`${admin}: Admin-Route nutzt 'hilfe'; ${LISTEN}`
		]);
	});
	it(`RR-07: ausserhalb von api/admin nutzt keine Route ${datei}`, () => {
		const pfad = 'src/routes/api/cm/+server.ts';
		const gut = [
			"import { holeCmDienste } from '../../../lib/server/dienste.ts';",
			"import { getCmTurniere } from '../../../lib/server/cm/schnittstellen.ts';",
			'export const GET = (e) => getCmTurniere(holeCmDienste(), e);'
		].join('\n');
		expect(mit(pfad, gut)).toEqual([]);
		const v = `../../../lib/server/${ohneEndung}`;
		for (const zeile of [
			`import { ${name} } from '${v}.ts';`,
			`import { ${name} } from '${v}';`,
			`import { ${name} } from '${v}.js';`,
			`import { ${name} } from '$lib/server/${ohneEndung}';`,
			`import { ${name} as g } from '${v}.ts';`,
			`import { '${name}' as g } from '${v}.ts';`,
			`import { '${name.slice(0, -1)}\\x${name.charCodeAt(name.length - 1).toString(16)}' as g } from '${v}.ts';`,
			`import type { ${konstante} } from '${v}.ts';`,
			`import * as a from '${v}.ts';`,
			`export { ${name} } from '${v}.ts';`,
			`export * from '${v}.ts';`,
			`const a = await import('${v}.ts');`,
			`import { hilfe } from '${v}.ts';`
		]) {
			expect(mit(pfad, `${gut}\n${zeile}`), zeile).toEqual([
				`${pfad}: nur Routen unter src/routes/api/admin/ dürfen lib/server/${datei} nutzen`
			]);
		}
	});
});

// Namen in Anführungszeichen (ES2022, `import { 'x' as y } from …`): Die Zeile ist ein Import wie
// jeder andere und wird nach denselben Regeln beurteilt; einen Namen mit Escape (`\u…`, `\x…`,
// `\'`, `\"`) liest die Prüfung nicht, er ist ein Befund (Schritt 09).
describe('Namen in Anführungszeichen', () => {
	const liste: [string, string] = [
		'src/lib/server/admin/schnittstellen.ts',
		'export const ADMIN_SCHNITTSTELLEN = {\n\tgetMitglied\n} satisfies Record<string, unknown>;'
	];
	const mListe: [string, string] = [
		'src/lib/server/mitteilung/verwaltung-schnittstellen.ts',
		'export const MITTEILUNG_ADMIN_SCHNITTSTELLEN = {\n\tpostVereinSenden\n} satisfies Record<string, unknown>;'
	];
	const admin = 'src/routes/api/admin/mitglieder/[id]/+server.ts';
	const adminGut = [
		"import { holeAdminDienste } from '../../../../../lib/server/dienste.ts';",
		"import { 'getMitglied' as g } from '../../../../../lib/server/admin/schnittstellen.ts';",
		'export const GET = (e) => g(holeAdminDienste(), e);'
	].join('\n');
	const mitglied = 'src/routes/api/profil/+server.ts';
	const mitgliedGut = [
		"import { 'holeProfilDienste' as h } from '../../../lib/server/dienste.ts';",
		'import { "getProfil" as g } from \'../../../lib/server/profil/schnittstellen.ts\';',
		'export const GET = (e) => g(h(), e);'
	].join('\n');
	const pruefe = (pfad: string, inhalt: string) =>
		pruefeBauregel(new Map([liste, mListe, [pfad, inhalt]]));

	it('RR-07: ein gelisteter Name in Anführungszeichen gilt wie ohne', () => {
		expect(pruefe(admin, adminGut)).toEqual([]);
		expect(pruefe(mitglied, mitgliedGut)).toEqual([]);
	});
	it('RR-07: Admin-Route: Quelle und Name in Anführungszeichen nach denselben Regeln', () => {
		for (const [zeile, befund] of [
			[
				"import { 'erstelleDb' as e } from '../../../../../lib/server/db/index.ts';",
				`${admin}: Admin-Route importiert '../../../../../lib/server/db/index.ts'; ${DATEIEN}`
			],
			[
				"import { 'liest' as l } from '../../../../../lib/server/admin/schnittstellen.ts';",
				`${admin}: Admin-Route nutzt 'liest'; ${LISTEN}`
			],
			[
				'import { "holeDb" as d } from \'../../../../../lib/server/dienste.ts\';',
				`${admin}: Admin-Route importiert 'holeDb' aus ../../../../../lib/server/dienste.ts; erlaubt sind nur holeAdminDienste und holeMitteilungAdminDienste`
			],
			[
				"export { 'erstelleDb' as e } from '../../../../../lib/server/db/index.ts';",
				`${admin}: Admin-Route importiert '../../../../../lib/server/db/index.ts'; ${DATEIEN}`
			]
		]) {
			expect(pruefe(admin, `${adminGut}\n${zeile}`), zeile).toEqual([befund]);
		}
	});
	it('RR-07: Mitglieder-Route: Quelle und Name in Anführungszeichen nach denselben Regeln', () => {
		for (const [zeile, befund] of [
			[
				"import { 'listeMitglieder' as l } from '$lib/server/admin/mitglieder.ts';",
				`${mitglied}: nur Routen unter src/routes/api/admin/ dürfen lib/server/admin nutzen`
			],
			[
				"import { 'holeAdminDienste' as h2 } from '../../../lib/server/dienste.ts';",
				`${mitglied}: nur Routen unter src/routes/api/admin/ dürfen 'holeAdminDienste' nutzen`
			],
			[
				"import { 'holeBremsen' as b } from '../../../lib/server/dienste.ts';",
				`${mitglied}: aus dienste.ts nur Einstiege der Mitglieder, nicht 'holeBremsen'; erlaubt sind nur holeLoginDienst, holePasskeyDienst, holeProfilDienste, holeCmDienste, holeMitteilungDienste, holeAnlassDienste, holeInterclubDienste`
			],
			[
				"export { 'postVereinSenden' as p } from '../../../lib/server/mitteilung/verwaltung-schnittstellen.ts';",
				`${mitglied}: nur Routen unter src/routes/api/admin/ dürfen lib/server/mitteilung/verwaltung-schnittstellen.ts nutzen`
			]
		]) {
			expect(pruefe(mitglied, `${mitgliedGut}\n${zeile}`), zeile).toEqual([befund]);
		}
	});
	it('RR-07: ein Name in Anführungszeichen mit Escape ist ein Befund', () => {
		// Die Prüfung entschlüsselt keine Escapes: gesperrt im Zweifel, auch bei der Erlaubt-Liste der
		// Einstiege aus dienste.ts.
		for (const [pfad, zeile, name] of [
			[
				admin,
				"import { 'getMitglie\\u0064' as g2 } from '../../../../../lib/server/admin/schnittstellen.ts';",
				"'getMitglie\\u0064'"
			],
			[
				mitglied,
				"import { 'holeProfilDienst\\x65' as p } from '../../../lib/server/dienste.ts';",
				"'holeProfilDienst\\x65'"
			]
		]) {
			expect(pruefe(pfad, `${pfad === admin ? adminGut : mitgliedGut}\n${zeile}`), zeile).toEqual([
				expect.stringContaining(name)
			]);
		}
	});
	it('ein Text in Anführungszeichen ausserhalb eines Imports ändert nichts', () => {
		const code = [
			"export const prerender = 'auto';",
			"import { getProfil } from '../../../lib/server/profil/schnittstellen.ts';",
			"import { 'x' as y } from '../../../lib/zeit.ts';"
		].join('\n');
		expect(pruefe(mitglied, code)).toEqual([]);
	});
});

// Ein Text in Anführungszeichen (auch ein einzelnes Zeichen in einem Template- oder Regex-Literal)
// darf keinen Import dahinter verschlucken: Jedes `import` und `export` wird für sich geprüft
// (Korrekturrunde Schritt 09).
describe('Text in Anführungszeichen verschluckt keinen Import', () => {
	const listen: [string, string][] = [
		[
			'src/lib/server/admin/schnittstellen.ts',
			'export const ADMIN_SCHNITTSTELLEN = {\n\tgetMitglied\n} satisfies Record<string, unknown>;'
		],
		[
			'src/lib/server/mitteilung/verwaltung-schnittstellen.ts',
			'export const MITTEILUNG_ADMIN_SCHNITTSTELLEN = {\n\tpostVereinSenden\n} satisfies Record<string, unknown>;'
		],
		[
			'src/lib/server/anlass/verwaltung-schnittstellen.ts',
			'export const ANLASS_ADMIN_SCHNITTSTELLEN = {\n\tgetAdminAnlaesse\n} satisfies Record<string, unknown>;'
		]
	];
	const mitglied = 'src/routes/api/profil/+server.ts';
	const admin = 'src/routes/api/admin/mitglieder/[id]/+server.ts';
	const pruefe = (pfad: string, inhalt: string) =>
		pruefeBauregel(new Map([...listen, [pfad, inhalt]]));
	// Ein Import zwischen zwei Literalen mit je einem Apostroph, danach ein weiteres `export … from`.
	const zwischen = (literal: string, zeile: string) =>
		`export const a = ${literal}; ${zeile} const b = ${literal}\nexport { z } from './x.ts';`;
	const LITERALE = ["`'`", "/'/", '`"`', '/"/'];

	it.each(LITERALE)('RR-07: Mitglieder-Route, Import zwischen %s', (literal) => {
		for (const [zeile, befund] of [
			[
				'import { holeAdminDienste } from "$lib/server/dienste";',
				`${mitglied}: nur Routen unter src/routes/api/admin/ dürfen 'holeAdminDienste' nutzen`
			],
			[
				"import { getMitglied } from '$lib/server/admin/schnittstellen';",
				`${mitglied}: nur Routen unter src/routes/api/admin/ dürfen lib/server/admin nutzen`
			],
			[
				"import { postVereinSenden } from '../../../lib/server/mitteilung/verwaltung-schnittstellen.ts';",
				`${mitglied}: nur Routen unter src/routes/api/admin/ dürfen lib/server/mitteilung/verwaltung-schnittstellen.ts nutzen`
			],
			[
				"import { getAdminAnlaesse } from '../../../lib/server/anlass/verwaltung-schnittstellen.ts';",
				`${mitglied}: nur Routen unter src/routes/api/admin/ dürfen lib/server/anlass/verwaltung-schnittstellen.ts nutzen`
			]
		]) {
			expect(pruefe(mitglied, zwischen(literal, zeile)), zeile).toContain(befund);
		}
	});
	it.each(LITERALE)('RR-07: Admin-Route, Import zwischen %s', (literal) => {
		const zeile = "import { erstelleDb } from '../../../../../lib/server/db/index.ts';";
		expect(pruefe(admin, zwischen(literal, zeile))).toContain(
			`${admin}: Admin-Route importiert '../../../../../lib/server/db/index.ts'; ${DATEIEN}`
		);
	});
	it.each(["'a\\'b'", '"a\\"b"'])(
		'RR-07: ein Name mit Escape-Anführungszeichen %s ist ein Befund und verschluckt den Import nicht',
		(name) => {
			const zeile = `import { ${name} as g, holeAdminDienste } from "$lib/server/dienste";`;
			expect(pruefe(mitglied, zeile)).toEqual(
				expect.arrayContaining([
					`${mitglied}: nur Routen unter src/routes/api/admin/ dürfen 'holeAdminDienste' nutzen`,
					expect.stringContaining(name)
				])
			);
		}
	);
	it('RR-07: export * mit Namen in Anführungszeichen ist ein Import', () => {
		expect(pruefe(mitglied, "export * as 'ns' from '$lib/server/dienste';")).toEqual([
			`${mitglied}: '$lib/server/dienste' nur statisch und mit Namen importieren`
		]);
	});
	it('RR-07: Import ohne Namen vor einem weiteren Import ohne Semikolon', () => {
		const code = "import '$lib/server/admin/rollen.ts'\nimport { getProfil } from '../x.ts'";
		expect(pruefe(mitglied, code)).toEqual([
			`${mitglied}: nur Routen unter src/routes/api/admin/ dürfen lib/server/admin nutzen`
		]);
	});
});

// Schritt 12 (Restlücke aus dem Review von Schritt 11): Eine Verwaltungs-Funktion in einer Datei der
// Mitglieder liefe durch keine 403-Schleife; die Rechteprüfung `liest`/`schreibt` darf darum nur in
// den Dateien der Tabelle VERWALTUNGS_DATEIEN stehen.
describe('liest und schreibt nur in den Verwaltungs-Dateien', () => {
	const mitglied = 'src/lib/server/cm/schnittstellen.ts';
	const pruefe = (pfad: string, code: string) => pruefeBauregel(new Map([[pfad, code]]));
	const befund = rechteBefund;

	it.each([
		['src/lib/server/admin/schnittstellen.ts', './rechte.ts'],
		['src/lib/server/turnier/schnittstellen.ts', '../admin/rechte.ts'],
		['src/lib/server/cm/verwaltung-schnittstellen.ts', '../admin/rechte.ts'],
		['src/lib/server/gespraech/verwaltung-schnittstellen.ts', '../admin/rechte.ts'],
		['src/lib/server/mitteilung/verwaltung-schnittstellen.ts', '../admin/rechte.ts'],
		['src/lib/server/anlass/verwaltung-schnittstellen.ts', '$lib/server/admin/rechte']
	])('RR-07: %s darf liest und schreibt importieren', (pfad, quelle) => {
		expect(pruefe(pfad, `import { liest, schreibt, type AdminDienste } from '${quelle}';`)).toEqual(
			[]
		);
	});

	it.each([
		['liest', "import { liest } from '../admin/rechte.ts';"],
		['schreibt', "import { schreibt as s } from '../admin/rechte';"],
		['liest', "import { type AdminDienste, liest } from '$lib/server/admin/rechte.js';"],
		['liest', 'import { liest } from "../admin/rechte.ts";'],
		['schreibt', "export { schreibt } from '../admin/rechte.ts';"],
		['liest', "import { 'liest' as l } from '../admin/rechte.ts';"],
		['liest', "import { liest } from './../admin/rechte.ts';"],
		['liest', "import { liest } from '../admin/rechte.ts?x';"],
		// Nicht normalisierte Pfade und Pfade ab der Projektwurzel (Review Schritt 12)
		['liest', "import { liest } from '$lib/server/cm/../admin/rechte';"],
		['liest', "import { liest } from '$lib/server/admin/./rechte.ts';"],
		['liest', "import { liest } from '$lib/../lib/server/admin/rechte.ts';"],
		['liest', "import { liest } from '/src/lib/server/admin/rechte.ts';"],
		['mitKonto', "import { mitKonto } from '../admin/rechte.ts';"],
		['mitKonto', "import { type AdminDienste, mitKonto as m } from '/src/lib/server/admin/rechte';"]
	])('RR-07: eine Datei der Mitglieder importiert %s: %s', (name, code) => {
		expect(pruefe(mitglied, code)).toEqual([befund(mitglied, name)]);
	});

	it.each([
		["'li\\x65st'", "import { 'li\\x65st' as l } from '../admin/rechte.ts';"],
		['li\\u0065st', "import { li\\u0065st } from '../admin/rechte.ts';"],
		['liest/**/as', "import { liest/**/as l } from '../admin/rechte.ts';"]
	])('RR-07: ein Name, der sich nicht lesen lässt, ist ein Befund: %s', (name, code) => {
		const [ergebnis] = pruefe(mitglied, code);
		expect(ergebnis).toContain(`${mitglied}: '${name.replace('/**/', '')}`);
		expect(ergebnis).toContain(VERWALTUNG);
	});

	it.each([
		"import * as r from '../admin/rechte.ts';",
		"export * from '../admin/rechte.ts';",
		"import r from '../admin/rechte.ts';",
		"import '../admin/rechte.ts';",
		"const r = await import('../admin/rechte.ts');"
	])('RR-07: admin/rechte.ts nur statisch und mit Namen: %s', (code) => {
		expect(pruefe(mitglied, code)).toEqual([
			`${mitglied}: '../admin/rechte.ts' nur statisch und mit Namen importieren`
		]);
	});

	it.each([
		['src/lib/server/admin/ansicht.ts', './rechte.ts'],
		['src/lib/server/datum.ts', './admin/rechte.ts'],
		['src/lib/verwaltung/neu.ts', '../server/admin/rechte.ts'],
		['src/hooks.server.ts', '$lib/server/admin/rechte']
	])('RR-07: auch %s ausserhalb der Themen ist gemeint', (pfad, quelle) => {
		expect(pruefe(pfad, `import { liest } from '${quelle}';`)).toEqual([befund(pfad, 'liest')]);
	});

	it.each([
		[
			'src/lib/server/mitteilung/typen.ts',
			"import type { AdminDienste } from '../admin/rechte.ts';"
		],
		[
			'src/lib/server/cm/verwaltung-meldung.ts',
			"import { type AdminUrheber } from '../admin/rechte.ts';"
		],
		['src/lib/server/dienste.ts', "import type { AdminDienste } from './admin/rechte.ts';"],
		[mitglied, "import { liest } from '../admin/rechte-neu.ts';"],
		[mitglied, "// import { liest } from '../admin/rechte.ts';"]
	])('lässt in %s %s zu', (pfad, code) => {
		expect(pruefe(pfad, code)).toEqual([]);
	});

	it('RR-07: admin/schnittstellen.ts darf mitKonto importieren', () => {
		expect(
			pruefe(
				'src/lib/server/admin/schnittstellen.ts',
				"import { liest, mitKonto, schreibt } from './rechte.ts';"
			)
		).toEqual([]);
	});

	it('Tests rufen die Rechteprüfung direkt', () => {
		expect(
			pruefe(
				'src/lib/server/admin/schnittstellen.db.test.ts',
				"import { liest, schreibt } from './rechte.ts';"
			)
		).toEqual([]);
	});

	it('Routen prüfen nur ihre eigenen Regeln, nicht doppelt', () => {
		const route = 'src/routes/api/profil/+server.ts';
		expect(pruefe(route, "import { liest } from '$lib/server/admin/rechte';")).toEqual([
			`${route}: nur Routen unter src/routes/api/admin/ dürfen lib/server/admin nutzen`
		]);
	});

	it.each([
		['src/lib/server/cm/schnittstellen.ts', true],
		['src/lib/server/admin/schnittstellen.ts', true],
		['src/lib/verwaltung/bereiche.ts', true],
		['src/hooks.server.ts', true],
		['src/lib/server/admin/schnittstellen.db.test.ts', false],
		['src/routes/api/profil/+server.ts', false],
		['src/lib/ui/Knopf.svelte', false],
		['tests/hilfen/verwaltungs-listen.ts', false]
	])('betrifftRechteImporte(%s) ist %s', (pfad, erwartet) => {
		expect(betrifftRechteImporte(pfad)).toBe(erwartet);
	});
});

// Schritt 12a, Punkt 2 (N-01): Kommentare werden nur ausserhalb von Texten entfernt. Ein `//` oder
// `/*` in einem Text lässt keinen Import verschwinden; ein Zeilenkommentar direkt hinter einem Text
// ist ein Kommentar (D.8, D.14).
describe('Kommentare nur ausserhalb von Texten (Schritt 12a)', () => {
	const mitglied = 'src/lib/server/cm/schnittstellen.ts';
	const route = 'src/routes/api/profil/+server.ts';
	const pruefe = (pfad: string, code: string) => pruefeBauregel(new Map([[pfad, code]]));

	it.each([
		['liest', "import { liest } from '$lib/server//admin/rechte.ts';"],
		['liest', "import { liest } from '..//admin/rechte.ts';"],
		['schreibt', 'import { schreibt } from "../admin//rechte";'],
		['liest', "const a = '/*';\nimport { liest } from '../admin/rechte.ts';\nconst b = '*/';"],
		['mitKonto', 'const a = `/*`;\nimport { mitKonto } from "../admin/rechte.ts";\nconst b = `*/`;']
	])(
		'RR-07: ein Kommentarzeichen in einem Text verschluckt den Import nicht (%s): %s',
		(name, code) => {
			expect(pruefe(mitglied, code)).toEqual([rechteBefund(mitglied, name)]);
		}
	);

	it('RR-07: ein Zeilenkommentar direkt hinter einem Text verschluckt den Import nicht', () => {
		const code = [
			'import {',
			"\t'holeAdminDienste'// it's",
			'\tas h',
			"} from '../../../lib/server/dienste.ts';"
		].join('\n');
		expect(pruefe(route, code)).toEqual([
			`${route}: nur Routen unter src/routes/api/admin/ dürfen 'holeAdminDienste' nutzen`
		]);
	});

	it('RR-07: Admin-Route: ein Kommentarzeichen in einem Text verschluckt den Import nicht', () => {
		const admin = 'src/routes/api/admin/x/+server.ts';
		const liste: [string, string] = [
			'src/lib/server/admin/schnittstellen.ts',
			'export const ADMIN_SCHNITTSTELLEN = {\n\tgetMitglied\n} satisfies Record<string, unknown>;'
		];
		const code =
			"const a = '/*';\nimport { erstelleDb } from '../../../../lib/server/db/index.ts';\nconst b = '*/';";
		expect(pruefeBauregel(new Map([liste, [admin, code]]))).toEqual([
			`${admin}: Admin-Route importiert '../../../../lib/server/db/index.ts'; ${DATEIEN}`
		]);
	});
});

// Schritt 12a, Punkt 1 (N-02): Die Routen-Regeln prüfen den Pfad, wie er steht, und die Datei, auf
// die er zeigt; `..`, `./`, `//` und Pfade ab `/src/` umgehen keine Sperre. Eine Admin-Route nimmt
// nur Pfade, die wirklich auf eine erlaubte Datei zeigen.
describe('Importpfade auch in Routen aufgelöst (Schritt 12a)', () => {
	const route = 'src/routes/api/profil/+server.ts';
	const listen: [string, string][] = [
		[
			'src/lib/server/admin/schnittstellen.ts',
			'export const ADMIN_SCHNITTSTELLEN = {\n\tgetMitglied\n} satisfies Record<string, unknown>;'
		],
		[
			'src/lib/server/anlass/verwaltung-schnittstellen.ts',
			'export const ANLASS_ADMIN_SCHNITTSTELLEN = {\n\tgetAdminAnlaesse\n} satisfies Record<string, unknown>;'
		]
	];
	const pruefe = (pfad: string, code: string) => pruefeBauregel(new Map([...listen, [pfad, code]]));
	const adminModul = `${route}: nur Routen unter src/routes/api/admin/ dürfen lib/server/admin nutzen`;

	it.each([
		"import { liest } from '$lib/server/cm/../admin/rechte';",
		"import { x } from '../../../lib/server/cm/../admin/rollen.ts';",
		"import { x } from '$lib/server/./admin/rollen.ts';",
		"import { x } from '$lib/server//admin/rollen.ts';",
		"import { x } from '/src/lib/server/x/../admin';",
		"const m = await import('../../../lib/server/cm/../admin/rollen.ts');"
	])('RR-07: Mitglieder-Route, lib/server/admin über %s', (code) => {
		expect(pruefe(route, code)).toEqual([adminModul]);
	});

	it.each([
		"import { getAdminAnlaesse } from '$lib/server/cm/../anlass/verwaltung-schnittstellen';",
		"import { getAdminAnlaesse } from '../../../lib/server//anlass/verwaltung-schnittstellen.ts';",
		"export * from '/src/lib/server/./anlass/verwaltung-schnittstellen.ts';"
	])('RR-07: Mitglieder-Route, Pfad-Sperre über %s', (code) => {
		expect(pruefe(route, code)).toEqual([
			`${route}: nur Routen unter src/routes/api/admin/ dürfen lib/server/anlass/verwaltung-schnittstellen.ts nutzen`
		]);
	});

	it.each([
		[
			"import { holeAdminDienste } from '$lib/server/cm/../dienste';",
			`${route}: nur Routen unter src/routes/api/admin/ dürfen 'holeAdminDienste' nutzen`
		],
		[
			"import * as d from '/src/lib/server/./dienste.ts';",
			`${route}: '/src/lib/server/./dienste.ts' nur statisch und mit Namen importieren`
		]
	])('RR-07: Mitglieder-Route, dienste.ts über %s', (code, befund) => {
		expect(pruefe(route, code)).toEqual([befund]);
	});

	// Der geschriebene Pfad endet wie eine erlaubte Datei, zeigt aber nicht auf sie.
	it.each([
		"import { getMitglied } from '../lib/server/admin/schnittstellen.ts';",
		"import { getMitglied } from 'paket/lib/server/admin/schnittstellen.ts';",
		"import { holeAdminDienste } from '/lib/server/dienste.ts';",
		"import { holeAdminDienste } from '../../../../lib/server/dienste.ts';"
	])('RR-07: Admin-Route, Pfad zeigt nicht auf die erlaubte Datei: %s', (zeile) => {
		const admin = 'src/routes/api/admin/mitglieder/[id]/+server.ts';
		const quelle = /'([^']+)'/.exec(zeile)?.[1];
		expect(pruefe(admin, zeile)).toEqual([
			`${admin}: Admin-Route importiert '${quelle}'; ${DATEIEN}`
		]);
	});
});

// Schritt 12a, Punkt 4 (N-03): Laden, dessen Ziel die Prüfung nicht liest, ist in Routen und in den
// Dateien der Rechte-Regel ein Befund; Dateien mit `.mts`/`.cts` gelten wie `.ts`.
describe('Nicht prüfbares Laden (Schritt 12a)', () => {
	const mitglied = 'src/lib/server/cm/schnittstellen.ts';
	const route = 'src/routes/api/profil/+server.ts';
	const admin = 'src/routes/api/admin/x/+server.ts';
	const liste: [string, string] = [
		'src/lib/server/admin/schnittstellen.ts',
		'export const ADMIN_SCHNITTSTELLEN = {\n\tgetMitglied\n} satisfies Record<string, unknown>;'
	];
	const pruefe = (pfad: string, code: string) => pruefeBauregel(new Map([liste, [pfad, code]]));
	const nicht = (pfad: string, wort: string) =>
		`${pfad}: ${wort} lässt sich nicht prüfen; nur statische Importe`;

	it.each([
		[route, "const m = import.meta.glob('$lib/server/admin/*.ts');", 'import.meta.glob'],
		[route, "const m = import.meta.glob('./*.ts', { eager: true });", 'import.meta.glob'],
		[route, "const r = require('../../../lib/server/admin/rollen.ts');", 'require'],
		[admin, "const m = import.meta.glob('../../../../lib/server/db/*.ts');", 'import.meta.glob'],
		[admin, "const r = require('../../../../lib/server/db/index.ts');", 'require'],
		[
			'src/routes/+page.svelte',
			"<script>\n\tconst m = import.meta.glob('./*.ts');\n</script>",
			'import.meta.glob'
		],
		[mitglied, "const r = require('../admin/rechte.ts');", 'require'],
		[mitglied, "const r = createRequire(import.meta.url)('../admin/rechte.ts');", 'createRequire'],
		[mitglied, "const m = import.meta.glob('../admin/*.ts');", 'import.meta.glob'],
		['src/lib/server/cm/verwaltung-schnittstellen.ts', "const r = require('./x.ts');", 'require']
	])('RR-07: %s: %s', (pfad, code, wort) => {
		expect(pruefe(pfad, code)).toEqual([nicht(pfad, wort)]);
	});

	it.each([
		[mitglied, 'const r = await import(pfad);'],
		[mitglied, 'const r = await import(`../admin/${datei}.ts`);'],
		['src/hooks.server.ts', 'const r = await import(pfad);'],
		['src/lib/server/admin/schnittstellen.ts', 'const r = await import(pfad);']
	])('RR-07: berechneter dynamischer Import ausserhalb der Routen in %s: %s', (pfad, code) => {
		expect(pruefe(pfad, code)).toEqual([
			`${pfad}: dynamischer Import mit berechnetem Pfad lässt sich nicht prüfen`
		]);
	});

	it.each(['src/lib/server/cm/hilfe.mts', 'src/lib/server/cm/hilfe.cts'])(
		'RR-07: %s gilt wie .ts',
		(pfad) => {
			expect(betrifftRechteImporte(pfad)).toBe(true);
			expect(pruefe(pfad, "import { liest } from '../admin/rechte.ts';")).toEqual([
				rechteBefund(pfad, 'liest')
			]);
		}
	);
});

// Schritt 12a, Punkt 5 (N-04): Die Dateien der Tabelle VERWALTUNGS_DATEIEN rufen `liest`, `schreibt`
// und `mitKonto` nur auf; sie reichen sie nicht weiter, sonst holte eine Mitglieder-Datei sie dort.
describe('Rechteprüfung nicht weiterreichen (Schritt 12a)', () => {
	const datei = 'src/lib/server/cm/verwaltung-schnittstellen.ts';
	const pruefe = (pfad: string, code: string) => pruefeBauregel(new Map([[pfad, code]]));
	const weiter = (pfad: string, name: string) =>
		`${pfad}: reicht '${name}' aus admin/rechte.ts weiter; liest, schreibt und mitKonto nur aufrufen, nicht weiterreichen`;
	const r = "'../admin/rechte.ts'";

	it.each([
		['liest', `import { liest } from ${r};\nexport { liest };`],
		['l', `import { liest as l } from ${r};\nexport { l as pruefe };`],
		['schreibt', `import { schreibt } from ${r};\nexport default schreibt;`],
		['l', `import { liest as l } from ${r};\nexport const pruefe = l;`],
		['liest', `import { liest } from ${r};\nconst a = liest;\nexport { a };`],
		['liest', `import { liest } from ${r};\nexport const LISTE = { liest };`],
		['l', `import { 'liest' as l } from ${r};\nexport { l };`],
		['schreibt', `export { schreibt } from ${r};`],
		['liest', `export { liest as pruefe } from ${r};`],
		['mitKonto', `export { 'mitKonto' as m } from ${r};`]
	])('RR-07: reicht %s weiter: %s', (name, code) => {
		expect(pruefe(datei, code)).toEqual([weiter(datei, name)]);
	});

	it('RR-07: auch admin/schnittstellen.ts reicht mitKonto nicht weiter', () => {
		const pfad = 'src/lib/server/admin/schnittstellen.ts';
		expect(pruefe(pfad, "import { mitKonto } from './rechte.ts';\nexport { mitKonto };")).toEqual([
			weiter(pfad, 'mitKonto')
		]);
	});

	it.each([
		`export * from ${r};`,
		`export * as rechte from ${r};`,
		`import * as rechte from ${r};\nexport { rechte };`,
		`const rechte = await import(${r});`
	])('RR-07: aus admin/rechte.ts nur statisch und mit Namen: %s', (code) => {
		expect(pruefe(datei, code)).toEqual([
			`${datei}: '../admin/rechte.ts' nur statisch und mit Namen importieren`
		]);
	});
});

// Korrekturrunde Schritt 12a (M-1, H-3): Das Muster für Texte kennt keine Syntax. Liest es einen
// Text zu weit oder zu kurz (Regex-Literal nach `)`, Division nach `a!` oder `i++`, Backtick in einem
// Ausdruck oder im Markup), darf kein Import und kein Weiterreichen verschwinden, das die Fassung bis
// Schritt 12 sah: Jede Regel prüft beide Lesarten ohne Kommentare. Fälle aus dem Review.
describe('Zwei Lesarten ohne Kommentare (Korrekturrunde Schritt 12a)', () => {
	const mitglied = 'src/lib/server/cm/hilfe.ts';
	const pruefe = (pfad: string, code: string) => pruefeBauregel(new Map([[pfad, code]]));
	const mehr = (quelle: string) => `import {\n\tfremd2, // geht's\n\tliest\n} from '${quelle}';`;
	const rechte = mehr('../admin/rechte.ts');

	it.each([
		['if (x) /`/.test(a);\n' + rechte + '\nconst t = `x`;'],
		['const d = a! / 2 + `a/b`;\n' + rechte + '\nconst t = `x`;'],
		["const h = a! / 2; import { fremd2, /* it's */ liest } from '../admin/rechte.ts';"],
		["let h = i++ / 2; import { fremd2, /* it's */ liest } from '../admin/rechte.ts';"],
		['const t = `${"`"}`;\n' + rechte + '\nconst u = `x`;'],
		['const t = `${a /* ` */}`;\n' + rechte + '\nconst u = `x`;']
	])('RR-07: Datei der Mitglieder: %s', (code) => {
		expect(pruefe(mitglied, code)).toEqual([rechteBefund(mitglied, 'liest')]);
	});

	it.each([
		[
			'src/routes/api/profil/+server.ts',
			"if (x) /'/.test(a); const u = '//cdn/x'; const m = await import('../../../lib/server/admin/rollen.ts');"
		],
		[
			'src/routes/api/profil/+server.ts',
			'const t = `${"`"}`; const a = "//"; import { getMitglieder } from \'$lib/server/admin/schnittstellen.ts\';'
		],
		[
			'src/routes/x/+page.svelte',
			`<p>Tippe \`</p>\n<script lang="ts">\n${mehr('$lib/server/admin/rollen.ts')}\nconst t = \`x\`;\n</script>`
		]
	])('RR-07: Route %s: %s', (pfad, code) => {
		expect(pruefe(pfad, code)).toContain(
			`${pfad}: nur Routen unter src/routes/api/admin/ dürfen lib/server/admin nutzen`
		);
	});

	it('RR-07: Admin-Route: ein Regex-Literal mit Backtick nach ) verdeckt keinen Import', () => {
		const admin = 'src/routes/api/admin/x/+server.ts';
		const liste: [string, string] = [
			'src/lib/server/admin/schnittstellen.ts',
			'export const ADMIN_SCHNITTSTELLEN = {\n\tgetMitglied\n} satisfies Record<string, unknown>;'
		];
		const code =
			'if (x) /`/.test(a);\n' + mehr('../../../../lib/server/db/index.ts') + '\nconst t = `x`;';
		expect(pruefeBauregel(new Map([liste, [admin, code]]))).toContain(
			`${admin}: Admin-Route importiert '../../../../lib/server/db/index.ts'; ${DATEIEN}`
		);
	});

	it('RR-07: Datei der Tabelle: eine Division nach a! verdeckt kein Weiterreichen (H-3)', () => {
		const datei = 'src/lib/server/cm/verwaltung-schnittstellen.ts';
		const code = [
			"import { liest } from '../admin/rechte.ts';",
			'const r = a! / 2; export const x = liest; const s = 1 / 2;'
		].join('\n');
		expect(pruefe(datei, code)).toEqual([
			`${datei}: reicht 'liest' aus admin/rechte.ts weiter; liest, schreibt und mitKonto nur aufrufen, nicht weiterreichen`
		]);
	});
});

// Korrekturrunde Schritt 12a (H-4, H-1, H-2): Was die neuen Regeln der Punkte 4 und 5 nicht melden.
describe('Keine Fehlalarme der Punkte 4 und 5 (Korrekturrunde Schritt 12a)', () => {
	const datei = 'src/lib/server/cm/verwaltung-schnittstellen.ts';
	const pruefe = (pfad: string, code: string) => pruefeBauregel(new Map([[pfad, code]]));
	const r = "import { liest, schreibt, type AdminDienste } from '../admin/rechte.ts';";

	it.each([
		`${r}\nexport const getX = liest('cm', async (d, e) => e);`,
		`${r}\nexport const postX = schreibt(\n\t'cm',\n\tasync (d, e) => e\n);`,
		`${r}\nexport const getY = liest<AdminDienste>('cm', (d, e) => e);`,
		`${r}\nconst meldung = 'Die Verwaltung liest und schreibt';\nexport const g = liest('cm', (d, e) => e);`,
		`${r}\ntype Pruefung = typeof liest;\nexport const g = schreibt('cm', (d, e) => e);`
	])('lässt in einer Datei der Tabelle zu: %s', (code) => {
		expect(pruefe(datei, code)).toEqual([]);
	});

	it.each([
		['src/lib/server/cm/schnittstellen.ts', "const r = x.require('a');"],
		['src/lib/server/cm/schnittstellen.ts', 'declare function require(id: string): unknown;'],
		[
			'src/routes/api/profil/+server.ts',
			'const m = meta.glob;\nexport const h = (a) => a.require(1);'
		]
	])('lässt in %s zu: %s', (pfad, code) => {
		expect(pruefe(pfad, code)).toEqual([]);
	});
});

describe('betrifftBauregel', () => {
	it.each([
		'src/routes/+page.ts',
		'vite.config.ts',
		'src/lib/a.remote.ts',
		'lib/b.remote.js',
		'src/lib/server/admin/schnittstellen.ts',
		'src/lib/server/turnier/schnittstellen.ts',
		'src/lib/server/cm/verwaltung-schnittstellen.ts',
		'src/lib/server/gespraech/verwaltung-schnittstellen.ts',
		'src/lib/server/mitteilung/verwaltung-schnittstellen.ts',
		'src/lib/server/anlass/verwaltung-schnittstellen.ts'
	])('prüft %s', (pfad) => {
		expect(betrifftBauregel(pfad)).toBe(true);
	});
	it('lässt andere Dateien aus', () => {
		expect(betrifftBauregel('src/lib/server/status.ts')).toBe(false);
		expect(betrifftBauregel('src/lib/server/anlass/schnittstellen.ts')).toBe(false);
		expect(betrifftBauregel('src/lib/server/mitteilung/schnittstellen.ts')).toBe(false);
		expect(betrifftBauregel('src/lib/server/gespraech/schnittstellen.ts')).toBe(false);
	});
});
