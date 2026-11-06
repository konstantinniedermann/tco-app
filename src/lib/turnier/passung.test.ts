import { describe, expect, it } from 'vitest';
import { fehlendeAngaben, passtEinzel, type KategorieRegel, type Spieler } from './passung.ts';

const regel = (r: Partial<KategorieRegel>): KategorieRegel => ({
	art: 'einzel',
	geschlecht: 'offen',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: null,
	klassierungBis: null,
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
