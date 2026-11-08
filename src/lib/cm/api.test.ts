import { describe, expect, test } from 'vitest';
import {
	doppelZurWahl,
	holeCmAnsicht,
	holeCmTurniere,
	lehneAnfrageAb,
	meldeAb,
	beantrageWildcard,
	meldeAn,
	nimmAnfrageAn,
	sendeCmAngaben,
	setzeSuchtext,
	speichereKlassierung,
	stelleAnfrage,
	sucheDoppelPartner,
	zieheAnfrageZurueck
} from './api.ts';

import type { CmAnsicht, CmKategorie } from './api.ts';

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

const istJsonPost = (a: Aufruf) =>
	a.init.method === 'POST' &&
	new Headers(a.init.headers).get('content-type') === 'application/json';

describe('Anfragen der Mitglieder zur Clubmeisterschaft', () => {
	test('A-ANMELDUNG-01: Turniere, Ansicht, An- und Abmelden auf den richtigen Pfaden', async () => {
		const t = holer(json(200, [{ id: 1 }]));
		expect(await holeCmTurniere(t.holen)).toEqual({ art: 'ok', daten: [{ id: 1 }] });
		expect(t.aufrufe[0]).toMatchObject({ pfad: '/api/cm', init: { method: 'GET' } });

		const a = holer(json(200, { grenze: 3 }));
		expect(await holeCmAnsicht(7, a.holen)).toEqual({ art: 'ok', daten: { grenze: 3 } });
		expect(a.aufrufe[0].pfad).toBe('/api/cm/7');

		const an = holer(json(200, { grenze: 3 }));
		expect((await meldeAn(4, null, an.holen)).art).toBe('ok');
		expect(an.aufrufe[0].pfad).toBe('/api/cm/kategorien/4/anmeldung');
		expect(istJsonPost(an.aufrufe[0])).toBe(true);

		const ab = holer(json(200, { grenze: 3 }));
		expect((await meldeAb(9, ab.holen)).art).toBe('ok');
		expect(ab.aufrufe[0].pfad).toBe('/api/cm/anmeldungen/9/abmelden');
		expect(istJsonPost(ab.aufrufe[0])).toBe(true);
	});

	test('FR-37: Angaben und Klassierung als JSON, Feldfehler als eingabe', async () => {
		const h = holer(json(200, {}));
		const angaben = { klassierung: 'R4', geschlecht: 'w', jahrgang: '1990' } as const;
		expect(await sendeCmAngaben(angaben, h.holen)).toEqual({ art: 'ok', daten: {} });
		expect(h.aufrufe[0].pfad).toBe('/api/cm/angaben');
		expect(istJsonPost(h.aufrufe[0])).toBe(true);
		expect(JSON.parse(String(h.aufrufe[0].init.body))).toEqual(angaben);

		const felder = { jahrgang: 'Bitte ein Jahr zwischen 1900 und 2026 angeben.' };
		expect(
			await sendeCmAngaben(angaben, holer(json(400, { fehler: 'eingabe', felder })).holen)
		).toEqual({ art: 'eingabe', felder });

		const k = holer(json(200, {}));
		expect(await speichereKlassierung('keine', k.holen)).toEqual({ art: 'ok', daten: {} });
		expect(k.aufrufe[0].pfad).toBe('/api/profil/klassierung');
		expect(JSON.parse(String(k.aufrufe[0].init.body))).toEqual({ klassierung: 'keine' });
		const schlecht = { klassierung: 'Bitte deine Klassierung wählen.' };
		expect(
			await speichereKlassierung(
				'R4',
				holer(json(400, { fehler: 'eingabe', felder: schlecht })).holen
			)
		).toEqual({ art: 'eingabe', felder: schlecht });
	});

	test('FR-06: 409 voll wird eigenes Ergebnis', async () => {
		const ergebnis = async (status: number, inhalt: unknown) =>
			meldeAn(1, null, holer(json(status, inhalt)).holen);
		expect(await ergebnis(409, { fehler: 'voll' })).toEqual({ art: 'voll' });
		expect(await ergebnis(409, { fehler: 'geschlossen' })).toEqual({ art: 'geschlossen' });
		expect(await ergebnis(409, { fehler: 'passt-nicht' })).toEqual({ art: 'passt-nicht' });
		expect(await ergebnis(409, { fehler: 'schon-angemeldet' })).toEqual({
			art: 'schon-angemeldet'
		});
		expect(await ergebnis(409, { fehler: 'angaben-fehlen' })).toEqual({ art: 'angaben-fehlen' });
		expect(await ergebnis(409, { fehler: 'unbekannt' })).toEqual({ art: 'stoerung' });
		expect(await ergebnis(401, { fehler: 'abgemeldet' })).toEqual({ art: 'abgemeldet' });
		expect(await ergebnis(404, { fehler: 'nicht-gefunden' })).toEqual({ art: 'nicht-gefunden' });
		expect(await ergebnis(500, {})).toEqual({ art: 'stoerung' });
		expect(await meldeAn(1, null, holer(new Error('weg')).holen)).toEqual({ art: 'stoerung' });
	});

	test('FR-08: Wildcard-Antrag mit Kommentar auf eigenem Pfad, eigene Ablehnungen', async () => {
		const h = holer(json(200, { grenze: 3 }));
		expect((await beantrageWildcard(4, 'Ich spiele gern.', h.holen)).art).toBe('ok');
		expect(h.aufrufe[0].pfad).toBe('/api/cm/kategorien/4/wildcard');
		expect(istJsonPost(h.aufrufe[0])).toBe(true);
		expect(JSON.parse(String(h.aufrufe[0].init.body))).toEqual({ kommentar: 'Ich spiele gern.' });

		const ergebnis = async (status: number, inhalt: unknown) =>
			beantrageWildcard(1, 'x', holer(json(status, inhalt)).holen);
		expect(await ergebnis(409, { fehler: 'keine-wildcard' })).toEqual({ art: 'keine-wildcard' });
		expect(await ergebnis(409, { fehler: 'voll' })).toEqual({ art: 'voll' });
		const felder = { kommentar: 'Bitte einen Kommentar angeben.' };
		expect(await ergebnis(400, { fehler: 'eingabe', felder })).toEqual({ art: 'eingabe', felder });
	});

	test('A-ANMELDUNG-04, FR-48: Partnersuche als GET mit kodiertem Suchtext und Abbruch', async () => {
		const treffer = [{ mitgliedId: 3, name: 'Marco Muster' }];
		const h = holer(json(200, treffer));
		const abbruch = new AbortController();
		expect(await sucheDoppelPartner(5, 'ma ü&', h.holen, abbruch.signal)).toEqual({
			art: 'ok',
			daten: treffer
		});
		expect(h.aufrufe[0].pfad).toBe('/api/cm/kategorien/5/partner?suche=ma%20%C3%BC%26');
		expect(h.aufrufe[0].init.method).toBe('GET');
		expect(h.aufrufe[0].init.signal).toBe(abbruch.signal);
		expect(await sucheDoppelPartner(5, 'ma', holer(new Error('abgebrochen')).holen)).toEqual({
			art: 'stoerung'
		});
	});

	test('FR-48: Anfrage stellen, annehmen, ablehnen und zurückziehen auf eigenen Pfaden', async () => {
		const ansicht = { grenze: 3 };
		const fall = async (
			aufruf: (holen: ReturnType<typeof holer>['holen']) => Promise<{ art: string }>,
			pfad: string,
			koerper: unknown
		) => {
			const h = holer(json(200, ansicht));
			expect(await aufruf(h.holen)).toEqual({ art: 'ok', daten: ansicht });
			expect(h.aufrufe[0].pfad).toBe(pfad);
			expect(istJsonPost(h.aufrufe[0])).toBe(true);
			expect(JSON.parse(String(h.aufrufe[0].init.body))).toEqual(koerper);
		};
		await fall((h) => stelleAnfrage(4, 17, h), '/api/cm/kategorien/4/anfragen', { anId: 17 });
		await fall((h) => nimmAnfrageAn(8, h), '/api/cm/anfragen/8/annehmen', {});
		await fall((h) => lehneAnfrageAb(8, h), '/api/cm/anfragen/8/ablehnen', {});
		await fall((h) => zieheAnfrageZurueck(8, h), '/api/cm/anfragen/8/zurueckziehen', {});

		const ergebnis = async (status: number, inhalt: unknown) =>
			stelleAnfrage(1, 2, holer(json(status, inhalt)).holen);
		expect(await ergebnis(409, { fehler: 'schon-angefragt' })).toEqual({ art: 'schon-angefragt' });
		expect(await ergebnis(409, { fehler: 'passt-nicht' })).toEqual({ art: 'passt-nicht' });
		expect(await ergebnis(404, { fehler: 'nicht-gefunden' })).toEqual({ art: 'nicht-gefunden' });
		expect(await nimmAnfrageAn(1, holer(json(409, { fehler: 'voll' })).holen)).toEqual({
			art: 'voll'
		});
	});

	test('FR-49: Suchtext beim Anmelden und Ändern, Feldfehler suchtext', async () => {
		const an = holer(json(200, { grenze: 3 }));
		expect((await meldeAn(4, 'Lieber abends.', an.holen)).art).toBe('ok');
		expect(JSON.parse(String(an.aufrufe[0].init.body))).toEqual({ suchtext: 'Lieber abends.' });
		const ohne = holer(json(200, { grenze: 3 }));
		await meldeAn(4, null, ohne.holen);
		expect(JSON.parse(String(ohne.aufrufe[0].init.body))).toEqual({});

		const s = holer(json(200, { grenze: 3 }));
		expect((await setzeSuchtext(9, '', s.holen)).art).toBe('ok');
		expect(s.aufrufe[0].pfad).toBe('/api/cm/anmeldungen/9/suchtext');
		expect(istJsonPost(s.aufrufe[0])).toBe(true);
		expect(JSON.parse(String(s.aufrufe[0].init.body))).toEqual({ suchtext: '' });

		const felder = { suchtext: 'Höchstens 120 Zeichen.' };
		expect(
			await setzeSuchtext(9, 'x', holer(json(400, { fehler: 'eingabe', felder })).holen)
		).toEqual({ art: 'eingabe', felder });
	});

	test('A-ANMELDUNG-04: Anmelde-Seite nur für ein offenes Doppel ohne Partner', () => {
		const doppel = { id: 4, art: 'doppel', eigen: null } as unknown as CmKategorie;
		const einzel = { id: 5, art: 'einzel', eigen: null } as unknown as CmKategorie;
		const ansicht = (k: Partial<CmAnsicht> & { status?: string }) =>
			({
				turnier: { status: k.status ?? 'offen' },
				fehlt: k.fehlt ?? [],
				kategorien: k.kategorien ?? [doppel, einzel]
			}) as unknown as CmAnsicht;
		expect(doppelZurWahl(ansicht({}), 4)).toBe(doppel);
		expect(doppelZurWahl(ansicht({}), 5)).toBeNull();
		expect(doppelZurWahl(ansicht({}), 6)).toBeNull();
		expect(doppelZurWahl(ansicht({ status: 'geschlossen' }), 4)).toBeNull();
		expect(doppelZurWahl(ansicht({ fehlt: ['geschlecht'] }), 4)).toBeNull();
		const sucht = { ...doppel, eigen: { art: 'sucht', kommentar: null } } as CmKategorie;
		expect(doppelZurWahl(ansicht({ kategorien: [sucht] }), 4)).toBe(sucht);
		const paar = { ...doppel, eigen: { art: 'paar' } } as unknown as CmKategorie;
		expect(doppelZurWahl(ansicht({ kategorien: [paar] }), 4)).toBeNull();
	});
});
