import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { erstelleBremsen } from './bremse.ts';
import { erstelleLoginDienst } from './dienst.ts';
import { holeLoginDienst } from './index.ts';
import {
	getSitzung,
	ladeSitzung,
	postBrief,
	postLogout,
	postMail,
	postMailCode
} from './schnittstellen.ts';
import { SITZUNG_COOKIE } from './sitzung.ts';

const db = erstelleDb(process.env.DATABASE_URL!);
const start = new Date('2026-11-02T12:00:00Z');
const STUNDE = 60 * 60 * 1000;

const logs = {
	error: vi.spyOn(console, 'error').mockImplementation(() => {}),
	warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
	log: vi.spyOn(console, 'log').mockImplementation(() => {})
};
const geheimnisse: string[] = [];

afterAll(async () => {
	await db.$client.end();
});

function baue() {
	const zeit = { t: start };
	const post: { an: string; text: string }[] = [];
	const dienst = erstelleLoginDienst({
		db,
		schluessel: 'x'.repeat(40),
		kontakt: 'kontakt@example.org',
		mailer: async (n) => {
			post.push(n);
		},
		bremsen: erstelleBremsen(() => zeit.t.getTime()),
		jetzt: () => zeit.t
	});
	return { dienst, zeit, post };
}

async function meldeAn() {
	const b = baue();
	const m = await legeMitgliedAn(db, { vorname: 'Erika' });
	const { code } = await b.dienst.stelleBriefCodeAus(m.kontoId);
	geheimnisse.push(code, m.email);
	const e = ereignis({ body: { code } });
	const antwort = await postBrief(b.dienst, e);
	const kennung = e.gesetzt.get(SITZUNG_COOKIE)!.wert;
	geheimnisse.push(kennung);
	return { ...b, ...m, code, kennung, antwort, e };
}

describe('Schnittstellen', () => {
	describe('POST /api/login/brief', () => {
		test('gültiger Code: 200, Cookie mit den Sitzungs-Optionen', async () => {
			const s = await meldeAn();
			expect(s.antwort.status).toBe(200);
			expect(await s.antwort.json()).toEqual({});
			expect(s.antwort.headers.get('cache-control')).toBe('no-store');
			const c = s.e.gesetzt.get(SITZUNG_COOKIE)!;
			expect(c.opt).toMatchObject({
				httpOnly: true,
				sameSite: 'lax',
				path: '/',
				maxAge: 365 * 24 * 60 * 60
			});
			expect((c.opt as { secure?: boolean }).secure).not.toBe(false);
		});

		test('benutzt: 400 mit Kontakt', async () => {
			const s = await meldeAn();
			const r = await postBrief(s.dienst, ereignis({ body: { code: s.code } }));
			expect(r.status).toBe(400);
			expect(await r.json()).toEqual({ fehler: 'benutzt', kontakt: 'kontakt@example.org' });
		});

		test('falsch: 400', async () => {
			const r = await postBrief(baue().dienst, ereignis({ body: { code: 'AAAAAAAAAA' } }));
			expect(r.status).toBe(400);
			expect(await r.json()).toEqual({ fehler: 'falsch' });
		});

		test('zu viele Fehlversuche: 429', async () => {
			const d = baue().dienst;
			let r!: Response;
			for (let i = 0; i < 11; i++) {
				r = await postBrief(d, ereignis({ body: { code: 'AAAAAAAAAA' }, ip: '198.51.100.9' }));
			}
			expect(r.status).toBe(429);
			expect(await r.json()).toEqual({ fehler: 'zu-viele' });
			expect(r.headers.get('cache-control')).toBe('no-store');
		});

		test('alte Kennung wird ersetzt', async () => {
			const s = await meldeAn();
			const m = await legeMitgliedAn(db);
			const { code } = await s.dienst.stelleBriefCodeAus(m.kontoId);
			geheimnisse.push(code);
			await postBrief(s.dienst, ereignis({ body: { code }, cookie: s.kennung }));
			expect(await s.dienst.pruefeSitzung(s.kennung)).toBeNull();
		});
	});

	describe('Review Focus 1: Content-Type', () => {
		test.each([
			['brief', postBrief],
			['mail-code', postMailCode],
			['mail', postMail],
			['logout', postLogout]
		])('%s: text/plain gibt 415', async (_n, f) => {
			const r = await f(
				baue().dienst,
				ereignis({ body: { code: 'x' }, contentType: 'text/plain' })
			);
			expect(r.status).toBe(415);
			expect(await r.json()).toEqual({ fehler: 'format' });
			expect(r.headers.get('cache-control')).toBe('no-store');
		});

		test('JSON mit charset ist erlaubt', async () => {
			const r = await postLogout(
				baue().dienst,
				ereignis({ contentType: 'application/json; charset=utf-8' })
			);
			expect(r.status).toBe(204);
		});
	});

	describe('Review Focus 3: kaputte Körper', () => {
		test.each([
			['kein JSON', '{kaputt'],
			['leer', undefined],
			['Zahl', '42'],
			['Feld fehlt', {}],
			['Feld ist Zahl', { code: 5, email: 7 }]
		])('Login: %s gibt 400 falsch', async (_n, body) => {
			const d = baue().dienst;
			for (const f of [postBrief, postMail]) {
				const r = await f(d, ereignis({ body }));
				expect(r.status).toBe(400);
				expect(await r.json()).toEqual({ fehler: 'falsch' });
			}
		});

		test.each([
			['kein JSON', '{kaputt'],
			['Zahl', '42'],
			['Feld fehlt', {}],
			['Feld ist Zahl', { email: 7 }]
		])('Anfordern: %s gibt 202', async (_n, body) => {
			const r = await postMailCode(baue().dienst, ereignis({ body }));
			expect(r.status).toBe(202);
		});
	});

	describe('POST /api/login/mail-code und /mail', () => {
		test('SI-04: gleiche Antwort für bekannte und unbekannte Adresse', async () => {
			const b = baue();
			const m = await legeMitgliedAn(db);
			geheimnisse.push(m.email, 'unbekannt-si04@example.org');
			const a = await postMailCode(b.dienst, ereignis({ body: { email: m.email } }));
			const u = await postMailCode(
				b.dienst,
				ereignis({ body: { email: 'unbekannt-si04@example.org' } })
			);
			expect(a.status).toBe(202);
			expect(u.status).toBe(202);
			expect(await a.text()).toBe(await u.text());
			expect([...a.headers]).toEqual([...u.headers]);
		});

		test('Mail-Code einlösen setzt Cookie; falscher Code 400', async () => {
			const b = baue();
			const m = await legeMitgliedAn(db);
			await postMailCode(b.dienst, ereignis({ body: { email: m.email } }));
			await vi.waitFor(() => expect(b.post).toHaveLength(1));
			const code = b.post[0].text.slice(0, 6);
			geheimnisse.push(code, m.email);
			const falsch = await postMail(
				b.dienst,
				ereignis({ body: { email: m.email, code: code === '000000' ? '111111' : '000000' } })
			);
			expect(falsch.status).toBe(400);
			const e = ereignis({ body: { email: m.email, code } });
			const ok = await postMail(b.dienst, e);
			expect(ok.status).toBe(200);
			expect(e.gesetzt.has(SITZUNG_COOKIE)).toBe(true);
			geheimnisse.push(e.gesetzt.get(SITZUNG_COOKIE)!.wert);
		});

		test('IP-Grenze beim Anfordern: 429', async () => {
			const d = baue().dienst;
			let r!: Response;
			for (let i = 0; i < 11; i++) {
				r = await postMailCode(
					d,
					ereignis({ body: { email: `x${i}@example.org` }, ip: '198.51.100.20' })
				);
			}
			expect(r.status).toBe(429);
			expect(await r.json()).toEqual({ fehler: 'zu-viele' });
		});
	});

	describe('GET /api/sitzung', () => {
		test('ohne Cookie 401, mit Cookie 200, nach beendeAlleSitzungen 401', async () => {
			const s = await meldeAn();
			const ohne = ereignis();
			await ladeSitzung(s.dienst, ohne);
			const r0 = getSitzung(ohne);
			expect(r0.status).toBe(401);
			expect(await r0.json()).toEqual({});
			expect(r0.headers.get('cache-control')).toBe('no-store');

			const mit = ereignis({ cookie: s.kennung });
			await ladeSitzung(s.dienst, mit);
			const r1 = getSitzung(mit);
			expect(r1.status).toBe(200);
			expect(await r1.json()).toEqual({ vorname: 'Erika' });

			await s.dienst.beendeAlleSitzungen(s.kontoId);
			const danach = ereignis({ cookie: s.kennung });
			await ladeSitzung(s.dienst, danach);
			expect(getSitzung(danach).status).toBe(401);
			expect(danach.geloescht).toEqual([SITZUNG_COOKIE]);
		});
	});

	describe('ladeSitzung', () => {
		test('verlängert das Cookie nach 25 h, nach 1 h nicht', async () => {
			const s = await meldeAn();
			s.zeit.t = new Date(start.getTime() + STUNDE);
			const kurz = ereignis({ cookie: s.kennung });
			await ladeSitzung(s.dienst, kurz);
			expect(kurz.locals.konto?.vorname).toBe('Erika');
			expect(kurz.gesetzt.size).toBe(0);

			s.zeit.t = new Date(start.getTime() + 25 * STUNDE);
			const lang = ereignis({ cookie: s.kennung });
			await ladeSitzung(s.dienst, lang);
			const c = lang.gesetzt.get(SITZUNG_COOKIE)!;
			expect(c.wert).toBe(s.kennung);
			expect(c.opt).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
		});

		test('ohne Cookie bleibt alles leer', async () => {
			const e = ereignis();
			await ladeSitzung(baue().dienst, e);
			expect(e.locals.konto).toBeUndefined();
			expect(e.gesetzt.size).toBe(0);
			expect(e.geloescht).toEqual([]);
		});
	});

	describe('POST /api/logout', () => {
		test('SI-06: löscht Sitzung und Cookie, 204; danach 401', async () => {
			const s = await meldeAn();
			const e = ereignis({ cookie: s.kennung });
			const r = await postLogout(s.dienst, e);
			expect(r.status).toBe(204);
			expect(await r.text()).toBe('');
			expect(e.geloescht).toEqual([SITZUNG_COOKIE]);
			const danach = ereignis({ cookie: s.kennung });
			await ladeSitzung(s.dienst, danach);
			expect(getSitzung(danach).status).toBe(401);
		});

		test('ohne Cookie: 204', async () => {
			const r = await postLogout(baue().dienst, ereignis());
			expect(r.status).toBe(204);
		});
	});

	describe('holeLoginDienst', () => {
		const alt = { ...process.env };
		afterEach(() => {
			process.env = { ...alt };
		});
		test('liefert dieselbe Instanz', () => {
			Object.assign(process.env, {
				MYTCO_CODE_SCHLUESSEL: 'y'.repeat(40),
				MYTCO_SMTP_URL: 'smtp://localhost:2525',
				MYTCO_MAIL_ABSENDER: 'mytco@example.org',
				MYTCO_KONTAKT: 'kontakt@example.org'
			});
			expect(holeLoginDienst()).toBe(holeLoginDienst());
		});
	});

	describe('SI-05: Logs', () => {
		test('kein Log enthält Code, Kennung, Adresse oder IP', () => {
			geheimnisse.push('203.0.113.7', '198.51.100.9', '198.51.100.20');
			const aufrufe = [logs.error, logs.warn, logs.log].flatMap((s) =>
				s.mock.calls.map((a) => JSON.stringify(a))
			);
			for (const g of geheimnisse) {
				for (const a of aufrufe) expect(a).not.toContain(g);
			}
			expect(geheimnisse.length).toBeGreaterThan(5);
		});
	});
});
