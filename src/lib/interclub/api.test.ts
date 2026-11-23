import { describe, expect, test } from 'vitest';
import {
	holeGefolgteTeams,
	holeInterclub,
	holeInterclubBegegnung,
	holeInterclubTeam,
	setzeFolgen
} from './api.ts';
import { holer, json, ungeprueft, type Koerper } from '../../../tests/hilfen/abruf.ts';

const STOERUNG = { art: 'stoerung' };

describe('Anfragen der Mitglieder zu Interclub', () => {
	test('Übersicht und Team per GET', async () => {
		const h = holer(json(200, { saison: 2026 }));
		expect(await holeInterclub(h.holen)).toEqual({ art: 'ok', daten: { saison: 2026 } });
		expect(h.aufrufe[0]).toMatchObject({ pfad: '/api/interclub', init: { method: 'GET' } });
		const t = holer(json(200, { teamId: 7398 }));
		expect(await holeInterclubTeam(7398, t.holen)).toEqual({ art: 'ok', daten: { teamId: 7398 } });
		expect(t.aufrufe[0]).toMatchObject({
			pfad: '/api/interclub/teams/7398',
			init: { method: 'GET' }
		});
		const b = holer(json(200, { teamId: 7398 }));
		expect(await holeInterclubBegegnung(7398, 972338, b.holen)).toEqual({
			art: 'ok',
			daten: { teamId: 7398 }
		});
		expect(b.aufrufe[0]).toMatchObject({
			pfad: '/api/interclub/teams/7398/begegnungen/972338',
			init: { method: 'GET' }
		});
		expect(
			await holeInterclubBegegnung(1, 2, holer(json(404, { fehler: 'nicht-gefunden' })).holen)
		).toEqual({ art: 'nicht-gefunden' });
	});

	test('Statuscodes werden zu Ergebnissen', async () => {
		const ergebnis = async <S extends number>(status: S, inhalt: Koerper<S>) =>
			holeInterclub(holer(json(status, inhalt)).holen);
		expect(await ergebnis(401, { fehler: 'abgemeldet' })).toEqual({ art: 'abgemeldet' });
		expect(await ergebnis(404, { fehler: 'nicht-gefunden' })).toEqual({ art: 'nicht-gefunden' });
		expect(await ergebnis(500, {})).toEqual(STOERUNG);
		expect(await holeInterclub(holer(new Error('weg')).holen)).toEqual(STOERUNG);
		expect(
			await holeInterclubTeam(1, holer(json(404, { fehler: 'nicht-gefunden' })).holen)
		).toEqual({ art: 'nicht-gefunden' });
	});

	test('Wörter, die Interclub nicht kennt, und unlesbare Körper sind Störung', async () => {
		const antwort = (r: Response) => holeInterclub(holer(r).holen);
		expect(await antwort(json(429, { fehler: 'zu-viele' }))).toEqual(STOERUNG);
		expect(await antwort(json(403, { fehler: 'nur-ansehen' }))).toEqual(STOERUNG);
		expect(await antwort(json(400, { fehler: 'eingabe' }))).toEqual(STOERUNG);
		expect(await antwort(new Response('kein JSON', { status: 200 }))).toEqual(STOERUNG);
		expect(await antwort(ungeprueft(404, null))).toEqual(STOERUNG);
	});

	test('Folgen setzen per JSON-POST, gefolgte Teams per GET', async () => {
		const h = holer(json(200, { folgt: true }));
		expect(await setzeFolgen(7398, true, h.holen)).toEqual({ art: 'ok', daten: { folgt: true } });
		expect(h.aufrufe[0]).toMatchObject({
			pfad: '/api/interclub/teams/7398/folgen',
			init: { method: 'POST', headers: { 'content-type': 'application/json' } }
		});
		expect(JSON.parse(String(h.aufrufe[0].init.body))).toEqual({ folgen: true });
		const g = holer(json(200, { teams: [{ teamId: 7398, liga: '2L Herren 1' }], push: false }));
		expect(await holeGefolgteTeams(g.holen)).toEqual({
			art: 'ok',
			daten: { teams: [{ teamId: 7398, liga: '2L Herren 1' }], push: false }
		});
		expect(g.aufrufe[0]).toMatchObject({ pfad: '/api/interclub/folgen', init: { method: 'GET' } });
	});

	test('Folgen ohne Push ist «kein-push», andere Fehler wie bei Interclub', async () => {
		const setze = (r: Response) => setzeFolgen(7398, true, holer(r).holen);
		expect(await setze(json(409, { fehler: 'kein-push' }))).toEqual({ art: 'kein-push' });
		expect(await setze(json(401, { fehler: 'abgemeldet' }))).toEqual({ art: 'abgemeldet' });
		expect(await setze(json(404, { fehler: 'nicht-gefunden' }))).toEqual({
			art: 'nicht-gefunden'
		});
		expect(await setze(json(403, { fehler: 'nur-ansehen' }))).toEqual(STOERUNG);
		expect(await setze(json(500, {}))).toEqual(STOERUNG);
		// Die Lese-Anfragen kennen das Wort nicht.
		expect(await holeInterclub(holer(json(409, { fehler: 'kein-push' })).holen)).toEqual(STOERUNG);
	});
});
