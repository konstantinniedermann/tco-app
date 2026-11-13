import { describe, expect, it } from 'vitest';
import { holer, json, type Koerper } from '../../../tests/hilfen/verwaltung-abruf.ts';
import {
	ladeMitglieder,
	ladeMitglied,
	legeMitgliedAn,
	speichereAngaben,
	speichereRollen,
	erfasseAustritt,
	erfasseWiedereintritt,
	loescheMitglied,
	nimmLoeschungZurueck,
	ladeAuskunft,
	ladeBriefe,
	erzeugeBriefe,
	erzeugeBrief
} from './mitglieder-api.ts';

describe('Anfragen der Verwaltung an die Admin-Schnittstellen', () => {
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
});

describe('Mitgliedschaft: Austritt, Löschung, Auskunft', () => {
	const aktionen = [
		[erfasseAustritt, 'austritt'],
		[erfasseWiedereintritt, 'wiedereintritt'],
		[loescheMitglied, 'loeschen'],
		[nimmLoeschungZurueck, 'loeschen-rueckgaengig']
	] as const;

	it.each(aktionen)('schickt ein leeres JSON an den richtigen Pfad (%#)', async (aktion, pfad) => {
		const h = holer(json(200, {}));
		expect(await aktion(5, h.holen)).toEqual({ art: 'ok', daten: {} });
		expect(h.aufrufe[0].pfad).toBe(`/api/admin/mitglieder/5/${pfad}`);
		expect(h.aufrufe[0].init.method).toBe('POST');
		expect(h.aufrufe[0].init.body).toBe('{}');
	});

	it.each(aktionen)('409 und weitere Antworten werden eigene Ergebnisse (%#)', async (aktion) => {
		const mit = <S extends number>(s: S, i: Koerper<S>) => aktion(1, holer(json(s, i)).holen);
		expect(await mit(409, { fehler: 'veraltet' })).toEqual({ art: 'veraltet' });
		expect(await mit(409, { fehler: 'letzter-mytco' })).toEqual({ art: 'letzter-mytco' });
		expect(await mit(409, { fehler: 'frist-abgelaufen' })).toEqual({ art: 'frist-abgelaufen' });
		expect(await mit(409, { fehler: 'eigenes-konto' })).toEqual({ art: 'eigenes-konto' });
		expect(await mit(403, { fehler: 'nur-ansehen' })).toEqual({ art: 'nur-ansehen' });
		expect(await mit(404, { fehler: 'nicht-gefunden' })).toEqual({ art: 'nicht-gefunden' });
		expect(await mit(500, {})).toEqual({ art: 'stoerung' });
		expect(await aktion(1, holer(new Error('weg')).holen)).toEqual({ art: 'stoerung' });
	});

	it('Auskunft liest /api/admin/mitglieder/[id]/auskunft', async () => {
		const h = holer(json(200, { name: 'Beispiel, Lea' }));
		expect(await ladeAuskunft(5, h.holen)).toEqual({
			art: 'ok',
			daten: { name: 'Beispiel, Lea' }
		});
		expect(h.aufrufe[0].pfad).toBe('/api/admin/mitglieder/5/auskunft');
		expect(h.aufrufe[0].init.method).toBe('GET');
	});
	it('A-LOGIN-01: Briefe lesen, als Serie und einzeln erzeugen; 409 nicht-moeglich mit anzahl', async () => {
		const l = holer(json(200, []));
		expect(await ladeBriefe(l.holen)).toEqual({ art: 'ok', daten: [] });
		expect(l.aufrufe[0].pfad).toBe('/api/admin/briefe');
		expect(l.aufrufe[0].init.method).toBe('GET');
		const s = holer(json(200, { briefe: [] }));
		expect(await erzeugeBriefe([3, 4], s.holen)).toEqual({ art: 'ok', daten: { briefe: [] } });
		expect(s.aufrufe[0].pfad).toBe('/api/admin/briefe');
		expect(JSON.parse(String(s.aufrufe[0].init.body))).toEqual({ ids: [3, 4] });
		const e = holer(json(200, { briefe: [] }));
		await erzeugeBrief(7, e.holen);
		expect(e.aufrufe[0].pfad).toBe('/api/admin/mitglieder/7/brief');
		expect(JSON.parse(String(e.aufrufe[0].init.body))).toEqual({});
		const n = holer(json(409, { fehler: 'nicht-moeglich', anzahl: 2 }));
		expect(await erzeugeBriefe([1, 2], n.holen)).toEqual({ art: 'nicht-moeglich', anzahl: 2 });
		const k = holer(json(403, { fehler: 'kein-recht' }));
		expect(await erzeugeBrief(1, k.holen)).toEqual({ art: 'kein-recht' });
	});
});
