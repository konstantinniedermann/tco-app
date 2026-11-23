import { describe, expect, it } from 'vitest';
import { holer, json } from '../../../tests/hilfen/abruf.ts';
import {
	ladeZugang,
	fordereCodeAn,
	bestaetige,
	ladeRollenListe,
	vergibRolle,
	entziehRolle,
	schaueAls,
	beendeAnsicht
} from './zugang-api.ts';

describe('Anfragen der Verwaltung an die Admin-Schnittstellen', () => {
	it('Regel 2: Rollen-Übersicht liest /api/admin/rollen', async () => {
		const liste = [{ rolle: 'cm', mitglieder: [{ id: 3, name: 'Muster, Hanna' }] }];
		const h = holer(json(200, liste));
		expect(await ladeRollenListe(h.holen)).toEqual({ art: 'ok', daten: liste });
		expect(h.aufrufe[0].pfad).toBe('/api/admin/rollen');
	});

	it('A-ROLLE-01, RR-03: Rolle vergeben und entziehen schicken Mitglied und Rolle; 409 letzter-mytco', async () => {
		const v = holer(json(200, {}));
		expect(await vergibRolle(7, 'cm', false, v.holen)).toEqual({ art: 'ok', daten: {} });
		expect(v.aufrufe.map((a) => [a.pfad, JSON.parse(String(a.init.body))])).toEqual([
			['/api/admin/rollen/vergeben', { mitgliedId: 7, rolle: 'cm', benachrichtigen: false }]
		]);
		const e = holer(json(409, { fehler: 'letzter-mytco' }));
		expect(await entziehRolle(7, 'mytco', false, e.holen)).toEqual({ art: 'letzter-mytco' });
		expect(e.aufrufe.map((a) => [a.pfad, JSON.parse(String(a.init.body))])).toEqual([
			['/api/admin/rollen/entziehen', { mitgliedId: 7, rolle: 'mytco', benachrichtigen: false }]
		]);
	});

	it('FR-56: Rolle vergeben und entziehen schicken das Häkchen «Mitglied benachrichtigen»', async () => {
		const h = holer(json(200, {}));
		await vergibRolle(7, 'cm', true, h.holen);
		await entziehRolle(7, 'cm', true, h.holen);
		expect(h.aufrufe.map((a) => JSON.parse(String(a.init.body)))).toEqual([
			{ mitgliedId: 7, rolle: 'cm', benachrichtigen: true },
			{ mitgliedId: 7, rolle: 'cm', benachrichtigen: true }
		]);
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
