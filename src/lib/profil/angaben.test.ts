import { describe, expect, it } from 'vitest';
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

const json = (status: number, inhalt: unknown) => Response.json(inhalt, { status });

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
		expect(await ladeProfil(holen)).toEqual({ angaben: LEA, klassierung: 'R5' });
		expect(aufrufe).toEqual([{ pfad: '/api/profil', init: { method: 'GET' } }]);
		expect(await ladeProfil(holer(json(200, { angaben: LEA, klassierung: 'R10' })).holen)).toEqual({
			angaben: LEA,
			klassierung: null
		});
		expect(await ladeProfil(holer(json(500, {})).holen)).toBeNull();
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
