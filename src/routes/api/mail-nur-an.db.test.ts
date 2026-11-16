// Umleitung der Mails auf Test (SI-17, Charakterisierung vor Schritt 07 des Refactorings): Mit
// gesetztem `MAIL_NUR_AN` geht jede Mail über jeden Dienste-Einstieg nur an diese Adresse, und der
// Betreff nennt den ursprünglichen Empfänger. Geprüft über die echten Routen mit den echten
// Einstiegen, je Weg ein eigenes Mitglied; Attrappe ist nur der SMTP-Versand. Dazu hält der Test
// je Weg fest, welcher Versender ihn bedient: der mit Pool nur für die Mitteilungs-Verwaltung.
//
// Eigene Datei, weil die Einstiege `MAIL_NUR_AN` beim ersten Aufruf lesen und der Bremsen-Test es
// leer setzt. Eigene Datenbank, weil eine Mitteilung an den Verein an alle aktiven Mitglieder geht
// und beim Speichern alte Mitteilungen aller Bezüge löscht (FR-45).
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../tests/hilfen/anfrage.ts';
import {
	legeEigeneDatenbankAn,
	type EigeneDatenbank
} from '../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../tests/hilfen/mitglieder.ts';
import { turnierjahre } from '../../../tests/hilfen/turnierjahre.ts';
import { holeDb } from '../../lib/server/db/index.ts';
import { gespraech, mitglied, turnier } from '../../lib/server/db/schema.ts';
import { erstelleSitzung, pruefeSitzung } from '../../lib/server/login/sitzung.ts';
import { legeKategorieAn, legeTurnierAn, setzeStatus } from '../../lib/server/turnier/turniere.ts';
import { POST as loginCode } from './login/mail-code/+server.ts';
import { POST as zugangCode } from './admin/zugang/code/+server.ts';
import { POST as zugangBestaetigen } from './admin/zugang/+server.ts';
import { GET as mitgliedLesen, POST as mitgliedAendern } from './admin/mitglieder/[id]/+server.ts';
import { POST as emailAendern } from './profil/email/+server.ts';
import { POST as cmAnmelden } from './cm/kategorien/[id]/anmeldung/+server.ts';
import { POST as gespraechSchreiben } from './cm/[id]/gespraech/+server.ts';
import { POST as mitteilungSenden } from './admin/mitteilungen/senden/+server.ts';
import { POST as gespraechAntworten } from './admin/gespraeche/[id]/+server.ts';

type Mail = { to: string; subject: string; text: string; pool: boolean };

// Hält jede Mail fest, die über SMTP hinausginge, und ob ihr Versender mit Pool gebaut wurde.
const mails = vi.hoisted(() => [] as Mail[]);
vi.mock('nodemailer', async (original) => {
	const echt = await original<typeof import('nodemailer')>();
	const createTransport = (transport: unknown) => {
		const pool =
			typeof transport === 'object' &&
			transport !== null &&
			(transport as { pool?: unknown }).pool === true;
		return {
			sendMail: async (m: Omit<Mail, 'pool'>) => {
				mails.push({ to: m.to, subject: m.subject, text: m.text, pool });
				return {};
			}
		};
	};
	return { default: { ...echt.default, createTransport } };
});

const ZIEL = 'umleitung@example.org';
let eigene: EigeneDatenbank | undefined;

beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('mail_nur_an');
	vi.stubEnv('DATABASE_URL', eigene.url);
	vi.stubEnv('MYTCO_CODE_SCHLUESSEL', 'nur-lokal-nicht-fuer-produktion-0123456789abcdef');
	vi.stubEnv('MYTCO_SMTP_URL', 'smtp://127.0.0.1:1');
	vi.stubEnv('MYTCO_MAIL_ABSENDER', 'MyTCO <mytco@example.org>');
	vi.stubEnv('MYTCO_KONTAKT', 'kontakt@example.org');
	vi.stubEnv('MAIL_NUR_AN', ZIEL);
	// Ohne VAPID-Paar ist Push aus: Meldungen gehen per Mail (SI-22).
	vi.stubEnv('MYTCO_VAPID_OEFFENTLICH', '');
	vi.stubEnv('MYTCO_VAPID_PRIVAT', '');
});

afterAll(async () => {
	try {
		await holeDb().$client.end();
	} finally {
		vi.unstubAllEnvs();
		await eigene?.abbauen();
	}
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

// Sitzungen um 2026-11 wie in den übrigen Datenbanktests; die Routen rechnen in Echtzeit.
const start = new Date('2026-11-02T12:00:00Z');
let ipNummer = 0;
/** Jede Anfrage aus einer eigenen IP, damit keine Grenze je IP greift. */
const neueIp = () => `198.51.100.${++ipNummer}`;
// Viele Mails gehen nach der Antwort raus; Frist grosszügig für eine langsame CI.
const WARTEN = { timeout: 5000 };

/** Gehört die Mail zu dieser Adresse, umgeleitet oder nicht? */
const fuer = (adresse: string) => (m: Mail) =>
	m.to === adresse || m.subject.startsWith(`[Test für ${adresse}] `);

async function neuesMitglied(rollen: string[] = []) {
	const db = holeDb();
	const m = await legeMitgliedAn(db, { rollen });
	const kennung = await erstelleSitzung(db, m.kontoId, start);
	const konto = (await pruefeSitzung(db, kennung, start))!.konto;
	return { ...m, konto };
}
type Mitglied = Awaited<ReturnType<typeof neuesMitglied>>;

type Handler = (e: never) => Promise<Response>;
const rufe = (handler: unknown, opt: Parameters<typeof ereignis>[0]) =>
	(handler as Handler)(ereignis({ ip: neueIp(), ...opt }) as never);

/** Admin mit bestätigter Sitzung (SI-08); der Code kommt aus der festgehaltenen Mail. */
async function bestaetigterAdmin(rollen: string[]): Promise<Mitglied> {
	const a = await neuesMitglied(rollen);
	expect((await rufe(zugangCode, { body: {}, konto: a.konto })).status).toBe(202);
	await vi.waitFor(() => expect(mails.filter(fuer(a.email))).toHaveLength(1), WARTEN);
	const code = mails.filter(fuer(a.email))[0].text.slice(0, 6);
	expect((await rufe(zugangBestaetigen, { body: { code }, konto: a.konto })).status).toBe(200);
	return a;
}

// Eigene Turnierjahre dieser Datei (`tests/hilfen/turnierjahre.ts`), gemeinsame Test-Datenbank.
const naechstesJahr = turnierjahre(import.meta.url);

/** Offenes Turnier in einem freien Jahr mit einer Herren-Kategorie; Anmeldeschluss in der Zukunft. */
async function offenesTurnier(kontaktMitgliedId: number) {
	const db = holeDb();
	for (;;) {
		const jahr = naechstesJahr();
		const t = await legeTurnierAn(db, {
			jahr,
			name: `Clubmeisterschaft ${jahr}`,
			anmeldeschluss: `${jahr}-05-31`,
			nummern: []
		});
		if (t.ergebnis !== 'ok') continue;
		const k = await legeKategorieAn(db, t.id, {
			name: 'Herren R1–R5',
			geschlecht: 'herren',
			art: 'einzel',
			jahrgangVon: null,
			jahrgangBis: null,
			klassierungVon: 'R1',
			klassierungBis: 'R5',
			mindestsumme: null
		});
		if (k.ergebnis !== 'ok') throw new Error('Kategorie');
		expect(await setzeStatus(db, t.id, 'offen', new Date())).toBe('ok');
		await db.update(turnier).set({ kontaktMitgliedId }).where(eq(turnier.id, t.id));
		return { turnierId: t.id, kategorieId: k.id };
	}
}

/**
 * Führt einen Weg aus und gibt die Mails zurück, die er ausgelöst hat; wartet, bis für jede
 * erwartete Adresse mindestens eine da ist (sonst wäre der Test leer grün).
 */
async function weg(adressen: string[], ausloesen: () => Promise<void>): Promise<Mail[]> {
	const vorher = mails.length;
	await ausloesen();
	await vi.waitFor(() => {
		for (const a of adressen) expect(mails.slice(vorher).filter(fuer(a)).length).toBeGreaterThan(0);
	}, WARTEN);
	return mails.slice(vorher);
}

/** Jede Mail ging an `MAIL_NUR_AN`, der Betreff nennt den Empfänger, Versender wie angegeben. */
function pruefeUmgeleitet(neu: Mail[], adressen: string[], pool: boolean) {
	expect(neu.length).toBeGreaterThan(0);
	for (const m of neu) {
		expect(m.to).toBe(ZIEL);
		expect(m.subject).toMatch(/^\[Test für [^\s\]]+@[^\s\]]+\] \S/);
		expect(m.pool).toBe(pool);
	}
	for (const a of adressen) {
		expect(neu.some((m) => m.subject.startsWith(`[Test für ${a}] `))).toBe(true);
	}
}

describe('SI-17: MAIL_NUR_AN leitet jede Mail über jeden Einstieg um', () => {
	test('Login: der Login-Code (ohne Pool)', async () => {
		const m = await neuesMitglied();
		const neu = await weg([m.email], async () => {
			expect((await rufe(loginCode, { body: { email: m.email } })).status).toBe(202);
		});
		pruefeUmgeleitet(neu, [m.email], false);
	});

	test('Verwaltung: der Code zum Bestätigen der Sitzung (ohne Pool)', async () => {
		const a = await neuesMitglied(['mytco']);
		const neu = await weg([a.email], async () => {
			expect((await rufe(zugangCode, { body: {}, konto: a.konto })).status).toBe(202);
		});
		pruefeUmgeleitet(neu, [a.email], false);
	});

	test('Verwaltung: der Hinweis an die alte Adresse (SI-09, ohne Pool)', async () => {
		const admin = await bestaetigterAdmin(['mitglieder']);
		const m = await neuesMitglied();
		const params = { id: String(m.mitgliedId) };
		const geladen = await rufe(mitgliedLesen, { method: 'GET', params, konto: admin.konto });
		const { angaben } = (await geladen.json()) as { angaben: Record<string, unknown> };
		const body = { ...angaben, email: `weg-${crypto.randomUUID()}@example.org`, vorher: angaben };
		const neu = await weg([m.email], async () => {
			expect((await rufe(mitgliedAendern, { body, params, konto: admin.konto })).status).toBe(200);
		});
		pruefeUmgeleitet(neu, [m.email], false);
	});

	test('Profil: die zwei Codes beim Wechsel der Adresse (SI-09, ohne Pool)', async () => {
		const m = await neuesMitglied();
		const neuAdresse = `neu-${crypto.randomUUID()}@example.org`;
		const neu = await weg([m.email, neuAdresse], async () => {
			const r = await rufe(emailAendern, { body: { email: neuAdresse }, konto: m.konto });
			expect(r.status).toBe(202);
		});
		pruefeUmgeleitet(neu, [m.email, neuAdresse], false);
	});

	test('CM: die Bestätigung der Anmeldung (ohne Pool)', async () => {
		const kontakt = await neuesMitglied(['cm']);
		const { kategorieId } = await offenesTurnier(kontakt.mitgliedId);
		const m = await neuesMitglied();
		await holeDb()
			.update(mitglied)
			.set({ geschlecht: 'm', jahrgang: 1990, klassierung: 'R3' })
			.where(eq(mitglied.id, m.mitgliedId));
		const neu = await weg([m.email], async () => {
			const params = { id: String(kategorieId) };
			expect((await rufe(cmAnmelden, { body: {}, params, konto: m.konto })).status).toBe(200);
		});
		pruefeUmgeleitet(neu, [m.email], false);
	});

	test('CM: die Meldung an die Kontaktperson, vom Mitglied ausgelöst (FR-53, ohne Pool)', async () => {
		const kontakt = await neuesMitglied(['cm']);
		const { turnierId } = await offenesTurnier(kontakt.mitgliedId);
		const m = await neuesMitglied();
		const neu = await weg([kontakt.email], async () => {
			const params = { id: String(turnierId) };
			const r = await rufe(gespraechSchreiben, { body: { text: 'Frage' }, params, konto: m.konto });
			expect(r.status).toBe(200);
		});
		pruefeUmgeleitet(neu, [kontakt.email], false);
	});

	test('Mitteilungs-Verwaltung: die Mitteilung an den Verein (FR-44, mit Pool)', async () => {
		const admin = await bestaetigterAdmin(['mitglieder']);
		const m = await neuesMitglied();
		const body = {
			titel: 'Platzsperre',
			text: 'Erfunden.',
			auswahl: 'alle',
			weg: 'push-sonst-mail'
		};
		const neu = await weg([m.email, admin.email], async () => {
			expect((await rufe(mitteilungSenden, { body, konto: admin.konto })).status).toBe(201);
		});
		pruefeUmgeleitet(neu, [m.email, admin.email], true);
	});

	test('Mitteilungs-Verwaltung: die Meldung ans Mitglied, von der Verwaltung ausgelöst (FR-53, mit Pool)', async () => {
		const kontakt = await bestaetigterAdmin(['cm']);
		const { turnierId } = await offenesTurnier(kontakt.mitgliedId);
		const m = await neuesMitglied();
		const params = { id: String(turnierId) };
		const r = await rufe(gespraechSchreiben, { body: { text: 'Frage' }, params, konto: m.konto });
		expect(r.status).toBe(200);
		// Die Meldung an die Kontaktperson (eben ausgelöst, Weg aus dem sechsten Test) muss draussen
		// sein, bevor gezählt wird. Fenster: `weg` zählt jede Mail ab dem Auslösen. Ein Nachzügler der
		// Mitteilung aus dem vorigen Test fiele hinein und liefe wie diese Meldung über den Pool, würde
		// also nicht auffallen; die Route der Mitteilung wartet aber den Versand ab, bevor sie antwortet.
		await vi.waitFor(() => expect(mails.filter(fuer(kontakt.email))).toHaveLength(2), WARTEN);
		const [g] = await holeDb()
			.select({ id: gespraech.id })
			.from(gespraech)
			.where(eq(gespraech.turnierId, turnierId));
		const neu = await weg([m.email], async () => {
			const antwort = await rufe(gespraechAntworten, {
				body: { text: 'Antwort', nachLetzter: 0 },
				params: { id: String(g.id) },
				konto: kontakt.konto
			});
			expect(antwort.status).toBe(200);
		});
		pruefeUmgeleitet(neu, [m.email], true);
	});
});
