import { describe, expect, it } from 'vitest';
import type { FehlerStatus, Fehlerkoerper } from '../fehler.ts';
import {
	MELDUNG_PROFIL,
	bestaetigeWechsel,
	codeEingabeFehler,
	emailEingabeFehler,
	fremdMeldung,
	mitAenderung,
	ladeAngaben,
	ladeKontakt,
	ladeProfil,
	speichereRufname,
	speichereAngaben,
	starteWechsel,
	type EigeneAngaben
} from './angaben.ts';

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

// Gestellte Antworten: Ein Fehler-Status nimmt nur einen Körper aus der gemeinsamen Liste an
// (src/lib/fehler.ts), damit ein Wort oder eine Form, die der Server nicht kennt, hier auffällt.
type Koerper<S extends number> = S extends FehlerStatus ? Fehlerkoerper : unknown;
const json = <S extends number>(status: S, inhalt: Koerper<S>) => Response.json(inhalt, { status });

/** Absichtlich ausserhalb der Liste: Antworten, die der Server nie so sendet. */
const ungeprueft = (status: number, inhalt: unknown) => Response.json(inhalt, { status });
const unlesbar = (status: number) => new Response('kein JSON', { status });

const LEA: EigeneAngaben = {
	mitgliedernummer: '1042',
	vorname: 'Lea',
	nachname: 'Beispiel',
	strasse: 'Musterweg 1',
	plz: '4600',
	ort: 'Olten',
	email: 'lea.beispiel@example.org',
	telefon: null,
	geschlecht: null,
	jahrgang: 1990,
	lizenznummer: null
};

describe('A-KONTO-01: eigene Angaben laden', () => {
	it('liefert die Angaben aus GET /api/profil', async () => {
		const { aufrufe, holen } = holer(json(200, { angaben: LEA }));
		expect(await ladeAngaben(holen)).toEqual(LEA);
		expect(aufrufe).toEqual([{ pfad: '/api/profil', init: { method: 'GET' } }]);
	});

	it('401 → null', async () => {
		expect(await ladeAngaben(holer(json(401, { fehler: 'abgemeldet' })).holen)).toBeNull();
	});

	it('Netzfehler → null', async () => {
		expect(await ladeAngaben(holer(new TypeError('offline')).holen)).toBeNull();
	});

	it('Kontakt aus /api/kontakt, bei Störung null', async () => {
		expect(await ladeKontakt(holer(json(200, { kontakt: 'K' })).holen)).toBe('K');
		expect(await ladeKontakt(holer(json(500, {})).holen)).toBeNull();
	});

	it('FR-37: Klassierung kommt mit den Angaben, unbekannte Werte gelten als nicht angegeben', async () => {
		const { aufrufe, holen } = holer(json(200, { angaben: LEA, klassierung: 'R5' }));
		expect(await ladeProfil(holen)).toEqual({ angaben: LEA, klassierung: 'R5', rufname: null });
		expect(aufrufe).toEqual([{ pfad: '/api/profil', init: { method: 'GET' } }]);
		expect(await ladeProfil(holer(json(200, { angaben: LEA, klassierung: 'R10' })).holen)).toEqual({
			angaben: LEA,
			klassierung: null,
			rufname: null
		});
		expect(await ladeProfil(holer(json(500, {})).holen)).toBeNull();
	});

	it('Rufname kommt mit den Angaben', async () => {
		const antwort = json(200, { angaben: LEA, klassierung: null, rufname: 'Lea' });
		expect((await ladeProfil(holer(antwort).holen))?.rufname).toBe('Lea');
	});

	it('Rufname speichern: ok, Meldung des Servers bei Eingabefehler, sonst Störung', async () => {
		const { aufrufe, holen } = holer(json(200, { rufname: 'Hannes' }));
		expect(await speichereRufname('Hannes', holen)).toEqual({ ergebnis: 'ok', rufname: 'Hannes' });
		expect(aufrufe[0].pfad).toBe('/api/profil/rufname');
		expect(await speichereRufname('', holer(json(200, { rufname: null })).holen)).toEqual({
			ergebnis: 'ok',
			rufname: null
		});
		const zuLang = json(400, { fehler: 'eingabe', felder: { rufname: 'Höchstens 10 Zeichen.' } });
		expect(await speichereRufname('x', holer(zuLang).holen)).toEqual({
			ergebnis: 'eingabe',
			fehler: 'Höchstens 10 Zeichen.'
		});
		expect(await speichereRufname('x', holer(json(500, {})).holen)).toEqual({
			ergebnis: 'stoerung'
		});
	});
});

describe('A-KONTO-01: eigene Angaben speichern', () => {
	it('schickt Änderung und geladenen Stand als JSON', async () => {
		const { aufrufe, holen } = holer(json(200, { geaendert: ['telefon'] }));
		const r = await speichereAngaben({ telefon: '079 000 00 00' }, LEA, holen);
		expect(r).toEqual({ ergebnis: 'ok' });
		expect(aufrufe[0].pfad).toBe('/api/profil');
		expect(aufrufe[0].init.method).toBe('POST');
		expect(JSON.parse(aufrufe[0].init.body as string)).toEqual({
			angaben: { telefon: '079 000 00 00' },
			vorher: LEA
		});
	});

	it('409 → veraltet', async () => {
		const r = await speichereAngaben({}, LEA, holer(json(409, { fehler: 'veraltet' })).holen);
		expect(r).toEqual({ ergebnis: 'veraltet' });
	});

	it('400 eingabe mit Feldern', async () => {
		const antwort = json(400, { fehler: 'eingabe', felder: { plz: '4 Ziffern' } });
		const r = await speichereAngaben({ plz: '46' }, LEA, holer(antwort).holen);
		expect(r).toEqual({ ergebnis: 'eingabe', felder: { plz: '4 Ziffern' }, fremd: false });
	});

	it('400 eingabe mit fremd: Altdaten in einem Feld, das das Mitglied nicht ändert', async () => {
		const antwort = json(400, { fehler: 'eingabe', felder: {}, fremd: true });
		const r = await speichereAngaben({ telefon: '' }, LEA, holer(antwort).holen);
		expect(r).toEqual({ ergebnis: 'eingabe', felder: {}, fremd: true });
	});

	it('Netzfehler → stoerung', async () => {
		const r = await speichereAngaben({}, LEA, holer(new TypeError('offline')).holen);
		expect(r).toEqual({ ergebnis: 'stoerung' });
	});
});

describe('A-KONTO-01: E-Mail-Wechsel', () => {
	it('202 → ok, schickt die neue Adresse', async () => {
		const { aufrufe, holen } = holer(json(202, {}));
		expect(await starteWechsel('lea.neu@example.org', holen)).toBe('ok');
		expect(aufrufe[0].pfad).toBe('/api/profil/email');
		expect(JSON.parse(aufrufe[0].init.body as string)).toEqual({ email: 'lea.neu@example.org' });
	});

	it('400 gleich → gleich', async () => {
		const r = await starteWechsel(
			'Lea.Beispiel@EXAMPLE.org',
			holer(json(400, { fehler: 'gleich' })).holen
		);
		expect(r).toBe('gleich');
	});

	it('400 eingabe → eingabe', async () => {
		expect(await starteWechsel('x', holer(json(400, { fehler: 'eingabe' })).holen)).toBe('eingabe');
	});

	it('429 → zu-viele', async () => {
		const r = await starteWechsel(
			'lea.neu@example.org',
			holer(json(429, { fehler: 'zu-viele' })).holen
		);
		expect(r).toBe('zu-viele');
	});

	it('Netzfehler → stoerung', async () => {
		expect(await starteWechsel('lea.neu@example.org', holer(new TypeError('offline')).holen)).toBe(
			'stoerung'
		);
	});

	it('Bestätigen schickt beide Codes, 200 → ok', async () => {
		const { aufrufe, holen } = holer(json(200, {}));
		expect(await bestaetigeWechsel('111111', '222222', holen)).toBe('ok');
		expect(aufrufe[0].pfad).toBe('/api/profil/email/bestaetigen');
		expect(JSON.parse(aufrufe[0].init.body as string)).toEqual({
			codeAlt: '111111',
			codeNeu: '222222'
		});
	});

	it('Bestätigen 400 falsch → falsch', async () => {
		const r = await bestaetigeWechsel('1', '2', holer(json(400, { fehler: 'falsch' })).holen);
		expect(r).toBe('falsch');
	});

	it('unbekannte Antwort → stoerung', async () => {
		expect(await bestaetigeWechsel('1', '2', holer(json(500, {})).holen)).toBe('stoerung');
	});
});

describe('A-KONTO-01: Meldungen und Stand', () => {
	it('fremd nennt den Kontakt, ohne Kontakt den Brief', () => {
		expect(fremdMeldung('K')).toBe(
			'Deine Angaben lassen sich gerade nicht speichern. Bitte melde dich bei K.'
		);
		expect(fremdMeldung(null)).toContain('in deinem Brief');
	});

	it('Stand nach dem Speichern: getrimmt, leeres Telefon und leere Lizenznummer als null', () => {
		const stand = mitAenderung(
			{ ...LEA, telefon: '079 000 00 00', lizenznummer: '12345678' },
			{ telefon: ' ', lizenznummer: '', ort: ' Trimbach ' }
		);
		expect(stand).toEqual({ ...LEA, telefon: null, lizenznummer: null, ort: 'Trimbach' });
	});
});

describe('UI-06: Prüfung im Browser vor dem E-Mail-Wechsel', () => {
	it('leere Adresse → Meldung, sonst entscheidet der Server', () => {
		expect(emailEingabeFehler('  ')).toBe(MELDUNG_PROFIL.emailFehlt);
		expect(emailEingabeFehler('kein-at')).toBeNull();
	});

	it('fehlt einer der zwei Codes → Meldung', () => {
		expect(codeEingabeFehler('123456', '')).toBe(MELDUNG_PROFIL.codesFehlen);
		expect(codeEingabeFehler(' ', '123456')).toBe(MELDUNG_PROFIL.codesFehlen);
		expect(codeEingabeFehler('123456', '654321')).toBeNull();
	});
});

// Ränder, die der gemeinsame Abruf-Baustein genau so erhalten muss (Charakterisierung vor Schritt 13).
describe('Profil: Ränder der Deutung', () => {
	const speichere = async (r: Response) => speichereAngaben({ ort: 'Olten' }, LEA, holer(r).holen);
	const wechsel = async (r: Response) => starteWechsel('neu@example.org', holer(r).holen);
	const rufname = async (r: Response) => speichereRufname('Lea', holer(r).holen);
	const STOERUNG = { ergebnis: 'stoerung' };

	it('401 und 404 sind Störung, beim Speichern und beim E-Mail-Wechsel', async () => {
		expect(await speichere(json(401, { fehler: 'abgemeldet' }))).toEqual(STOERUNG);
		expect(await speichere(json(404, { fehler: 'nicht-gefunden' }))).toEqual(STOERUNG);
		expect(await wechsel(json(401, { fehler: 'abgemeldet' }))).toBe('stoerung');
		expect(await wechsel(json(404, { fehler: 'nicht-gefunden' }))).toBe('stoerung');
	});

	it('429 ist zu-viele, auch ohne lesbaren Körper und mit JSON null', async () => {
		expect(await wechsel(unlesbar(429))).toBe('zu-viele');
		expect(await wechsel(ungeprueft(429, null))).toBe('zu-viele');
	});

	it('jedes 2xx ist ok, auch ohne lesbaren Körper und ohne Körper', async () => {
		expect(await bestaetigeWechsel('1', '2', holer(unlesbar(200)).holen)).toBe('ok');
		expect(await rufname(unlesbar(200))).toEqual({ ergebnis: 'ok', rufname: null });
		expect(await speichere(new Response(null, { status: 204 }))).toEqual({ ergebnis: 'ok' });
	});

	it('eingabe ohne felder ist gültig, mit drei Folgen', async () => {
		expect(await speichere(json(400, { fehler: 'eingabe' }))).toEqual({
			ergebnis: 'eingabe',
			felder: {},
			fremd: false
		});
		expect(await rufname(json(400, { fehler: 'eingabe' }))).toEqual({
			ergebnis: 'eingabe',
			fehler: 'Ungültig.'
		});
		expect(await wechsel(json(400, { fehler: 'eingabe' }))).toBe('eingabe');
	});

	it('eingabe mit felder als Liste: leere Feldmeldungen', async () => {
		expect(await speichere(ungeprueft(400, { fehler: 'eingabe', felder: ['plz'] }))).toEqual({
			ergebnis: 'eingabe',
			felder: {},
			fremd: false
		});
	});

	it('gleich, falsch und zu-viele werden beim Speichern zu Störung, veraltet beim Rufnamen', async () => {
		expect(await speichere(json(400, { fehler: 'gleich' }))).toEqual(STOERUNG);
		expect(await speichere(json(400, { fehler: 'falsch' }))).toEqual(STOERUNG);
		expect(await speichere(json(429, { fehler: 'zu-viele' }))).toEqual(STOERUNG);
		expect(await rufname(json(409, { fehler: 'veraltet' }))).toEqual(STOERUNG);
	});

	it('ein Wort gilt nur mit seinem Status; JSON null bei 400 ist Störung', async () => {
		expect(await wechsel(json(400, { fehler: 'veraltet' }))).toBe('stoerung');
		expect(await wechsel(json(409, { fehler: 'gleich' }))).toBe('stoerung');
		expect(await wechsel(json(409, { fehler: 'eingabe' }))).toBe('stoerung');
		expect(await wechsel(ungeprueft(400, null))).toBe('stoerung');
	});

	it('Laden: unlesbarer Körper, falsche Form und Netzfehler geben null', async () => {
		expect(await ladeProfil(holer(unlesbar(200)).holen)).toBeNull();
		expect(await ladeProfil(holer(json(200, { angaben: 'Lea' })).holen)).toBeNull();
		expect(await ladeKontakt(holer(json(200, { kontakt: 5 })).holen)).toBeNull();
		expect(await ladeKontakt(holer(new Error('weg')).holen)).toBeNull();
	});
});
