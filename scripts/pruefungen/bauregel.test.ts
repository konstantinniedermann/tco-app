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
	const gut = [
		"import { holeAdminDienste } from '../../../../../lib/server/admin/index.ts';",
		"import { getMitglied } from '../../../../../lib/server/admin/schnittstellen.ts';",
		"import type { RequestHandler } from './$types';"
	].join('\n');
	it('jede +server.ts unter api/admin importiert nur aus admin/index.ts und admin/schnittstellen.ts', () => {
		expect(pruefeBauregel(new Map([[route, gut]]))).toEqual([]);
		for (const schlecht of [
			"import { holeDb } from '../../../lib/server/db/index.ts';",
			"import { listeMitglieder } from '../../../lib/server/admin/mitglieder.ts';",
			"import { x } from '../../../lib/server/admin/index.ts.evil';",
			"export { y } from '../../../lib/server/login/index.ts';",
			"import '../../../lib/server/db/schema.ts';"
		]) {
			expect(pruefeBauregel(new Map([[route, `${gut}\n${schlecht}`]]))).toHaveLength(1);
		}
	});
	it('gilt nur unter api/admin', () => {
		const fremd = "import { holeDb } from '../../../lib/server/db/index.ts';";
		expect(pruefeBauregel(new Map([['src/routes/api/sitzung/+server.ts', fremd]]))).toEqual([]);
	});
});

describe('betrifftBauregel', () => {
	it.each(['src/routes/+page.ts', 'vite.config.ts', 'src/lib/a.remote.ts', 'lib/b.remote.js'])(
		'prüft %s',
		(pfad) => {
			expect(betrifftBauregel(pfad)).toBe(true);
		}
	);
	it('lässt andere Dateien aus', () => {
		expect(betrifftBauregel('src/lib/server/status.ts')).toBe(false);
	});
});
