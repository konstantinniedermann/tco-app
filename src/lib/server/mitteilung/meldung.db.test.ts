import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { pushAbo, sitzung } from '../db/schema.ts';
import type { Mailer } from '../login/dienst.ts';
import { cmAdmins, meldeMitgliedern } from './meldung.ts';
import type { PushSender } from './versand.ts';

const db = erstelleDb(process.env.DATABASE_URL!);
afterAll(async () => {
	await db.$client.end();
});

const logs = [
	vi.spyOn(console, 'error').mockImplementation(() => {}),
	vi.spyOn(console, 'warn').mockImplementation(() => {}),
	vi.spyOn(console, 'log').mockImplementation(() => {})
];
// SI-05: Die Meldung loggt nichts, auch nicht bei Fehlern.
afterEach(() => {
	try {
		for (const l of logs) expect(l).not.toHaveBeenCalled();
	} finally {
		for (const l of logs) l.mockClear();
	}
});

const SITZUNG_ZEIT = new Date('2026-11-02T12:00:00Z');
const ADRESSE = 'https://mytco.example.org';
const M = { titel: 'Clubmeisterschaft', text: 'Du bist jetzt angemeldet.', pfad: '/cm/anmelden' };

/** Legt ein Push-Abo mit eigener Sitzung für das Konto an und gibt den Endpunkt zurück. */
async function legeAboAn(kontoId: number) {
	const kennungHash = randomUUID();
	await db.insert(sitzung).values({
		kennungHash,
		kontoId,
		sitzungsversion: 1,
		erstelltAm: SITZUNG_ZEIT,
		zuletztGenutzt: SITZUNG_ZEIT
	});
	const endpunkt = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
	await db.insert(pushAbo).values({
		endpunkt,
		sitzungHash: kennungHash,
		kontoId,
		p256dh: 'schluessel',
		auth: 'geheimnis',
		eingerichtetAm: SITZUNG_ZEIT
	});
	return endpunkt;
}

function pushStub(ergebnis: 'ok' | 'ungueltig' | 'fehler' = 'ok') {
	const gesendet: { endpunkt: string; nutzlast: string }[] = [];
	const push: PushSender = async (abo, nutzlast) => {
		gesendet.push({ endpunkt: abo.endpunkt, nutzlast });
		return ergebnis;
	};
	return { push, gesendet };
}

function mailStub(wirft = false) {
	const mails: Parameters<Mailer>[0][] = [];
	const mailer: Mailer = async (n) => {
		mails.push(n);
		if (wirft) throw new Error('SMTP');
	};
	return { mailer, mails };
}

describe('FR-47: persönliche Meldung', () => {
	test('FR-47: gelungener Push, keine Mail; Nutzlast trägt den vollen Link', async () => {
		const m = await legeMitgliedAn(db);
		const endpunkt = await legeAboAn(m.kontoId);
		const p = pushStub();
		const ml = mailStub();
		await meldeMitgliedern(
			{ db, push: p.push, mailer: ml.mailer, adresse: `${ADRESSE}/` },
			[m.mitgliedId],
			M
		);
		expect(ml.mails).toEqual([]);
		expect(p.gesendet).toEqual([
			{
				endpunkt,
				nutzlast: JSON.stringify({ titel: M.titel, text: M.text, link: ADRESSE + M.pfad })
			}
		]);
	});

	test('FR-47: Push gescheitert, genau eine Mail mit Link am Ende', async () => {
		const m = await legeMitgliedAn(db);
		await legeAboAn(m.kontoId);
		const ml = mailStub();
		await meldeMitgliedern(
			{ db, push: pushStub('fehler').push, mailer: ml.mailer, adresse: ADRESSE },
			[m.mitgliedId, m.mitgliedId],
			M
		);
		expect(ml.mails).toEqual([
			{ an: m.email, betreff: M.titel, text: `${M.text}\n\n${ADRESSE}${M.pfad}` }
		]);
	});

	test('FR-47: ohne Abo und Thema Clubmeisterschaft aus, trotzdem eine Mail', async () => {
		const m = await legeMitgliedAn(db);
		await db.execute(`update konto set thema_cm = false where id = ${m.kontoId}`);
		const ml = mailStub();
		await meldeMitgliedern(
			{ db, push: pushStub().push, mailer: ml.mailer, adresse: ADRESSE },
			[m.mitgliedId],
			M
		);
		expect(ml.mails.map((n) => n.an)).toEqual([m.email]);
	});

	test('FR-47: gesperrtes Konto und ausgetretenes Mitglied bekommen nichts', async () => {
		const gesperrt = await legeMitgliedAn(db, { gesperrt: true });
		const ausgetreten = await legeMitgliedAn(db, { status: 'ausgetreten' });
		const ml = mailStub();
		const p = pushStub();
		await meldeMitgliedern(
			{ db, push: p.push, mailer: ml.mailer, adresse: ADRESSE },
			[gesperrt.mitgliedId, ausgetreten.mitgliedId],
			M
		);
		expect(ml.mails).toEqual([]);
		expect(p.gesendet).toEqual([]);
	});

	test('FR-47: push null gibt Mail; werfender Mailer wirft nicht und loggt nichts', async () => {
		const m = await legeMitgliedAn(db);
		await legeAboAn(m.kontoId);
		const ml = mailStub();
		await meldeMitgliedern(
			{ db, push: null, mailer: ml.mailer, adresse: ADRESSE },
			[m.mitgliedId],
			M
		);
		expect(ml.mails.map((n) => n.an)).toEqual([m.email]);
		const wirft = mailStub(true);
		await expect(
			meldeMitgliedern(
				{ db, push: null, mailer: wirft.mailer, adresse: ADRESSE },
				[m.mitgliedId],
				M
			)
		).resolves.toBeUndefined();
		expect(wirft.mails).toHaveLength(1);
	});

	test('FR-47: cmAdmins liefert nur gültige CM-Admins (aktiv, Konto nicht gesperrt, Rolle cm)', async () => {
		const admin = await legeMitgliedAn(db, { rollen: ['cm'] });
		const gesperrt = await legeMitgliedAn(db, { rollen: ['cm'], gesperrt: true });
		const ausgetreten = await legeMitgliedAn(db, { rollen: ['cm'], status: 'ausgetreten' });
		const vorgemerkt = await legeMitgliedAn(db, { rollen: ['cm'], status: 'vorgemerkt' });
		const andere = await legeMitgliedAn(db, { rollen: ['mitglieder'] });
		const ohne = await legeMitgliedAn(db);
		const ids = await cmAdmins(db);
		expect(ids).toContain(admin.mitgliedId);
		for (const x of [gesperrt, ausgetreten, vorgemerkt, andere, ohne])
			expect(ids).not.toContain(x.mitgliedId);
	});
});
