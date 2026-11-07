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
	aendereKategorie,
	beendeAnsicht,
	ladeRollenListe,
	schaueAls,
	ladeAnmeldungen,
	meldeVonHandAn,
	verschiebeAnmeldung,
	loescheAnmeldung,
	entscheideAntrag,
	sucheSpieler,
	korrigiereKlassierung
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
	it('Regel 3: 403 kein-recht und nur-ansehen kommen als eigene Antwort an', async () => {
		const a = await speichereRollen(
			1,
			['cm'],
			[],
			holer(json(403, { fehler: 'kein-recht' })).holen
		);
		const b = await legeTurnierAn({}, holer(json(403, { fehler: 'nur-ansehen' })).holen);
		expect([a, b]).toEqual([{ art: 'kein-recht' }, { art: 'nur-ansehen' }]);
	});

	it('Regel 2: Rollen-Übersicht liest /api/admin/rollen', async () => {
		const liste = [{ rolle: 'cm', mitglieder: [{ id: 3, name: 'Muster, Hanna' }] }];
		const h = holer(json(200, liste));
		expect(await ladeRollenListe(h.holen)).toEqual({ art: 'ok', daten: liste });
		expect(h.aufrufe[0].pfad).toBe('/api/admin/rollen');
	});

	it('Ansicht als …: einschalten schickt die Rolle; läuft schon eine, wird sie zuerst beendet', async () => {
		const ohne = holer(json(200, {}));
		expect(await schaueAls('cm', null, ohne.holen)).toEqual({ art: 'ok', daten: {} });
		expect(ohne.aufrufe.map((a) => [a.pfad, a.init.body])).toEqual([
			['/api/admin/ansicht', JSON.stringify({ rolle: 'cm' })]
		]);

		const mit = holer(json(200, {}));
		await schaueAls('mitglied', 'cm', mit.holen);
		expect(mit.aufrufe.map((a) => a.pfad)).toEqual([
			'/api/admin/ansicht/beenden',
			'/api/admin/ansicht'
		]);

		// Lässt sich die laufende Ansicht nicht beenden, schaltet die Seite keine neue ein.
		const kaputt = holer(new Error('Netz weg'));
		expect(await schaueAls('mitglied', 'cm', kaputt.holen)).toEqual({ art: 'stoerung' });
		expect(kaputt.aufrufe).toHaveLength(1);

		const ende = holer(json(200, {}));
		expect(await beendeAnsicht(ende.holen)).toEqual({ art: 'ok', daten: {} });
		expect(ende.aufrufe[0].init.method).toBe('POST');
	});

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
		const d = await aendereKategorie(2, {}, false, holer(json(409, { fehler: 'abgesagt' })).holen);
		expect([a, b, c, d]).toEqual([
			{ art: 'schluss-vorbei' },
			{ art: 'keine-kategorie' },
			{ art: 'unzulaessig' },
			{ art: 'abgesagt' }
		]);
	});

	it('FR-36: 409 unpassend wird eigenes Ergebnis mit anzahl', async () => {
		const u = holer(json(409, { fehler: 'unpassend', anzahl: 3 }));
		expect(await aendereKategorie(2, {}, false, u.holen)).toEqual({ art: 'unpassend', anzahl: 3 });
		const h = holer(json(409, { fehler: 'hat-anmeldungen', anzahl: 2 }));
		expect(await sageKategorieAb(2, h.holen)).toEqual({ art: 'hat-anmeldungen', anzahl: 2 });
		const t = holer(json(200, {}));
		await aendereKategorie(2, { name: 'x' }, true, t.holen);
		expect(JSON.parse(String(t.aufrufe[0].init.body))).toEqual({ name: 'x', trotzdem: true });
		await aendereKategorie(2, { name: 'x' }, false, t.holen);
		expect(JSON.parse(String(t.aufrufe[1].init.body))).toEqual({ name: 'x' });
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

	it('A-ANMELDUNG-06, FR-46, FR-08: Anmeldungen verwalten mit Pfad, Methode und Körper', async () => {
		const h = holer(json(200, {}));
		await ladeAnmeldungen(4, h.holen);
		await meldeVonHandAn(4, 12, false, h.holen);
		await meldeVonHandAn(4, 12, true, h.holen);
		await verschiebeAnmeldung(30, 5, false, h.holen);
		await verschiebeAnmeldung(30, 5, true, h.holen);
		await loescheAnmeldung(30, h.holen);
		await korrigiereKlassierung(12, 'R6', h.holen);
		expect(h.aufrufe.map((a) => [a.init.method, a.pfad])).toEqual([
			['GET', '/api/admin/kategorien/4/anmeldungen'],
			['POST', '/api/admin/kategorien/4/anmeldungen'],
			['POST', '/api/admin/kategorien/4/anmeldungen'],
			['POST', '/api/admin/anmeldungen/30'],
			['POST', '/api/admin/anmeldungen/30'],
			['POST', '/api/admin/anmeldungen/30/loeschen'],
			['POST', '/api/admin/spieler/12/klassierung']
		]);
		const koerper = h.aufrufe.slice(1).map((a) => JSON.parse(String(a.init.body)));
		expect(koerper).toEqual([
			{ mitgliedId: 12 },
			{ mitgliedId: 12, trotzdem: true },
			{ kategorieId: 5 },
			{ kategorieId: 5, trotzdem: true },
			{},
			{ klassierung: 'R6' }
		]);
	});

	it('FR-08: Entscheid schickt den Grund nur bei einer Ablehnung, ohne Leerzeichen am Rand', async () => {
		const h = holer(json(200, {}));
		await entscheideAntrag(30, true, 'wird ignoriert', h.holen);
		await entscheideAntrag(30, false, '  Zu viele Anträge.  ', h.holen);
		await entscheideAntrag(30, false, '   ', h.holen);
		expect(h.aufrufe.map((a) => [a.init.method, a.pfad])).toEqual([
			['POST', '/api/admin/anmeldungen/30/entscheid'],
			['POST', '/api/admin/anmeldungen/30/entscheid'],
			['POST', '/api/admin/anmeldungen/30/entscheid']
		]);
		expect(h.aufrufe.map((a) => JSON.parse(String(a.init.body)))).toEqual([
			{ bestaetigt: true },
			{ bestaetigt: false, grund: 'Zu viele Anträge.' },
			{ bestaetigt: false }
		]);
	});

	it('A-ANMELDUNG-06: Spielersuche schickt den Suchtext kodiert und liefert die Treffer', async () => {
		const treffer = [
			{
				mitgliedId: 12,
				name: 'Muster, Hanna',
				geschlecht: 'w',
				jahrgang: 1990,
				klassierung: 'R7'
			}
		];
		const h = holer(json(200, treffer));
		expect(await sucheSpieler('Muster, H&a', h.holen)).toEqual({ art: 'ok', daten: treffer });
		expect(h.aufrufe[0]).toMatchObject({ init: { method: 'GET' } });
		expect(h.aufrufe[0].pfad).toBe('/api/admin/spieler?suche=Muster%2C+H%26a');
	});

	it('FR-46: 409 warnung kommt mit den Warnungen an', async () => {
		const w = holer(json(409, { fehler: 'warnung', warnungen: ['passt-nicht', 'voll'] }));
		expect(await meldeVonHandAn(4, 12, false, w.holen)).toEqual({
			art: 'warnung',
			warnungen: ['passt-nicht', 'voll']
		});
		const v = holer(json(409, { fehler: 'warnung', warnungen: ['geschlossen'] }));
		expect(await verschiebeAnmeldung(30, 5, false, v.holen)).toEqual({
			art: 'warnung',
			warnungen: ['geschlossen']
		});
		// Ohne Liste der Warnungen ist die Antwort nicht lesbar.
		const kaputt = holer(json(409, { fehler: 'warnung' }));
		expect(await meldeVonHandAn(4, 12, false, kaputt.holen)).toEqual({ art: 'stoerung' });
	});

	it('FR-46, FR-08: 409 schon-angemeldet, vorbereitung und nicht-beantragt werden eigene Ergebnisse', async () => {
		const a = await meldeVonHandAn(
			4,
			12,
			false,
			holer(json(409, { fehler: 'schon-angemeldet' })).holen
		);
		const b = await verschiebeAnmeldung(
			30,
			5,
			false,
			holer(json(409, { fehler: 'vorbereitung' })).holen
		);
		const c = await entscheideAntrag(
			30,
			true,
			'',
			holer(json(409, { fehler: 'nicht-beantragt' })).holen
		);
		const d = await loescheAnmeldung(30, holer(json(404, { fehler: 'nicht-gefunden' })).holen);
		expect([a, b, c, d]).toEqual([
			{ art: 'schon-angemeldet' },
			{ art: 'vorbereitung' },
			{ art: 'nicht-beantragt' },
			{ art: 'nicht-gefunden' }
		]);
	});
});
