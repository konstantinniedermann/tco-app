import { describe, expect, it } from 'vitest';
import { holer, json, ungeprueft } from '../../../tests/hilfen/verwaltung-abruf.ts';
import { sendeAntwort } from './gespraech-api.ts';
import {
	ladeMitglieder,
	speichereRollen,
	zeigeEinleseVorschau,
	liesMitgliederEin
} from './mitglieder-api.ts';
import { legeTurnierAn } from './turnier-api.ts';
import { ladeZugang } from './zugang-api.ts';

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

	it('Netzfehler, kaputter Körper und unbekannter Status werden zu stoerung', async () => {
		expect(await ladeZugang(holer(new Error('offline')).holen)).toEqual({ art: 'stoerung' });
		expect(await ladeZugang(holer(new Response('<html>', { status: 400 })).holen)).toEqual({
			art: 'stoerung'
		});
		expect(await ladeZugang(holer(json(500, {})).holen)).toEqual({ art: 'stoerung' });
		expect(await ladeZugang(holer(ungeprueft(409, { fehler: 'sonst' })).holen)).toEqual({
			art: 'stoerung'
		});
	});
});

// Ränder, die der gemeinsame Abruf-Baustein genau so erhalten muss (Charakterisierung vor Schritt 13).
describe('Verwaltung: Ränder der Deutung', () => {
	const hole = async (r: Response) => ladeZugang(holer(r).holen);
	const schick = async (r: Response) => legeTurnierAn({}, holer(r).holen);
	const STOERUNG = { art: 'stoerung' };

	it('401 und 404 genügen als Status, auch ohne Wort', async () => {
		expect(await hole(ungeprueft(404, {}))).toEqual({ art: 'nicht-gefunden' });
		expect(await hole(ungeprueft(401, {}))).toEqual({ art: 'abgemeldet' });
	});

	it('ohne lesbaren Körper Störung, auch bei 204, 200 und 429', async () => {
		expect(await schick(new Response(null, { status: 204 }))).toEqual(STOERUNG);
		expect(await hole(new Response('kein JSON', { status: 200 }))).toEqual(STOERUNG);
		expect(await schick(new Response('kein JSON', { status: 429 }))).toEqual(STOERUNG);
	});

	it('JSON null gilt bei einem Fehler als leerer Körper, bei Erfolg als Daten', async () => {
		expect(await hole(ungeprueft(401, null))).toEqual({ art: 'abgemeldet' });
		expect(await hole(ungeprueft(200, null))).toEqual({ art: 'ok', daten: null });
		expect(await schick(ungeprueft(409, null))).toEqual(STOERUNG);
	});

	it('403 braucht eines seiner vier Wörter', async () => {
		expect(await hole(ungeprueft(403, {}))).toEqual(STOERUNG);
		expect(await hole(json(403, { fehler: 'veraltet' }))).toEqual(STOERUNG);
	});

	it('ein Wort gilt nur mit seinem Status', async () => {
		expect(await schick(json(400, { fehler: 'veraltet' }))).toEqual(STOERUNG);
		expect(await schick(json(409, { fehler: 'falsch' }))).toEqual(STOERUNG);
		expect(await schick(json(409, { fehler: 'push-aus' }))).toEqual(STOERUNG);
	});

	it('eingabe braucht felder; eine Liste als felder kommt heute durch (Rand)', async () => {
		expect(await schick(json(400, { fehler: 'eingabe' }))).toEqual(STOERUNG);
		expect(await schick(ungeprueft(400, { fehler: 'eingabe', felder: 'titel' }))).toEqual(STOERUNG);
		expect(await schick(ungeprueft(400, { fehler: 'eingabe', felder: ['titel'] }))).toEqual({
			art: 'eingabe',
			felder: ['titel']
		});
	});

	it('A-MITGLIED-07: 400 datei kommt mit den Fehlern der Datei an, ohne sie Störung', async () => {
		const datei = { zeilen: [{ zeile: 2, fehler: ['plz'] }] };
		const v = holer(json(400, { fehler: 'datei', datei }));
		expect(await zeigeEinleseVorschau('a;b', v.holen)).toEqual({ art: 'datei', datei });
		expect(v.aufrufe[0].pfad).toBe('/api/admin/einlesen/vorschau');
		const ohne = await liesMitgliederEin(
			'a;b',
			1,
			holer(ungeprueft(400, { fehler: 'datei' })).holen
		);
		expect(ohne).toEqual(STOERUNG);
		const text = await zeigeEinleseVorschau(
			'a;b',
			holer(ungeprueft(400, { fehler: 'datei', datei: 'kaputt' })).holen
		);
		expect(text).toEqual(STOERUNG);
	});

	it('FR-50: 409 inzwischen kommt mit dem Gespräch an, ohne Gespräch Störung; 409 nur-lesen', async () => {
		const gespraech = { id: 4, nachrichten: [] };
		const antwort = { text: 'Danke', nachLetzter: 9 };
		const i = holer(json(409, { fehler: 'inzwischen', gespraech }));
		expect(await sendeAntwort(4, antwort, i.holen)).toEqual({ art: 'inzwischen', gespraech });
		expect(i.aufrufe[0].pfad).toBe('/api/admin/gespraeche/4');
		const ohne = holer(json(409, { fehler: 'inzwischen', gespraech: null }));
		expect(await sendeAntwort(4, antwort, ohne.holen)).toEqual(STOERUNG);
		const n = holer(json(409, { fehler: 'nur-lesen' }));
		expect(await sendeAntwort(4, antwort, n.holen)).toEqual({ art: 'nur-lesen' });
	});

	it('Wörter mit Zusatz ohne ihren Zusatz sind Störung', async () => {
		for (const fehler of ['unpassend', 'hat-anmeldungen', 'nicht-moeglich', 'vergeben'])
			expect(await schick(ungeprueft(409, { fehler }))).toEqual(STOERUNG);
		expect(await schick(ungeprueft(409, { fehler: 'unpassend', anzahl: '2' }))).toEqual(STOERUNG);
		expect(await schick(ungeprueft(409, { fehler: 'vergeben', feld: 3 }))).toEqual(STOERUNG);
		expect(await schick(ungeprueft(409, { fehler: 'warnung', warnungen: {} }))).toEqual(STOERUNG);
	});
});
