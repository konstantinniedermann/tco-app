import { describe, expect, it } from 'vitest';
import type { FehlerStatus, Fehlerkoerper } from '../fehler.ts';
import {
	MELDUNG,
	fordereMailCodeAn,
	meldeMitBriefAn,
	meldeMitMailAn,
	meldeSichAb,
	meldung,
	sende
} from './anmelden.ts';

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
		expect(await sende('/api/login/brief', { code: 'abc' }, holen)).toEqual({ art: 'ok' });
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
		expect(await sende('/x', {}, holer(json(202, {})).holen)).toEqual({ art: 'ok' });
	});

	it('400 falsch', async () => {
		const r = await sende('/x', {}, holer(json(400, { fehler: 'falsch' })).holen);
		expect(r).toEqual({ art: 'falsch' });
	});

	it('400 benutzt mit Kontakt', async () => {
		const r = await sende('/x', {}, holer(json(400, { fehler: 'benutzt', kontakt: 'K' })).holen);
		expect(r).toEqual({ art: 'benutzt', kontakt: 'K' });
	});

	it('429 zu viele', async () => {
		const r = await sende('/x', {}, holer(json(429, { fehler: 'zu-viele' })).holen);
		expect(r).toEqual({ art: 'zu-viele' });
	});

	it.each([
		['Serverfehler', json(500, {})],
		['400 ohne lesbaren Körper', new Response('kaputt', { status: 400 })],
		['Netzfehler', new TypeError('Failed to fetch')]
	])('%s gilt als Störung', async (_, antwort) => {
		expect(await sende('/x', {}, holer(antwort).holen)).toEqual({ art: 'stoerung' });
	});
});

describe('Meldungen beim Feld (UI-06)', () => {
	it('benutzt nennt die Ansprechperson', () => {
		expect(meldung({ art: 'benutzt', kontakt: 'das Sekretariat' }, 'F')).toBe(
			'Dieser Code wurde schon benutzt. Wende dich an das Sekretariat.'
		);
	});

	it('falsch nimmt den Text der Seite', () => {
		expect(meldung({ art: 'falsch' }, MELDUNG.briefFalsch)).toBe(
			'Dieser Code stimmt nicht. Prüf ihn oder lass dir einen neuen per E-Mail schicken.'
		);
		expect(meldung({ art: 'falsch' }, MELDUNG.mailFalsch)).toBe(
			'Dieser Code stimmt nicht. Prüf ihn oder lass dir einen neuen schicken.'
		);
	});

	it('zu viele und Störung', () => {
		expect(meldung({ art: 'zu-viele' }, 'F')).toBe(
			'Zu viele Versuche. Versuch es in einer Stunde nochmals.'
		);
		expect(meldung({ art: 'stoerung' }, 'F')).toBe(MELDUNG.stoerung);
	});

	it('ok hat keine Meldung', () => {
		expect(meldung({ art: 'ok' }, 'F')).toBeNull();
	});
});

// Ränder, die der gemeinsame Abruf-Baustein genau so erhalten muss (Charakterisierung vor Schritt 13).
describe('Login-Schnittstellen: Ränder der Deutung', () => {
	const ab = async (r: Response) => sende('/api/login/brief', { code: 'abc' }, holer(r).holen);
	const STOERUNG = { art: 'stoerung' };

	it('429 ist zu-viele, auch ohne lesbaren Körper', async () => {
		expect(await ab(unlesbar(429))).toEqual({ art: 'zu-viele' });
	});

	it('jedes 2xx ist ok, auch ohne Körper und ohne lesbaren Körper', async () => {
		expect(await ab(new Response(null, { status: 204 }))).toEqual({ art: 'ok' });
		expect(await ab(unlesbar(200))).toEqual({ art: 'ok' });
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

describe('Benannte Anfragen der Login-Seiten', () => {
	it('A-LOGIN-01: jede Funktion nennt ihre Adresse und schickt ihre Angaben', async () => {
		const fall = async (
			aufruf: (holen: ReturnType<typeof holer>['holen']) => Promise<{ art: string }>,
			pfad: string,
			koerper: object
		) => {
			const h = holer(json(200, {}));
			expect(await aufruf(h.holen)).toEqual({ art: 'ok' });
			expect(h.aufrufe).toEqual([
				{
					pfad,
					init: {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify(koerper)
					}
				}
			]);
		};
		await fall((h) => meldeMitBriefAn('ABCD-1234', h), '/api/login/brief', { code: 'ABCD-1234' });
		await fall((h) => fordereMailCodeAn('lea@example.org', h), '/api/login/mail-code', {
			email: 'lea@example.org'
		});
		await fall((h) => meldeMitMailAn('lea@example.org', '123456', h), '/api/login/mail', {
			email: 'lea@example.org',
			code: '123456'
		});
		await fall((h) => meldeSichAb(h), '/api/logout', {});
	});
});
