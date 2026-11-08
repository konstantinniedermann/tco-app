import { describe, expect, it } from 'vitest';
import { punkte } from './klassierung.ts';
import {
	fehlendeAngaben,
	passtAlsPaar,
	passtDoppelAllein,
	passtEinzel,
	vermerk,
	warnungenDoppel,
	warnungenEinzel,
	wildcardEinzel,
	type KategorieRegel,
	type Spieler
} from './passung.ts';

const regel = (r: Partial<KategorieRegel>): KategorieRegel => ({
	art: 'einzel',
	geschlecht: 'offen',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: null,
	klassierungBis: null,
	mindestsumme: null,
	...r
});
const spieler = (s: Partial<Spieler>): Spieler => ({
	geschlecht: 'm',
	jahrgang: 1990,
	klassierung: 'R4',
	...s
});

describe('Passung Einzel', () => {
	it('FR-07: R4-Mann passt in Herren R1–R6, nicht in Damen R4–R9 und nicht in Herren R7–R9', () => {
		const m = spieler({});
		expect(
			passtEinzel(regel({ geschlecht: 'herren', klassierungVon: 'R1', klassierungBis: 'R6' }), m)
		).toBe(true);
		expect(
			passtEinzel(regel({ geschlecht: 'damen', klassierungVon: 'R4', klassierungBis: 'R9' }), m)
		).toBe(false);
		expect(
			passtEinzel(regel({ geschlecht: 'herren', klassierungVon: 'R7', klassierungBis: 'R9' }), m)
		).toBe(false);
		expect(passtEinzel(regel({ klassierungVon: 'N1', klassierungBis: 'R3' }), m)).toBe(false);
		expect(passtEinzel(regel({ klassierungVon: 'R4', klassierungBis: 'R4' }), m)).toBe(true);
		expect(passtEinzel(regel({ klassierungVon: 'X1', klassierungBis: 'R9' }), m)).toBe(false);
	});

	it('FR-07: keine Lizenz passt nur, wenn der Bereich bis R9 reicht', () => {
		const k = spieler({ klassierung: 'keine' });
		expect(passtEinzel(regel({ klassierungVon: 'R1', klassierungBis: 'R9' }), k)).toBe(true);
		expect(passtEinzel(regel({ klassierungVon: 'R4', klassierungBis: 'R8' }), k)).toBe(false);
	});

	it('FR-07: Jahrgang 2009 passt in «ab 2009», 2008 nicht; 1982 passt in «bis 1982»', () => {
		expect(passtEinzel(regel({ jahrgangVon: 2009 }), spieler({ jahrgang: 2009 }))).toBe(true);
		expect(passtEinzel(regel({ jahrgangVon: 2009 }), spieler({ jahrgang: 2008 }))).toBe(false);
		expect(passtEinzel(regel({ jahrgangBis: 1982 }), spieler({ jahrgang: 1982 }))).toBe(true);
		expect(passtEinzel(regel({ jahrgangBis: 1982 }), spieler({ jahrgang: 1983 }))).toBe(false);
	});

	it('FR-07: offen passt für Frau und Mann, Doppel und Mixed passen nie im Einzel', () => {
		expect(passtEinzel(regel({}), spieler({ geschlecht: 'w' }))).toBe(true);
		expect(passtEinzel(regel({}), spieler({ geschlecht: 'm' }))).toBe(true);
		expect(passtEinzel(regel({ geschlecht: 'damen' }), spieler({ geschlecht: 'w' }))).toBe(true);
		expect(passtEinzel(regel({ art: 'doppel' }), spieler({}))).toBe(false);
		expect(passtEinzel(regel({ geschlecht: 'mixed' }), spieler({}))).toBe(false);
	});

	it('FR-37: fehlende Angaben machen jede Kategorie unpassend und werden aufgezählt', () => {
		const s = { geschlecht: null, jahrgang: 1990, klassierung: null } as Spieler;
		expect(fehlendeAngaben(s)).toEqual(['klassierung', 'geschlecht']);
		expect(passtEinzel(regel({}), s)).toBe(false);
		expect(fehlendeAngaben(spieler({ jahrgang: null }))).toEqual(['jahrgang']);
		expect(fehlendeAngaben(spieler({}))).toEqual([]);
	});
});

describe('Wildcard Einzel', () => {
	const h46 = regel({ geschlecht: 'herren', klassierungVon: 'R4', klassierungBis: 'R6' });
	const h16 = regel({ geschlecht: 'herren', klassierungVon: 'R1', klassierungBis: 'R6' });

	it('FR-08: Wildcard nur nach oben und nur wegen der Klassierung', () => {
		expect(wildcardEinzel(h46, spieler({ klassierung: 'R8' }))).toBe(true);
		expect(wildcardEinzel(h16, spieler({ klassierung: 'keine' }))).toBe(true);
		expect(wildcardEinzel(h46, spieler({ klassierung: 'R2' }))).toBe(false);
		expect(wildcardEinzel(h46, spieler({ klassierung: 'R5' }))).toBe(false);
		expect(wildcardEinzel(h46, spieler({ klassierung: 'R8', geschlecht: 'w' }))).toBe(false);
		const junioren = regel({
			geschlecht: 'herren',
			jahrgangVon: 2009,
			klassierungVon: 'R4',
			klassierungBis: 'R6'
		});
		expect(wildcardEinzel(junioren, spieler({ klassierung: 'R8', jahrgang: 1990 }))).toBe(false);
		expect(wildcardEinzel(h46, spieler({ klassierung: null }))).toBe(false);
		expect(wildcardEinzel({ ...h46, art: 'doppel' }, spieler({ klassierung: 'R8' }))).toBe(false);
		expect(wildcardEinzel(regel({}), spieler({ klassierung: 'R8' }))).toBe(false);
	});

	it('FR-08: Warnungen beim Anmelden von Hand', () => {
		const r79 = regel({ geschlecht: 'herren', klassierungVon: 'R7', klassierungBis: 'R9' });
		expect(warnungenEinzel(h46, spieler({ klassierung: null }))).toEqual(['angaben-fehlen']);
		expect(warnungenEinzel(r79, spieler({ klassierung: 'R2' }))).toEqual(['passt-nicht']);
		expect(warnungenEinzel(h46, spieler({ klassierung: 'R5' }))).toEqual([]);
	});
});

describe('Passung Doppel', () => {
	const doppel = (r: Partial<KategorieRegel> = {}) =>
		regel({ art: 'doppel', geschlecht: 'herren', mindestsumme: 9, ...r });

	it('FR-07: Doppel nach Geschlecht und Mindestsumme, ohne Jahrgang', () => {
		expect(punkte('N2')).toBe(0);
		expect(punkte('R4')).toBe(4);
		expect(punkte('keine')).toBe(10);

		const k = doppel();
		const m = (klassierung: Spieler['klassierung']) => spieler({ klassierung });
		expect(passtAlsPaar(k, m('R4'), m('R5'), true)).toBe(true);
		expect(passtAlsPaar(k, m('R3'), m('R5'), true)).toBe(false);
		expect(passtAlsPaar(k, m('R1'), m('R8'), true)).toBe(true);
		expect(passtAlsPaar(k, m('N1'), m('R8'), true)).toBe(false);
		expect(passtAlsPaar(k, m('N1'), m('R9'), true)).toBe(true);
		expect(passtAlsPaar(doppel({ mindestsumme: null }), m('R9'), m('R9'), true)).toBe(false);

		const w = spieler({ geschlecht: 'w', klassierung: 'R5' });
		const mann = spieler({ klassierung: 'R5' });
		expect(passtAlsPaar(doppel({ geschlecht: 'mixed' }), w, mann, true)).toBe(true);
		expect(passtAlsPaar(doppel({ geschlecht: 'mixed' }), w, w, true)).toBe(false);
		expect(passtAlsPaar(doppel({ geschlecht: 'damen' }), w, mann, true)).toBe(false);
		expect(passtAlsPaar(doppel({ geschlecht: 'damen' }), w, w, true)).toBe(true);

		const alt = spieler({ jahrgang: 1970, klassierung: 'R5' });
		expect(passtAlsPaar(doppel({ jahrgangVon: 2000 }), alt, alt, true)).toBe(true);
		expect(passtDoppelAllein(doppel({ jahrgangVon: 2000 }), alt)).toBe(true);
	});

	it('FR-07: Suche lässt fehlende Angaben des Partners zu, Annehmen nicht', () => {
		const a = spieler({ klassierung: 'R5' });
		const ohneKlassierung = spieler({ klassierung: null });
		const ohneGeschlecht = spieler({ geschlecht: null, klassierung: 'R5' });
		const mixed = doppel({ geschlecht: 'mixed' });
		const frau = spieler({ geschlecht: 'w', klassierung: 'R5' });
		expect(passtAlsPaar(doppel(), a, ohneKlassierung, false)).toBe(true);
		expect(passtAlsPaar(mixed, frau, ohneGeschlecht, false)).toBe(true);
		expect(passtAlsPaar(doppel(), a, ohneKlassierung, true)).toBe(false);
		expect(passtAlsPaar(mixed, frau, ohneGeschlecht, true)).toBe(false);
		// `a` muss vollständig sein
		expect(passtAlsPaar(doppel(), ohneKlassierung, a, false)).toBe(false);
		// ein bekannter Partner wird weiter geprüft
		expect(passtAlsPaar(doppel(), a, spieler({ klassierung: 'R2' }), false)).toBe(false);
		expect(passtAlsPaar(doppel(), a, spieler({ geschlecht: 'w' }), false)).toBe(false);
	});

	it('FR-07: passtDoppelAllein prüft Art, Angaben und Geschlecht', () => {
		expect(passtDoppelAllein(doppel({ geschlecht: 'mixed' }), spieler({}))).toBe(true);
		expect(passtDoppelAllein(doppel({ geschlecht: 'offen' }), spieler({ geschlecht: 'w' }))).toBe(
			true
		);
		expect(passtDoppelAllein(doppel(), spieler({ geschlecht: 'w' }))).toBe(false);
		expect(passtDoppelAllein(doppel(), spieler({ klassierung: null }))).toBe(false);
		expect(passtDoppelAllein(doppel(), spieler({ geschlecht: null }))).toBe(false);
		expect(passtDoppelAllein(regel({ geschlecht: 'herren' }), spieler({}))).toBe(false);
		expect(passtEinzel(doppel(), spieler({}))).toBe(false);
	});

	it('FR-07: vermerk nennt, was für das Doppel fehlt', () => {
		expect(vermerk(spieler({ geschlecht: null }))).toBe('angaben-fehlen');
		expect(vermerk(spieler({ geschlecht: null, klassierung: null }))).toBe('angaben-fehlen');
		expect(vermerk(spieler({ jahrgang: null }))).toBeNull();
		expect(vermerk(spieler({ klassierung: null }))).toBe('klassierung-fehlt');
		expect(vermerk(spieler({}))).toBeNull();
	});

	it('FR-07: im Doppel verlangt die Passung nie einen Jahrgang', () => {
		const ohneJahrgang = spieler({ jahrgang: null, klassierung: 'R5' });
		const b = spieler({ klassierung: 'R5' });
		expect(passtAlsPaar(doppel(), ohneJahrgang, b, true)).toBe(true);
		expect(passtAlsPaar(doppel(), b, ohneJahrgang, true)).toBe(true);
		expect(passtAlsPaar(doppel(), ohneJahrgang, b, false)).toBe(true);
		expect(passtDoppelAllein(doppel(), ohneJahrgang)).toBe(true);
	});

	it('FR-46: Warnungen im Doppel', () => {
		const frau = spieler({ geschlecht: 'w', klassierung: 'R5' });
		const mann = spieler({ klassierung: 'R5' });
		expect(warnungenDoppel(doppel(), frau, mann)).toEqual(['passt-nicht']);
		expect(warnungenDoppel(doppel(), spieler({ klassierung: 'R3' }), mann)).toEqual([
			'passt-nicht'
		]);
		expect(warnungenDoppel(doppel(), spieler({}), null)).toEqual([]);
		expect(warnungenDoppel(doppel(), mann, spieler({ klassierung: null }))).toEqual([
			'angaben-fehlen'
		]);
		// Weitere Fälle: allein unpassend, fehlendes Geschlecht, passendes Paar, Jahrgang zählt nicht.
		expect(warnungenDoppel(doppel(), frau, null)).toEqual(['passt-nicht']);
		expect(warnungenDoppel(doppel(), spieler({ geschlecht: null }), null)).toEqual([
			'angaben-fehlen'
		]);
		expect(warnungenDoppel(doppel(), mann, spieler({ jahrgang: null, klassierung: 'R4' }))).toEqual(
			[]
		);
		expect(warnungenDoppel(doppel({ geschlecht: 'mixed' }), frau, mann)).toEqual([]);
	});
});
