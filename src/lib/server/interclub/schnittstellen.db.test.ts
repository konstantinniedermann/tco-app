import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import {
	legeEigeneDatenbankAn,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { importiereBeispiel } from '../../../../tests/hilfen/interclub.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleSitzung, pruefeSitzung, type AngemeldetesKonto } from '../login/sitzung.ts';
import { getSitzung } from '../sitzung/schnittstellen.ts';
import { pushAbo } from '../db/schema.ts';
import {
	getInterclub,
	getInterclubBegegnung,
	getInterclubFolgen,
	getInterclubTeam,
	postInterclubFolgen
} from './schnittstellen.ts';
import type { InterclubDienste } from './typen.ts';

const logs = [
	vi.spyOn(console, 'error').mockImplementation(() => {}),
	vi.spyOn(console, 'warn').mockImplementation(() => {}),
	vi.spyOn(console, 'log').mockImplementation(() => {})
];
// SI-05: Die Schnittstellen loggen nichts.
afterEach(() => {
	try {
		for (const l of logs) expect(l).not.toHaveBeenCalled();
	} finally {
		for (const l of logs) l.mockClear();
	}
});

const JETZT = new Date('2026-11-13T10:00:00Z');
const IMPORT = new Date('2026-11-12T08:00:00Z');

// Ob es Interclub-Daten gibt, ändert sich mit dem Import: eigene Datenbank.
let e: EigeneDatenbank;
let d: InterclubDienste;
beforeAll(async () => {
	e = await legeEigeneDatenbankAn('icschnittstellen');
	d = { db: e.db, jetzt: () => JETZT };
}, 30_000);
afterAll(async () => {
	await e.abbauen();
});

async function einloggen(): Promise<AngemeldetesKonto> {
	const m = await legeMitgliedAn(e.db, { vorname: 'Vreni', nachname: `Muster-${randomUUID()}` });
	const kennung = await erstelleSitzung(e.db, m.kontoId, JETZT);
	return (await pruefeSitzung(e.db, kennung, JETZT))!.konto;
}

const get = (konto?: AngemeldetesKonto, params: Record<string, string> = {}) =>
	ereignis({ method: 'GET', konto, params });
const sitzung = async (konto: AngemeldetesKonto) =>
	(await (await getSitzung(get(konto), e.db)).json()).interclub;

describe('Schnittstellen für Interclub (Mitglied)', () => {
	test('ohne Sitzung 401', async () => {
		const a = await getInterclub(d, get());
		expect([a.status, await a.json()]).toEqual([401, { fehler: 'abgemeldet' }]);
		expect((await getInterclubTeam(d, get(undefined, { id: '1' }))).status).toBe(401);
	});

	test('ohne Daten 404 und Sitzung meldet interclub: false', async () => {
		const konto = await einloggen();
		const a = await getInterclub(d, get(konto));
		expect([a.status, await a.json()]).toEqual([404, { fehler: 'nicht-gefunden' }]);
		const t = await getInterclubTeam(d, get(konto, { id: '7398' }));
		expect(t.status).toBe(404);
		expect(await sitzung(konto)).toBe(false);
	});

	test('mit Import: Übersicht, Team, Fehlerfälle und Sitzung interclub: true', async () => {
		await importiereBeispiel(e.db, 2026, IMPORT);
		const konto = await einloggen();
		const a = await getInterclub(d, get(konto));
		expect(a.status).toBe(200);
		expect(a.headers.get('cache-control')).toBe('no-store');
		expect(await a.json()).toMatchObject({ saison: 2026 });
		const t = await getInterclubTeam(d, get(konto, { id: '7398' }));
		expect(t.status).toBe(200);
		expect(await t.json()).toMatchObject({ saison: 2026 });
		for (const id of ['abc', '999999999']) {
			const r = await getInterclubTeam(d, get(konto, { id }));
			expect([r.status, await r.json()]).toEqual([404, { fehler: 'nicht-gefunden' }]);
		}
		expect(await sitzung(konto)).toBe(true);
	});

	test('Begegnung: 401 ohne Sitzung, 200 mit Einzelpartien ohne Nummern, 404 sonst', async () => {
		const ohne = await getInterclubBegegnung(
			d,
			get(undefined, { id: '7398', begegnung: '972338' })
		);
		expect(ohne.status).toBe(401);
		const konto = await einloggen();
		const r = await getInterclubBegegnung(d, get(konto, { id: '7398', begegnung: '972338' }));
		expect(r.status).toBe(200);
		expect(r.headers.get('cache-control')).toBe('no-store');
		const text = await r.text();
		expect(JSON.parse(text)).toMatchObject({ teamId: 7398, gegner: 'Villmergen' });
		expect(text).toContain('Saitenbett Hannes');
		expect(text).toContain('Testmann Elena');
		expect(text).not.toContain('stId');
		expect(text).not.toContain('rangliste');
		for (const params of [
			{ id: '7398', begegnung: 'abc' },
			{ id: 'abc', begegnung: '972338' },
			{ id: '7398', begegnung: '972340' },
			{ id: '7396', begegnung: '972338' }
		]) {
			const f = await getInterclubBegegnung(d, get(konto, params));
			expect([f.status, await f.json()]).toEqual([404, { fehler: 'nicht-gefunden' }]);
		}
	});
});

describe('Schnittstellen: Teams folgen', () => {
	const post = (konto: AngemeldetesKonto | undefined, body: unknown, id = '7398', ct?: string) =>
		ereignis({ method: 'POST', konto, params: { id }, body, contentType: ct });
	const mitAbo = async (konto: AngemeldetesKonto) => {
		await e.db.insert(pushAbo).values({
			endpunkt: `https://push.example/${randomUUID()}`,
			sitzungHash: konto.sitzungHash,
			kontoId: konto.kontoId,
			p256dh: 'p',
			auth: 'a',
			eingerichtetAm: JETZT
		});
	};

	test('Team liefert folgen; ohne Abo kein Folgen (409), mit Abo 200', async () => {
		await importiereBeispiel(e.db, 2026, IMPORT);
		const konto = await einloggen();
		const t = await (await getInterclubTeam(d, get(konto, { id: '7398' }))).json();
		expect(t).toMatchObject({ saison: 2026, folgen: { folgt: false, push: false } });

		const ohne = await postInterclubFolgen(d, post(konto, { folgen: true }));
		expect([ohne.status, await ohne.json()]).toEqual([409, { fehler: 'kein-push' }]);

		await mitAbo(konto);
		const ok = await postInterclubFolgen(d, post(konto, { folgen: true }));
		expect([ok.status, await ok.json()]).toEqual([200, { folgt: true }]);
		const t2 = await (await getInterclubTeam(d, get(konto, { id: '7398' }))).json();
		expect(t2.folgen).toEqual({ folgt: true, push: true });

		const liste = await getInterclubFolgen(d, get(konto));
		expect(liste.status).toBe(200);
		expect(await liste.json()).toEqual({
			teams: [{ teamId: 7398, liga: expect.any(String) }],
			push: true
		});

		const weg = await postInterclubFolgen(d, post(konto, { folgen: false }));
		expect([weg.status, await weg.json()]).toEqual([200, { folgt: false }]);
		expect(await (await getInterclubFolgen(d, get(konto))).json()).toEqual({
			teams: [],
			push: true
		});
	});

	test('Fehlerfälle: 404, 400, 415, 401', async () => {
		const konto = await einloggen();
		await mitAbo(konto);
		const unbekannt = await postInterclubFolgen(d, post(konto, { folgen: true }, '999999999'));
		expect([unbekannt.status, await unbekannt.json()]).toEqual([404, { fehler: 'nicht-gefunden' }]);
		const keineZahl = await postInterclubFolgen(d, post(konto, { folgen: true }, 'abc'));
		expect(keineZahl.status).toBe(404);
		for (const body of [{ folgen: 'ja' }, {}, { folgen: 1 }]) {
			const r = await postInterclubFolgen(d, post(konto, body));
			expect([r.status, await r.json()]).toEqual([400, { fehler: 'eingabe' }]);
		}
		const kein = await postInterclubFolgen(d, post(konto, '{"folgen":true}', '7398', ''));
		expect([kein.status, await kein.json()]).toEqual([415, { fehler: 'format' }]);
		expect((await postInterclubFolgen(d, post(undefined, { folgen: true }))).status).toBe(401);
		expect((await getInterclubFolgen(d, get())).status).toBe(401);
	});
});
