import { describe, expect, it } from 'vitest';
import { FELDER } from './angaben.ts';
import { MAX_BYTES, MAX_ZEILEN, PFLICHT_SPALTEN, pruefeDatei } from './einlesen.ts';

const KOPF = 'mitgliedernummer;vorname;nachname;strasse;plz;ort;email';
const ERIKA = 'A1;Erika;Beispiel;Musterweg 1;4600;Olten;Erika.Beispiel@example.org';
const MAX = 'B2;Max;Muster;Testgasse 2;4600;Olten;max.muster@example.org';

function ok(text: string) {
	const r = pruefeDatei(text, 2026);
	if (!r.ok) throw new Error(`erwartet: ok, war ${r.grund}`);
	return r;
}

describe('pruefeDatei', () => {
	it('A-MITGLIED-07: gültige Datei, Angaben normalisiert, Zeilennummern der Datei', () => {
		const r = ok(`${KOPF}\n${ERIKA}\n${MAX}\n`);
		expect(r.fehlerhaft).toEqual([]);
		expect(r.gueltig.map((g) => g.zeile)).toEqual([2, 3]);
		expect(r.gueltig[0].angaben).toMatchObject({
			mitgliedernummer: 'A1',
			email: 'erika.beispiel@example.org',
			telefon: null,
			jahrgang: null
		});
	});

	it('A-MITGLIED-07: Reihenfolge der Spalten frei, freiwillige Spalten gelesen', () => {
		const r = ok(
			'email,jahrgang,nachname,vorname,ort,plz,strasse,mitgliedernummer,geschlecht\n' +
				'e@example.org,1980,Beispiel,Erika,Olten,4600,Weg 1,C3,w\n'
		);
		expect(r.gueltig[0].angaben).toMatchObject({
			jahrgang: 1980,
			geschlecht: 'w',
			vorname: 'Erika'
		});
	});

	it('A-MITGLIED-07: Pflichtspalten sind die Pflichtfelder', () => {
		expect(PFLICHT_SPALTEN).toEqual([
			'mitgliedernummer',
			'vorname',
			'nachname',
			'strasse',
			'plz',
			'ort',
			'email'
		]);
	});

	it('A-MITGLIED-07: unbekannte, fehlende und doppelte Spalten sind ein Fehler der Datei', () => {
		expect(pruefeDatei('mitgliedernummer;vorname;vorname;iban\nx;y;z;w\n', 2026)).toEqual({
			ok: false,
			grund: 'spalten',
			unbekannt: ['iban'],
			fehlend: ['nachname', 'strasse', 'plz', 'ort', 'email'],
			doppelt: ['vorname']
		});
	});

	it('A-MITGLIED-07: alle Spalten der Vorlage sind bekannt', () => {
		const r = ok(`${FELDER.join(';')}\nA1;Erika;Beispiel;Weg 1;4600;Olten;e@example.org;;;;\n`);
		expect(r.gueltig).toHaveLength(1);
	});

	it('A-MITGLIED-07: leere Datei, nur Kopf, offenes Anführungszeichen', () => {
		expect(pruefeDatei('', 2026)).toEqual({ ok: false, grund: 'leer' });
		expect(pruefeDatei(`${KOPF}\n`, 2026)).toEqual({ ok: false, grund: 'keine-zeilen' });
		expect(pruefeDatei(`${KOPF}\n"A1;x\n`, 2026)).toEqual({
			ok: false,
			grund: 'anfuehrungszeichen'
		});
	});

	it('A-MITGLIED-07: Windows-1252 statt UTF-8 (Ersatzzeichen) ist ein Fehler der Datei', () => {
		const text = `${KOPF}\nA1;Erika;M�ller;Weg 1;4600;Olten;e@example.org\n`;
		expect(pruefeDatei(text, 2026)).toEqual({ ok: false, grund: 'kodierung' });
	});

	it('A-MITGLIED-07: höchstens 400 KB (UTF-8-Bytes)', () => {
		const kopf = `${KOPF}\n`;
		const fuellung = (n: number) => `${kopf}${ERIKA}\n`.padEnd(n, ' ');
		expect(MAX_BYTES).toBe(400 * 1024);
		expect(pruefeDatei(fuellung(MAX_BYTES), 2026).ok).toBe(true);
		expect(pruefeDatei(fuellung(MAX_BYTES + 1), 2026)).toEqual({ ok: false, grund: 'zu-gross' });
		// «ü» zählt zwei Bytes: gleich viele Zeichen, ein Byte zu viel
		expect(pruefeDatei(fuellung(MAX_BYTES).replace('Erika', 'Erikü'), 2026)).toEqual({
			ok: false,
			grund: 'zu-gross'
		});
	});

	it('A-MITGLIED-07: höchstens 2000 Datenzeilen', () => {
		const zeilen = (n: number) =>
			Array.from(
				{ length: n },
				(_, i) => `N${i};Erika;Beispiel;Weg 1;4600;Olten;e${i}@example.org`
			);
		expect(MAX_ZEILEN).toBe(2000);
		expect(pruefeDatei([KOPF, ...zeilen(2000)].join('\n'), 2026).ok).toBe(true);
		expect(pruefeDatei([KOPF, ...zeilen(2001)].join('\n'), 2026)).toEqual({
			ok: false,
			grund: 'zu-viele-zeilen'
		});
	});

	it('A-MITGLIED-07: Zeilenfehler je Feld, ohne den Wert im Text, mit Name', () => {
		const r = ok(`${KOPF}\n${MAX}\nA1;Erika;Beispiel;Weg 1;46;Olten;kein-at\n`);
		expect(r.gueltig.map((g) => g.zeile)).toEqual([2]);
		expect(r.fehlerhaft).toEqual([
			{
				zeile: 3,
				name: 'Erika Beispiel',
				fehler: { plz: '4 Ziffern', email: 'keine gültige E-Mail-Adresse' }
			}
		]);
		expect(JSON.stringify(r.fehlerhaft)).not.toContain('kein-at');
	});

	it('A-MITGLIED-07: falsche Zahl der Felder', () => {
		const r = ok(`${KOPF}\nA1;Erika;Beispiel\n`);
		expect(r.fehlerhaft).toEqual([
			{ zeile: 2, name: 'Erika Beispiel', fehler: { zeile: '3 Felder statt 7' } }
		]);
	});

	it('A-MITGLIED-07: leere Spalten am Ende (Excel) sind erlaubt, solange sie leer sind', () => {
		const r = ok(`${KOPF};;\n${ERIKA};;\n${MAX};x\n`);
		expect(r.gueltig.map((g) => g.zeile)).toEqual([2]);
		expect(r.fehlerhaft).toEqual([
			{ zeile: 3, name: 'Max Muster', fehler: { zeile: '8 Felder statt 7' } }
		]);
	});

	it('A-MITGLIED-07: Nummer fehlt ist ein Fehler (Pflicht beim Einlesen)', () => {
		const r = ok(`${KOPF}\n;Erika;Beispiel;Weg 1;4600;Olten;e@example.org\n`);
		expect(r.fehlerhaft[0].fehler).toEqual({ mitgliedernummer: 'fehlt' });
	});

	it('A-MITGLIED-07: Nummer oder E-Mail doppelt in der Datei – alle betroffenen Zeilen', () => {
		const r = ok(
			[
				KOPF,
				ERIKA,
				'a1;Erik;Anders;Weg 2;4600;Olten;erik@example.org',
				MAX,
				'D4;Maxi;Muster;Weg 3;4600;Olten;MAX.MUSTER@example.org',
				'E5;Eva;Einzel;Weg 4;4600;Olten;eva@example.org'
			].join('\n')
		);
		expect(r.gueltig.map((g) => g.zeile)).toEqual([6]);
		expect(r.fehlerhaft.map((f) => [f.zeile, f.fehler])).toEqual([
			[2, { mitgliedernummer: 'kommt in der Datei mehrfach vor' }],
			[3, { mitgliedernummer: 'kommt in der Datei mehrfach vor' }],
			[4, { email: 'kommt in der Datei mehrfach vor' }],
			[5, { email: 'kommt in der Datei mehrfach vor' }]
		]);
	});

	it('A-MITGLIED-07: Name höchstens 100 Zeichen, ohne Leerraum am Rand', () => {
		const lang = 'x'.repeat(150);
		const r = ok(`${KOPF}\nA1; ${lang} ;Beispiel;Weg 1;4600;Olten;e@example.org\n`);
		expect(r.fehlerhaft[0].name).toHaveLength(100);
		expect(r.fehlerhaft[0].name.startsWith('x')).toBe(true);
	});
});
