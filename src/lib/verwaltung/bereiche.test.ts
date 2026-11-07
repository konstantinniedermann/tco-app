import { describe, expect, test } from 'vitest';
import type { VerwaltungsRolle } from '../server/admin/rollen.ts';
import { BEREICHE, darf, type Bereich } from './bereiche.ts';

// Matrix der Spec «Rollen schärfen», Abschnitt Rechte: [lesen, schreiben] je Rolle und Bereich.
const MATRIX: Record<VerwaltungsRolle, Record<Bereich, [boolean, boolean]>> = {
	mytco: { mitglieder: [true, false], cm: [true, false], rollen: [true, true] },
	mitglieder: { mitglieder: [true, true], cm: [false, false], rollen: [false, false] },
	cm: { mitglieder: [false, false], cm: [true, true], rollen: [false, false] }
};

describe('Bereiche der Verwaltung', () => {
	test('RR-07: BEREICHE nennt genau die Rollen der Spec', () => {
		expect(BEREICHE).toEqual({
			mitglieder: { lesen: ['mitglieder', 'mytco'], schreiben: ['mitglieder'] },
			cm: { lesen: ['cm', 'mytco'], schreiben: ['cm'] },
			rollen: { lesen: ['mytco'], schreiben: ['mytco'] }
		});
	});

	test('RR-07: jede Rolle allein liest und schreibt nach der Matrix', () => {
		for (const [rolle, bereiche] of Object.entries(MATRIX)) {
			for (const [bereich, [lesen, schreiben]] of Object.entries(bereiche)) {
				const r = [rolle as VerwaltungsRolle];
				const b = bereich as Bereich;
				expect([rolle, bereich, darf(r, b, 'lesen'), darf(r, b, 'schreiben')]).toEqual([
					rolle,
					bereich,
					lesen,
					schreiben
				]);
			}
		}
	});

	test('RR-07: einzelne Fälle der Spec', () => {
		expect(darf(['mytco'], 'mitglieder', 'schreiben')).toBe(false);
		expect(darf(['mytco'], 'rollen', 'schreiben')).toBe(true);
		expect(darf(['mitglieder'], 'rollen', 'lesen')).toBe(false);
		expect(darf(['cm'], 'mitglieder', 'lesen')).toBe(false);
	});

	test('RR-01: Rechte addieren sich; ohne Rolle nichts', () => {
		expect(darf(['mytco', 'mitglieder'], 'mitglieder', 'schreiben')).toBe(true);
		expect(darf(['mytco', 'mitglieder'], 'cm', 'schreiben')).toBe(false);
		expect(darf(['mitglieder', 'cm'], 'cm', 'schreiben')).toBe(true);
		expect(darf(['mitglieder', 'cm'], 'rollen', 'lesen')).toBe(false);
		for (const b of Object.keys(BEREICHE) as Bereich[]) {
			expect(darf([], b, 'lesen')).toBe(false);
			expect(darf([], b, 'schreiben')).toBe(false);
		}
	});
});
