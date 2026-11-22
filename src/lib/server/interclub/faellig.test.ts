import { describe, expect, it } from 'vitest';
import { istFaellig, type Lage, type Paar, type Versuch } from './faellig.ts';

// Mittwoch, 12. Mai 2027, 10:00 in Zürich (Sommerzeit, UTC+2).
const JETZT = new Date('2027-05-12T08:00:00Z');
const MINUTE = 60_000;
const vor = (minuten: number) => new Date(JETZT.getTime() - minuten * MINUTE);
const versuch = (
	saison: number,
	wettbewerb: 'ic' | 'jic',
	minuten: number,
	wort: Versuch['wort'] = 'ok'
): Versuch => ({ saison, wettbewerb, versuchtAm: vor(minuten), wort });

// Alle Vorjahre 2021–2026 schon geholt: nur die laufende Saison zählt.
const ALLE_VORJAHRE: Paar[] = [2021, 2022, 2023, 2024, 2025, 2026].flatMap((saison) => [
	{ saison, wettbewerb: 'ic' as const },
	{ saison, wettbewerb: 'jic' as const }
]);
const lage = (l: Partial<Lage>): Lage => ({
	jetzt: JETZT,
	versuche: [],
	vorhanden: ALLE_VORJAHRE,
	frisch: [],
	...l
});

describe('istFaellig', () => {
	it('Spielwoche: ic frisch, letzter Versuch 60 min her → ic mit frische', () => {
		const a = istFaellig(
			lage({ frisch: ['ic'], versuche: [versuch(2027, 'ic', 60), versuch(2027, 'jic', 60)] })
		);
		expect(a).toEqual([{ saison: 2027, wettbewerb: 'ic', berichte: 'frische' }]);
	});

	it('Neustart: letzter Versuch 35 min her → nichts für ic', () => {
		const a = istFaellig(
			lage({ frisch: ['ic'], versuche: [versuch(2027, 'ic', 35), versuch(2027, 'jic', 35)] })
		);
		expect(a).toEqual([]);
	});

	it('ruhige Woche: letzter Versuch 3 h her → nichts; 25 h her → ic mit fehlende', () => {
		expect(
			istFaellig(lage({ versuche: [versuch(2027, 'ic', 180), versuch(2027, 'jic', 180)] }))
		).toEqual([]);
		expect(
			istFaellig(lage({ versuche: [versuch(2027, 'ic', 25 * 60), versuch(2027, 'jic', 180)] }))
		).toEqual([{ saison: 2027, wettbewerb: 'ic', berichte: 'fehlende' }]);
	});

	it('noch nicht freigeschaltet: letzter Versuch keine-teams vor 2 h → nichts', () => {
		const a = istFaellig(
			lage({
				versuche: [
					versuch(2027, 'ic', 120, 'keine-teams'),
					versuch(2027, 'jic', 120, 'keine-teams')
				]
			})
		);
		expect(a).toEqual([]);
	});

	it('nur ic läuft: jic mit keine-teams vor 25 h → jic täglich, ic stündlich', () => {
		const a = istFaellig(
			lage({
				frisch: ['ic'],
				versuche: [versuch(2027, 'ic', 61), versuch(2027, 'jic', 25 * 60, 'keine-teams')]
			})
		);
		expect(a).toEqual([
			{ saison: 2027, wettbewerb: 'ic', berichte: 'frische' },
			{ saison: 2027, wettbewerb: 'jic', berichte: 'fehlende' }
		]);
	});

	it('Nacht: 23:30 Zürich → leer, 06:59 → leer, 07:00 → nicht leer', () => {
		expect(istFaellig(lage({ jetzt: new Date('2027-05-12T21:30:00Z') }))).toEqual([]);
		expect(istFaellig(lage({ jetzt: new Date('2027-05-12T04:59:00Z') }))).toEqual([]);
		expect(istFaellig(lage({ jetzt: new Date('2027-05-12T05:00:00Z') }))).not.toEqual([]);
	});

	it('Nacht im Winter: 06:30 UTC ist 07:30 in Zürich → nicht leer', () => {
		expect(istFaellig(lage({ jetzt: new Date('2027-01-12T06:30:00Z') }))).not.toEqual([]);
	});

	it('Nachholen: leere Datenbank im Mai 2027 → laufende Saison und 2021 ic', () => {
		expect(istFaellig(lage({ vorhanden: [] }))).toEqual([
			{ saison: 2027, wettbewerb: 'ic', berichte: 'fehlende' },
			{ saison: 2027, wettbewerb: 'jic', berichte: 'fehlende' },
			{ saison: 2021, wettbewerb: 'ic', berichte: 'fehlende' }
		]);
	});

	const LAUFEND = [versuch(2027, 'ic', 120), versuch(2027, 'jic', 120)];
	const ohne = (...weg: Paar[]) =>
		ALLE_VORJAHRE.filter(
			(p) => !weg.some((w) => w.saison === p.saison && w.wettbewerb === p.wettbewerb)
		);

	it('Nachholen: 2021 ic mit form vor 30 h, 2021 jic nie versucht → 2021 jic', () => {
		const a = istFaellig(
			lage({
				vorhanden: ohne({ saison: 2021, wettbewerb: 'ic' }, { saison: 2021, wettbewerb: 'jic' }),
				versuche: [...LAUFEND, versuch(2021, 'ic', 30 * 60, 'form')]
			})
		);
		expect(a).toEqual([{ saison: 2021, wettbewerb: 'jic', berichte: 'fehlende' }]);
	});

	it('Nachholen: alle versucht, keiner ok → der mit dem ältesten Versuch', () => {
		const a = istFaellig(
			lage({
				vorhanden: ohne({ saison: 2021, wettbewerb: 'ic' }, { saison: 2023, wettbewerb: 'jic' }),
				versuche: [
					...LAUFEND,
					versuch(2021, 'ic', 30 * 60, 'stoerung'),
					versuch(2023, 'jic', 50 * 60, 'form')
				]
			})
		);
		expect(a).toEqual([{ saison: 2023, wettbewerb: 'jic', berichte: 'fehlende' }]);
	});

	it('Nachholen: keine-teams ist endgültig, vorhanden zählt als erledigt', () => {
		const a = istFaellig(
			lage({
				vorhanden: ohne({ saison: 2022, wettbewerb: 'jic' }),
				versuche: [...LAUFEND, versuch(2022, 'jic', 30 * 60, 'keine-teams')]
			})
		);
		expect(a).toEqual([]);
	});

	it('Nachholen: ein Versuch der Vorjahre vor 3 h → kein Nachholen', () => {
		const a = istFaellig(
			lage({
				vorhanden: ohne({ saison: 2024, wettbewerb: 'ic' }, { saison: 2025, wettbewerb: 'ic' }),
				versuche: [...LAUFEND, versuch(2025, 'ic', 180, 'stoerung')]
			})
		);
		expect(a).toEqual([]);
	});

	it('ab: Nachholen beginnt erst bei der genannten Saison', () => {
		const a = istFaellig(lage({ vorhanden: [], versuche: LAUFEND, ab: 2026 }));
		expect(a).toEqual([{ saison: 2026, wettbewerb: 'ic', berichte: 'fehlende' }]);
	});
});
