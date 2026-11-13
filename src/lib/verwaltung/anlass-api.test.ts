import { describe, expect, it } from 'vitest';
import { holer, json } from '../../../tests/hilfen/verwaltung-abruf.ts';
import {
	ladeAnlaesseAdmin,
	ladeAnlassAdmin,
	legeAnlassAn,
	aendereAnlass,
	loescheAnlass
} from './anlass-api.ts';

describe('Anfragen der Verwaltung an die Admin-Schnittstellen', () => {
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
});
