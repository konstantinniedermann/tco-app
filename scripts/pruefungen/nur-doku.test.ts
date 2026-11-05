import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { istNurDoku } from './nur-doku.ts';

describe('istNurDoku', () => {
	it('erkennt reine Doku-Änderungen', () => {
		expect(istNurDoku(['docs/a/b.md', 'CLAUDE.md', 'README.md'])).toBe(true);
		expect(istNurDoku(['docs/bild.png'])).toBe(true);
	});
	it('erkennt Code', () => {
		expect(istNurDoku(['docs/a.md', 'scripts/x.sh'])).toBe(false);
		expect(istNurDoku(['.github/workflows/check.yml'])).toBe(false);
	});
	it('zählt die Datenschutzerklärung als Code (die App baut sie ein, DS-09)', () => {
		expect(istNurDoku(['docs/datenschutzerklaerung.md'])).toBe(false);
		expect(istNurDoku(['docs/datenschutz.md'])).toBe(true);
	});
	it('behandelt die leere Liste als Doku', () => {
		expect(istNurDoku([])).toBe(true);
	});
});

describe('nur-doku.ts', () => {
	it('importiert nur Node-Module (die CI führt die Fassung des Basis-Commits allein aus)', () => {
		const quelle = readFileSync('scripts/pruefungen/nur-doku.ts', 'utf-8');
		const importe = [
			...quelle.matchAll(/\bfrom\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]/g)
		];
		expect(importe.map((t) => t[1] ?? t[2]).filter((m) => !m.startsWith('node:'))).toEqual([]);
	});
});
