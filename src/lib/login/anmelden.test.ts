import { describe, expect, it } from 'vitest';
import type { FehlerStatus, Fehlerkoerper } from '../fehler.ts';
import { MELDUNG, meldung, sende } from './anmelden.ts';

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
const unlesbar = (status: number) => new Response('kein JSON', { status });

describe('Anfrage an die Login-Schnittstellen', () => {
	it('schickt JSON mit POST', async () => {
		const { aufrufe, holen } = holer(json(200, {}));
		expect(await sende('/api/login/brief', { code: 'abc' }, holen)).toEqual({ ergebnis: 'ok' });
		expect(aufrufe).toEqual([
			{
				pfad: '/api/login/brief',
				init: {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: '{"code":"abc"}'
				}
			}
		]);
	});

	it('202 gilt als ok', async () => {
		expect(await sende('/x', {}, holer(json(202, {})).holen)).toEqual({ ergebnis: 'ok' });
	});

	it('400 falsch', async () => {
		const r = await sende('/x', {}, holer(json(400, { fehler: 'falsch' })).holen);
		expect(r).toEqual({ ergebnis: 'falsch' });
	});

	it('400 benutzt mit Kontakt', async () => {
		const r = await sende('/x', {}, holer(json(400, { fehler: 'benutzt', kontakt: 'K' })).holen);
		expect(r).toEqual({ ergebnis: 'benutzt', kontakt: 'K' });
	});

	it('429 zu viele', async () => {
		const r = await sende('/x', {}, holer(json(429, { fehler: 'zu-viele' })).holen);
		expect(r).toEqual({ ergebnis: 'zu-viele' });
	});

	it.each([
		['Serverfehler', json(500, {})],
		['400 ohne lesbaren Körper', new Response('kaputt', { status: 400 })],
		['Netzfehler', new TypeError('Failed to fetch')]
	])('%s gilt als Störung', async (_, antwort) => {
		expect(await sende('/x', {}, holer(antwort).holen)).toEqual({ ergebnis: 'stoerung' });
	});
});

describe('Meldungen beim Feld (UI-06)', () => {
	it('benutzt nennt die Ansprechperson', () => {
		expect(meldung({ ergebnis: 'benutzt', kontakt: 'das Sekretariat' }, 'F')).toBe(
			'Dieser Code wurde schon benutzt. Wende dich an das Sekretariat.'
		);
	});

	it('falsch nimmt den Text der Seite', () => {
		expect(meldung({ ergebnis: 'falsch' }, MELDUNG.briefFalsch)).toBe(
			'Dieser Code stimmt nicht. Prüf ihn oder lass dir einen neuen per E-Mail schicken.'
		);
		expect(meldung({ ergebnis: 'falsch' }, MELDUNG.mailFalsch)).toBe(
			'Dieser Code stimmt nicht. Prüf ihn oder lass dir einen neuen schicken.'
		);
	});

	it('zu viele und Störung', () => {
		expect(meldung({ ergebnis: 'zu-viele' }, 'F')).toBe(
			'Zu viele Versuche. Versuch es in einer Stunde nochmals.'
		);
		expect(meldung({ ergebnis: 'stoerung' }, 'F')).toBe(MELDUNG.stoerung);
	});

	it('ok hat keine Meldung', () => {
		expect(meldung({ ergebnis: 'ok' }, 'F')).toBeNull();
	});
});

// Ränder, die der gemeinsame Abruf-Baustein genau so erhalten muss (Charakterisierung vor Schritt 13).
describe('Login-Schnittstellen: Ränder der Deutung', () => {
	const ab = async (r: Response) => sende('/api/login/brief', { code: 'abc' }, holer(r).holen);
	const STOERUNG = { ergebnis: 'stoerung' };

	it('429 ist zu-viele, auch ohne lesbaren Körper', async () => {
		expect(await ab(unlesbar(429))).toEqual({ ergebnis: 'zu-viele' });
	});

	it('jedes 2xx ist ok, auch ohne Körper und ohne lesbaren Körper', async () => {
		expect(await ab(new Response(null, { status: 204 }))).toEqual({ ergebnis: 'ok' });
		expect(await ab(unlesbar(200))).toEqual({ ergebnis: 'ok' });
	});

	it('401 und 404 sind Störung', async () => {
		expect(await ab(json(401, { fehler: 'abgemeldet' }))).toEqual(STOERUNG);
		expect(await ab(json(404, { fehler: 'nicht-gefunden' }))).toEqual(STOERUNG);
	});

	it('benutzt nur mit kontakt', async () => {
		expect(await ab(ungeprueft(400, { fehler: 'benutzt' }))).toEqual(STOERUNG);
	});

	it('Wort mit falschem Status, fremdes Wort und JSON null bei 400 sind Störung', async () => {
		expect(await ab(json(409, { fehler: 'falsch' }))).toEqual(STOERUNG);
		expect(await ab(json(400, { fehler: 'eingabe' }))).toEqual(STOERUNG);
		expect(await ab(ungeprueft(400, null))).toEqual(STOERUNG);
	});
});
