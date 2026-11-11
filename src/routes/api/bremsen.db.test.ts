// Geteilte Bremsen (Vertrag, Schritt 03 des Refactorings): Die Grenzen je Adresse und je IP zählen
// über alle Dienste-Einstiege zusammen (SI-04, SI-09). Geprüft wird die Wirkung über die echten
// Routen mit den echten Einstiegen, nicht die Identität eines Objekts: So bleibt der Test grün, wie
// auch immer der Zusammenbau der Dienste aussieht (Schritt 07), und wird rot, sobald ein Einstieg
// eigene Bremsen bekommt. Attrappe ist nur der SMTP-Versand.
//
// Nicht prüfbar, weil ohne Wirkung: Die Fehlergrenzen für Passkey, Brief und Mail-Code nutzt je nur
// ein Dienst, und die Dienste der Mitteilungs-Verwaltung erreichen die Bremsen über keine Route.
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../tests/hilfen/anfrage.ts';
import { legeMitgliedAn } from '../../../tests/hilfen/mitglieder.ts';
import { holeDb } from '../../lib/server/db/index.ts';
import { erstelleSitzung, pruefeSitzung } from '../../lib/server/login/sitzung.ts';
import { POST as loginCode } from './login/mail-code/+server.ts';
import { POST as zugangCode } from './admin/zugang/code/+server.ts';
import { POST as zugangBestaetigen } from './admin/zugang/+server.ts';
import { GET as mitgliedLesen, POST as mitgliedAendern } from './admin/mitglieder/[id]/+server.ts';
import { POST as emailAendern } from './profil/email/+server.ts';

// Hält jede Mail fest, die über SMTP hinausginge.
const mails = vi.hoisted(() => [] as { to: string; text: string }[]);
vi.mock('nodemailer', async (original) => {
	const echt = await original<typeof import('nodemailer')>();
	const createTransport = () => ({
		sendMail: async (m: { to: string; text: string }) => {
			mails.push(m);
			return {};
		}
	});
	return { default: { ...echt.default, createTransport } };
});

beforeAll(() => {
	vi.stubEnv('MYTCO_CODE_SCHLUESSEL', 'nur-lokal-nicht-fuer-produktion-0123456789abcdef');
	vi.stubEnv('MYTCO_SMTP_URL', 'smtp://127.0.0.1:1');
	vi.stubEnv('MYTCO_MAIL_ABSENDER', 'MyTCO <mytco@example.org>');
	vi.stubEnv('MYTCO_KONTAKT', 'kontakt@example.org');
	vi.stubEnv('MAIL_NUR_AN', '');
	vi.stubEnv('MYTCO_VAPID_OEFFENTLICH', '');
	vi.stubEnv('MYTCO_VAPID_PRIVAT', '');
});

afterAll(async () => {
	vi.unstubAllEnvs();
	await holeDb().$client.end();
});

const logs = [
	vi.spyOn(console, 'error').mockImplementation(() => {}),
	vi.spyOn(console, 'warn').mockImplementation(() => {}),
	vi.spyOn(console, 'log').mockImplementation(() => {})
];
// SI-05: Auch hier wird nichts geloggt (ein Mailfehler hiesse «Code-Mail nicht versandt»).
afterEach(() => {
	try {
		for (const l of logs) expect(l).not.toHaveBeenCalled();
	} finally {
		for (const l of logs) l.mockClear();
	}
});

// Sitzungen um 2026-11 wie in den übrigen Datenbanktests; die Bremsen zählen in Echtzeit.
const start = new Date('2026-11-02T12:00:00Z');
let ipNummer = 0;
/** Jede Anfrage aus einer eigenen IP, damit nur die Grenze der Adresse greift. */
const neueIp = () => `198.51.100.${++ipNummer}`;
const mailsAn = (adresse: string) => mails.filter((m) => m.to === adresse);

async function mitglied(rollen: string[] = []) {
	const m = await legeMitgliedAn(holeDb(), { rollen });
	const kennung = await erstelleSitzung(holeDb(), m.kontoId, start);
	const konto = (await pruefeSitzung(holeDb(), kennung, start))!.konto;
	return { ...m, konto };
}

type Mitglied = Awaited<ReturnType<typeof mitglied>>;
type Handler = (e: never) => Promise<Response>;
const rufe = (handler: unknown, opt: Parameters<typeof ereignis>[0]) =>
	(handler as Handler)(ereignis({ ip: neueIp(), ...opt }) as never);

const verbraucher = {
	/** Login: Code an die Adresse. Die Antwort ist immer 202 (SI-04). */
	login: async (m: Mitglied) => {
		expect((await rufe(loginCode, { body: { email: m.email } })).status).toBe(202);
	},
	/** Verwaltung: Code zum Bestätigen der Sitzung an die eigene Adresse. */
	verwaltung: async (m: Mitglied) => {
		expect((await rufe(zugangCode, { body: {}, konto: m.konto })).status).toBe(202);
	},
	/** Profil: Wechsel der eigenen Adresse; zählt bei der bisherigen Adresse. */
	profil: async (m: Mitglied) => {
		const neu = { email: `neu-${crypto.randomUUID()}@example.org` };
		expect((await rufe(emailAendern, { body: neu, konto: m.konto })).status).toBe(202);
	}
};

const pruefer = {
	verwaltung: async (m: Mitglied) => (await rufe(zugangCode, { body: {}, konto: m.konto })).status,
	profil: async (m: Mitglied) => {
		const neu = { email: `neu-${crypto.randomUUID()}@example.org` };
		return (await rufe(emailAendern, { body: neu, konto: m.konto })).status;
	}
};

describe('Bremsen über alle Dienste-Einstiege', () => {
	// Die Grenze je Adresse liegt bei 3 Mails pro Stunde (SI-04).
	const paare = [
		['login', 'verwaltung'],
		['login', 'profil'],
		['verwaltung', 'profil'],
		['profil', 'verwaltung']
	] as const;

	test.each(paare)(
		'SI-04: drei Mails über %s schöpfen die Adress-Grenze auch für %s aus',
		async (von, fuer) => {
			const m = await mitglied(['mytco']);
			for (let i = 0; i < 3; i++) await verbraucher[von](m);
			expect(await pruefer[fuer](m)).toBe(429);
			// Alle drei Mails sind wirklich gegangen; die Prüfung danach hat keine ausgelöst.
			await vi.waitFor(() => expect(mailsAn(m.email)).toHaveLength(3));
		}
	);

	test('SI-04: Anfragen je IP zählen für Login-Code und Wechsel der Adresse zusammen', async () => {
		const ip = neueIp();
		for (let i = 0; i < 10; i++) {
			const email = `niemand-${crypto.randomUUID()}@example.org`;
			expect((await rufe(loginCode, { body: { email }, ip })).status).toBe(202);
		}
		const m = await mitglied();
		const neu = { email: `neu-${crypto.randomUUID()}@example.org` };
		expect((await rufe(emailAendern, { body: neu, konto: m.konto, ip })).status).toBe(429);
	});

	test('SI-09: der Hinweis an die alte Adresse zählt zur Adress-Grenze von Login und Profil', async () => {
		// Ein bestätigter Mitglieder-Admin ändert die Adresse eines Mitglieds: Hinweis an die alte.
		const admin = await mitglied(['mitglieder']);
		expect((await rufe(zugangCode, { body: {}, konto: admin.konto })).status).toBe(202);
		await vi.waitFor(() => expect(mailsAn(admin.email)).toHaveLength(1));
		const code = mailsAn(admin.email)[0].text.slice(0, 6);
		expect((await rufe(zugangBestaetigen, { body: { code }, konto: admin.konto })).status).toBe(
			200
		);
		const m = await mitglied();
		const alt = m.email;
		const params = { id: String(m.mitgliedId) };
		const geladen = await rufe(mitgliedLesen, { method: 'GET', params, konto: admin.konto });
		const { angaben } = (await geladen.json()) as { angaben: Record<string, unknown> };
		const body = { ...angaben, email: `weg-${crypto.randomUUID()}@example.org`, vorher: angaben };
		expect((await rufe(mitgliedAendern, { body, params, konto: admin.konto })).status).toBe(200);
		await vi.waitFor(() => expect(mailsAn(alt)).toHaveLength(1));
		// Zwei Login-Codes dazu: Die alte Adresse hat ihre drei Mails (die Codes gehen an niemanden,
		// weil die Adresse keinem Konto mehr gehört, zählen aber).
		for (let i = 0; i < 2; i++) {
			expect((await rufe(loginCode, { body: { email: alt } })).status).toBe(202);
		}
		// Ein anderes Mitglied wechselt auf die alte Adresse: Der Code an die neue Adresse fällt weg,
		// der an die bisherige geht (beide Mails entstehen im selben Schritt).
		const n = await mitglied();
		expect((await rufe(emailAendern, { body: { email: alt }, konto: n.konto })).status).toBe(202);
		await vi.waitFor(() => expect(mailsAn(n.email)).toHaveLength(1));
		expect(mailsAn(alt)).toHaveLength(1);
	});
});
