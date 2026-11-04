import { describe, expect, it } from 'vitest';
import {
	bestaetige,
	fordereCodeAn,
	ladeMitglieder,
	ladeMitglied,
	ladeZugang,
	legeMitgliedAn,
	speichereAngaben,
	speichereRollen
} from './api.ts';

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

describe('Anfragen der Verwaltung an die Admin-Schnittstellen', () => {
	it('RR-07: 401 wird abgemeldet, 403 kein-admin und unbestaetigt bleiben getrennt', async () => {
		const a = await ladeZugang(holer(json(401, { fehler: 'abgemeldet' })).holen);
		const b = await ladeZugang(holer(json(403, { fehler: 'kein-admin' })).holen);
		const c = await ladeMitglieder({}, holer(json(403, { fehler: 'unbestaetigt' })).holen);
		expect([a, b, c]).toEqual([
			{ art: 'abgemeldet' },
			{ art: 'kein-admin' },
			{ art: 'unbestaetigt' }
		]);
	});

	it('SI-08: Zugang liefert bestaetigt; Code anfordern 202 ok, 429 zu-viele', async () => {
		expect(await ladeZugang(holer(json(200, { bestaetigt: true })).holen)).toEqual({
			art: 'ok',
			daten: { bestaetigt: true }
		});
		expect(await fordereCodeAn(holer(json(202, {})).holen)).toEqual({ art: 'ok', daten: {} });
		expect(await fordereCodeAn(holer(json(429, { fehler: 'zu-viele' })).holen)).toEqual({
			art: 'zu-viele'
		});
	});

	it('SI-08: Bestätigen schickt JSON, 400 falsch wird falsch', async () => {
		const { aufrufe, holen } = holer(json(400, { fehler: 'falsch' }));
		expect(await bestaetige('123456', holen)).toEqual({ art: 'falsch' });
		expect(aufrufe).toEqual([
			{
				pfad: '/api/admin/zugang',
				init: {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: '{"code":"123456"}'
				}
			}
		]);
	});

	it('A-MITGLIED-06: Liste fragt mit Suche und Status', async () => {
		const { aufrufe, holen } = holer(json(200, []));
		await ladeMitglieder({ suche: 'Müller & Co', status: 'aktiv' }, holen);
		expect(aufrufe[0].pfad).toBe('/api/admin/mitglieder?suche=M%C3%BCller+%26+Co&status=aktiv');
		const leer = holer(json(200, []));
		await ladeMitglieder({}, leer.holen);
		expect(leer.aufrufe[0].pfad).toBe('/api/admin/mitglieder');
	});

	it('A-MITGLIED-01: 400 eingabe liefert die Feldfehler, 409 vergeben das Feld', async () => {
		const felder = { plz: '4 Ziffern' };
		expect(await legeMitgliedAn({}, holer(json(400, { fehler: 'eingabe', felder })).holen)).toEqual(
			{ art: 'eingabe', felder }
		);
		expect(
			await speichereAngaben(
				7,
				{},
				{},
				holer(json(409, { fehler: 'vergeben', feld: 'email' })).holen
			)
		).toEqual({ art: 'vergeben', feld: 'email' });
	});

	it('A-MITGLIED-02: Speichern schickt den geladenen Stand mit, 409 veraltet wird veraltet', async () => {
		const { aufrufe, holen } = holer(json(409, { fehler: 'veraltet' }));
		expect(await speichereAngaben(7, { ort: 'Aarau' }, { ort: 'Olten' }, holen)).toEqual({
			art: 'veraltet'
		});
		expect(aufrufe[0].pfad).toBe('/api/admin/mitglieder/7');
		expect(JSON.parse(String(aufrufe[0].init.body))).toEqual({
			ort: 'Aarau',
			vorher: { ort: 'Olten' }
		});
	});

	it('RR-03: 409 letzter-admin, 404 nicht-gefunden', async () => {
		expect(
			await speichereRollen(7, [], holer(json(409, { fehler: 'letzter-admin' })).holen)
		).toEqual({ art: 'letzter-admin' });
		expect(await ladeMitglied(9, holer(json(404, { fehler: 'nicht-gefunden' })).holen)).toEqual({
			art: 'nicht-gefunden'
		});
	});

	it('Netzfehler, kaputter Körper und unbekannter Status werden zu stoerung', async () => {
		expect(await ladeZugang(holer(new Error('offline')).holen)).toEqual({ art: 'stoerung' });
		expect(await ladeZugang(holer(new Response('<html>', { status: 400 })).holen)).toEqual({
			art: 'stoerung'
		});
		expect(await ladeZugang(holer(json(500, {})).holen)).toEqual({ art: 'stoerung' });
		expect(await ladeZugang(holer(json(409, { fehler: 'sonst' })).holen)).toEqual({
			art: 'stoerung'
		});
	});
});
