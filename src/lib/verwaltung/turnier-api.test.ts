import { describe, expect, it } from 'vitest';
import { holer, json, ungeprueft } from '../../../tests/hilfen/verwaltung-abruf.ts';
import {
	ladeTurniere,
	legeTurnierAn,
	setzeTurnierStatus,
	legeKategorieAn,
	sageKategorieAb,
	aendereKategorie,
	ladeAnmeldungen,
	meldeVonHandAn,
	verschiebeAnmeldung,
	loescheAnmeldung,
	entscheideAntrag,
	sucheSpieler,
	korrigiereKlassierung,
	ladeDoppel,
	meldeDoppelAn,
	legeZusammen,
	aenderePartner,
	meldeAnfrageAlsPaarAn,
	loescheAnfrage
} from './turnier-api.ts';

describe('Anfragen der Verwaltung an die Admin-Schnittstellen', () => {
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

	it('FR-36: 409 art-gesperrt wird eigenes Ergebnis', async () => {
		const g = holer(json(409, { fehler: 'art-gesperrt' }));
		expect(await aendereKategorie(2, {}, true, g.holen)).toEqual({ art: 'art-gesperrt' });
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

	it('A-ANMELDUNG-06, FR-46, FR-48: Doppel verwalten mit Pfad, Methode und Körper', async () => {
		const h = holer(json(200, {}));
		await ladeDoppel(7, h.holen);
		await meldeDoppelAn(7, [12], false, h.holen);
		await meldeDoppelAn(7, [12, 13], true, h.holen);
		await legeZusammen(40, 41, false, h.holen);
		await legeZusammen(40, 41, true, h.holen);
		await aenderePartner(40, 12, 14, false, h.holen);
		await aenderePartner(40, 12, null, true, h.holen);
		await meldeAnfrageAlsPaarAn(9, false, h.holen);
		await meldeAnfrageAlsPaarAn(9, true, h.holen);
		await loescheAnfrage(9, h.holen);
		expect(h.aufrufe.map((a) => [a.init.method, a.pfad])).toEqual([
			['GET', '/api/admin/kategorien/7/doppel'],
			['POST', '/api/admin/kategorien/7/doppel'],
			['POST', '/api/admin/kategorien/7/doppel'],
			['POST', '/api/admin/anmeldungen/40/zusammenlegen'],
			['POST', '/api/admin/anmeldungen/40/zusammenlegen'],
			['POST', '/api/admin/anmeldungen/40/partner'],
			['POST', '/api/admin/anmeldungen/40/partner'],
			['POST', '/api/admin/anfragen/9/paar'],
			['POST', '/api/admin/anfragen/9/paar'],
			['POST', '/api/admin/anfragen/9/loeschen']
		]);
		const koerper = h.aufrufe.slice(1).map((a) => JSON.parse(String(a.init.body)));
		expect(koerper).toEqual([
			{ mitgliedIds: [12] },
			{ mitgliedIds: [12, 13], trotzdem: true },
			{ mitAnmeldungId: 41 },
			{ mitAnmeldungId: 41, trotzdem: true },
			{ bleibtId: 12, neuId: 14 },
			{ bleibtId: 12, neuId: null, trotzdem: true },
			{},
			{ trotzdem: true },
			{}
		]);
	});

	it('A-ANMELDUNG-06: Doppel-Liste kommt mit Paaren, Suchenden und Anfragen an', async () => {
		const s = (mitgliedId: number, vorname: string) => ({
			mitgliedId,
			name: { rufname: null, vorname, nachname: 'Beispiel' },
			mitgliedStatus: 'aktiv',
			geschlecht: 'm',
			klassierung: 'R5'
		});
		const liste = {
			paare: [{ anmeldungId: 40, spieler: [s(12, 'Max'), s(13, 'Tim')], summe: 10 }],
			suchende: [{ anmeldungId: 41, spieler: s(14, 'Ben'), kommentar: 'Gern am Abend.' }],
			anfragen: [
				{
					anfrageId: 9,
					von: s(15, 'Leo'),
					an: s(16, 'Noah'),
					gestelltAm: '2027-04-02T08:00:00.000Z'
				}
			]
		};
		expect(await ladeDoppel(7, holer(json(200, liste)).holen)).toEqual({ art: 'ok', daten: liste });
		expect(await ladeDoppel(7, holer(json(404, { fehler: 'nicht-gefunden' })).holen)).toEqual({
			art: 'nicht-gefunden'
		});
		const w = holer(json(409, { fehler: 'warnung', warnungen: ['passt-nicht', 'voll'] }));
		expect(await meldeDoppelAn(7, [12, 13], false, w.holen)).toEqual({
			art: 'warnung',
			warnungen: ['passt-nicht', 'voll']
		});
		const v = holer(json(409, { fehler: 'vorbereitung' }));
		expect(await legeZusammen(40, 41, false, v.holen)).toEqual({ art: 'vorbereitung' });
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
				name: { rufname: null, vorname: 'Hanna', nachname: 'Muster' },
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
		const kaputt = holer(ungeprueft(409, { fehler: 'warnung' }));
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
