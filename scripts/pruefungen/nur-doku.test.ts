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
	it('behandelt die leere Liste als Doku', () => {
		expect(istNurDoku([])).toBe(true);
	});
});
