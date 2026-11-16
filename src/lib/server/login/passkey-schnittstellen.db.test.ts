import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { testPruefer } from '../../../../tests/hilfen/passkey-pruefer.ts';
import { erstelleDb } from '../db/index.ts';
import { getSitzung } from '../sitzung/schnittstellen.ts';
import { erstelleBremsen } from './bremse.ts';
import { ChallengeSpeicher, CHALLENGE_GUELTIG_MS } from './challenge.ts';
import {
	getPasskeys,
	postAnmelden,
	postAnmeldenOptionen,
	postEinrichten,
	postEinrichtenOptionen,
	postEntfernen,
	postHinweis
} from './passkey-schnittstellen.ts';
import { erstellePasskeyDienst } from './passkey.ts';
import { erstelleSitzung, pruefeSitzung, SITZUNG_COOKIE } from './sitzung.ts';

const db = erstelleDb(process.env.DATABASE_URL!);
const start = new Date('2026-11-02T12:00:00Z');
const URL_ORT = 'https://mytco.example.org/api/passkey';

const logs = [
	vi.spyOn(console, 'error').mockImplementation(() => {}),
	vi.spyOn(console, 'warn').mockImplementation(() => {}),
	vi.spyOn(console, 'log').mockImplementation(() => {})
];

beforeEach(() => {
	for (const l of logs) l.mockClear();
});

afterAll(async () => {
	await db.$client.end();
});

function baue() {
	const zeit = { t: start };
	const { pruefer } = testPruefer();
	const dienst = erstellePasskeyDienst({
		db,
		pruefer,
		bremsen: erstelleBremsen(() => zeit.t.getTime()),
		challenges: new ChallengeSpeicher({ jetzt: () => zeit.t.getTime() }),
		jetzt: () => zeit.t
	});
	return { dienst, zeit };
}

const neueKennung = () => randomUUID().replaceAll('-', '');
const challengeAus = (o: unknown) => (o as { challenge: string }).challenge;

/** Ereignis einer angemeldeten Anfrage: Konto aus der geprüften Sitzung wie in ladeSitzung. */
async function angemeldet(
	kontoId: number,
	opt: { body?: unknown; contentType?: string; ip?: string } = {}
) {
	const kennung = await erstelleSitzung(db, kontoId, start, undefined, { passkeyHinweis: true });
	return { kennung, e: await mitSitzung(kennung, opt) };
}

async function mitSitzung(
	kennung: string,
	opt: { body?: unknown; contentType?: string; ip?: string } = {}
) {
	const e = ereignis({ ...opt, cookie: kennung, url: URL_ORT });
	e.locals.konto = (await pruefeSitzung(db, kennung, start))!.konto;
	return e;
}

const anonym = (opt: { body?: unknown; contentType?: string; ip?: string } = {}) =>
	ereignis({ ...opt, url: URL_ORT });

/** Richtet über die Schnittstellen einen Passkey ein und liefert dessen Kennung. */
async function richteEin(d: ReturnType<typeof baue>, kontoId: number) {
	const kennung = neueKennung();
	const { kennung: sitzung } = await angemeldet(kontoId);
	const o = await postEinrichtenOptionen(d.dienst, await mitSitzung(sitzung));
	const challenge = challengeAus(await o.json());
	const r = await postEinrichten(
		d.dienst,
		await mitSitzung(sitzung, { body: { antwort: { id: kennung, ok: true, challenge } } })
	);
	expect(r.status).toBe(200);
	return { kennung, sitzung };
}

describe('Passkey-Schnittstellen', () => {
	test('A-LOGIN-07: Einrichten, Liste, Anmelden setzt das Sitzungs-Cookie wie der Code', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const { kennung } = await richteEin(d, kontoId);

		const liste = await getPasskeys(d.dienst, (await angemeldet(kontoId)).e);
		expect(liste.status).toBe(200);
		expect(liste.headers.get('cache-control')).toBe('no-store');
		const { passkeys } = (await liste.json()) as {
			passkeys: { kennung: string; geraet: string; eingerichtetAm: string }[];
		};
		expect(passkeys).toHaveLength(1);
		expect(passkeys[0]).toMatchObject({ kennung, geraet: 'Gerät' });
		expect(new Date(passkeys[0].eingerichtetAm).toISOString()).toBe(passkeys[0].eingerichtetAm);

		const o = await postAnmeldenOptionen(d.dienst, anonym({ body: {} }));
		expect(o.status).toBe(200);
		const { optionen, vorgang } = (await o.json()) as { optionen: object; vorgang: string };
		expect(optionen).toMatchObject({ rpId: 'mytco.example.org' });

		const e = anonym({
			body: { vorgang, antwort: { id: kennung, ok: true, challenge: challengeAus(optionen) } }
		});
		const r = await postAnmelden(d.dienst, e);
		expect(r.status).toBe(200);
		expect(await r.json()).toEqual({});
		expect(e.gesetzt.get(SITZUNG_COOKIE)?.wert).toMatch(/\S{20,}/);
	});

	test('A-LOGIN-07: /api/sitzung meldet passkeyHinweis, nach hinweis false', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const { kennung, e } = await angemeldet(kontoId);
		const vorher = await getSitzung(e, db);
		expect(await vorher.json()).toMatchObject({ passkeyHinweis: true });

		const r = await postHinweis(d.dienst, await mitSitzung(kennung, { body: {} }));
		expect(r.status).toBe(204);
		const nachher = await getSitzung(await mitSitzung(kennung), db);
		expect(await nachher.json()).toMatchObject({ passkeyHinweis: false });
	});

	test('SI-18: Entfernen eines eigenen Passkeys gibt 204, danach 404', async () => {
		const d = baue();
		const { kontoId } = await legeMitgliedAn(db);
		const { kennung, sitzung } = await richteEin(d, kontoId);
		const weg = await postEntfernen(d.dienst, await mitSitzung(sitzung, { body: { kennung } }));
		expect(weg.status).toBe(204);
		const nochmal = await postEntfernen(d.dienst, await mitSitzung(sitzung, { body: { kennung } }));
		expect(nochmal.status).toBe(404);
		expect(await nochmal.json()).toEqual({ fehler: 'nicht-gefunden' });
	});

	test('SI-18: Anmelde-Optionen sind gebremst', async () => {
		const d = baue();
		for (let i = 0; i < 10; i++) {
			const o = await postAnmeldenOptionen(d.dienst, anonym({ body: {}, ip: '198.51.100.5' }));
			expect(o.status).toBe(200);
			await d.dienst.anmelden('x', {}, { rpId: 'a', herkunft: 'b' }, '198.51.100.5');
		}
		const r = await postAnmeldenOptionen(d.dienst, anonym({ body: {}, ip: '198.51.100.5' }));
		expect(r.status).toBe(429);
		expect(await r.json()).toEqual({ fehler: 'zu-viele' });
	});

	describe('ohne Sitzung', () => {
		test('SI-18: ohne Sitzung ergibt 401', async () => {
			const d = baue();
			const antworten = [
				await postEinrichtenOptionen(d.dienst, anonym({ body: {} })),
				await postEinrichten(d.dienst, anonym({ body: { antwort: {} } })),
				await getPasskeys(d.dienst, anonym()),
				await postEntfernen(d.dienst, anonym({ body: { kennung: 'abc' } })),
				await postHinweis(d.dienst, anonym({ body: {} }))
			];
			expect(antworten.map((r) => r.status)).toEqual([401, 401, 401, 401, 401]);
			expect(antworten[0].headers.get('cache-control')).toBe('no-store');
		});

		test('SI-18: Konto ohne Sitzungs-Cookie ergibt 401', async () => {
			const d = baue();
			const { kontoId } = await legeMitgliedAn(db);
			const { e } = await angemeldet(kontoId, { body: {} });
			const ohneCookie = ereignis({ body: {}, url: URL_ORT });
			ohneCookie.locals.konto = e.locals.konto;
			expect((await postHinweis(d.dienst, ohneCookie)).status).toBe(401);
		});
	});

	describe('Format', () => {
		test('SI-18: ohne JSON ergibt 415', async () => {
			const d = baue();
			const { kontoId } = await legeMitgliedAn(db);
			const opt = { body: 'x=1', contentType: 'text/plain' };
			const { e } = await angemeldet(kontoId, opt);
			const status = async (f: Promise<Response>) => (await f).status;
			expect([
				await status(postEinrichtenOptionen(d.dienst, e)),
				await status(postEinrichten(d.dienst, e)),
				await status(postAnmeldenOptionen(d.dienst, anonym(opt))),
				await status(postAnmelden(d.dienst, anonym(opt))),
				await status(postEntfernen(d.dienst, e)),
				await status(postHinweis(d.dienst, e))
			]).toEqual([415, 415, 415, 415, 415, 415]);
		});
	});

	describe('kaputte Körper', () => {
		const koerper: unknown[] = [
			'{"antwort": GEHEIM-kaputt',
			'"GEHEIM"',
			'5',
			'[1]',
			{},
			{ antwort: 5 }
		];

		test.each(koerper)(
			'SI-18: kaputter Körper %j ergibt 400 und nichts davon im Log',
			async (b) => {
				const d = baue();
				const { kontoId } = await legeMitgliedAn(db);
				const a = await angemeldet(kontoId);
				const ids = [
					(await postEinrichten(d.dienst, await mitSitzung(a.kennung, { body: b }))).status,
					(await postAnmelden(d.dienst, anonym({ body: b }))).status,
					(await postEntfernen(d.dienst, await mitSitzung(a.kennung, { body: b }))).status
				];
				expect(ids).toEqual([400, 400, 400]);
				expect(JSON.stringify(logs.map((l) => l.mock.calls))).not.toContain('GEHEIM');
			}
		);

		test('SI-18: erfundener oder abgelaufener Vorgang ergibt 400 falsch', async () => {
			const d = baue();
			const { kontoId } = await legeMitgliedAn(db);
			const { kennung } = await richteEin(d, kontoId);

			const erfunden = await postAnmelden(
				d.dienst,
				anonym({ body: { vorgang: 'erfunden', antwort: { id: kennung, ok: true } } })
			);
			expect(erfunden.status).toBe(400);
			expect(await erfunden.json()).toEqual({ fehler: 'falsch' });

			const o = await postAnmeldenOptionen(d.dienst, anonym({ body: {} }));
			const { optionen, vorgang } = (await o.json()) as { optionen: object; vorgang: string };
			d.zeit.t = new Date(start.getTime() + CHALLENGE_GUELTIG_MS + 1000);
			const e = anonym({
				body: { vorgang, antwort: { id: kennung, ok: true, challenge: challengeAus(optionen) } }
			});
			const abgelaufen = await postAnmelden(d.dienst, e);
			expect(abgelaufen.status).toBe(400);
			expect(await abgelaufen.json()).toEqual({ fehler: 'falsch' });
			expect(e.gesetzt.size).toBe(0);

			expect((await postAnmelden(d.dienst, anonym({ body: {} }))).status).toBe(400);
		});
	});
});
