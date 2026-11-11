import { readFileSync } from 'node:fs';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { AUSNAHMEN } from '../eslint.config.js';

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
		['db/neu.ts', "import { x } from '../login/sitzung.ts';"]
	])('meldet in %s den Import %s', async (datei, code) => {
		expect(await meldungen(datei, code)).toHaveLength(1);
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

	it('jede Ausnahme ist noch nötig (die Datei importiert das Ziel wirklich)', () => {
		for (const a of AUSNAHMEN) {
			const quelle = readFileSync(`${SERVER}/${a.von}`, 'utf8');
			const ziel = a.nach.replace(/\.ts$/, '').replace(/\./g, '\\.');
			const importiert = new RegExp(`from '(?:\\.\\./|\\$lib/server/)${ziel}(?:\\.ts)?'`).test(
				quelle
			);
			expect(importiert, `${a.von} importiert ${a.nach} nicht mehr: Ausnahme streichen`).toBe(true);
		}
	});

	it('jede Ausnahme nennt einen Schritt', () => {
		for (const a of AUSNAHMEN) expect(a.schritt, `${a.von} → ${a.nach}`).toMatch(/\S/);
	});
});
