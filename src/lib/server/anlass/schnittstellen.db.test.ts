import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { erstelleSitzung, pruefeSitzung, type AngemeldetesKonto } from '../login/sitzung.ts';
import { legeAnlassAn, loescheAnlass } from './anlaesse.ts';
import { getAnlaesse, getAnlass, getKalender, postAnmeldung } from './schnittstellen.ts';
import type { AnlassDienste } from './typen.ts';

const db = erstelleDb(process.env.DATABASE_URL!);
afterAll(async () => {
	await db.$client.end();
});

const logs = [
	vi.spyOn(console, 'error').mockImplementation(() => {}),
	vi.spyOn(console, 'warn').mockImplementation(() => {}),
	vi.spyOn(console, 'log').mockImplementation(() => {})
];
// SI-05: Die Schnittstellen loggen nichts, auch keine Bemerkungen.
afterEach(() => {
	try {
		for (const l of logs) expect(l).not.toHaveBeenCalled();
	} finally {
		for (const l of logs) l.mockClear();
	}
});

const JETZT = new Date('2099-03-01T10:00:00Z');
// Sitzungen mit einer Zeit wie in den übrigen Tests: Ein Login räumt Sitzungen auf, die ein Jahr
// nicht genutzt wurden, und träfe mit 2099 die Sitzungen parallel laufender Tests.
const SITZUNG_ZEIT = new Date('2026-11-02T12:00:00Z');
const d: AnlassDienste = { db, jetzt: () => JETZT };

async function einloggen(): Promise<AngemeldetesKonto> {
	const m = await legeMitgliedAn(db, { vorname: 'Vreni', nachname: `Muster-${randomUUID()}` });
	const kennung = await erstelleSitzung(db, m.kontoId, SITZUNG_ZEIT);
	return (await pruefeSitzung(db, kennung, SITZUNG_ZEIT))!.konto;
}

async function neuerAnlass(schluss = new Date('2099-03-16T22:59:00Z')) {
	const admin = await legeMitgliedAn(db);
	const titel = `Anlass ${randomUUID()}`;
	const id = await legeAnlassAn(db, admin.mitgliedId, {
		titel,
		beginn: new Date('2099-03-19T18:30:00Z'),
		ort: 'Clubhaus',
		einladung: 'Traktanden',
		anmeldeschluss: schluss
	});
	return { id, titel };
}

describe('Schnittstellen für Anlässe (Mitglied)', () => {
	test('A-ANLASS-01: ohne Sitzung 401', async () => {
		const get = await getAnlaesse(d, ereignis({ method: 'GET' }));
		expect([get.status, await get.json()]).toEqual([401, { fehler: 'abgemeldet' }]);
		const eins = await getAnlass(d, ereignis({ method: 'GET', params: { id: '1' } }));
		expect(eins.status).toBe(401);
		const post = await postAnmeldung(
			d,
			ereignis({ body: { antwort: 'kommt' }, params: { id: '1' } })
		);
		expect(post.status).toBe(401);
		expect(get.headers.get('cache-control')).toBe('no-store');
	});

	test('A-ANLASS-01: Mitglied sieht den Anlass mit Kalender-Link, meldet sich ab und wieder an', async () => {
		const konto = await einloggen();
		const { id, titel } = await neuerAnlass();
		const liste = await (await getAnlaesse(d, ereignis({ method: 'GET', konto }))).json();
		const a = liste.find((x: { id: number }) => x.id === id);
		expect(a).toMatchObject({ titel, antwort: null, offen: true });
		expect(a.kalender).toMatch(/^\/api\/kalender\/[A-Za-z0-9_-]{43}$/);
		expect(a).not.toHaveProperty('kalenderKennung');

		const ab = await postAnmeldung(
			d,
			ereignis({
				body: { antwort: 'kommt-nicht', bemerkung: 'Ferien' },
				params: { id: String(id) },
				konto
			})
		);
		expect(ab.status).toBe(200);
		expect(await ab.json()).toMatchObject({ antwort: 'kommt-nicht', bemerkung: 'Ferien' });
		const an = await postAnmeldung(
			d,
			ereignis({ body: { antwort: 'kommt' }, params: { id: String(id) }, konto })
		);
		expect(await an.json()).toMatchObject({ antwort: 'kommt', bemerkung: null });
	});

	test('SI-10: postAnmeldung ohne JSON 415', async () => {
		const konto = await einloggen();
		const r = await postAnmeldung(
			d,
			ereignis({ contentType: 'text/plain', body: '{}', params: { id: '1' }, konto })
		);
		expect([r.status, await r.json()]).toEqual([415, { fehler: 'format' }]);
	});

	test('FR-28: postAnmeldung nach Anmeldeschluss 409 geschlossen', async () => {
		const konto = await einloggen();
		const { id } = await neuerAnlass(new Date('2099-02-28T10:00:00Z'));
		const r = await postAnmeldung(
			d,
			ereignis({ body: { antwort: 'kommt' }, params: { id: String(id) }, konto })
		);
		expect([r.status, await r.json()]).toEqual([409, { fehler: 'geschlossen' }]);
	});

	test('FR-30: zu lange Bemerkung 400 mit Feld', async () => {
		const konto = await einloggen();
		const { id } = await neuerAnlass();
		const r = await postAnmeldung(
			d,
			ereignis({
				body: { antwort: 'kommt-nicht', bemerkung: 'a'.repeat(501) },
				params: { id: String(id) },
				konto
			})
		);
		expect([r.status, await r.json()]).toEqual([
			400,
			{
				fehler: 'eingabe',
				felder: { bemerkung: 'Die Bemerkung darf höchstens 500 Zeichen lang sein.' }
			}
		]);
	});

	test('FR-30: ungültige Antwort 400 mit Feld', async () => {
		const konto = await einloggen();
		const { id } = await neuerAnlass();
		const r = await postAnmeldung(
			d,
			ereignis({ body: { antwort: 'vielleicht' }, params: { id: String(id) }, konto })
		);
		expect([r.status, await r.json()]).toEqual([
			400,
			{
				fehler: 'eingabe',
				felder: { antwort: 'Bitte wähle «Ich komme» oder «Ich komme nicht».' }
			}
		]);
	});

	test('gelöschter oder unbekannter Anlass 404', async () => {
		const konto = await einloggen();
		const { id } = await neuerAnlass();
		await loescheAnlass(db, id);
		const post = await postAnmeldung(
			d,
			ereignis({ body: { antwort: 'kommt' }, params: { id: String(id) }, konto })
		);
		expect([post.status, await post.json()]).toEqual([404, { fehler: 'nicht-gefunden' }]);
		const get = await getAnlass(d, ereignis({ method: 'GET', params: { id: 'abc' }, konto }));
		expect(get.status).toBe(404);
	});

	test('SI-19: Kalender ohne Login: richtige Kennung 200 text/calendar ohne Personendaten, falsche 404', async () => {
		const konto = await einloggen();
		const { id, titel } = await neuerAnlass();
		await postAnmeldung(
			d,
			ereignis({
				body: { antwort: 'kommt-nicht', bemerkung: 'Geheim' },
				params: { id: String(id) },
				konto
			})
		);
		const a = await (
			await getAnlass(d, ereignis({ method: 'GET', params: { id: String(id) }, konto }))
		).json();
		const kennung = a.kalender.split('/').at(-1);
		const r = await getKalender(d, ereignis({ method: 'GET', params: { kennung } }));
		expect(r.status).toBe(200);
		expect(r.headers.get('content-type')).toBe('text/calendar; charset=utf-8');
		expect(r.headers.get('cache-control')).toBe('no-store');
		const text = await r.text();
		expect(text).toContain(`SUMMARY:${titel}`);
		expect(text).not.toContain('Geheim');
		expect(text).not.toContain('Vreni');
		const falsch = await getKalender(d, ereignis({ method: 'GET', params: { kennung: 'x' } }));
		expect(falsch.status).toBe(404);
	});
});
