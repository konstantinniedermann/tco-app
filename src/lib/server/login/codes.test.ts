import { describe, expect, it } from 'vitest';
import {
	BRIEF_ALPHABET,
	erzeugeBriefCode,
	erzeugeMailCode,
	formatiereBriefCode,
	gleich,
	hashBriefCode,
	hashMailCode,
	normalisiereBriefCode,
	normalisiereMailCode
} from './codes.ts';

const SCHLUESSEL = 'a'.repeat(32);

describe('Brief-Code erzeugen', () => {
	it('SI-01: Brief-Code hat 10 Zeichen aus dem Alphabet', () => {
		const muster = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/;
		for (let i = 0; i < 1000; i++) {
			expect(erzeugeBriefCode()).toMatch(muster);
		}
	});

	it('SI-01: Brief-Code verwirft Bytes über 247 statt Modulo', () => {
		const folge = [255, 248, ...new Array(20).fill(0)];
		let pos = 0;
		const zufall = (n: number) => {
			const teil = folge.slice(pos, pos + n);
			pos += n;
			while (teil.length < n) teil.push(0);
			return Uint8Array.from(teil);
		};
		expect(erzeugeBriefCode(zufall)[0]).toBe('A');
	});

	it('SI-01: grobe Gleichverteilung', () => {
		const zaehler = new Map<string, number>();
		for (let i = 0; i < 3100; i++) {
			for (const z of erzeugeBriefCode()) zaehler.set(z, (zaehler.get(z) ?? 0) + 1);
		}
		expect(zaehler.size).toBe(BRIEF_ALPHABET.length);
		for (const anzahl of zaehler.values()) {
			expect(anzahl).toBeGreaterThanOrEqual(800);
			expect(anzahl).toBeLessThanOrEqual(1200);
		}
	});
});

describe('Mail-Code erzeugen', () => {
	it('SI-01: Mail-Code hat 6 Ziffern, auch mit führender Null', () => {
		expect(erzeugeMailCode((n) => new Uint8Array(n))).toBe('000000');
		expect(erzeugeMailCode()).toMatch(/^\d{6}$/);
	});
});

describe('normalisieren und formatieren', () => {
	it('UI-07: normalisiert Gross/klein, Leerzeichen und Bindestrich', () => {
		expect(normalisiereBriefCode(' k7mpq-r4xht ')).toBe('K7MPQR4XHT');
		expect(normalisiereBriefCode('K7MPQ R4XHT')).toBe('K7MPQR4XHT');
	});

	it('UI-07: falsche Länge oder fremde Zeichen → null', () => {
		expect(normalisiereBriefCode('K7MPQR4XH0')).toBeNull();
		expect(normalisiereBriefCode('K7MPQ')).toBeNull();
		expect(normalisiereBriefCode('x'.repeat(10000))).toBeNull();
	});

	it('normalisiereMailCode', () => {
		expect(normalisiereMailCode(' 012 345 ')).toBe('012345');
		expect(normalisiereMailCode('12345a')).toBeNull();
		expect(normalisiereMailCode('12345')).toBeNull();
	});

	it('formatiereBriefCode', () => {
		expect(formatiereBriefCode('K7MPQR4XHT')).toBe('K7MPQ-R4XHT');
	});
});

describe('Hashes', () => {
	it('DS-10: Hash hängt vom Schlüssel ab und ist deterministisch', () => {
		const code = erzeugeBriefCode();
		const h = hashBriefCode(SCHLUESSEL, code);
		expect(h).toMatch(/^[0-9a-f]{64}$/);
		expect(hashBriefCode(SCHLUESSEL, code)).toBe(h);
		expect(hashBriefCode('b'.repeat(32), code)).not.toBe(h);
	});

	it('DS-10: hashMailCode unterscheidet Konten', () => {
		const code = erzeugeMailCode();
		expect(hashMailCode(SCHLUESSEL, 1, code)).not.toBe(hashMailCode(SCHLUESSEL, 2, code));
		expect(hashMailCode(SCHLUESSEL, 1, code)).toBe(hashMailCode(SCHLUESSEL, 1, code));
	});

	it('gleich vergleicht, auch bei verschiedener Länge', () => {
		expect(gleich('abc', 'abc')).toBe(true);
		expect(gleich('abc', 'abd')).toBe(false);
		expect(gleich('abc', 'abcd')).toBe(false);
	});
});
