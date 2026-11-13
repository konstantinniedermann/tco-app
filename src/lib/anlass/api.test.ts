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

/** Absichtlich ausserhalb der Liste: Antworten, die der Server nie so sendet. */
const ungeprueft = (status: number, inhalt: unknown) => Response.json(inhalt, { status });

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

// Ränder, die der gemeinsame Abruf-Baustein genau so erhalten muss (Charakterisierung vor Schritt 13).
describe('Anlässe: Ränder der Deutung', () => {
	const antwort = async (r: Response) =>
		sendeAntwort(1, { antwort: 'kommt', bemerkung: null }, holer(r).holen);
	const STOERUNG = { art: 'stoerung' };

	test('401 und 404 genügen als Status, auch ohne Wort', async () => {
		expect(await antwort(ungeprueft(401, {}))).toEqual({ art: 'abgemeldet' });
		expect(await antwort(ungeprueft(404, {}))).toEqual({ art: 'nicht-gefunden' });
	});

	test('ohne lesbaren Körper Störung, auch bei 204, 200 und 401; JSON null bei 404 ebenso', async () => {
		expect(await antwort(new Response(null, { status: 204 }))).toEqual(STOERUNG);
		expect(await antwort(new Response('kein JSON', { status: 200 }))).toEqual(STOERUNG);
		expect(await antwort(new Response('kein JSON', { status: 401 }))).toEqual(STOERUNG);
		expect(await antwort(ungeprueft(404, null))).toEqual(STOERUNG);
	});

	test('JSON null bei Erfolg kommt als Daten an', async () => {
		expect(await antwort(ungeprueft(200, null))).toEqual({ art: 'ok', daten: null });
	});

	test('Wörter, die der Anlass nicht kennt, und Wörter mit falschem Status sind Störung', async () => {
		expect(await antwort(json(429, { fehler: 'zu-viele' }))).toEqual(STOERUNG);
		expect(await antwort(json(403, { fehler: 'nur-ansehen' }))).toEqual(STOERUNG);
		expect(await antwort(json(400, { fehler: 'geschlossen' }))).toEqual(STOERUNG);
		expect(
			await antwort(json(409, { fehler: 'eingabe', felder: { bemerkung: 'Zu lang.' } }))
		).toEqual(STOERUNG);
		expect(await antwort(json(409, { fehler: 'voll' }))).toEqual(STOERUNG);
	});

	test('eingabe nur mit einem der zwei Felder; mit beiden geht antwort vor', async () => {
		expect(await antwort(json(400, { fehler: 'eingabe', felder: { plz: 'Falsch.' } }))).toEqual(
			STOERUNG
		);
		expect(
			await antwort(
				json(400, {
					fehler: 'eingabe',
					felder: { bemerkung: 'Zu lang.', antwort: 'Bitte wählen.' }
				})
			)
		).toEqual({ art: 'eingabe', feld: 'antwort' });
	});
});
