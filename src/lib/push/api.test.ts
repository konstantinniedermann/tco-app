import { describe, expect, test } from 'vitest';
import { holeBenachrichtigungen, loescheAbo, sendeAbo, speichereThemen } from './api.ts';

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

const json = (status: number, inhalt: unknown) => Response.json(inhalt, { status });
const STAND = {
	themen: { anlaesse: true, cm: false, verein: true },
	pushHier: false,
	schluessel: 'B-erfunden'
};
const ABO = { endpoint: 'https://push.example.org/abo/1', keys: { p256dh: 'p', auth: 'a' } };

describe('Anfragen zu Benachrichtigungen (FR-40, FR-41)', () => {
	test('FR-41: Stand laden und Themen per JSON-POST speichern', async () => {
		const h = holer(json(200, STAND));
		expect(await holeBenachrichtigungen(h.holen)).toEqual({ art: 'ok', daten: STAND });
		expect(h.aufrufe[0]).toMatchObject({
			pfad: '/api/benachrichtigungen',
			init: { method: 'GET' }
		});

		const s = holer(json(200, STAND));
		expect(await speichereThemen(STAND.themen, s.holen)).toEqual({ art: 'ok', daten: STAND });
		expect(s.aufrufe[0].pfad).toBe('/api/benachrichtigungen');
		expect(s.aufrufe[0].init.method).toBe('POST');
		expect(new Headers(s.aufrufe[0].init.headers).get('content-type')).toBe('application/json');
		expect(JSON.parse(String(s.aufrufe[0].init.body))).toEqual({ themen: STAND.themen });
	});

	test('FR-40: Abo melden und löschen', async () => {
		const h = holer(json(200, { pushHier: true }));
		expect(await sendeAbo(ABO, h.holen)).toEqual({ art: 'ok', daten: { pushHier: true } });
		expect(h.aufrufe[0].pfad).toBe('/api/benachrichtigungen/abo');
		expect(JSON.parse(String(h.aufrufe[0].init.body))).toEqual(ABO);

		const l = holer(json(200, { pushHier: false }));
		expect(await loescheAbo(l.holen)).toEqual({ art: 'ok', daten: { pushHier: false } });
		expect(l.aufrufe[0].pfad).toBe('/api/benachrichtigungen/abo/loeschen');
		expect(new Headers(l.aufrufe[0].init.headers).get('content-type')).toBe('application/json');
		expect(JSON.parse(String(l.aufrufe[0].init.body))).toEqual({});
	});

	test('FR-40: Statuscodes werden zu Ergebnissen (401, 409 push-aus, Störung)', async () => {
		const abo = async (antwort: Response | Error) => sendeAbo(ABO, holer(antwort).holen);
		expect(await abo(json(401, { fehler: 'abgemeldet' }))).toEqual({ art: 'abgemeldet' });
		expect(await abo(json(409, { fehler: 'push-aus' }))).toEqual({ art: 'push-aus' });
		expect(await abo(json(409, { fehler: 'anderes' }))).toEqual({ art: 'stoerung' });
		expect(await abo(json(400, { fehler: 'eingabe' }))).toEqual({ art: 'stoerung' });
		expect(await abo(json(500, {}))).toEqual({ art: 'stoerung' });
		expect(await abo(new Error('weg'))).toEqual({ art: 'stoerung' });
		expect(await abo(new Response('kein JSON', { status: 502 }))).toEqual({ art: 'stoerung' });
		expect(await holeBenachrichtigungen(holer(json(401, {})).holen)).toEqual({
			art: 'abgemeldet'
		});
	});
});
