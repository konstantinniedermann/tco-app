import { describe, expect, test } from 'vitest';
import type { FehlerStatus, Fehlerkoerper } from '../fehler.ts';
import { holeInterclub, holeInterclubBegegnung, holeInterclubTeam } from './api.ts';

type Aufruf = { pfad: string; init: RequestInit };

function holer(antwort: Response | Error) {
	const aufrufe: Aufruf[] = [];
	const holen = async (pfad: string, init: RequestInit) => {
		aufrufe.push({ pfad, init });
		if (antwort instanceof Error) throw antwort;
		return antwort;
	};
	return { aufrufe, holen };
}

// Ein Fehler-Status nimmt nur einen Körper aus der gemeinsamen Liste an (src/lib/fehler.ts).
type Koerper<S extends number> = S extends FehlerStatus ? Fehlerkoerper : unknown;
const json = <S extends number>(status: S, inhalt: Koerper<S>) => Response.json(inhalt, { status });

/** Absichtlich ausserhalb der Liste: Antworten, die der Server nie so sendet. */
const ungeprueft = (status: number, inhalt: unknown) => Response.json(inhalt, { status });

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
});
