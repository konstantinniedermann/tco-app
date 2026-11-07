import { describe, expect, test } from 'vitest';
import { bereichVon, nurAnsehen, rechte, startziel, umleitung } from './umleiten.ts';

describe('RR-07: Bereiche der Verwaltung je Rolle', () => {
	test('startziel: MyTCO- und Mitglieder-Admin beginnen bei den Mitgliedern, nur cm bei den Turnieren', () => {
		expect(startziel(['mytco'])).toBe('/verwaltung/mitglieder');
		expect(startziel(['mitglieder'])).toBe('/verwaltung/mitglieder');
		expect(startziel(['mytco', 'mitglieder'])).toBe('/verwaltung/mitglieder');
		expect(startziel(['cm'])).toBe('/verwaltung/turniere');
	});

	test('bereichVon ordnet jede Seite ihrem Bereich zu', () => {
		expect(bereichVon('/verwaltung/mitglieder')).toBe('mitglieder');
		expect(bereichVon('/verwaltung/mitglieder/12')).toBe('mitglieder');
		expect(bereichVon('/verwaltung/anlaesse/neu')).toBe('mitglieder');
		expect(bereichVon('/verwaltung/fairgate')).toBe('mitglieder');
		expect(bereichVon('/verwaltung/verlauf')).toBe('mitglieder');
		expect(bereichVon('/verwaltung/mitteilungen')).toBe('mitglieder');
		expect(bereichVon('/verwaltung/turniere/3/kategorien/7')).toBe('cm');
		expect(bereichVon('/verwaltung/rollen')).toBe('rollen');
		expect(bereichVon('/verwaltung/bestaetigen')).toBeNull();
		expect(bereichVon('/verwaltung')).toBeNull();
		// Kein Präfix-Treffer über die Grenze eines Pfadteils hinaus.
		expect(bereichVon('/verwaltung/rollenspiel')).toBeNull();
	});

	test('eine Seite ausserhalb der lesbaren Bereiche leitet zum startziel um', () => {
		expect(umleitung('/verwaltung/rollen', ['mitglieder'], false)).toBe('/verwaltung/mitglieder');
		expect(umleitung('/verwaltung/rollen', ['cm'], false)).toBe('/verwaltung/turniere');
		expect(umleitung('/verwaltung/mitglieder', ['cm'], false)).toBe('/verwaltung/turniere');
		expect(umleitung('/verwaltung/anlaesse', ['cm'], false)).toBe('/verwaltung/turniere');
		expect(umleitung('/verwaltung/mitteilungen', ['cm'], false)).toBe('/verwaltung/turniere');
		expect(umleitung('/verwaltung/turniere', ['mitglieder'], false)).toBe('/verwaltung/mitglieder');
	});

	test('lesbare Seiten und die Bestätigung bleiben', () => {
		expect(umleitung('/verwaltung/rollen', ['mytco'], false)).toBeNull();
		expect(umleitung('/verwaltung/turniere/3', ['mytco'], false)).toBeNull();
		expect(umleitung('/verwaltung/mitglieder/12', ['mytco'], false)).toBeNull();
		expect(umleitung('/verwaltung/turniere', ['cm'], false)).toBeNull();
		expect(umleitung('/verwaltung/bestaetigen', ['cm'], false)).toBeNull();
	});

	test('Regel 3: Seiten zum Anlegen ohne Schreibrecht führen zur Liste ihres Bereichs', () => {
		expect(umleitung('/verwaltung/mitglieder/neu', ['mytco'], false)).toBe(
			'/verwaltung/mitglieder'
		);
		expect(umleitung('/verwaltung/anlaesse/neu', ['mytco'], false)).toBe('/verwaltung/anlaesse');
		expect(umleitung('/verwaltung/turniere/neu', ['mytco'], false)).toBe('/verwaltung/turniere');
		expect(umleitung('/verwaltung/turniere/3/kategorien/neu', ['mytco'], false)).toBe(
			'/verwaltung/turniere/3'
		);
		expect(umleitung('/verwaltung/mitglieder/neu', ['mitglieder'], false)).toBeNull();
		// In der Ansicht schreibt keine Rolle, auch nicht die gewählte.
		expect(umleitung('/verwaltung/turniere/neu', ['cm'], true)).toBe('/verwaltung/turniere');
	});

	test('rechte: der MyTCO-Admin liest alles und schreibt nur Rollen; in der Ansicht schreibt niemand', () => {
		expect(rechte(['mytco'], false)).toEqual({
			darfLesen: { mitglieder: true, cm: true, rollen: true },
			darfSchreiben: { mitglieder: false, cm: false, rollen: true }
		});
		expect(rechte(['mitglieder', 'cm'], false)).toEqual({
			darfLesen: { mitglieder: true, cm: true, rollen: false },
			darfSchreiben: { mitglieder: true, cm: true, rollen: false }
		});
		expect(rechte(['cm'], true)).toEqual({
			darfLesen: { mitglieder: false, cm: true, rollen: false },
			darfSchreiben: { mitglieder: false, cm: false, rollen: false }
		});
	});

	test('nurAnsehen: Hinweis auf Seiten, die die Rolle nur lesen darf, nicht im Verlauf und nicht in der Ansicht', () => {
		expect(nurAnsehen('/verwaltung/mitglieder/12', ['mytco'], false)).toBe('mitglieder');
		expect(nurAnsehen('/verwaltung/turniere', ['mytco'], false)).toBe('cm');
		expect(nurAnsehen('/verwaltung/verlauf', ['mytco'], false)).toBeNull();
		expect(nurAnsehen('/verwaltung/rollen', ['mytco'], false)).toBeNull();
		expect(nurAnsehen('/verwaltung/mitglieder', ['mitglieder'], false)).toBeNull();
		expect(nurAnsehen('/verwaltung/turniere', ['cm'], true)).toBeNull();
		expect(nurAnsehen('/verwaltung/bestaetigen', ['mytco'], false)).toBeNull();
	});
});
