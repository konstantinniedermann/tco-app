import { describe, expect, it } from 'vitest';
import {
	aendereAnlass,
	bestaetige,
	ladeAnlaesseAdmin,
	ladeAnlassAdmin,
	legeAnlassAn,
	loescheAnlass,
	fordereCodeAn,
	ladeMitglieder,
	ladeMitglied,
	ladeZugang,
	legeMitgliedAn,
	speichereAngaben,
	speichereRollen,
	ladeTurniere,
	legeTurnierAn,
	setzeTurnierStatus,
	legeKategorieAn,
	sageKategorieAb,
	aendereKategorie
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

	it('RR-03: Rollen schicken den geladenen Stand mit; 409 letzter-mytco und veraltet, 404 nicht-gefunden', async () => {
		const { aufrufe, holen } = holer(json(409, { fehler: 'letzter-mytco' }));
		expect(await speichereRollen(7, ['cm'], ['mytco', 'cm'], holen)).toEqual({
			art: 'letzter-mytco'
		});
		expect(aufrufe[0].pfad).toBe('/api/admin/mitglieder/7/rollen');
		expect(JSON.parse(String(aufrufe[0].init.body))).toEqual({
			rollen: ['cm'],
			vorher: ['mytco', 'cm']
		});
		expect(
			await speichereRollen(7, [], [], holer(json(409, { fehler: 'veraltet' })).holen)
		).toEqual({ art: 'veraltet' });
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

	it('A-ANLASS-01: Anlässe laden, anlegen, ändern, löschen', async () => {
		const liste = holer(json(200, [{ id: 3 }]));
		expect(await ladeAnlaesseAdmin(liste.holen)).toEqual({ art: 'ok', daten: [{ id: 3 }] });
		expect(liste.aufrufe[0].pfad).toBe('/api/admin/anlaesse');

		const eins = holer(json(200, { id: 3 }));
		expect(await ladeAnlassAdmin(3, eins.holen)).toEqual({ art: 'ok', daten: { id: 3 } });
		expect(eins.aufrufe[0].pfad).toBe('/api/admin/anlaesse/3');

		const neu = holer(json(201, { id: 4 }));
		expect(await legeAnlassAn({ titel: 'GV' }, neu.holen)).toEqual({ art: 'ok', daten: { id: 4 } });
		expect(neu.aufrufe[0]).toMatchObject({ pfad: '/api/admin/anlaesse', init: { method: 'POST' } });

		const fehlt = holer(
			json(400, { fehler: 'eingabe', felder: { titel: 'Bitte einen Titel angeben.' } })
		);
		expect(await aendereAnlass(3, {}, fehlt.holen)).toEqual({
			art: 'eingabe',
			felder: { titel: 'Bitte einen Titel angeben.' }
		});
		expect(fehlt.aufrufe[0].pfad).toBe('/api/admin/anlaesse/3');

		const weg = holer(json(404, { fehler: 'nicht-gefunden' }));
		expect(await loescheAnlass(3, weg.holen)).toEqual({ art: 'nicht-gefunden' });
		expect(weg.aufrufe[0]).toMatchObject({
			pfad: '/api/admin/anlaesse/3/loeschen',
			init: { method: 'POST' }
		});
	});

	it('FR-33: 409 schluss-vorbei und keine-kategorie werden eigene Ergebnisse', async () => {
		const a = await setzeTurnierStatus(
			1,
			'offen',
			holer(json(409, { fehler: 'schluss-vorbei' })).holen
		);
		const b = await setzeTurnierStatus(
			1,
			'offen',
			holer(json(409, { fehler: 'keine-kategorie' })).holen
		);
		const c = await setzeTurnierStatus(
			1,
			'geschlossen',
			holer(json(409, { fehler: 'unzulaessig' })).holen
		);
		const d = await aendereKategorie(2, {}, holer(json(409, { fehler: 'abgesagt' })).holen);
		expect([a, b, c, d]).toEqual([
			{ art: 'schluss-vorbei' },
			{ art: 'keine-kategorie' },
			{ art: 'unzulaessig' },
			{ art: 'abgesagt' }
		]);
	});

	it('FR-33: 409 vergeben nennt Jahr oder Name', async () => {
		const r = await legeTurnierAn({}, holer(json(409, { fehler: 'vergeben', feld: 'jahr' })).holen);
		expect(r).toEqual({ art: 'vergeben', feld: 'jahr' });
	});

	it('FR-33: Turnier-Endpunkte werden mit Pfad und Körper aufgerufen', async () => {
		const h = holer(json(200, {}));
		await ladeTurniere(h.holen);
		await setzeTurnierStatus(7, 'offen', h.holen);
		await legeKategorieAn(7, { name: 'x' }, h.holen);
		await sageKategorieAb(9, h.holen);
		expect(h.aufrufe.map((a) => [a.init.method, a.pfad])).toEqual([
			['GET', '/api/admin/turniere'],
			['POST', '/api/admin/turniere/7/status'],
			['POST', '/api/admin/turniere/7/kategorien'],
			['POST', '/api/admin/kategorien/9/absagen']
		]);
		expect(JSON.parse(String(h.aufrufe[1].init.body))).toEqual({ status: 'offen' });
	});

	it('RR-07: ladeZugang liefert die Rollen', async () => {
		const r = await ladeZugang(
			holer(json(200, { bestaetigt: true, mitgliedId: 3, rollen: ['cm'] })).holen
		);
		expect(r).toEqual({
			art: 'ok',
			daten: { bestaetigt: true, mitgliedId: 3, rollen: ['cm'] }
		});
		if (r.art === 'ok') expect(r.daten.rollen).toEqual(['cm']);
	});
});
