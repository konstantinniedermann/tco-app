import { describe, expect, test } from 'vitest';
import {
	datumText,
	entscheidText,
	ergebnisText,
	kachelText,
	nachRunde,
	nachTag,
	ortText,
	pause,
	plakette,
	standText,
	teamText,
	vorgewaehlt
} from './anzeige.ts';

describe('Texte der Interclub-Ansicht', () => {
	test('Datum mit Wochentag, mit Uhrzeit nur wenn bekannt', () => {
		expect(datumText('2026-05-09')).toBe('Sa 09.05.');
		expect(datumText('2026-05-10', null)).toBe('So 10.05.');
		expect(datumText('2026-06-07', '09:00')).toBe('So 07.06., 09:00');
		expect(datumText('2026-05-05')).toBe('Di 05.05.');
	});

	test('Stand in Zürcher Zeit, Sommer und Winter', () => {
		expect(standText(new Date('2026-11-13T07:56Z'))).toBe('Stand: 13.11.2026, 08:56');
		expect(standText('2026-05-11T05:12:00.000Z')).toBe('Stand: 11.05.2026, 07:12');
		// 23:30 UTC ist in Zürich schon der nächste Tag.
		expect(standText('2026-06-30T23:30:00.000Z')).toBe('Stand: 01.07.2026, 01:30');
	});

	test('Ergebnis als Wort und Plakette (UI-05: nie nur Farbe)', () => {
		expect(ergebnisText('sieg')).toBe('Sieg');
		expect(ergebnisText('niederlage')).toBe('Niederlage');
		expect(ergebnisText('unentschieden')).toBe('Unentschieden');
		expect(plakette('sieg')).toBe('plakette-ok');
		expect(plakette('niederlage')).toBe('plakette-niederlage');
		expect(plakette('unentschieden')).toBe('plakette-leise');
	});

	test('Heim oder auswärts aus Sicht des TCO-Teams', () => {
		expect(ortText(true)).toBe('Heim');
		expect(ortText(false)).toBe('Auswärts');
	});

	test('Kachel eines Teams: Teamname, Rang, Auf- oder Abstiegsspiele', () => {
		expect(kachelText('Olten 1', 2, 4, 'aufstieg')).toBe('Olten 1 · 2. von 4 · Aufstiegsspiele');
		expect(kachelText('Olten', 4, 4, 'abstieg')).toBe('Olten · 4. von 4 · Abstiegsspiele');
		expect(kachelText('Olten 2', 1, 5, null)).toBe('Olten 2 · 1. von 5');
		// Ohne Rangliste (noch kein Spiel gewertet) nur der Teamname.
		expect(kachelText('Olten', null, 0, null)).toBe('Olten');
	});

	test('Zeile unter dem Titel der Team-Seite', () => {
		const rangliste = [
			{ rang: 1, eigen: false },
			{ rang: 2, eigen: true },
			{ rang: 3, eigen: false },
			{ rang: 4, eigen: false }
		];
		expect(teamText('Olten 1', 62, rangliste)).toBe('Olten 1 · Gruppe 62 · 2. von 4');
		expect(teamText('Olten', 18, [])).toBe('Olten · Gruppe 18');
	});

	test('Titel der Karte mit Auf- oder Abstiegsspielen', () => {
		expect(entscheidText('aufstieg')).toBe('Aufstiegsspiele');
		expect(entscheidText('abstieg')).toBe('Abstiegsspiele');
	});

	const spiel = { datum: '2026-05-10' };
	const stand = (abgeschlossen: boolean, letzte: object[], naechste: object[]) => ({
		abgeschlossen,
		letzte,
		naechste
	});

	test('Pause: Saison läuft, aber 7 Tage zurück und voraus spielt kein TCO-Team', () => {
		expect(pause(stand(false, [], []))).toBe(true);
		expect(pause(stand(false, [spiel], []))).toBe(false);
		expect(pause(stand(false, [], [spiel]))).toBe(false);
		expect(pause(stand(true, [], []))).toBe(false);
	});

	test('vorgewählt ist Teams nach der Saison und in einer Pause, sonst Resultate', () => {
		expect(vorgewaehlt(stand(true, [], []))).toBe('teams');
		expect(vorgewaehlt(stand(false, [], []))).toBe('teams');
		expect(vorgewaehlt(stand(false, [spiel], []))).toBe('resultate');
		expect(vorgewaehlt(stand(false, [], [spiel]))).toBe('resultate');
	});
});

describe('Gruppieren', () => {
	test('nach Tag, Reihenfolge wie geliefert', () => {
		const spiele = [
			{ datum: '2026-05-10', n: 1 },
			{ datum: '2026-05-10', n: 2 },
			{ datum: '2026-05-09', n: 3 },
			{ datum: '2026-05-05', n: 4 }
		];
		expect(nachTag(spiele)).toEqual([
			{ datum: '2026-05-10', spiele: [spiele[0], spiele[1]] },
			{ datum: '2026-05-09', spiele: [spiele[2]] },
			{ datum: '2026-05-05', spiele: [spiele[3]] }
		]);
		expect(nachTag([])).toEqual([]);
	});

	test('nach Runde, Reihenfolge wie geliefert', () => {
		const spiele = [
			{ runde: 1, n: 1 },
			{ runde: 1, n: 2 },
			{ runde: 2, n: 3 }
		];
		expect(nachRunde(spiele)).toEqual([
			{ runde: 1, spiele: [spiele[0], spiele[1]] },
			{ runde: 2, spiele: [spiele[2]] }
		]);
	});
});
