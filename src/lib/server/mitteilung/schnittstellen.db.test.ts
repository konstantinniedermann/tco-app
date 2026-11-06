import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { pushAbo } from '../db/schema.ts';
import { erstelleSitzung, pruefeSitzung, type AngemeldetesKonto } from '../login/sitzung.ts';
import {
	getBenachrichtigungen,
	postAboLoeschen,
	postAbo,
	postThemen,
	type MitteilungDienste
} from './schnittstellen.ts';

const db = erstelleDb(process.env.DATABASE_URL!);
afterAll(async () => {
	await db.$client.end();
});

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

// Sitzungen mit einer Zeit wie in den übrigen Tests: Ein Login räumt Sitzungen auf, die ein Jahr
// nicht genutzt wurden, und träfe mit 2099 die Sitzungen parallel laufender Tests.
const SITZUNG_ZEIT = new Date('2026-11-02T12:00:00Z');
const d: MitteilungDienste = { db, vapidOeffentlich: 'oeffentlicher-schluessel' };
const dOhneVapid: MitteilungDienste = { db, vapidOeffentlich: null };

async function einloggen(): Promise<AngemeldetesKonto> {
	const m = await legeMitgliedAn(db, { vorname: 'Vreni', nachname: `Muster-${randomUUID()}` });
	const kennung = await erstelleSitzung(db, m.kontoId, SITZUNG_ZEIT);
	return (await pruefeSitzung(db, kennung, SITZUNG_ZEIT))!.konto;
}

const neuesAbo = () => ({
	endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`,
	keys: {
		p256dh: 'erfundener-oeffentlicher-schluessel',
		auth: 'erfundenes-auth-geheimnis'
	}
});

describe('Schnittstellen für Mitteilungen (Mitglied)', () => {
	test('FR-40: Abo speichern und pushHier', async () => {
		const konto = await einloggen();
		const vorher = await (
			await getBenachrichtigungen(d, ereignis({ method: 'GET', konto }))
		).json();
		expect(vorher).toEqual({
			themen: { anlaesse: true, cm: true, verein: true },
			pushHier: false,
			schluessel: 'oeffentlicher-schluessel'
		});
		const abo = neuesAbo();
		const r = await postAbo(d, ereignis({ body: abo, konto }));
		expect([r.status, await r.json()]).toEqual([200, { pushHier: true }]);
		const nachher = await (
			await getBenachrichtigungen(d, ereignis({ method: 'GET', konto }))
		).json();
		expect(nachher.pushHier).toBe(true);
		// Eine andere Sitzung desselben Kontos hat kein Abo auf diesem Gerät.
		const kennung2 = await erstelleSitzung(db, konto.kontoId, SITZUNG_ZEIT);
		const zweite = (await pruefeSitzung(db, kennung2, SITZUNG_ZEIT))!.konto;
		const andere = await (
			await getBenachrichtigungen(d, ereignis({ method: 'GET', konto: zweite }))
		).json();
		expect(andere.pushHier).toBe(false);
	});

	test('FR-40: gleicher Endpunkt von einem anderen Konto übernimmt das Abo', async () => {
		const erstes = await einloggen();
		const zweites = await einloggen();
		const abo = neuesAbo();
		await postAbo(d, ereignis({ body: abo, konto: erstes }));
		const r = await postAbo(d, ereignis({ body: abo, konto: zweites }));
		expect(r.status).toBe(200);
		const zeilen = await db.select().from(pushAbo).where(eq(pushAbo.endpunkt, abo.endpoint));
		expect(zeilen).toHaveLength(1);
		expect(zeilen[0].kontoId).toBe(zweites.kontoId);
		expect(zeilen[0].sitzungHash).toBe(zweites.sitzungHash);
		const vom1 = await db.select().from(pushAbo).where(eq(pushAbo.kontoId, erstes.kontoId));
		expect(vom1).toHaveLength(0);
	});

	test('FR-40: Abo löschen', async () => {
		const konto = await einloggen();
		await postAbo(d, ereignis({ body: neuesAbo(), konto }));
		const r = await postAboLoeschen(d, ereignis({ body: {}, konto }));
		expect(r.status).toBe(200);
		const g = await (await getBenachrichtigungen(d, ereignis({ method: 'GET', konto }))).json();
		expect(g.pushHier).toBe(false);
	});

	test('FR-40: ungültiges Abo → 400', async () => {
		const konto = await einloggen();
		const r = await postAbo(
			d,
			ereignis({ body: { ...neuesAbo(), endpoint: 'https://example.org/x' }, konto })
		);
		expect([r.status, await r.json()]).toEqual([400, { fehler: 'eingabe' }]);
	});

	test('FR-41: Themen setzen und lesen', async () => {
		const konto = await einloggen();
		const r = await postThemen(
			d,
			ereignis({ body: { themen: { anlaesse: false, cm: true, verein: false } }, konto })
		);
		const erwartet = { anlaesse: false, cm: true, verein: false };
		expect(r.status).toBe(200);
		expect((await r.json()).themen).toEqual(erwartet);
		const g = await (await getBenachrichtigungen(d, ereignis({ method: 'GET', konto }))).json();
		expect(g.themen).toEqual(erwartet);
	});

	test('FR-41: Themen mit fehlendem Schlüssel → 400', async () => {
		const konto = await einloggen();
		for (const themen of [
			{ anlaesse: false, cm: true },
			{ anlaesse: 'ja', cm: true, verein: true },
			null
		]) {
			const r = await postThemen(d, ereignis({ body: { themen }, konto }));
			expect([r.status, await r.json()]).toEqual([400, { fehler: 'eingabe' }]);
		}
		const r = await postThemen(d, ereignis({ body: {}, konto }));
		expect(r.status).toBe(400);
	});

	test('SI-22: Abo ohne VAPID → 409 push-aus', async () => {
		const konto = await einloggen();
		const r = await postAbo(dOhneVapid, ereignis({ body: neuesAbo(), konto }));
		expect([r.status, await r.json()]).toEqual([409, { fehler: 'push-aus' }]);
		const g = await (
			await getBenachrichtigungen(dOhneVapid, ereignis({ method: 'GET', konto }))
		).json();
		expect(g.schluessel).toBeNull();
	});

	test('FR-40: ohne Sitzung 401', async () => {
		const get = await getBenachrichtigungen(d, ereignis({ method: 'GET' }));
		expect([get.status, await get.json()]).toEqual([401, { fehler: 'abgemeldet' }]);
		expect(get.headers.get('cache-control')).toBe('no-store');
		for (const f of [postThemen, postAbo, postAboLoeschen])
			expect((await f(d, ereignis({ body: {} }))).status).toBe(401);
	});

	test('SI-10: ohne JSON 415', async () => {
		const konto = await einloggen();
		for (const f of [postThemen, postAbo, postAboLoeschen]) {
			const r = await f(d, ereignis({ body: 'x', contentType: 'text/plain', konto }));
			expect(r.status).toBe(415);
		}
	});
});
