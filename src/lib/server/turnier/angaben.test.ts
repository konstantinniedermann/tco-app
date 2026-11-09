import { describe, expect, it } from 'vitest';
import { pruefeKategorie, pruefeTurnier } from './angaben.ts';

const turnier = {
	jahr: 2027,
	name: ' Clubmeisterschaft ',
	anmeldeschluss: '2027-05-31',
	nummern: [{ bezeichnung: ' Gruppenphase ', nummer: '123456' }]
};
const einzel = {
	name: 'Herren R4–R9',
	geschlecht: 'herren',
	art: 'einzel',
	klassierungVon: 'R4',
	klassierungBis: 'R9'
};
const doppel = { name: 'Doppel offen', geschlecht: 'offen', art: 'doppel', mindestsumme: 9 };

describe('Prüfung Turnier', () => {
	it('FR-33: gültiges Turnier wird getrimmt übernommen', () => {
		const r = pruefeTurnier(turnier);
		expect(r).toEqual({
			ok: true,
			werte: {
				jahr: 2027,
				name: 'Clubmeisterschaft',
				anmeldeschluss: '2027-05-31',
				nummern: [{ bezeichnung: 'Gruppenphase', nummer: '123456' }]
			}
		});
		expect(pruefeTurnier({ ...turnier, nummern: [] }).ok).toBe(true);
	});

	it('FR-33: Turnier ohne Name, Jahr 2019 und Schluss in anderem Jahr ergeben Feldfehler', () => {
		const r = pruefeTurnier({ ...turnier, name: '  ', jahr: 2019 });
		expect(r).toMatchObject({
			ok: false,
			felder: {
				name: 'Bitte einen Namen angeben.',
				jahr: 'Bitte ein Jahr zwischen 2020 und 2100 angeben.'
			}
		});
		const s = pruefeTurnier({ ...turnier, anmeldeschluss: '2028-01-10' });
		expect(s).toMatchObject({
			ok: false,
			felder: { anmeldeschluss: 'Der Anmeldeschluss muss im Turnierjahr liegen.' }
		});
	});

	it('FR-33: Anmeldeschluss muss ein echtes Datum sein, Name höchstens 120 Zeichen', () => {
		for (const a of ['2027-02-30', 'morgen', '', undefined]) {
			const r = pruefeTurnier({ ...turnier, anmeldeschluss: a });
			expect(r.ok).toBe(false);
			if (!r.ok) expect(r.felder.anmeldeschluss).toBeTruthy();
		}
		const lang = pruefeTurnier({ ...turnier, name: 'x'.repeat(121) });
		expect(lang).toMatchObject({ ok: false, felder: { name: 'Höchstens 120 Zeichen.' } });
	});

	it('Kontaktperson: fehlt = unverändert, null = keine, positive Zahl = Mitglied', () => {
		const werteVon = (kontakt: unknown) => {
			const r = pruefeTurnier({ ...turnier, kontakt });
			return r.ok ? r.werte.kontakt : 'fehler';
		};
		const ohne = pruefeTurnier(turnier);
		expect(ohne.ok && 'kontakt' in ohne.werte).toBe(false);
		expect(werteVon(null)).toBeNull();
		expect(werteVon(7)).toBe(7);
		expect(werteVon('7')).toBe(7);
		for (const falsch of ['x', 0, -1, 1.5, {}]) {
			const r = pruefeTurnier({ ...turnier, kontakt: falsch });
			expect(r).toMatchObject({
				ok: false,
				felder: { kontakt: 'Bitte eine Person aus der Liste wählen.' }
			});
		}
	});

	it('FR-33: Jahr darf als Zahl oder Zahlentext kommen, nicht als Unsinn', () => {
		expect(pruefeTurnier({ ...turnier, jahr: '2027' }).ok).toBe(true);
		expect(pruefeTurnier({ ...turnier, jahr: 2027.5 }).ok).toBe(false);
		expect(pruefeTurnier({ ...turnier, jahr: 'abc' }).ok).toBe(false);
		expect(pruefeTurnier({ ...turnier, jahr: 2101 }).ok).toBe(false);
	});

	it('FR-33: Turniernummer nur Ziffern', () => {
		const r = pruefeTurnier({
			...turnier,
			nummern: [{ bezeichnung: 'Gruppenphase', nummer: '12a' }]
		});
		expect(r).toMatchObject({
			ok: false,
			felder: { nummern: 'Turniernummern bestehen nur aus Ziffern (höchstens 12).' }
		});
		const zulang = pruefeTurnier({
			...turnier,
			nummern: [{ bezeichnung: 'A', nummer: '1234567890123' }]
		});
		expect(zulang.ok).toBe(false);
	});

	it('FR-33: Turniernummern brauchen Bezeichnung und müssen eine Liste sein', () => {
		const leer = pruefeTurnier({ ...turnier, nummern: [{ bezeichnung: ' ', nummer: '1' }] });
		expect(leer).toMatchObject({
			ok: false,
			felder: { nummern: 'Bitte eine Bezeichnung angeben (höchstens 60 Zeichen).' }
		});
		expect(pruefeTurnier({ ...turnier, nummern: 'x' }).ok).toBe(false);
		expect(pruefeTurnier({ ...turnier, nummern: [null] }).ok).toBe(false);
		expect(pruefeTurnier({ ...turnier, nummern: undefined }).ok).toBe(false);
	});
});

describe('Prüfung Kategorie', () => {
	it('FR-34: gültige Einzel- und Doppelkategorie', () => {
		expect(pruefeKategorie(einzel, 2027)).toEqual({
			ok: true,
			werte: {
				name: 'Herren R4–R9',
				geschlecht: 'herren',
				art: 'einzel',
				jahrgangVon: null,
				jahrgangBis: null,
				klassierungVon: 'R4',
				klassierungBis: 'R9',
				mindestsumme: null
			}
		});
		expect(pruefeKategorie(doppel, 2027)).toMatchObject({
			ok: true,
			werte: { art: 'doppel', mindestsumme: 9, klassierungVon: null, klassierungBis: null }
		});
	});

	it('FR-34: Einzel braucht Klassierung von nicht schwächer als bis', () => {
		const r = pruefeKategorie({ ...einzel, klassierungVon: 'R6', klassierungBis: 'R1' }, 2027);
		expect(r).toMatchObject({
			ok: false,
			felder: { klassierungBis: 'Das Ende darf nicht stärker sein als der Anfang.' }
		});
		expect(
			pruefeKategorie({ ...einzel, klassierungVon: 'R4', klassierungBis: 'R4' }, 2027).ok
		).toBe(true);
	});

	it('FR-34: Einzel ohne Klassierung ist ein Fehler an beiden Feldern', () => {
		const r = pruefeKategorie({ ...einzel, klassierungVon: '', klassierungBis: undefined }, 2027);
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.felder.klassierungVon).toBeTruthy();
			expect(r.felder.klassierungBis).toBeTruthy();
		}
		const falsch = pruefeKategorie({ ...einzel, klassierungVon: 'keine' }, 2027);
		expect(falsch.ok).toBe(false);
	});

	it('FR-34: Mixed nur im Doppel', () => {
		const r = pruefeKategorie({ ...einzel, geschlecht: 'mixed' }, 2027);
		expect(r).toMatchObject({ ok: false, felder: { geschlecht: 'Mixed gibt es nur im Doppel.' } });
		expect(pruefeKategorie({ ...doppel, geschlecht: 'mixed' }, 2027).ok).toBe(true);
	});

	it('FR-34: Geschlecht und Art müssen erlaubte Werte sein', () => {
		const g = pruefeKategorie({ ...einzel, geschlecht: 'divers' }, 2027);
		expect(g.ok).toBe(false);
		if (!g.ok) expect(g.felder.geschlecht).toBeTruthy();
		const a = pruefeKategorie({ ...einzel, art: 'mannschaft' }, 2027);
		expect(a.ok).toBe(false);
		if (!a.ok) expect(a.felder.art).toBeTruthy();
	});

	it('FR-34: Doppel ohne Mindestsumme nimmt nicht 9 still an', () => {
		const r = pruefeKategorie({ ...doppel, mindestsumme: undefined }, 2027);
		expect(r).toMatchObject({
			ok: false,
			felder: { mindestsumme: 'Bitte eine Zahl von 0 bis 20 angeben.' }
		});
		expect(pruefeKategorie({ ...doppel, mindestsumme: '' }, 2027).ok).toBe(false);
		expect(pruefeKategorie({ ...doppel, mindestsumme: 21 }, 2027).ok).toBe(false);
		expect(pruefeKategorie({ ...doppel, mindestsumme: 0 }, 2027).ok).toBe(true);
		expect(pruefeKategorie({ ...doppel, mindestsumme: '20' }, 2027).ok).toBe(true);
	});

	it('FR-34: negative Mindestsumme ist ein Fehler', () => {
		const r = pruefeKategorie({ ...doppel, mindestsumme: -5 }, 2027);
		expect(r).toMatchObject({
			ok: false,
			felder: { mindestsumme: 'Bitte eine Zahl von 0 bis 20 angeben.' }
		});
		// Ein negativer Jahrgang zählt nur im Einzel; im Doppel wird er geleert (FR-34).
		expect(pruefeKategorie({ ...einzel, jahrgangVon: -1 }, 2027).ok).toBe(false);
	});

	it('FR-34: Wechsel auf Einzel verwirft die Mindestsumme, auf Doppel die Klassierung', () => {
		const e = pruefeKategorie({ ...einzel, mindestsumme: 9 }, 2027);
		expect(e).toMatchObject({ ok: true, werte: { mindestsumme: null } });
		const d = pruefeKategorie({ ...doppel, klassierungVon: 'R1', klassierungBis: 'R9' }, 2027);
		expect(d).toMatchObject({
			ok: true,
			werte: { klassierungVon: null, klassierungBis: null }
		});
	});

	it('FR-34: Jahrgang von nach bis ist ein Fehler', () => {
		const r = pruefeKategorie({ ...einzel, jahrgangVon: 2010, jahrgangBis: 2005 }, 2027);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.felder.jahrgangBis).toBeTruthy();
	});

	it('FR-34: Jahrgang liegt zwischen 1900 und dem Turnierjahr, leer ist erlaubt', () => {
		expect(pruefeKategorie({ ...einzel, jahrgangVon: 1899 }, 2027).ok).toBe(false);
		expect(pruefeKategorie({ ...einzel, jahrgangBis: 2028 }, 2027).ok).toBe(false);
		expect(pruefeKategorie({ ...einzel, jahrgangVon: 'abc' }, 2027).ok).toBe(false);
		const r = pruefeKategorie({ ...einzel, jahrgangVon: '1990', jahrgangBis: 2027 }, 2027);
		expect(r).toMatchObject({ ok: true, werte: { jahrgangVon: 1990, jahrgangBis: 2027 } });
		const leer = pruefeKategorie({ ...einzel, jahrgangVon: '', jahrgangBis: null }, 2027);
		expect(leer).toMatchObject({ ok: true, werte: { jahrgangVon: null, jahrgangBis: null } });
	});

	it('FR-34: Doppel ohne Jahrgang: der Server leert ihn und prüft ihn nicht', () => {
		const r = pruefeKategorie({ ...doppel, jahrgangVon: '2009', jahrgangBis: 2010 }, 2027);
		expect(r).toMatchObject({ ok: true, werte: { jahrgangVon: null, jahrgangBis: null } });
		const unsinn = pruefeKategorie({ ...doppel, jahrgangVon: 'abc', jahrgangBis: 1800 }, 2027);
		expect(unsinn).toMatchObject({ ok: true, werte: { jahrgangVon: null, jahrgangBis: null } });
	});

	it('FR-34: Name 1 bis 60 Zeichen, getrimmt', () => {
		const leer = pruefeKategorie({ ...einzel, name: ' ' }, 2027);
		expect(leer).toMatchObject({ ok: false, felder: { name: 'Bitte einen Namen angeben.' } });
		const lang = pruefeKategorie({ ...einzel, name: 'x'.repeat(61) }, 2027);
		expect(lang).toMatchObject({ ok: false, felder: { name: 'Höchstens 60 Zeichen.' } });
		expect(pruefeKategorie({ ...einzel, name: '  Herren  ' }, 2027)).toMatchObject({
			ok: true,
			werte: { name: 'Herren' }
		});
	});
});
