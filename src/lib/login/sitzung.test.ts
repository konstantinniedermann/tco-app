import { describe, expect, it } from 'vitest';
import { hatSitzung, ladeSitzung } from './sitzung.ts';

const antwortMit = (status: number) => (async () => new Response('{}', { status })) as typeof fetch;

describe('hatSitzung', () => {
	it('ist angemeldet, wenn /api/sitzung mit 200 antwortet', async () => {
		expect(await hatSitzung(antwortMit(200))).toBe(true);
	});

	it('ist nicht angemeldet ohne Sitzung (401)', async () => {
		expect(await hatSitzung(antwortMit(401))).toBe(false);
	});

	it('ist nicht angemeldet, wenn das Netz weg ist', async () => {
		const weg = (async () => {
			throw new TypeError('Failed to fetch');
		}) as typeof fetch;
		expect(await hatSitzung(weg)).toBe(false);
	});
});

describe('hatSitzung: Ränder', () => {
	it('ist nicht angemeldet, wenn der Server gestört ist (503)', async () => {
		expect(await hatSitzung(antwortMit(503))).toBe(false);
	});
});

const SITZUNG = {
	vorname: 'Erika',
	rufname: null,
	passkeyHinweis: true,
	verwaltung: false,
	ansicht: null,
	nachrichtenOffen: 0
};

describe('ladeSitzung', () => {
	it('fragt /api/sitzung mit GET und ohne Kopfzeilen und gibt die Sitzung', async () => {
		const anfragen: [string, RequestInit][] = [];
		const holen = (async (pfad: string, init: RequestInit) => {
			anfragen.push([pfad, init]);
			return new Response(JSON.stringify(SITZUNG), { status: 200 });
		}) as typeof fetch;
		expect(await ladeSitzung(holen)).toEqual({ art: 'ok', daten: SITZUNG });
		expect(anfragen).toEqual([['/api/sitzung', { method: 'GET' }]]);
	});

	it('ohne Sitzung: abgemeldet, nach dem Status, auch ohne lesbaren Körper', async () => {
		expect((await ladeSitzung(antwortMit(401))).art).toBe('abgemeldet');
		const leer = (async () => new Response(null, { status: 401 })) as typeof fetch;
		expect((await ladeSitzung(leer)).art).toBe('abgemeldet');
	});

	it('jede andere Antwort ist eine Störung', async () => {
		expect(await ladeSitzung(antwortMit(503))).toEqual({ art: 'stoerung' });
		expect(await ladeSitzung(antwortMit(403))).toEqual({ art: 'stoerung' });
	});

	it('ein Erfolg ohne lesbaren Körper bleibt ein Erfolg ohne Daten (wie im Baustein)', async () => {
		const leer = (async () => new Response('kein json', { status: 200 })) as typeof fetch;
		expect(await ladeSitzung(leer)).toEqual({ art: 'ok', daten: undefined });
	});

	it('Netz weg: eine Störung, oder auf Wunsch der Wurf von fetch (Fall G)', async () => {
		const wurf = new TypeError('Failed to fetch');
		const weg = (async () => {
			throw wurf;
		}) as typeof fetch;
		expect(await ladeSitzung(weg)).toEqual({ art: 'stoerung' });
		await expect(ladeSitzung(weg, 'wurf')).rejects.toBe(wurf);
	});

	it('auf Wunsch des Wurfs bleibt eine Antwort des Servers eine Störung, kein Wurf', async () => {
		expect(await ladeSitzung(antwortMit(503), 'wurf')).toEqual({ art: 'stoerung' });
	});
});
