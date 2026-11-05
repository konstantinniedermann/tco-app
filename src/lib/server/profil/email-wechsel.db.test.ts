import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, test, vi } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { aenderung, mitglied } from '../db/schema.ts';
import { erstelleBremsen } from '../login/bremse.ts';
import { MAIL_CODE_GUELTIG_MS } from '../login/codes.ts';
import { erstelleLoginDienst } from '../login/dienst.ts';
import { baueAdresseVergebenMail, baueWechselCodeMail } from '../login/mail.ts';
import { erstelleSitzung, pruefeSitzung } from '../login/sitzung.ts';
import { erstelleEmailWechselDienst } from './email-wechsel.ts';

const db = erstelleDb(process.env.DATABASE_URL!);
afterAll(async () => {
	await db.$client.end();
});

const SCHLUESSEL = 'x'.repeat(40);
const KONTAKT = 'kontakt@example.org';
const start = new Date('2026-11-05T12:00:00Z');

type Nachricht = { an: string; betreff: string; text: string };

function baue() {
	const zeit = { t: start };
	const post: Nachricht[] = [];
	const bremsen = erstelleBremsen(() => zeit.t.getTime());
	const mailer = async (n: Nachricht) => {
		post.push(n);
	};
	const abh = { db, schluessel: SCHLUESSEL, kontakt: KONTAKT, mailer, bremsen };
	const dienst = erstelleEmailWechselDienst({ ...abh, jetzt: () => zeit.t });
	const login = erstelleLoginDienst({ ...abh, jetzt: () => zeit.t });
	return { dienst, login, zeit, post, bremsen };
}

async function lea() {
	const m = await legeMitgliedAn(db, { vorname: 'Lea', nachname: 'Beispiel' });
	const kennung = await erstelleSitzung(db, m.kontoId, start);
	const konto = (await pruefeSitzung(db, kennung, start))!.konto;
	return { ...m, konto };
}

const neueAdresse = () => `lea.neu-${crypto.randomUUID()}@example.org`;
const codeAus = (n: Nachricht) => n.text.slice(0, 6);
const falscherCode = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, '0');
const emailVon = async (id: number) =>
	(await db.select({ email: mitglied.email }).from(mitglied).where(eq(mitglied.id, id)))[0].email;

/** Startet einen Wechsel und liefert die beiden Code-Mails (alt, neu). */
async function starte(z: ReturnType<typeof baue>, l: Awaited<ReturnType<typeof lea>>, neu: string) {
	const vorher = z.post.length;
	const r = await z.dienst.starte(l.konto, neu, 'ip-1');
	expect(r.annahme).toBe('ok');
	await r.arbeit;
	const mails = z.post.slice(vorher);
	const alt = mails.find((n) => n.an === l.email)!;
	const neuMail = mails.find((n) => n.an === neu)!;
	return { alt: codeAus(alt), neu: neuMail ? codeAus(neuMail) : null, mails };
}

describe('E-Mail-Wechsel', () => {
	test('SI-09: Wechsel braucht Code der alten und der neuen Adresse', async () => {
		const z = baue();
		const l = await lea();
		const neu = neueAdresse();
		const codes = await starte(z, l, neu);
		expect(codes.mails).toHaveLength(2);
		expect(codes.mails.find((n) => n.an === l.email)).toEqual({
			an: l.email,
			...baueWechselCodeMail(codes.alt, 'alt', KONTAKT)
		});
		expect(codes.mails.find((n) => n.an === neu)).toEqual({
			an: neu,
			...baueWechselCodeMail(codes.neu!, 'neu', KONTAKT)
		});

		expect(await z.dienst.bestaetige(l.konto, codes.alt, codes.neu)).toBe('ok');
		const [m] = await db.select().from(mitglied).where(eq(mitglied.id, l.mitgliedId));
		expect(m.email).toBe(neu);
		expect(m.fairgateOffenSeit).toEqual(start);
		const v = await db.select().from(aenderung).where(eq(aenderung.mitgliedId, l.mitgliedId));
		expect(v).toHaveLength(1);
		expect(v[0]).toMatchObject({
			urheberArt: 'mitglied',
			urheberMitgliedId: l.mitgliedId,
			aktion: 'feld-geaendert',
			detail: 'email'
		});
		// Einmal eingelöst, gilt der Wechsel nicht nochmals.
		expect(await z.dienst.bestaetige(l.konto, codes.alt, codes.neu)).toBe('falsch');
	});

	test('SI-09: nur ein richtiger Code genügt nicht', async () => {
		const z = baue();
		const l = await lea();
		const codes = await starte(z, l, neueAdresse());
		expect(await z.dienst.bestaetige(l.konto, codes.alt, falscherCode(codes.neu!))).toBe('falsch');
		expect(await z.dienst.bestaetige(l.konto, falscherCode(codes.alt), codes.neu)).toBe('falsch');
		expect(await z.dienst.bestaetige(l.konto, codes.alt, undefined)).toBe('falsch');
		expect(await emailVon(l.mitgliedId)).toBe(l.email);
	});

	test('SI-09: vertauschte Codes sind falsch', async () => {
		const z = baue();
		const l = await lea();
		const codes = await starte(z, l, neueAdresse());
		expect(await z.dienst.bestaetige(l.konto, codes.neu, codes.alt)).toBe('falsch');
		expect(await emailVon(l.mitgliedId)).toBe(l.email);
		// Der Fehlversuch zählt: nach vier weiteren ist der Wechsel weg.
		for (let i = 0; i < 4; i++) {
			expect(await z.dienst.bestaetige(l.konto, codes.neu, codes.alt)).toBe('falsch');
		}
		expect(await z.dienst.bestaetige(l.konto, codes.alt, codes.neu)).toBe('falsch');
		expect(await emailVon(l.mitgliedId)).toBe(l.email);
	});

	test('SI-09: nach 5 Fehlversuchen ist der Wechsel ungültig', async () => {
		const z = baue();
		const l = await lea();
		const codes = await starte(z, l, neueAdresse());
		for (let i = 0; i < 5; i++) {
			expect(await z.dienst.bestaetige(l.konto, falscherCode(codes.alt), codes.neu)).toBe('falsch');
		}
		expect(await z.dienst.bestaetige(l.konto, codes.alt, codes.neu)).toBe('falsch');
		expect(await emailVon(l.mitgliedId)).toBe(l.email);
	});

	test('SI-09: der 5. Versuch darf noch stimmen', async () => {
		const z = baue();
		const l = await lea();
		const neu = neueAdresse();
		const codes = await starte(z, l, neu);
		for (let i = 0; i < 4; i++) {
			expect(await z.dienst.bestaetige(l.konto, codes.alt, falscherCode(codes.neu!))).toBe(
				'falsch'
			);
		}
		expect(await z.dienst.bestaetige(l.konto, codes.alt, codes.neu)).toBe('ok');
		expect(await emailVon(l.mitgliedId)).toBe(neu);
	});

	test('SI-09: zwei gleichzeitige Bestätigungen lösen nur einmal ein', async () => {
		const z = baue();
		const l = await lea();
		const codes = await starte(z, l, neueAdresse());
		const r = await Promise.all([
			z.dienst.bestaetige(l.konto, codes.alt, codes.neu),
			z.dienst.bestaetige(l.konto, codes.alt, codes.neu)
		]);
		expect(r.sort()).toEqual(['falsch', 'ok']);
		const v = await db.select().from(aenderung).where(eq(aenderung.mitgliedId, l.mitgliedId));
		expect(v).toHaveLength(1);
	});

	test('SI-09: nach 15 Minuten abgelaufen', async () => {
		const z = baue();
		const l = await lea();
		const codes = await starte(z, l, neueAdresse());
		z.zeit.t = new Date(start.getTime() + MAIL_CODE_GUELTIG_MS + 1);
		expect(await z.dienst.bestaetige(l.konto, codes.alt, codes.neu)).toBe('falsch');
		expect(await emailVon(l.mitgliedId)).toBe(l.email);
	});

	test('SI-09: ein neuer Wechsel ersetzt den angefangenen', async () => {
		const z = baue();
		const l = await lea();
		const erste = await starte(z, l, neueAdresse());
		const zweiteAdresse = neueAdresse();
		const zweite = await starte(z, l, zweiteAdresse);
		expect(await z.dienst.bestaetige(l.konto, erste.alt, erste.neu)).toBe('falsch');
		expect(await z.dienst.bestaetige(l.konto, zweite.alt, zweite.neu)).toBe('ok');
		expect(await emailVon(l.mitgliedId)).toBe(zweiteAdresse);
	});

	test('SI-09: gleiche Adresse anders geschrieben', async () => {
		const z = baue();
		const l = await lea();
		const anders = `  ${l.email.toUpperCase()} `;
		const r = await z.dienst.starte(l.konto, anders, 'ip-1');
		expect(r.annahme).toBe('gleich');
		await r.arbeit;
		expect(z.post).toHaveLength(0);
		// Nichts gezählt: drei echte Wechsel sind danach noch möglich.
		for (let i = 0; i < 3; i++) await starte(z, l, neueAdresse());
	});

	test('SI-09: ungültige Adresse', async () => {
		const z = baue();
		const l = await lea();
		for (const eingabe of ['', 'keine-adresse', 'a@example..org', 42, null, undefined]) {
			const r = await z.dienst.starte(l.konto, eingabe, 'ip-1');
			expect(r.annahme).toBe('ungueltig');
			await r.arbeit;
		}
		expect(z.post).toHaveLength(0);
	});

	test('SI-09: die neue Adresse wird wie beim Admin getrimmt und klein gespeichert', async () => {
		const z = baue();
		const l = await lea();
		const neu = neueAdresse();
		const r = await z.dienst.starte(l.konto, ` ${neu.toUpperCase()} `, 'ip-1');
		expect(r.annahme).toBe('ok');
		await r.arbeit;
		const alt = z.post.find((n) => n.an === l.email)!;
		const neuMail = z.post.find((n) => n.an === neu)!;
		expect(await z.dienst.bestaetige(l.konto, codeAus(alt), codeAus(neuMail))).toBe('ok');
		expect(await emailVon(l.mitgliedId)).toBe(neu);
	});

	test('SI-04: vergebene Adresse bekommt Hinweis statt Code, Antwort gleich', async () => {
		const z = baue();
		const l = await lea();
		const andere = await legeMitgliedAn(db, { vorname: 'Noah', nachname: 'Erfunden' });
		const r = await z.dienst.starte(l.konto, andere.email.toUpperCase(), 'ip-1');
		expect(r.annahme).toBe('ok');
		await r.arbeit;
		expect(z.post).toHaveLength(2);
		const alt = z.post.find((n) => n.an === l.email)!;
		const hinweis = z.post.find((n) => n.an === andere.email)!;
		expect(hinweis).toEqual({ an: andere.email, ...baueAdresseVergebenMail(KONTAKT) });
		expect(hinweis.text).not.toMatch(/\d{6}/);
		// Auch ein erratener Code der neuen Adresse hilft nicht.
		for (const neuCode of ['000000', '123456', '999999']) {
			expect(await z.dienst.bestaetige(l.konto, codeAus(alt), neuCode)).toBe('falsch');
		}
		expect(await emailVon(l.mitgliedId)).toBe(l.email);
		expect(await emailVon(andere.mitgliedId)).toBe(andere.email);
	});

	test('SI-09: Grenze pro Konto 3 pro Stunde', async () => {
		const z = baue();
		const l = await lea();
		// Vor jedem Versuch eine andere bisherige Adresse, IP und neue Adresse: nur die Konto-Grenze greift.
		const frischeAdresse = () =>
			db.update(mitglied).set({ email: neueAdresse() }).where(eq(mitglied.id, l.mitgliedId));
		for (let i = 0; i < 3; i++) {
			await frischeAdresse();
			const r = await z.dienst.starte(l.konto, neueAdresse(), `ip-${i}`);
			expect(r.annahme).toBe('ok');
			await r.arbeit;
		}
		await frischeAdresse();
		const r = await z.dienst.starte(l.konto, neueAdresse(), 'ip-9');
		expect(r.annahme).toBe('zu-viele');
		await r.arbeit;
		expect(z.post).toHaveLength(6);
	});

	test('SI-09: Grenze der bisherigen Adresse erreicht → zu viele', async () => {
		const z = baue();
		const l = await lea();
		for (let i = 0; i < 3; i++) await (await z.login.fordereMailCodeAn(l.email, 'ip-2')).arbeit;
		const r = await z.dienst.starte(l.konto, neueAdresse(), 'ip-1');
		expect(r.annahme).toBe('zu-viele');
	});

	test('SI-09: Grenze pro IP', async () => {
		const z = baue();
		for (let i = 0; i < 10; i++) z.bremsen.anfragenProIp.zaehle('ip-1');
		const l = await lea();
		const r = await z.dienst.starte(l.konto, neueAdresse(), 'ip-1');
		expect(r.annahme).toBe('zu-viele');
	});

	test('SI-04: Grenze der neuen Adresse erreicht: keine Mail, Antwort ok', async () => {
		const z = baue();
		const l = await lea();
		const neu = neueAdresse();
		// Drei Login-Mail-Anfragen an die neue Adresse (ohne Konto, also ohne Versand) zählen trotzdem.
		for (let i = 0; i < 3; i++) await z.login.fordereMailCodeAn(neu, 'ip-2').arbeit;
		const r = await z.dienst.starte(l.konto, neu, 'ip-1');
		expect(r.annahme).toBe('ok');
		await r.arbeit;
		expect(z.post.map((n) => n.an)).toEqual([l.email]);
	});

	test('SI-09: Admin ändert die Adresse während des Wechsels', async () => {
		const z = baue();
		const l = await lea();
		const codes = await starte(z, l, neueAdresse());
		const vomAdmin = neueAdresse();
		await db.update(mitglied).set({ email: vomAdmin }).where(eq(mitglied.id, l.mitgliedId));
		expect(await z.dienst.bestaetige(l.konto, codes.alt, codes.neu)).toBe('falsch');
		expect(await emailVon(l.mitgliedId)).toBe(vomAdmin);
	});

	test('SI-09: neue Adresse wird inzwischen anderweitig vergeben (Wettlauf) → falsch', async () => {
		const z = baue();
		const l = await lea();
		const neu = neueAdresse();
		const codes = await starte(z, l, neu);
		const andere = await legeMitgliedAn(db, { vorname: 'Mia', nachname: 'Erfunden' });
		await db.update(mitglied).set({ email: neu }).where(eq(mitglied.id, andere.mitgliedId));
		expect(await z.dienst.bestaetige(l.konto, codes.alt, codes.neu)).toBe('falsch');
		expect(await emailVon(l.mitgliedId)).toBe(l.email);
	});

	test('A-KONTO-01: Prüfung der vergebenen Adresse scheitert → feste Logzeile, Bestätigung falsch', async () => {
		const zeit = { t: start };
		const post: Nachricht[] = [];
		let selects = 0;
		// Das erste select (Mitglied laden) geht durch, das zweite (Adresse vergeben?) wirft.
		const kaputt = new Proxy(db, {
			get(ziel, name) {
				if (name === 'select') {
					return (...a: unknown[]) => {
						selects += 1;
						if (selects >= 2) throw new Error('db an lea@example.org kaputt');
						return (ziel.select as (...b: unknown[]) => unknown)(...a);
					};
				}
				return Reflect.get(ziel, name, ziel);
			}
		});
		const fehler: unknown[][] = [];
		const spaeher = vi.spyOn(console, 'error').mockImplementation((...a) => void fehler.push(a));
		try {
			const dienst = erstelleEmailWechselDienst({
				db: kaputt,
				schluessel: SCHLUESSEL,
				kontakt: KONTAKT,
				mailer: async (n) => void post.push(n),
				bremsen: erstelleBremsen(() => zeit.t.getTime()),
				jetzt: () => zeit.t
			});
			const l = await lea();
			const r = await dienst.starte(l.konto, neueAdresse(), 'ip-1');
			expect(r.annahme).toBe('ok');
			await r.arbeit;
			expect(selects).toBe(2);
			expect(post).toHaveLength(0);
			expect(fehler).toEqual([['Wechsel-Prüfung nicht möglich']]);
			// Der Eintrag bleibt «vergeben»: auch beliebige Codes bestätigen nichts.
			expect(await dienst.bestaetige(l.konto, '123456', '654321')).toBe('falsch');
			expect(await emailVon(l.mitgliedId)).toBe(l.email);
		} finally {
			spaeher.mockRestore();
		}
	});

	test('SI-05: Mail-Fehler nur als feste Logzeile', async () => {
		const zeit = { t: start };
		const fehler: unknown[][] = [];
		const original = console.error;
		console.error = (...a: unknown[]) => fehler.push(a);
		try {
			const dienst = erstelleEmailWechselDienst({
				db,
				schluessel: SCHLUESSEL,
				kontakt: KONTAKT,
				mailer: async () => {
					throw new Error('smtp an lea@example.org kaputt');
				},
				bremsen: erstelleBremsen(() => zeit.t.getTime()),
				jetzt: () => zeit.t
			});
			const l = await lea();
			const r = await dienst.starte(l.konto, neueAdresse(), 'ip-1');
			expect(r.annahme).toBe('ok');
			await r.arbeit;
		} finally {
			console.error = original;
		}
		expect(fehler).toEqual([['Wechsel-Mail nicht versandt'], ['Wechsel-Mail nicht versandt']]);
	});
});
