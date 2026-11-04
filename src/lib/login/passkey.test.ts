import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	entfernePasskey,
	hinweisErledigt,
	kannPasskey,
	ladePasskeys,
	meldeMitPasskeyAn,
	richtePasskeyEin,
	type Webauthn
} from './passkey';

/** Fake-fetch: antwortet der Reihe nach; eine Fehler-Instanz wird geworfen. */
function fakeHolen(...antworten: (Response | Error)[]) {
	const aufrufe: { pfad: string; init: RequestInit }[] = [];
	const holen = async (pfad: string, init: RequestInit) => {
		aufrufe.push({ pfad, init });
		const a = antworten.shift();
		if (a === undefined) throw new Error('keine Antwort vorbereitet');
		if (a instanceof Error) throw a;
		return a;
	};
	return { holen, aufrufe };
}

const json = (inhalt: unknown, status = 200) =>
	new Response(JSON.stringify(inhalt), { status, headers: { 'content-type': 'application/json' } });
const leer = (status: number) => new Response(null, { status });

function fakeWebauthn(teil: Partial<Webauthn> = {}): Webauthn {
	return {
		unterstuetzt: () => true,
		registriere: async () => ({ id: 'neu' }),
		melde: async () => ({ id: 'alt' }),
		...teil
	};
}

const abbruch = () => Object.assign(new Error('abgebrochen'), { name: 'NotAllowedError' });
const verpackterAbbruch = () => Object.assign(new Error('verpackt'), { cause: abbruch() });

afterEach(() => vi.unstubAllGlobals());

describe('kannPasskey', () => {
	it('A-LOGIN-07: folgt dem, was der Browser meldet', () => {
		expect(kannPasskey(fakeWebauthn({ unterstuetzt: () => true }))).toBe(true);
		expect(kannPasskey(fakeWebauthn({ unterstuetzt: () => false }))).toBe(false);
	});
});

describe('richtePasskeyEin', () => {
	it('A-LOGIN-07: holt Optionen, fragt den Browser, schickt die Antwort', async () => {
		const { holen, aufrufe } = fakeHolen(json({ challenge: 'c' }), json({}));
		const registriere = vi.fn(async () => ({ id: 'neu' }));
		const r = await richtePasskeyEin(holen, fakeWebauthn({ registriere }));
		expect(r).toBe('ok');
		expect(registriere).toHaveBeenCalledWith({ challenge: 'c' });
		expect(aufrufe.map((a) => a.pfad)).toEqual([
			'/api/passkey/einrichten/optionen',
			'/api/passkey/einrichten'
		]);
		expect(aufrufe[1].init.headers).toEqual({ 'content-type': 'application/json' });
		expect(JSON.parse(aufrufe[1].init.body as string)).toEqual({ antwort: { id: 'neu' } });
	});

	it('A-LOGIN-07: Abbruch im Dialog (auch verpackt) ist kein Fehler', async () => {
		for (const fehler of [abbruch(), verpackterAbbruch()]) {
			const { holen, aufrufe } = fakeHolen(json({}));
			const w = fakeWebauthn({ registriere: () => Promise.reject(fehler) });
			expect(await richtePasskeyEin(holen, w)).toBe('abgebrochen');
			expect(aufrufe).toHaveLength(1);
		}
	});

	it('A-LOGIN-07: anderer Browserfehler ist Fehler', async () => {
		const { holen } = fakeHolen(json({}));
		const w = fakeWebauthn({ registriere: () => Promise.reject(new Error('kaputt')) });
		expect(await richtePasskeyEin(holen, w)).toBe('fehler');
	});

	it('A-LOGIN-07: Serverfehler bei Optionen oder Antwort ist Fehler', async () => {
		const w = fakeWebauthn();
		expect(await richtePasskeyEin(fakeHolen(leer(401)).holen, w)).toBe('fehler');
		expect(
			await richtePasskeyEin(fakeHolen(json({}), json({ fehler: 'falsch' }, 400)).holen, w)
		).toBe('fehler');
		expect(await richtePasskeyEin(fakeHolen(json({}), leer(500)).holen, w)).toBe('fehler');
	});

	it('A-LOGIN-07: Netzfehler ist Fehler', async () => {
		const w = fakeWebauthn();
		expect(await richtePasskeyEin(fakeHolen(new TypeError('netz')).holen, w)).toBe('fehler');
		expect(await richtePasskeyEin(fakeHolen(json({}), new TypeError('netz')).holen, w)).toBe(
			'fehler'
		);
	});
});

describe('meldeMitPasskeyAn', () => {
	const optionen = () => json({ optionen: { challenge: 'c' }, vorgang: 'v1' });

	it('A-LOGIN-08: schickt Vorgang und Antwort', async () => {
		const { holen, aufrufe } = fakeHolen(optionen(), json({}));
		const melde = vi.fn(async () => ({ id: 'alt' }));
		expect(await meldeMitPasskeyAn(holen, fakeWebauthn({ melde }))).toBe('ok');
		expect(melde).toHaveBeenCalledWith({ challenge: 'c' });
		expect(aufrufe.map((a) => a.pfad)).toEqual([
			'/api/passkey/anmelden/optionen',
			'/api/passkey/anmelden'
		]);
		expect(JSON.parse(aufrufe[1].init.body as string)).toEqual({
			vorgang: 'v1',
			antwort: { id: 'alt' }
		});
	});

	it('A-LOGIN-08: Abbruch (auch verpackt) ist abgebrochen', async () => {
		for (const fehler of [abbruch(), verpackterAbbruch()]) {
			const w = fakeWebauthn({ melde: () => Promise.reject(fehler) });
			expect(await meldeMitPasskeyAn(fakeHolen(optionen()).holen, w)).toBe('abgebrochen');
		}
	});

	it('A-LOGIN-08: anderer Browserfehler ist falsch', async () => {
		const w = fakeWebauthn({ melde: () => Promise.reject(new Error('kaputt')) });
		expect(await meldeMitPasskeyAn(fakeHolen(optionen()).holen, w)).toBe('falsch');
	});

	it('A-LOGIN-08: Server sagt falsch', async () => {
		const { holen } = fakeHolen(optionen(), json({ fehler: 'falsch' }, 400));
		expect(await meldeMitPasskeyAn(holen, fakeWebauthn())).toBe('falsch');
	});

	it('A-LOGIN-08: 429 bei Optionen oder Antwort ist zu-viele', async () => {
		const w = fakeWebauthn();
		const zuViele = () => json({ fehler: 'zu-viele' }, 429);
		expect(await meldeMitPasskeyAn(fakeHolen(zuViele()).holen, w)).toBe('zu-viele');
		expect(await meldeMitPasskeyAn(fakeHolen(optionen(), zuViele()).holen, w)).toBe('zu-viele');
	});

	it('A-LOGIN-08: Serverfehler, kaputte Optionen und Netzfehler sind stoerung', async () => {
		const w = fakeWebauthn();
		expect(await meldeMitPasskeyAn(fakeHolen(leer(500)).holen, w)).toBe('stoerung');
		expect(await meldeMitPasskeyAn(fakeHolen(json({ unsinn: 1 })).holen, w)).toBe('stoerung');
		expect(await meldeMitPasskeyAn(fakeHolen(new TypeError('netz')).holen, w)).toBe('stoerung');
		expect(await meldeMitPasskeyAn(fakeHolen(optionen(), leer(500)).holen, w)).toBe('stoerung');
		expect(await meldeMitPasskeyAn(fakeHolen(optionen(), new TypeError('netz')).holen, w)).toBe(
			'stoerung'
		);
	});
});

describe('ladePasskeys', () => {
	it('A-LOGIN-09: wandelt Zeitangaben in Date um', async () => {
		const { holen, aufrufe } = fakeHolen(
			json({
				passkeys: [
					{
						kennung: 'k1',
						geraet: 'iPhone',
						eingerichtetAm: '2026-11-01T10:00:00.000Z',
						zuletztBenutzt: null
					},
					{
						kennung: 'k2',
						geraet: 'Mac',
						eingerichtetAm: '2026-10-01T08:00:00.000Z',
						zuletztBenutzt: '2026-11-02T09:30:00.000Z'
					}
				]
			})
		);
		const liste = await ladePasskeys(holen);
		expect(aufrufe[0].pfad).toBe('/api/passkey');
		expect(liste).toEqual([
			{
				kennung: 'k1',
				geraet: 'iPhone',
				eingerichtetAm: new Date('2026-11-01T10:00:00.000Z'),
				zuletztBenutzt: null
			},
			{
				kennung: 'k2',
				geraet: 'Mac',
				eingerichtetAm: new Date('2026-10-01T08:00:00.000Z'),
				zuletztBenutzt: new Date('2026-11-02T09:30:00.000Z')
			}
		]);
	});

	it('A-LOGIN-09: leere Liste bleibt leer, Störung gibt null', async () => {
		expect(await ladePasskeys(fakeHolen(json({ passkeys: [] })).holen)).toEqual([]);
		expect(await ladePasskeys(fakeHolen(leer(401)).holen)).toBeNull();
		expect(await ladePasskeys(fakeHolen(json({ unsinn: 1 })).holen)).toBeNull();
		expect(await ladePasskeys(fakeHolen(new TypeError('netz')).holen)).toBeNull();
	});
});

describe('entfernePasskey', () => {
	function umgebung(pkc: unknown) {
		vi.stubGlobal('location', { hostname: 'mytco.example.org' });
		vi.stubGlobal('PublicKeyCredential', pkc);
	}

	it('A-LOGIN-10: 204 ist ok, Anfrage trägt die Kennung', async () => {
		umgebung(undefined);
		const { holen, aufrufe } = fakeHolen(leer(204));
		expect(await entfernePasskey('k1', holen)).toBe('ok');
		expect(aufrufe[0].pfad).toBe('/api/passkey/entfernen');
		expect(JSON.parse(aufrufe[0].init.body as string)).toEqual({ kennung: 'k1' });
	});

	it('A-LOGIN-10: 404, 401, 500 und Netzfehler sind fehler, kein Signal', async () => {
		const signal = vi.fn();
		umgebung({ signalUnknownCredential: signal });
		for (const a of [leer(404), leer(401), leer(500), new TypeError('netz')]) {
			expect(await entfernePasskey('k1', fakeHolen(a).holen)).toBe('fehler');
		}
		expect(signal).not.toHaveBeenCalled();
	});

	it('A-LOGIN-10: meldet dem Browser die entfernte Kennung, wenn er das kann', async () => {
		const signal = vi.fn(async () => {});
		umgebung({ signalUnknownCredential: signal });
		expect(await entfernePasskey('k1', fakeHolen(leer(204)).holen)).toBe('ok');
		expect(signal).toHaveBeenCalledWith({ rpId: 'mytco.example.org', credentialId: 'k1' });
	});

	it('A-LOGIN-10: fehlendes oder fehlschlagendes Signal wirft nie', async () => {
		umgebung({});
		expect(await entfernePasskey('k1', fakeHolen(leer(204)).holen)).toBe('ok');
		umgebung({ signalUnknownCredential: () => Promise.reject(new Error('x')) });
		expect(await entfernePasskey('k1', fakeHolen(leer(204)).holen)).toBe('ok');
		umgebung({
			signalUnknownCredential: () => {
				throw new Error('sync');
			}
		});
		expect(await entfernePasskey('k1', fakeHolen(leer(204)).holen)).toBe('ok');
	});
});

describe('hinweisErledigt', () => {
	it('A-LOGIN-11: meldet es dem Server und wirft nie', async () => {
		const { holen, aufrufe } = fakeHolen(leer(204));
		await hinweisErledigt(holen);
		expect(aufrufe[0].pfad).toBe('/api/passkey/hinweis');
		await expect(hinweisErledigt(fakeHolen(new TypeError('netz')).holen)).resolves.toBeUndefined();
		await expect(hinweisErledigt(fakeHolen(leer(500)).holen)).resolves.toBeUndefined();
	});
});
