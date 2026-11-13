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
import { getInterclub, getInterclubTeam } from './schnittstellen.ts';
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
});
