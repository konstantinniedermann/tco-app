import { randomUUID } from 'node:crypto';
import { inArray } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { pushAbo, sitzung } from '../db/schema.ts';
import type { Mailer } from '../login/dienst.ts';
import type { Empfaenger } from './empfaenger.ts';
import { versende, type PushSender } from './versand.ts';

const db = erstelleDb(process.env.DATABASE_URL!);
afterAll(async () => {
	await db.$client.end();
});

const logs = [
	vi.spyOn(console, 'error').mockImplementation(() => {}),
	vi.spyOn(console, 'warn').mockImplementation(() => {}),
	vi.spyOn(console, 'log').mockImplementation(() => {})
];
// SI-05: Der Versand loggt nichts, auch nicht bei Fehlern.
afterEach(() => {
	try {
		for (const l of logs) expect(l).not.toHaveBeenCalled();
	} finally {
		for (const l of logs) l.mockClear();
	}
});

// Sitzungen mit einer Zeit wie in den übrigen Tests (Aufräumen beim Login).
const SITZUNG_ZEIT = new Date('2026-11-02T12:00:00Z');
const ADRESSE = 'https://mytco.example.org';
const M = {
	titel: 'Generalversammlung',
	text: 'Bitte melde dich bis Di, 16. März an oder ab.',
	link: `${ADRESSE}/anlass/7`
};
const FUSS = `Diese Mitteilungen kannst du im Profil abschalten: ${ADRESSE}/profil`;

type Ergebnis = Awaited<ReturnType<PushSender>>;
type Abo = Empfaenger['abos'][number];

const neuesAbo = (): Abo => ({
	endpunkt: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`,
	p256dh: 'schluessel',
	auth: 'geheimnis'
});

let naechsteId = 1;
// Erfundene Empfänger ohne Datenbank; nur der Test «ungueltig» braucht echte Abo-Zeilen.
function empf(teil: { email?: string | null; abos?: Abo[] } = {}): Empfaenger {
	const id = naechsteId++;
	return {
		mitgliedId: id,
		name: `Muster, Test ${id}`,
		email: teil.email === undefined ? `test-${randomUUID()}@example.org` : teil.email,
		abos: teil.abos ?? []
	};
}

/** Push-Sender, der je Endpunkt das gewünschte Ergebnis liefert (Standard `ok`) und alles mitschreibt. */
function pushStub(ergebnisse: Record<string, Ergebnis | 'wirft'> = {}) {
	const gesendet: { endpunkt: string; nutzlast: string }[] = [];
	const push: PushSender = async (abo, nutzlast) => {
		gesendet.push({ endpunkt: abo.endpunkt, nutzlast });
		const e = ergebnisse[abo.endpunkt] ?? 'ok';
		if (e === 'wirft') throw new Error('Netz weg');
		return e;
	};
	return { push, gesendet };
}

function mailStub(scheitertAn: string[] = []) {
	const mails: Parameters<Mailer>[0][] = [];
	const mailer: Mailer = async (n) => {
		mails.push(n);
		if (scheitertAn.includes(n.an)) throw new Error('SMTP');
	};
	return { mailer, mails };
}

describe('Versand einer Mitteilung', () => {
	test('FR-44: Push trägt titel, text und link, die Mail Text, Link und Fusszeile', async () => {
		const mitPush = empf({ abos: [neuesAbo()] });
		const ohne = empf();
		const p = pushStub();
		const m = mailStub();
		await versende({ push: p.push, mailer: m.mailer, db, adresse: ADRESSE }, [mitPush, ohne], {
			...M,
			weg: 'push-sonst-mail'
		});
		expect(p.gesendet).toEqual([
			{
				endpunkt: mitPush.abos[0].endpunkt,
				nutzlast: JSON.stringify({ titel: M.titel, text: M.text, link: M.link })
			}
		]);
		expect(m.mails).toEqual([
			{ an: ohne.email, betreff: M.titel, text: `${M.text}\n\n${M.link}\n\n${FUSS}` }
		]);
	});

	test('FR-44: nur Push schickt keine Mail', async () => {
		const mitPush = empf({ abos: [neuesAbo()] });
		const ohne = empf();
		const m = mailStub();
		const z = await versende(
			{ push: pushStub().push, mailer: m.mailer, db, adresse: ADRESSE },
			[mitPush, ohne],
			{ ...M, weg: 'push' }
		);
		expect(m.mails).toEqual([]);
		expect(z).toEqual({ push: 1, mails: 0, ersatzMails: 0, nichtErreichbar: 1 });
	});

	test('FR-44: Push sonst Mail: ohne Abo Mail, mit Abo keine', async () => {
		const mitPush = empf({ abos: [neuesAbo()] });
		const ohne = empf();
		const m = mailStub();
		const z = await versende(
			{ push: pushStub().push, mailer: m.mailer, db, adresse: ADRESSE },
			[mitPush, ohne],
			{ ...M, weg: 'push-sonst-mail' }
		);
		expect(m.mails.map((n) => n.an)).toEqual([ohne.email]);
		expect(z).toEqual({ push: 1, mails: 1, ersatzMails: 0, nichtErreichbar: 0 });
	});

	test('FR-44: Push sonst Mail: alle Pushes gescheitert → Ersatz-Mail', async () => {
		const [a1, a2, b1, b2] = [neuesAbo(), neuesAbo(), neuesAbo(), neuesAbo()];
		const alleWeg = empf({ abos: [a1, a2] });
		const einerGut = empf({ abos: [b1, b2] });
		const p = pushStub({
			[a1.endpunkt]: 'fehler',
			[a2.endpunkt]: 'wirft',
			[b1.endpunkt]: 'fehler'
		});
		const m = mailStub();
		const z = await versende(
			{ push: p.push, mailer: m.mailer, db, adresse: ADRESSE },
			[alleWeg, einerGut],
			{ ...M, weg: 'push-sonst-mail' }
		);
		expect(p.gesendet).toHaveLength(4);
		// Ein gelungener Push von zweien genügt: keine Ersatz-Mail.
		expect(m.mails.map((n) => n.an)).toEqual([alleWeg.email]);
		expect(z).toEqual({ push: 1, mails: 0, ersatzMails: 1, nichtErreichbar: 0 });
	});

	test('FR-44: Push und Mail: beides', async () => {
		const mitPush = empf({ abos: [neuesAbo()] });
		const ohne = empf();
		const gescheitert = empf({ abos: [neuesAbo()] });
		const p = pushStub({ [gescheitert.abos[0].endpunkt]: 'fehler' });
		const m = mailStub();
		const z = await versende(
			{ push: p.push, mailer: m.mailer, db, adresse: ADRESSE },
			[mitPush, ohne, gescheitert],
			{ ...M, weg: 'push-und-mail' }
		);
		expect(p.gesendet.map((g) => g.endpunkt)).toEqual([
			mitPush.abos[0].endpunkt,
			gescheitert.abos[0].endpunkt
		]);
		expect(m.mails.map((n) => n.an)).toEqual([mitPush.email, ohne.email, gescheitert.email]);
		// Beim Weg «Push und Mail» gibt es keine Ersatz-Mail: die Mail geht ohnehin.
		expect(z).toEqual({ push: 1, mails: 3, ersatzMails: 0, nichtErreichbar: 0 });
	});

	test('FR-44: ungueltig löscht das Abo', async () => {
		const m = await legeMitgliedAn(db);
		// Zwei Geräte, je mit eigener Sitzung (ein Abo je Sitzung).
		const sitzungen = [randomUUID(), randomUUID()];
		await db.insert(sitzung).values(
			sitzungen.map((kennungHash) => ({
				kennungHash,
				kontoId: m.kontoId,
				sitzungsversion: 1,
				erstelltAm: SITZUNG_ZEIT,
				zuletztGenutzt: SITZUNG_ZEIT
			}))
		);
		const [weg, bleibt] = [neuesAbo(), neuesAbo()];
		await db.insert(pushAbo).values(
			[weg, bleibt].map((a, i) => ({
				...a,
				sitzungHash: sitzungen[i],
				kontoId: m.kontoId,
				eingerichtetAm: SITZUNG_ZEIT
			}))
		);
		const e: Empfaenger = {
			mitgliedId: m.mitgliedId,
			name: 'Muster, Test',
			email: m.email,
			abos: [weg, bleibt]
		};
		const z = await versende(
			{
				push: pushStub({ [weg.endpunkt]: 'ungueltig', [bleibt.endpunkt]: 'fehler' }).push,
				mailer: mailStub().mailer,
				db,
				adresse: ADRESSE
			},
			[e],
			{ ...M, weg: 'push-sonst-mail' }
		);
		const rest = await db
			.select({ endpunkt: pushAbo.endpunkt })
			.from(pushAbo)
			.where(inArray(pushAbo.endpunkt, [weg.endpunkt, bleibt.endpunkt]));
		expect(rest).toEqual([{ endpunkt: bleibt.endpunkt }]);
		expect(z).toEqual({ push: 0, mails: 0, ersatzMails: 1, nichtErreichbar: 0 });
		await db.delete(sitzung).where(inArray(sitzung.kennungHash, sitzungen));
	});

	test('FR-44: Mailfehler bei einem hält die anderen nicht auf', async () => {
		const [a, b, c] = [empf(), empf(), empf()];
		const m = mailStub([b.email!]);
		const z = await versende(
			{ push: pushStub().push, mailer: m.mailer, db, adresse: ADRESSE },
			[a, b, c],
			{ ...M, weg: 'push-sonst-mail' }
		);
		expect(m.mails.map((n) => n.an)).toEqual([a.email, b.email, c.email]);
		// Wer weder Push noch Mail bekam, ist nicht erreicht.
		expect(z).toEqual({ push: 0, mails: 2, ersatzMails: 0, nichtErreichbar: 1 });
	});

	test('DS-05: jede Mail hat genau einen Empfänger', async () => {
		const liste = [empf(), empf(), empf({ abos: [neuesAbo()] }), empf()];
		const m = mailStub();
		await versende({ push: pushStub().push, mailer: m.mailer, db, adresse: ADRESSE }, liste, {
			...M,
			weg: 'push-und-mail'
		});
		expect(m.mails).toHaveLength(4);
		expect(m.mails.map((n) => n.an)).toEqual(liste.map((e) => e.email));
		for (const n of m.mails) {
			expect(n.an).not.toMatch(/[,;\s]/);
			expect(n.text).not.toContain('@');
		}
	});

	test('FR-44: ohne Mail-Adresse und ohne Push zählt als nicht erreichbar', async () => {
		const leer = empf({ email: null });
		const leererText = empf({ email: '' });
		const gescheitert = empf({ email: null, abos: [neuesAbo()] });
		const p = pushStub({ [gescheitert.abos[0].endpunkt]: 'fehler' });
		const m = mailStub();
		const z = await versende(
			{ push: p.push, mailer: m.mailer, db, adresse: ADRESSE },
			[leer, leererText, gescheitert],
			{ ...M, weg: 'push-sonst-mail' }
		);
		expect(m.mails).toEqual([]);
		expect(z).toEqual({ push: 0, mails: 0, ersatzMails: 0, nichtErreichbar: 3 });
	});

	test('FR-44: ohne VAPID geht nichts per Push, Mail statt Ersatz-Mail', async () => {
		const mitAbo = empf({ abos: [neuesAbo()] });
		const ohne = empf();
		const m = mailStub();
		const z = await versende(
			{ push: null, mailer: m.mailer, db, adresse: ADRESSE },
			[mitAbo, ohne],
			{
				...M,
				weg: 'push-sonst-mail'
			}
		);
		expect(m.mails.map((n) => n.an)).toEqual([mitAbo.email, ohne.email]);
		expect(z).toEqual({ push: 0, mails: 2, ersatzMails: 0, nichtErreichbar: 0 });
		expect(
			await versende({ push: null, mailer: m.mailer, db, adresse: ADRESSE }, [mitAbo], {
				...M,
				weg: 'push'
			})
		).toEqual({ push: 0, mails: 0, ersatzMails: 0, nichtErreichbar: 1 });
	});

	test('FR-44: zuerst alle Pushes, dann die Mails', async () => {
		const reihenfolge: string[] = [];
		const ohne = empf();
		const mitPush = empf({ abos: [neuesAbo()] });
		await versende(
			{
				push: async () => {
					reihenfolge.push('push');
					return 'ok';
				},
				mailer: async () => {
					reihenfolge.push('mail');
				},
				db,
				adresse: ADRESSE
			},
			[ohne, mitPush],
			{ ...M, weg: 'push-und-mail' }
		);
		expect(reihenfolge).toEqual(['push', 'mail', 'mail']);
	});

	test('DS-05: Mails gehen zu fünft gleichzeitig, jede an genau eine Adresse', async () => {
		const liste = Array.from({ length: 12 }, () => empf());
		const offen = new Set<string>();
		let hoechstens = 0;
		const an: string[] = [];
		const z = await versende(
			{
				push: null,
				mailer: async (n) => {
					an.push(n.an);
					offen.add(n.an);
					hoechstens = Math.max(hoechstens, offen.size);
					await new Promise((r) => setTimeout(r, 5));
					offen.delete(n.an);
				},
				db,
				adresse: ADRESSE
			},
			liste,
			{ ...M, weg: 'push-und-mail' }
		);
		expect(hoechstens).toBe(5);
		expect(an).toEqual(liste.map((e) => e.email));
		expect(z).toEqual({ push: 0, mails: 12, ersatzMails: 0, nichtErreichbar: 0 });
	});
});
