import { describe, expect, test } from 'vitest';
import type { FehlerStatus, Fehlerkoerper } from '../fehler.ts';
import { holeAnlaesse, holeAnlass, sendeAntwort } from './api.ts';

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

// Gestellte Antworten: Ein Fehler-Status nimmt nur einen Körper aus der gemeinsamen Liste an
// (src/lib/fehler.ts), damit ein Wort oder eine Form, die der Server nicht kennt, hier auffällt.
type Koerper<S extends number> = S extends FehlerStatus ? Fehlerkoerper : unknown;
const json = <S extends number>(status: S, inhalt: Koerper<S>) => Response.json(inhalt, { status });

describe('Anfragen der Mitglieder zu Anlässen', () => {
	test('A-ANLASS-01: Liste und einzelner Anlass', async () => {
		const h = holer(json(200, [{ id: 1 }]));
		expect(await holeAnlaesse(h.holen)).toEqual({ art: 'ok', daten: [{ id: 1 }] });
		expect(h.aufrufe[0]).toMatchObject({ pfad: '/api/anlaesse', init: { method: 'GET' } });
		const e = holer(json(200, { id: 7 }));
		expect(await holeAnlass(7, e.holen)).toEqual({ art: 'ok', daten: { id: 7 } });
		expect(e.aufrufe[0].pfad).toBe('/api/anlaesse/7');
	});

	test('sendeAntwort schickt JSON per POST', async () => {
		const h = holer(json(200, { id: 7, antwort: 'kommt' }));
		const r = await sendeAntwort(7, { antwort: 'kommt-nicht', bemerkung: 'Ferien' }, h.holen);
		expect(r).toEqual({ art: 'ok', daten: { id: 7, antwort: 'kommt' } });
		expect(h.aufrufe[0].pfad).toBe('/api/anlaesse/7/anmeldung');
		expect(h.aufrufe[0].init.method).toBe('POST');
		expect(new Headers(h.aufrufe[0].init.headers).get('content-type')).toBe('application/json');
		expect(JSON.parse(String(h.aufrufe[0].init.body))).toEqual({
			antwort: 'kommt-nicht',
			bemerkung: 'Ferien'
		});
	});

	test('Statuscodes werden zu Ergebnissen', async () => {
		const ergebnis = async <S extends number>(status: S, inhalt: Koerper<S>) =>
			sendeAntwort(1, { antwort: 'kommt', bemerkung: null }, holer(json(status, inhalt)).holen);
		expect(await ergebnis(401, { fehler: 'abgemeldet' })).toEqual({ art: 'abgemeldet' });
		expect(await ergebnis(404, { fehler: 'nicht-gefunden' })).toEqual({ art: 'nicht-gefunden' });
		expect(await ergebnis(409, { fehler: 'geschlossen' })).toEqual({ art: 'geschlossen' });
		expect(
			await ergebnis(400, { fehler: 'eingabe', felder: { bemerkung: 'Höchstens 500 Zeichen.' } })
		).toEqual({ art: 'eingabe', feld: 'bemerkung' });
		expect(
			await ergebnis(400, { fehler: 'eingabe', felder: { antwort: 'Bitte wählen.' } })
		).toEqual({ art: 'eingabe', feld: 'antwort' });
		expect(await ergebnis(400, { fehler: 'eingabe' })).toEqual({ art: 'stoerung' });
		expect(await ergebnis(500, {})).toEqual({ art: 'stoerung' });
		expect(
			await sendeAntwort(1, { antwort: 'kommt', bemerkung: null }, holer(new Error('weg')).holen)
		).toEqual({ art: 'stoerung' });
	});
});
