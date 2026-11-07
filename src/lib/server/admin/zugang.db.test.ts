import { and, eq } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { konto as kontoTabelle, kontoRolle, mitglied, sitzung } from '../db/schema.ts';
import { erstelleBremsen } from '../login/bremse.ts';
import { erstelleLoginDienst } from '../login/dienst.ts';
import { beendeAlleSitzungen, erstelleSitzung, pruefeSitzung } from '../login/sitzung.ts';
import {
	ADMIN_BESTAETIGUNG_MS,
	baueAdminCodeMail,
	erstelleZugangDienst,
	type Zugang
} from './zugang.ts';

const db = erstelleDb(process.env.DATABASE_URL!);
afterAll(async () => {
	await db.$client.end();
});

const SCHLUESSEL = 'x'.repeat(40);
const start = new Date('2026-11-02T12:00:00Z');
const MINUTE = 60_000;

type Nachricht = { an: string; betreff: string; text: string };

function baue() {
	const zeit = { t: start };
	const post: Nachricht[] = [];
	const bremsen = erstelleBremsen(() => zeit.t.getTime());
	const mailer = async (n: Nachricht) => {
		post.push(n);
	};
	const dienst = erstelleZugangDienst({
		db,
		schluessel: SCHLUESSEL,
		kontakt: 'kontakt@example.org',
		mailer,
		bremsen,
		jetzt: () => zeit.t
	});
	return { dienst, zeit, post, bremsen, mailer };
}

async function einloggen(kontoId: number, t: Date = start) {
	const kennung = await erstelleSitzung(db, kontoId, t);
	const r = await pruefeSitzung(db, kennung, t);
	return r!.konto;
}
const codeAus = (n: Nachricht) => n.text.slice(0, 6);
const falscherCode = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, '0');

async function bestaetigt(
	z: ReturnType<typeof baue>,
	konto: Awaited<ReturnType<typeof einloggen>>
) {
	const r = await z.dienst.fordereCodeAn(konto);
	await r.arbeit;
	return z.dienst.bestaetige(konto, codeAus(z.post.at(-1)!));
}

describe('Zugang zur Verwaltung', () => {
	test('SI-08, RR-09: Admin bestätigt mit Code, danach 24 Stunden bestätigt', async () => {
		const z = baue();
		const admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
		const konto = await einloggen(admin.kontoId);
		expect((await z.dienst.pruefe(konto)).stufe).toBe('unbestaetigt');

		const r = await z.dienst.fordereCodeAn(konto);
		expect(r.annahme).toBe('ok');
		await r.arbeit;
		expect(z.post).toHaveLength(1);
		expect(z.post[0].an).toBe(admin.email);
		expect(z.post[0]).toMatchObject(baueAdminCodeMail(codeAus(z.post[0]), 'kontakt@example.org'));
		expect(await z.dienst.bestaetige(konto, codeAus(z.post[0]))).toBe('ok');

		expect(await z.dienst.pruefe(konto)).toEqual<Zugang>({
			stufe: 'bestaetigt',
			kontoId: admin.kontoId,
			mitgliedId: admin.mitgliedId,
			rollen: ['mytco', 'mitglieder']
		});
		z.zeit.t = new Date(start.getTime() + ADMIN_BESTAETIGUNG_MS - MINUTE);
		expect((await z.dienst.pruefe(konto)).stufe).toBe('bestaetigt');
		z.zeit.t = new Date(start.getTime() + ADMIN_BESTAETIGUNG_MS + MINUTE);
		expect((await z.dienst.pruefe(konto)).stufe).toBe('unbestaetigt');
	});

	test('SI-08: Mail-Text', () => {
		expect(baueAdminCodeMail('123456', 'k@example.org')).toEqual({
			betreff: 'Dein Code für die Verwaltung von MyTCO',
			text: [
				'123456 ist dein Code für die Verwaltung von MyTCO.',
				'',
				'Der Code gilt 15 Minuten und nur einmal.',
				'',
				'Hast du keinen Code angefordert? Dann melde dich bei k@example.org.'
			].join('\n')
		});
	});

	test('SI-08: abgemeldet ohne Konto', async () => {
		expect(await baue().dienst.pruefe(undefined)).toEqual({ stufe: 'abgemeldet' });
	});

	test('SI-08: falscher Code fünfmal → auch der richtige gilt nicht mehr', async () => {
		const z = baue();
		const admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
		const konto = await einloggen(admin.kontoId);
		await (
			await z.dienst.fordereCodeAn(konto)
		).arbeit;
		const richtig = codeAus(z.post[0]);
		for (let i = 0; i < 5; i++) {
			expect(await z.dienst.bestaetige(konto, falscherCode(richtig))).toBe('falsch');
		}
		expect(await z.dienst.bestaetige(konto, richtig)).toBe('falsch');
		expect((await z.dienst.pruefe(konto)).stufe).toBe('unbestaetigt');
	});

	test('SI-08: ohne Code, ungültige Eingabe oder nach 15 Minuten → falsch', async () => {
		const z = baue();
		const admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
		const konto = await einloggen(admin.kontoId);
		expect(await z.dienst.bestaetige(konto, '123456')).toBe('falsch');
		await (
			await z.dienst.fordereCodeAn(konto)
		).arbeit;
		const code = codeAus(z.post[0]);
		expect(await z.dienst.bestaetige(konto, 42)).toBe('falsch');
		expect(await z.dienst.bestaetige(konto, 'abc')).toBe('falsch');
		z.zeit.t = new Date(start.getTime() + 15 * MINUTE + 1);
		expect(await z.dienst.bestaetige(konto, code)).toBe('falsch');
	});

	test('SI-08: Admin-Code gilt nur einmal', async () => {
		const z = baue();
		const admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
		const konto = await einloggen(admin.kontoId);
		expect(await bestaetigt(z, konto)).toBe('ok');
		const [zeile] = await db
			.select()
			.from(sitzung)
			.where(eq(sitzung.kennungHash, konto.sitzungHash));
		expect(zeile.adminCodeHash).toBeNull();
		expect(zeile.adminCodeAblauf).toBeNull();
		expect(zeile.adminCodeFehlversuche).toBe(0);
		expect(await z.dienst.bestaetige(konto, codeAus(z.post[0]))).toBe('falsch');
	});

	test('SI-08: Bestätigung gilt nur für diese Sitzung', async () => {
		const z = baue();
		const admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
		const a = await einloggen(admin.kontoId);
		const b = await einloggen(admin.kontoId);
		expect(await bestaetigt(z, a)).toBe('ok');
		expect((await z.dienst.pruefe(a)).stufe).toBe('bestaetigt');
		expect((await z.dienst.pruefe(b)).stufe).toBe('unbestaetigt');
		expect(await z.dienst.bestaetige(b, codeAus(z.post[0]))).toBe('falsch');
	});

	test('SI-07, SI-08: nach «Alle Sitzungen beenden» ist eine neue Sitzung unbestätigt', async () => {
		const z = baue();
		const admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
		const alt = await einloggen(admin.kontoId);
		expect(await bestaetigt(z, alt)).toBe('ok');
		await beendeAlleSitzungen(db, admin.kontoId);
		const neu = await einloggen(admin.kontoId);
		expect((await z.dienst.pruefe(neu)).stufe).toBe('unbestaetigt');
	});

	test('SI-08: ein Login-Mail-Code öffnet die Verwaltung nicht, ein Admin-Code loggt nicht ein', async () => {
		const z = baue();
		const login = erstelleLoginDienst({
			db,
			schluessel: SCHLUESSEL,
			kontakt: 'kontakt@example.org',
			mailer: z.mailer,
			bremsen: z.bremsen,
			jetzt: () => z.zeit.t
		});
		const admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
		const konto = await einloggen(admin.kontoId);

		await login.fordereMailCodeAn(admin.email, 'ip-1').arbeit;
		expect(await z.dienst.bestaetige(konto, codeAus(z.post[0]))).toBe('falsch');
		expect((await z.dienst.pruefe(konto)).stufe).toBe('unbestaetigt');

		await (
			await z.dienst.fordereCodeAn(konto)
		).arbeit;
		const r = await login.loginMitMailCode(admin.email, codeAus(z.post[1]), 'ip-2');
		expect(r.ergebnis).toBe('falsch');
	});

	test('RR-07: Konto ohne Verwaltungsrolle → keine-rolle, Code-Anfrage schickt keine Mail', async () => {
		const z = baue();
		for (const rollen of [[], ['lizenz']]) {
			const m = await legeMitgliedAn(db, { rollen });
			const konto = await einloggen(m.kontoId);
			expect(await z.dienst.pruefe(konto)).toEqual({ stufe: 'keine-rolle' });
			const r = await z.dienst.fordereCodeAn(konto);
			expect(r.annahme).toBe('ok');
			await r.arbeit;
			expect(z.post).toHaveLength(0);
			expect(await z.dienst.bestaetige(konto, '123456')).toBe('falsch');
		}
	});

	test('RR-07: cm ohne Admin bekommt Zugang mit Rollen [cm], Lizenz allein nicht', async () => {
		const z = baue();
		const cm = await legeMitgliedAn(db, { rollen: ['cm', 'lizenz'] });
		const konto = await einloggen(cm.kontoId);
		expect(await z.dienst.pruefe(konto)).toEqual<Zugang>({ stufe: 'unbestaetigt', rollen: ['cm'] });
		expect(await bestaetigt(z, konto)).toBe('ok');
		expect(z.post.at(-1)!.an).toBe(cm.email);
		expect(await z.dienst.pruefe(konto)).toEqual<Zugang>({
			stufe: 'bestaetigt',
			kontoId: cm.kontoId,
			mitgliedId: cm.mitgliedId,
			rollen: ['cm']
		});

		const lizenz = await einloggen((await legeMitgliedAn(db, { rollen: ['lizenz'] })).kontoId);
		expect(await z.dienst.pruefe(lizenz)).toEqual({ stufe: 'keine-rolle' });
	});

	test('RR-07, RR-08: Sperre oder Austritt eines bestätigten cm-Kontos → keine-rolle bei der nächsten Prüfung', async () => {
		// Die Sitzungsprüfung lässt solche Konten gar nicht erst ein; der Zugang prüft trotzdem selbst.
		const z = baue();
		const gesperrt = await legeMitgliedAn(db, { rollen: ['cm'] });
		const ausgetreten = await legeMitgliedAn(db, { rollen: ['cm'] });
		const kg = await einloggen(gesperrt.kontoId);
		const ka = await einloggen(ausgetreten.kontoId);
		expect(await bestaetigt(z, kg)).toBe('ok');
		expect(await bestaetigt(z, ka)).toBe('ok');
		await db
			.update(kontoTabelle)
			.set({ gesperrt: true })
			.where(eq(kontoTabelle.id, gesperrt.kontoId));
		await db
			.update(mitglied)
			.set({ status: 'ausgetreten', austrittAm: new Date() })
			.where(eq(mitglied.id, ausgetreten.mitgliedId));
		expect(await z.dienst.pruefe(kg)).toEqual({ stufe: 'keine-rolle' });
		expect(await z.dienst.pruefe(ka)).toEqual({ stufe: 'keine-rolle' });
	});

	test('RR-07: entzogene Rolle hebt eine bestehende Bestätigung auf', async () => {
		const z = baue();
		const admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
		const konto = await einloggen(admin.kontoId);
		expect(await bestaetigt(z, konto)).toBe('ok');
		await db.delete(kontoRolle).where(eq(kontoRolle.kontoId, admin.kontoId));
		expect(await z.dienst.pruefe(konto)).toEqual({ stufe: 'keine-rolle' });
	});

	test('RR-07: entzogenes mitglieder bei verbleibendem cm wirkt sofort, Bestätigung bleibt für cm', async () => {
		const z = baue();
		const m = await legeMitgliedAn(db, { rollen: ['mitglieder', 'cm'] });
		const konto = await einloggen(m.kontoId);
		expect(await bestaetigt(z, konto)).toBe('ok');
		expect(await z.dienst.pruefe(konto)).toMatchObject({ rollen: ['mitglieder', 'cm'] });
		await db
			.delete(kontoRolle)
			.where(and(eq(kontoRolle.kontoId, m.kontoId), eq(kontoRolle.rolle, 'mitglieder')));
		expect(await z.dienst.pruefe(konto)).toEqual<Zugang>({
			stufe: 'bestaetigt',
			kontoId: m.kontoId,
			mitgliedId: m.mitgliedId,
			rollen: ['cm']
		});
	});

	test('SI-08: vierte Code-Anfrage in einer Stunde → zu-viele, keine Mail', async () => {
		const z = baue();
		const admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
		const konto = await einloggen(admin.kontoId);
		for (let i = 0; i < 3; i++) await (await z.dienst.fordereCodeAn(konto)).arbeit;
		expect(z.post).toHaveLength(3);
		const vierte = await z.dienst.fordereCodeAn(konto);
		await vierte.arbeit;
		expect(vierte.annahme).toBe('zu-viele');
		expect(z.post).toHaveLength(3);
	});

	test('SI-05: Admin-Code steht nur als Hash in der Datenbank', async () => {
		const z = baue();
		const admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
		const konto = await einloggen(admin.kontoId);
		await (
			await z.dienst.fordereCodeAn(konto)
		).arbeit;
		const code = codeAus(z.post[0]);
		const [zeile] = await db
			.select()
			.from(sitzung)
			.where(eq(sitzung.kennungHash, konto.sitzungHash));
		expect(zeile.adminCodeHash).toMatch(/^[0-9a-f]{64}$/);
		expect(JSON.stringify(zeile)).not.toContain(code);
	});

	test('SI-05: Fehler beim Versand erscheint nur als feste Logzeile', async () => {
		const z = baue();
		const admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
		const konto = await einloggen(admin.kontoId);
		const kaputt = erstelleZugangDienst({
			db,
			schluessel: SCHLUESSEL,
			kontakt: 'k@example.org',
			mailer: async () => {
				throw new Error(`Zugang zu ${admin.email} verweigert`);
			},
			bremsen: z.bremsen,
			jetzt: () => z.zeit.t
		});
		const log: unknown[][] = [];
		const orig = console.error;
		console.error = (...a: unknown[]) => void log.push(a);
		try {
			await (
				await kaputt.fordereCodeAn(konto)
			).arbeit;
		} finally {
			console.error = orig;
		}
		expect(log).toEqual([['Admin-Code-Mail nicht versandt']]);
	});
});
