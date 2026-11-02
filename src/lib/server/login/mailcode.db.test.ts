import { eq } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { konto } from '../db/schema.ts';
import { erstelleBremsen } from './bremse.ts';
import { MAIL_CODE_GUELTIG_MS } from './codes.ts';
import { erstelleLoginDienst, type Mailer } from './dienst.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});
afterEach(() => {
	vi.restoreAllMocks();
});

const SCHLUESSEL = 'x'.repeat(40);
const start = new Date('2026-11-02T12:00:00Z');
const MINUTE = 60_000;
const STUNDE = 60 * MINUTE;

type Nachricht = { an: string; betreff: string; text: string };

function baue(mailer?: Mailer) {
	const zeit = { t: start };
	const post: Nachricht[] = [];
	const bremsen = erstelleBremsen(() => zeit.t.getTime());
	const dienst = erstelleLoginDienst({
		db,
		schluessel: SCHLUESSEL,
		kontakt: 'kontakt@example.org',
		mailer:
			mailer ??
			(async (n) => {
				post.push(n);
			}),
		bremsen,
		jetzt: () => zeit.t
	});
	return { dienst, zeit, post };
}

const codeAus = (n: Nachricht) => n.text.slice(0, 6);
const holeKonto = async (id: number) => (await db.select().from(konto).where(eq(konto.id, id)))[0];

async function fordereAn(d: ReturnType<typeof baue>, email: string, ip = 'ip-1') {
	const r = d.dienst.fordereMailCodeAn(email, ip);
	await r.arbeit;
	return r;
}

describe('Mail-Code', () => {
	test('A-LOGIN-10: bekannte Adresse erhält einen 6-stelligen Code, der einmal gilt', async () => {
		const d = baue();
		const { email, kontoId } = await legeMitgliedAn(db);
		expect((await fordereAn(d, email)).annahme).toBe('ok');
		expect(d.post).toHaveLength(1);
		expect(d.post[0].an).toBe(email);
		const code = codeAus(d.post[0]);
		expect(code).toMatch(/^\d{6}$/);
		const k = await holeKonto(kontoId);
		expect(k.mailCodeAblauf).toEqual(new Date(start.getTime() + MAIL_CODE_GUELTIG_MS));
		expect(JSON.stringify(k)).not.toContain(code);
		const r = await d.dienst.loginMitMailCode(email, code, 'ip-2');
		expect(r.ergebnis).toBe('ok');
		if (r.ergebnis === 'ok') expect(await d.dienst.pruefeSitzung(r.kennung)).not.toBeNull();
		expect(await d.dienst.loginMitMailCode(email, code, 'ip-2')).toEqual({ ergebnis: 'falsch' });
	});

	test('Adresse wird normalisiert', async () => {
		const d = baue();
		const { email } = await legeMitgliedAn(db);
		await fordereAn(d, `  ${email.replace('test-', 'Test-').replace('@example', '@Example')} `);
		expect(d.post).toHaveLength(1);
		const r = await d.dienst.loginMitMailCode(
			` ${email.toUpperCase()} `,
			codeAus(d.post[0]),
			'ip-3'
		);
		expect(r.ergebnis).toBe('ok');
	});

	test('SI-04: unbekannte Adresse → gleiche Annahme, keine Mail', async () => {
		const d = baue();
		const { email } = await legeMitgliedAn(db);
		const bekannt = d.dienst.fordereMailCodeAn(email, 'ip-4');
		const unbekannt = d.dienst.fordereMailCodeAn('niemand-xyz@example.org', 'ip-4');
		await Promise.all([bekannt.arbeit, unbekannt.arbeit]);
		expect(bekannt.annahme).toBe('ok');
		expect({ annahme: bekannt.annahme }).toEqual({ annahme: unbekannt.annahme });
		expect(d.post).toHaveLength(1);
		expect(d.dienst.fordereMailCodeAn(42, 'ip-4').annahme).toBe('ok');
	});

	test('SI-04: Annahme wartet nicht auf die Arbeit', async () => {
		const d = baue(() => new Promise<void>(() => {}));
		const { email } = await legeMitgliedAn(db);
		const r = d.dienst.fordereMailCodeAn(email, 'ip-5');
		expect(r.annahme).toBe('ok');
		expect(r.arbeit).toBeInstanceOf(Promise);
	});

	test('SI-04: höchstens 3 Mails pro Adresse und Stunde, 10 pro Tag', async () => {
		const d = baue();
		const { email } = await legeMitgliedAn(db);
		for (let i = 0; i < 3; i++) await fordereAn(d, email, `ip-6-${i}`);
		expect(d.post).toHaveLength(3);
		expect((await fordereAn(d, email, 'ip-6-x')).annahme).toBe('ok');
		expect(d.post).toHaveLength(3);
		d.zeit.t = new Date(start.getTime() + STUNDE + MINUTE);
		await fordereAn(d, email, 'ip-6-y');
		expect(d.post).toHaveLength(4);
		for (let i = 0; i < 6; i++) {
			d.zeit.t = new Date(d.zeit.t.getTime() + STUNDE + MINUTE);
			await fordereAn(d, email, `ip-6-t${i}`);
		}
		expect(d.post).toHaveLength(10);
		d.zeit.t = new Date(d.zeit.t.getTime() + STUNDE + MINUTE);
		await fordereAn(d, email, 'ip-6-z');
		expect(d.post).toHaveLength(10);
	});

	test('SI-04: 10 Anfragen pro IP und Stunde, dann zu-viele', async () => {
		const d = baue();
		for (let i = 0; i < 10; i++) {
			expect(d.dienst.fordereMailCodeAn(`x${i}@example.org`, 'ip-7').annahme).toBe('ok');
		}
		expect(d.dienst.fordereMailCodeAn('x@example.org', 'ip-7').annahme).toBe('zu-viele');
		expect(d.dienst.fordereMailCodeAn('x@example.org', 'ip-8').annahme).toBe('ok');
	});

	test('gesperrtes Konto oder nicht aktives Mitglied → keine Mail', async () => {
		const d = baue();
		const gesperrt = await legeMitgliedAn(db, { gesperrt: true });
		const ausgetreten = await legeMitgliedAn(db, { status: 'ausgetreten' });
		await fordereAn(d, gesperrt.email, 'ip-9');
		await fordereAn(d, ausgetreten.email, 'ip-9');
		expect(d.post).toHaveLength(0);
		expect((await holeKonto(gesperrt.kontoId)).mailCodeHash).toBeNull();
		expect((await holeKonto(ausgetreten.kontoId)).mailCodeHash).toBeNull();
	});

	test('neuer Mail-Code ersetzt nur den alten Mail-Code', async () => {
		const d = baue();
		const { email, kontoId } = await legeMitgliedAn(db);
		const { code: brief } = await d.dienst.stelleBriefCodeAus(kontoId);
		await fordereAn(d, email);
		await fordereAn(d, email);
		expect(await d.dienst.loginMitMailCode(email, codeAus(d.post[0]), 'ip-10')).toEqual({
			ergebnis: 'falsch'
		});
		const k = await holeKonto(kontoId);
		expect(k.briefCodeHash).not.toBeNull();
		expect(k.briefCodeBenutztAm).toBeNull();
		expect((await d.dienst.loginMitBriefCode(brief, 'ip-10')).ergebnis).toBe('ok');
	});

	test('Login mit Mail-Code macht Brief-Code ungültig', async () => {
		const d = baue();
		const { email, kontoId } = await legeMitgliedAn(db);
		const { code: brief } = await d.dienst.stelleBriefCodeAus(kontoId);
		await fordereAn(d, email);
		expect((await d.dienst.loginMitMailCode(email, codeAus(d.post[0]), 'ip-12')).ergebnis).toBe(
			'ok'
		);
		expect(await d.dienst.loginMitBriefCode(brief, 'ip-12')).toEqual({
			ergebnis: 'benutzt',
			kontakt: 'kontakt@example.org'
		});
	});

	test('SI-03: nach 5 Fehlversuchen ist der Mail-Code ungültig', async () => {
		const d = baue();
		const { email, kontoId } = await legeMitgliedAn(db);
		await fordereAn(d, email);
		const code = codeAus(d.post[0]);
		const falsch = code === '000000' ? '111111' : '000000';
		for (let i = 0; i < 5; i++) {
			expect(await d.dienst.loginMitMailCode(email, falsch, `ip-13-${i}`)).toEqual({
				ergebnis: 'falsch'
			});
		}
		expect((await holeKonto(kontoId)).mailCodeFehlversuche).toBe(5);
		expect(await d.dienst.loginMitMailCode(email, code, 'ip-13-x')).toEqual({
			ergebnis: 'falsch'
		});
	});

	test('Mail-Code nach 15 Minuten abgelaufen → falsch', async () => {
		const d = baue();
		const { email } = await legeMitgliedAn(db);
		await fordereAn(d, email);
		d.zeit.t = new Date(start.getTime() + MAIL_CODE_GUELTIG_MS);
		expect(await d.dienst.loginMitMailCode(email, codeAus(d.post[0]), 'ip-14')).toEqual({
			ergebnis: 'falsch'
		});
	});

	test('Fehlversuche pro IP werden gezählt, danach zu-viele', async () => {
		const d = baue();
		for (let i = 0; i < 10; i++) {
			expect(await d.dienst.loginMitMailCode('niemand@example.org', '123456', 'ip-15')).toEqual({
				ergebnis: 'falsch'
			});
		}
		expect(await d.dienst.loginMitMailCode('niemand@example.org', '123456', 'ip-15')).toEqual({
			ergebnis: 'zu-viele'
		});
		expect(await d.dienst.loginMitMailCode(1, null, 'ip-16')).toEqual({ ergebnis: 'falsch' });
	});

	test('B-02: unbekannte Adresse und verbrauchter Code liefern beide falsch', async () => {
		const d = baue();
		const { email } = await legeMitgliedAn(db);
		await fordereAn(d, email);
		const code = codeAus(d.post[0]);
		await d.dienst.loginMitMailCode(email, code, 'ip-17');
		const verbraucht = await d.dienst.loginMitMailCode(email, code, 'ip-17');
		const unbekannt = await d.dienst.loginMitMailCode('niemand@example.org', code, 'ip-17');
		expect(verbraucht).toEqual({ ergebnis: 'falsch' });
		expect(unbekannt).toEqual(verbraucht);
	});

	test('SI-05: Versandfehler loggt nur eine feste Zeile', async () => {
		const fehler = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { email } = await legeMitgliedAn(db);
		const d = baue(async () => {
			throw new Error('smtp://user:pw@host ' + email);
		});
		const r = d.dienst.fordereMailCodeAn(email, 'ip-18');
		await expect(r.arbeit).resolves.toBeUndefined();
		expect(fehler.mock.calls).toEqual([['Code-Mail nicht versandt']]);
	});
});
