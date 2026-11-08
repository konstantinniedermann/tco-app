import { describe, expect, it } from 'vitest';
import { leseCsv } from './csv.ts';

function ok(text: string) {
	const r = leseCsv(text);
	if (!r.ok) throw new Error(`erwartet: ok, war ${r.grund}`);
	return r;
}

describe('leseCsv', () => {
	it('A-MITGLIED-07: Komma als Trennzeichen, Kopf klein und getrimmt', () => {
		const r = ok(' Vorname ,NACHNAME\nErika,Beispiel\n');
		expect(r.kopf).toEqual(['vorname', 'nachname']);
		expect(r.zeilen).toEqual([{ nummer: 2, felder: ['Erika', 'Beispiel'] }]);
	});

	it('A-MITGLIED-07: Semikolon aus der Kopfzeile erkannt, Kommas im Feld bleiben', () => {
		const r = ok('vorname;ort\nErika;Olten, Altstadt');
		expect(r.kopf).toEqual(['vorname', 'ort']);
		expect(r.zeilen[0].felder).toEqual(['Erika', 'Olten, Altstadt']);
	});

	it('A-MITGLIED-07: BOM am Anfang und CRLF', () => {
		const r = ok('\uFEFFvorname;nachname\r\nErika;Beispiel\r\nMax;Muster\r\n');
		expect(r.kopf).toEqual(['vorname', 'nachname']);
		expect(r.zeilen.map((z) => z.nummer)).toEqual([2, 3]);
	});

	it('A-MITGLIED-07: nur CR als Zeilenende (altes Mac-Excel)', () => {
		const r = ok('vorname;nachname\rErika;Beispiel\r');
		expect(r.zeilen).toEqual([{ nummer: 2, felder: ['Erika', 'Beispiel'] }]);
	});

	it('A-MITGLIED-07: Anführungszeichen nach RFC 4180', () => {
		const r = ok('a;b\n"x;""y""";"z"\n');
		expect(r.zeilen[0].felder).toEqual(['x;"y"', 'z']);
	});

	it('A-MITGLIED-07: Zeilenumbruch im Feld, die Nummer der Folgezeile zählt weiter', () => {
		const r = ok('a;b\n"eins\nzwei";x\ny;z\n');
		expect(r.zeilen).toEqual([
			{ nummer: 2, felder: ['eins\nzwei', 'x'] },
			{ nummer: 4, felder: ['y', 'z'] }
		]);
	});

	it('A-MITGLIED-07: leere Zeilen und Zeilen aus lauter Trennzeichen fallen weg', () => {
		const r = ok('a;b\n\nx;y\n;\n  ;  \n\n');
		expect(r.zeilen).toEqual([{ nummer: 3, felder: ['x', 'y'] }]);
	});

	it('A-MITGLIED-07: Felder bleiben roh (Leerraum am Rand)', () => {
		const r = ok('a,b\n x , y \n');
		expect(r.zeilen[0].felder).toEqual([' x ', ' y ']);
	});

	it('A-MITGLIED-07: Anführungszeichen mitten im Feld ist ein Zeichen, keine Zeile geht verloren', () => {
		const r = ok('a;b\nHauptstr. 5";x\nc;d\ne;f\nWeg 12";y\n');
		expect(r.zeilen).toEqual([
			{ nummer: 2, felder: ['Hauptstr. 5"', 'x'] },
			{ nummer: 3, felder: ['c', 'd'] },
			{ nummer: 4, felder: ['e', 'f'] },
			{ nummer: 5, felder: ['Weg 12"', 'y'] }
		]);
	});

	it('A-MITGLIED-07: Leerzeilen vor der Kopfzeile stören die Erkennung des Trennzeichens nicht', () => {
		const r = ok('\n\r\nvorname;ort\nErika;Olten, Altstadt\n');
		expect(r.kopf).toEqual(['vorname', 'ort']);
		expect(r.zeilen).toEqual([{ nummer: 4, felder: ['Erika', 'Olten, Altstadt'] }]);
	});

	it('A-MITGLIED-07: offenes Anführungszeichen ist ein Fehler der Datei', () => {
		expect(leseCsv('a;b\n"x;y\n')).toEqual({ ok: false, grund: 'anfuehrungszeichen' });
	});

	it('A-MITGLIED-07: leere Datei oder nur Leerraum', () => {
		expect(leseCsv('')).toEqual({ ok: false, grund: 'leer' });
		expect(leseCsv('\uFEFF \r\n\n')).toEqual({ ok: false, grund: 'leer' });
	});

	it('A-MITGLIED-07: Kopf ohne Daten ergibt keine Zeilen', () => {
		expect(ok('a;b\n').zeilen).toEqual([]);
	});
});
