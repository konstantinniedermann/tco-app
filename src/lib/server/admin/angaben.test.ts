import { describe, expect, it } from 'vitest';
import { pruefeAngaben } from './angaben.ts';

const OPT = { nummerPflicht: false, jahr: 2026 };

const gueltig = {
	vorname: 'Erika',
	nachname: 'Beispiel',
	strasse: 'Musterweg 1',
	plz: '4600',
	ort: 'Olten',
	email: 'erika.beispiel@example.org'
};

function fehlerVon(roh: unknown, opt = OPT) {
	const r = pruefeAngaben(roh, opt);
	if (r.ok) throw new Error('erwartet: ok false');
	return r.fehler;
}

describe('pruefeAngaben', () => {
	it('A-MITGLIED-01: vollständige Angaben werden angenommen, Ränder getrimmt, E-Mail klein', () => {
		const r = pruefeAngaben(
			{
				...gueltig,
				mitgliedernummer: ' 123 ',
				vorname: ' Erika ',
				email: ' Erika.Beispiel@Example.org ',
				telefon: '+41 00 000 00 00',
				geschlecht: 'w',
				jahrgang: 1962,
				lizenznummer: 'AB12',
				unbekannt: 'x'
			},
			OPT
		);
		expect(r).toEqual({
			ok: true,
			angaben: {
				mitgliedernummer: '123',
				vorname: 'Erika',
				nachname: 'Beispiel',
				strasse: 'Musterweg 1',
				plz: '4600',
				ort: 'Olten',
				email: 'erika.beispiel@example.org',
				telefon: '+41 00 000 00 00',
				geschlecht: 'w',
				jahrgang: 1962,
				lizenznummer: 'AB12'
			}
		});
	});

	it('Pflichtfelder fehlen → je Feld "fehlt"', () => {
		expect(fehlerVon({}, { ...OPT, nummerPflicht: true })).toEqual({
			mitgliedernummer: 'fehlt',
			vorname: 'fehlt',
			nachname: 'fehlt',
			strasse: 'fehlt',
			plz: 'fehlt',
			ort: 'fehlt',
			email: 'fehlt'
		});
		expect(fehlerVon({ vorname: '  ' })).toEqual({
			vorname: 'fehlt',
			nachname: 'fehlt',
			strasse: 'fehlt',
			plz: 'fehlt',
			ort: 'fehlt',
			email: 'fehlt'
		});
	});

	it('PLZ braucht 4 Ziffern', () => {
		for (const plz of ['460', 'D-79100']) {
			expect(fehlerVon({ ...gueltig, plz }).plz).toBe('4 Ziffern');
		}
	});

	it('E-Mail ohne @ oder über 254 Zeichen → "keine gültige E-Mail-Adresse"', () => {
		const lang = `${'a'.repeat(250)}@example.org`;
		for (const email of ['erika.example.org', lang]) {
			expect(fehlerVon({ ...gueltig, email }).email).toBe('keine gültige E-Mail-Adresse');
		}
	});

	it('Jahrgang vierstellig zwischen 1900 und dem aktuellen Jahr', () => {
		for (const jahrgang of [1899, 2027, '19a2', 1962.5]) {
			expect(fehlerVon({ ...gueltig, jahrgang }).jahrgang).toBeTruthy();
		}
		const ok = (jahrgang: unknown) => {
			const r = pruefeAngaben({ ...gueltig, jahrgang }, OPT);
			return r.ok ? r.angaben.jahrgang : 'fehler';
		};
		expect(ok('1962')).toBe(1962);
		expect(ok(1900)).toBe(1900);
		expect(ok(2026)).toBe(2026);
	});

	it('Geschlecht nur w, m oder leer', () => {
		expect(fehlerVon({ ...gueltig, geschlecht: 'x' }).geschlecht).toBeTruthy();
		expect(fehlerVon({ ...gueltig, geschlecht: 'W' }).geschlecht).toBeTruthy();
		for (const g of ['w', 'm']) {
			const r = pruefeAngaben({ ...gueltig, geschlecht: g }, OPT);
			expect(r.ok && r.angaben.geschlecht).toBe(g);
		}
	});

	it('Telefon 6–20 Zeichen aus Ziffern, Leerzeichen, +', () => {
		for (const telefon of ['12345', '1'.repeat(21), '079-123 45 67', 'abc def gh']) {
			expect(fehlerVon({ ...gueltig, telefon }).telefon).toBeTruthy();
		}
		const r = pruefeAngaben({ ...gueltig, telefon: '123456' }, OPT);
		expect(r.ok && r.angaben.telefon).toBe('123456');
	});

	it('Mitgliedernummer und Lizenznummer 1–20 Ziffern oder Buchstaben', () => {
		for (const wert of ['a-b', 'x'.repeat(21), 'ä1']) {
			const f = fehlerVon({ ...gueltig, mitgliedernummer: wert, lizenznummer: wert });
			expect(f.mitgliedernummer).toBeTruthy();
			expect(f.lizenznummer).toBeTruthy();
		}
		const r = pruefeAngaben(
			{ ...gueltig, mitgliedernummer: 'A1', lizenznummer: '9'.repeat(20) },
			OPT
		);
		expect(r.ok).toBe(true);
	});

	it('Texte höchstens 100 Zeichen', () => {
		const lang = 'a'.repeat(101);
		const f = fehlerVon({ ...gueltig, vorname: lang, nachname: lang, strasse: lang, ort: lang });
		expect(Object.keys(f).sort()).toEqual(['nachname', 'ort', 'strasse', 'vorname']);
		expect(pruefeAngaben({ ...gueltig, vorname: 'a'.repeat(100) }, OPT).ok).toBe(true);
	});

	it('freiwillige Felder leer → null', () => {
		for (const leer of ['', '  ', undefined, null]) {
			const r = pruefeAngaben(
				{
					...gueltig,
					mitgliedernummer: leer,
					telefon: leer,
					geschlecht: leer,
					jahrgang: leer,
					lizenznummer: leer
				},
				OPT
			);
			expect(r.ok && r.angaben).toMatchObject({
				mitgliedernummer: null,
				telefon: null,
				geschlecht: null,
				jahrgang: null,
				lizenznummer: null
			});
		}
		const r = pruefeAngaben(gueltig, OPT);
		expect(r.ok && r.angaben.telefon).toBeNull();
	});

	it('Kein Objekt (null, Array, String) → ok: false, ohne Ausnahme', () => {
		for (const roh of [null, [], 'text', 5, undefined]) {
			expect(pruefeAngaben(roh, OPT).ok).toBe(false);
		}
	});

	it('Werte ohne Zeichenkette → Fehler statt Ausnahme', () => {
		expect(fehlerVon({ ...gueltig, vorname: 5, ort: {} })).toMatchObject({
			vorname: 'fehlt',
			ort: 'fehlt'
		});
	});
});
