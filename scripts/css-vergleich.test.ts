import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { vergleicheOrdner } from './css-vergleich.ts';

const aufzuraeumen: string[] = [];

/** Legt einen echten Temp-Ordner mit den genannten Dateien an (Name → Inhalt). */
function ordner(dateien: Record<string, string>): string {
	const pfad = mkdtempSync(join(tmpdir(), 'css-vergleich-test-'));
	aufzuraeumen.push(pfad);
	for (const [name, inhalt] of Object.entries(dateien)) writeFileSync(join(pfad, name), inhalt);
	return pfad;
}

afterEach(() => {
	for (const pfad of aufzuraeumen.splice(0)) rmSync(pfad, { recursive: true, force: true });
});

describe('Stylesheet-Vergleich', () => {
	it('meldet gleiche Dateien als gleich', () => {
		const a = ordner({ '0.DrKJQ_Q0.css': ':root{--a:1}.x{color:red}' });
		const b = ordner({ '0.DrKJQ_Q0.css': ':root{--a:1}.x{color:red}' });
		const ergebnis = vergleicheOrdner(a, b);
		expect(ergebnis.gleich).toBe(true);
		expect(ergebnis.meldungen.join('\n')).toContain('gleich');
	});

	it('erkennt anderen Inhalt und nennt die erste abweichende Stelle', () => {
		const a = ordner({ '0.DrKJQ_Q0.css': '.a{color:red}.b{color:blue}' });
		const b = ordner({ '0.DrKJQ_Q0.css': '.a{color:red}.c{color:blue}' });
		const ergebnis = vergleicheOrdner(a, b);
		expect(ergebnis.gleich).toBe(false);
		const text = ergebnis.meldungen.join('\n');
		expect(text).toContain('Inhalt anders');
		expect(text).toContain('Zeichen 15');
		expect(text).toContain('.a{color:red}.b');
		expect(text).toContain('.a{color:red}.c');
	});

	it('erkennt zwei vertauschte Regeln', () => {
		const a = ordner({ '0.DrKJQ_Q0.css': '.a{color:red}.b{color:blue}' });
		const b = ordner({ '0.DrKJQ_Q0.css': '.b{color:blue}.a{color:red}' });
		expect(vergleicheOrdner(a, b).gleich).toBe(false);
	});

	it('meldet nur anderen Namen (Hash) bei gleichem Inhalt, aber nicht als gleich', () => {
		const a = ordner({ '0.DrKJQ_Q0.css': '.a{color:red}' });
		const b = ordner({ '0.Zzzzzzz9.css': '.a{color:red}' });
		const ergebnis = vergleicheOrdner(a, b);
		expect(ergebnis.gleich).toBe(false);
		const text = ergebnis.meldungen.join('\n');
		expect(text).toContain('nur der Dateiname');
		expect(text).toContain('0.DrKJQ_Q0.css');
		expect(text).toContain('0.Zzzzzzz9.css');
	});

	it('meldet bei anderem Hash und anderem Inhalt den Inhalt', () => {
		const a = ordner({ '0.DrKJQ_Q0.css': '.a{color:red}' });
		const b = ordner({ '0.Zzzzzzz9.css': '.a{color:blue}' });
		const ergebnis = vergleicheOrdner(a, b);
		expect(ergebnis.gleich).toBe(false);
		expect(ergebnis.meldungen.join('\n')).toContain('Inhalt anders');
	});

	it('meldet eine fehlende und eine neue Datei', () => {
		const a = ordner({ '0.DrKJQ_Q0.css': '.a{}', 'Briefdruck.D8J5PXgb.css': '.b{}' });
		const b = ordner({ '0.DrKJQ_Q0.css': '.a{}', 'Neu.AAAAAAAA.css': '.c{}' });
		const ergebnis = vergleicheOrdner(a, b);
		expect(ergebnis.gleich).toBe(false);
		const text = ergebnis.meldungen.join('\n');
		expect(text).toContain('fehlt nachher: Briefdruck.D8J5PXgb.css');
		expect(text).toContain('neu nachher: Neu.AAAAAAAA.css');
	});

	it('meldet eine Datei, die dazukommt, auch ohne Gegenstück', () => {
		const a = ordner({ '0.DrKJQ_Q0.css': '.a{}' });
		const b = ordner({ '0.DrKJQ_Q0.css': '.a{}', '1.BBBBBBBB.css': '.b{}' });
		expect(vergleicheOrdner(a, b).gleich).toBe(false);
	});

	it('ignoriert .br, .gz und andere Dateien', () => {
		const a = ordner({
			'0.DrKJQ_Q0.css': '.a{}',
			'0.DrKJQ_Q0.css.br': 'x',
			'0.DrKJQ_Q0.css.gz': 'y'
		});
		const b = ordner({ '0.DrKJQ_Q0.css': '.a{}', 'notiz.txt': 'z' });
		expect(vergleicheOrdner(a, b).gleich).toBe(true);
	});

	it('wirft einen verständlichen Fehler für einen fehlenden Ordner', () => {
		const a = ordner({ '0.DrKJQ_Q0.css': '.a{}' });
		const fehlt = join(a, 'gibt-es-nicht');
		expect(() => vergleicheOrdner(a, fehlt)).toThrow(/Ordner/);
	});

	it('wirft einen Fehler, wenn ein Ordner keine CSS-Datei enthält', () => {
		const a = ordner({ '0.DrKJQ_Q0.css': '.a{}' });
		const leer = ordner({});
		mkdirSync(join(leer, 'unterordner'));
		expect(() => vergleicheOrdner(a, leer)).toThrow(/keine CSS-Datei/);
	});

	it('vergleicht Bytes: verschiedene ungültige Bytes sind nicht gleich', () => {
		const a = ordner({});
		const b = ordner({});
		writeFileSync(join(a, '0.DrKJQ_Q0.css'), Buffer.from([0x2e, 0x61, 0xff]));
		writeFileSync(join(b, '0.DrKJQ_Q0.css'), Buffer.from([0x2e, 0x61, 0xfe]));
		const ergebnis = vergleicheOrdner(a, b);
		expect(ergebnis.gleich).toBe(false);
		expect(ergebnis.meldungen.join('\n')).toContain('Inhalt anders');
	});

	it('bricht ab, wenn eine CSS-Datei in einem Unterordner liegt', () => {
		const a = ordner({ '0.DrKJQ_Q0.css': '.a{}' });
		const b = ordner({ '0.DrKJQ_Q0.css': '.a{}' });
		mkdirSync(join(b, 'unter'));
		writeFileSync(join(b, 'unter', 'x.AAAAAAAA.css'), '.x{}');
		expect(() => vergleicheOrdner(a, b)).toThrow(/Unterordner/);
		expect(() => vergleicheOrdner(b, a)).toThrow(/Unterordner/);
	});

	it('bricht ab, wenn beide Argumente auf denselben Ordner zeigen', () => {
		const a = ordner({ '0.DrKJQ_Q0.css': '.a{}' });
		expect(() => vergleicheOrdner(a, a)).toThrow(/derselbe Ordner/);
		expect(() => vergleicheOrdner(a, join(a, '..', basename(a)))).toThrow(/derselbe Ordner/);
	});

	it('lässt mehrere Kandidaten mit gleichem Stamm als fehlt/neu stehen', () => {
		const a = ordner({ '0.AAAAAAAA.css': '.a{}' });
		const b = ordner({ '0.BBBBBBBB.css': '.a{}', '0.CCCCCCCC.css': '.a{}' });
		const ergebnis = vergleicheOrdner(a, b);
		expect(ergebnis.gleich).toBe(false);
		const text = ergebnis.meldungen.join('\n');
		expect(text).toContain('fehlt nachher: 0.AAAAAAAA.css');
		expect(text).toContain('neu nachher: 0.BBBBBBBB.css');
		expect(text).toContain('neu nachher: 0.CCCCCCCC.css');
	});
});
