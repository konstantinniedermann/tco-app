import { describe, expect, test } from 'vitest';
import { amtlicherName, anredeName, nameText, pruefeRufname, sichtbarerRufname } from './name.ts';

const muster = { rufname: 'Hannes', vorname: 'Johannes', nachname: 'Muster' };

describe('Namensdarstellung', () => {
	test('nameText mit Rufname', () => {
		expect(nameText(muster, 'vorname-zuerst')).toBe('Hannes (Johannes Muster)');
		expect(nameText(muster, 'nachname-zuerst')).toBe('Hannes (Muster, Johannes)');
	});

	test('ohne Rufname nur der amtliche Name', () => {
		const n = { ...muster, rufname: null };
		expect(nameText(n, 'vorname-zuerst')).toBe('Johannes Muster');
		expect(amtlicherName(n, 'nachname-zuerst')).toBe('Muster, Johannes');
		expect(sichtbarerRufname(n)).toBeNull();
	});

	test('Rufname gleich Vorname (ohne Gross-/Kleinschreibung) zählt als keiner', () => {
		const n = { ...muster, rufname: 'johannes' };
		expect(sichtbarerRufname(n)).toBeNull();
		expect(nameText(n, 'vorname-zuerst')).toBe('Johannes Muster');
		expect(sichtbarerRufname({ ...muster, rufname: '  ' })).toBeNull();
		expect(sichtbarerRufname(muster)).toBe('Hannes');
	});

	test('anredeName', () => {
		expect(anredeName(muster)).toBe('Hannes');
		expect(anredeName({ ...muster, rufname: null })).toBe('Johannes');
	});
});

describe('pruefeRufname', () => {
	test('trimmt', () => {
		expect(pruefeRufname('  Hannes ')).toEqual({ ok: true, rufname: 'Hannes' });
	});

	test('leer wird null', () => {
		for (const roh of ['', '   ', null, undefined]) {
			expect(pruefeRufname(roh)).toEqual({ ok: true, rufname: null });
		}
	});

	test('höchstens 10 Zeichen', () => {
		expect(pruefeRufname('Abcdefghijk')).toEqual({ ok: false, fehler: 'Höchstens 10 Zeichen.' });
		expect(pruefeRufname('Abcdefghij')).toEqual({ ok: true, rufname: 'Abcdefghij' });
	});

	test('zählt Grapheme', () => {
		expect(pruefeRufname('Zoë').ok).toBe(true);
		expect(pruefeRufname('👍🏽Ben').ok).toBe(true);
		expect(pruefeRufname('👍🏽'.repeat(10)).ok).toBe(true);
		expect(pruefeRufname('👍🏽'.repeat(11)).ok).toBe(false);
	});

	test('lehnt Steuerzeichen und Nicht-Text ab', () => {
		expect(pruefeRufname('Han​nes')).toEqual({
			ok: false,
			fehler: 'Unsichtbares Sonderzeichen, bitte neu eintippen.'
		});
		expect(pruefeRufname(42)).toEqual({ ok: false, fehler: 'Ungültig.' });
	});
});
