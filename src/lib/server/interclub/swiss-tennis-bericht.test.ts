import { describe, expect, it } from 'vitest';
import { pruefeBericht } from './swiss-tennis.ts';

// Spielbericht in der Form von Swiss Tennis, mit erfundenen Namen und Nummern.
type Seite = { members: { id: number; name: string }[]; wo: number };
const seite = (wo: number, ...namen: [number, string][]): Seite => ({
	members: namen.map(([id, name]) => ({ id, name })),
	wo
});
const partie = (home: Seite, away: Seite, results: string[], position = 1) => ({
	position,
	players: { home, away },
	results
});
const MAX = 'Max Muster R6 (9497)';
const GERD = 'Gerd Gegner R5 (3876)';

function bericht(o: { tcoAuswaerts?: boolean; einzel?: unknown[]; doppel?: unknown[] } = {}) {
	const tco = { name: 'Olten 1', clubNumber: 2202, points: 8, sets: 16, games: 99 };
	const gegner = { name: 'Gegnerdorf', clubNumber: 2264, points: 1, sets: 3, games: 55 };
	return {
		title: 'Beispiel',
		subtitle: '02. Mai 2026',
		homeTeam: o.tcoAuswaerts ? gegner : tco,
		awayTeam: o.tcoAuswaerts ? tco : gegner,
		singles: o.einzel ?? [
			partie(seite(0, [900001, MAX]), seite(0, [900101, GERD]), ['5:7', '0:6', ''])
		],
		doubles: o.doppel ?? [
			partie(
				seite(0, [900001, MAX], [900002, 'Erika Beispiel N4 (120)']),
				seite(0, [900101, GERD], [900102, 'Gina Gegner R9 (61449)']),
				['0:6', '6:4', '11:9']
			)
		],
		leagueId: 9,
		groupId: 62
	};
}

function gelesen(json: unknown) {
	const r = pruefeBericht(json, 2202);
	if (r === null || r === 'fehlt') throw new Error(`erwartet einen Bericht, nicht ${r}`);
	return r;
}

describe('pruefeBericht', () => {
	it('liest Einzel und Doppel mit den TCO-Spielern, TCO heim', () => {
		expect(pruefeBericht(bericht(), 2202)).toEqual({
			tcoHeim: true,
			saetze: { tco: 16, gegner: 3 },
			games: { tco: 99, gegner: 55 },
			partien: [
				{
					art: 'einzel',
					position: 1,
					saetze: ['5:7', '0:6'],
					aufgabe: null,
					spieler: [{ stId: 900001, name: 'Max Muster', klassierung: 'R6', rangliste: 9497 }],
					gegner: [{ name: 'Gerd Gegner', klassierung: 'R5' }]
				},
				{
					art: 'doppel',
					position: 1,
					saetze: ['0:6', '6:4', '11:9'],
					aufgabe: null,
					spieler: [
						{ stId: 900001, name: 'Max Muster', klassierung: 'R6', rangliste: 9497 },
						{ stId: 900002, name: 'Erika Beispiel', klassierung: 'N4', rangliste: 120 }
					],
					gegner: [
						{ name: 'Gerd Gegner', klassierung: 'R5' },
						{ name: 'Gina Gegner', klassierung: 'R9' }
					]
				}
			]
		});
	});

	it('dreht die Sätze und nimmt die Gastspieler, wenn TCO auswärts spielt', () => {
		const r = gelesen(
			bericht({
				tcoAuswaerts: true,
				einzel: [partie(seite(0, [900101, GERD]), seite(0, [900001, MAX]), ['6:3', '4:6', '10:7'])],
				doppel: []
			})
		);
		expect(r.tcoHeim).toBe(false);
		expect(r.saetze).toEqual({ tco: 16, gegner: 3 });
		expect(r.partien[0].saetze).toEqual(['3:6', '6:4', '7:10']);
		expect(r.partien[0].spieler.map((s) => s.name)).toEqual(['Max Muster']);
		expect(r.partien[0].gegner).toEqual([{ name: 'Gerd Gegner', klassierung: 'R5' }]);
	});

	it('merkt, welche Seite aufgegeben hat', () => {
		const einzel = [
			partie(seite(1, [900001, MAX]), seite(0, [900101, GERD]), ['1:0', '', '']),
			partie(
				seite(0, [900002, 'Erika Beispiel R6 (2)']),
				seite(1, [900102, 'Gina Gegner R5 (3)']),
				['6:3', '5:3', ''],
				2
			)
		];
		const r = gelesen(bericht({ einzel, doppel: [] }));
		expect(r.partien.map((p) => [p.aufgabe, p.saetze])).toEqual([
			['tco', ['1:0']],
			['gegner', ['6:3', '5:3']]
		]);
	});

	it('übernimmt vom Gegner nur Name und Klassierung, keine Nummern', () => {
		const text = JSON.stringify(gelesen(bericht()).partien.map((p) => p.gegner));
		expect(text).toContain('Gerd Gegner');
		expect(text).not.toContain('900101');
		expect(text).not.toContain('3876');
		expect(text).not.toContain('61449');
	});

	it('meldet einen fehlenden Bericht', () => {
		expect(pruefeBericht(null, 2202)).toBe('fehlt');
	});

	it('lässt nicht gespielte Partien weg (beide Seiten w.o., ohne Spieler)', () => {
		const leer = partie(seite(1), seite(1), ['', '', '']);
		const r = gelesen(bericht({ doppel: [leer, { ...leer, position: 2 }] }));
		expect(r.partien.map((p) => p.art)).toEqual(['einzel']);
	});

	it('nimmt ein w.o. des TCO ohne eingetragenen Spieler an', () => {
		const r = gelesen(
			bericht({ einzel: [partie(seite(1), seite(0, [900101, GERD]), ['', '', ''])], doppel: [] })
		);
		expect(r.partien[0]).toMatchObject({ spieler: [], saetze: [], aufgabe: 'tco' });
		expect(r.partien[0].gegner).toEqual([{ name: 'Gerd Gegner', klassierung: 'R5' }]);
	});

	it('nimmt einen Gegner ohne Klassierung und ohne Nummer an', () => {
		const ohne = { members: [{ id: null, name: 'Gast Spieler' }], wo: 0 } as unknown as Seite;
		const r = gelesen(
			bericht({ einzel: [partie(seite(0, [900001, MAX]), ohne, ['6:0', '6:0', ''])], doppel: [] })
		);
		expect(r.partien[0].gegner).toEqual([{ name: 'Gast Spieler', klassierung: '' }]);
	});

	it('weist abweichende Formen ab', () => {
		const gast = seite(0, [900101, GERD]);
		const mitEinzel = (p: unknown) => bericht({ einzel: [p], doppel: [] });
		const einzelVon = (heim: Seite, results = ['6:0', '6:0', '']) =>
			mitEinzel(partie(heim, gast, results));
		const faelle: [string, unknown][] = [
			['leer', {}],
			['Text', 'x'],
			['ohne TCO', { ...bericht(), homeTeam: bericht().awayTeam }],
			['zweimal TCO', { ...bericht(), awayTeam: bericht().homeTeam }],
			['ohne Einzel', { ...bericht(), singles: undefined }],
			['Name ohne Klassierung', einzelVon(seite(0, [900001, 'Max Muster']))],
			['falsche Klassierung', einzelVon(seite(0, [900001, 'Max Muster X5 (12)']))],
			['Einzel mit zwei', einzelVon(seite(0, [900001, MAX], [900002, 'Erika Beispiel R6 (1)']))],
			[
				'Doppel mit einem',
				bericht({ einzel: [], doppel: [partie(seite(0, [900001, MAX]), gast, ['6:0', '6:0', ''])] })
			],
			['zwei Sätze', einzelVon(seite(0, [900001, MAX]), ['6:0', '6:0'])],
			['Satz mit Strich', einzelVon(seite(0, [900001, MAX]), ['6-3', '6:0', ''])],
			['wo 2', einzelVon(seite(2, [900001, MAX]))],
			[
				'Position als Text',
				mitEinzel({ ...partie(seite(0, [900001, MAX]), gast, ['6:0', '6:0', '']), position: '1' })
			],
			[
				'Gegner ohne Liste',
				mitEinzel(
					partie(seite(0, [900001, MAX]), { members: 'x', wo: 0 } as unknown as Seite, [
						'6:0',
						'6:0',
						''
					])
				)
			],
			[
				'Spieler-Id als Text',
				einzelVon({ members: [{ id: '1' as unknown as number, name: MAX }], wo: 0 })
			],
			['Punkte fehlen', { ...bericht(), homeTeam: { name: 'Olten 1', clubNumber: 2202 } }],
			[
				'Einzel mit zwei Gegnern',
				mitEinzel(
					partie(
						seite(0, [900001, MAX]),
						seite(0, [900101, GERD], [900102, 'Gina Gegner R9 (1)']),
						['6:0', '6:0', '']
					)
				)
			]
		];
		for (const [name, f] of faelle) expect(pruefeBericht(f, 2202), name).toBeNull();
	});
});
