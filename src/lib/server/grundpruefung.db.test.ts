// Grundprüfung über alle Listen der Schnittstellen (Vertrag, Schritt 03 des Refactorings):
// Ohne Sitzung antwortet jede Schnittstelle der Mitglieder 401, und jede schreibende Schnittstelle
// (Mitglieder und Verwaltung) weist eine Anfrage ohne JSON mit 415 ab, auch ohne Sitzung (Format vor
// Sitzung, festgehalten vor Schritt 06). Jede Schnittstelle der Verwaltung antwortet ohne Sitzung
// 401, ohne Rolle 403 `kein-admin` und unbestätigt 403 `unbestaetigt` (festgehalten vor Schritt 09,
// über alle Listen aus `tests/hilfen/verwaltungs-listen.ts`). Die Tests halten das heutige
// Verhalten fest; Abweichungen von der Regel stehen unten als benannte Ausnahmen, je Erwartung.
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../tests/hilfen/anfrage.ts';
import { legeMitgliedAn } from '../../../tests/hilfen/mitglieder.ts';
import { testPruefer } from '../../../tests/hilfen/passkey-pruefer.ts';
import { VERWALTUNGS_LISTEN } from '../../../tests/hilfen/verwaltungs-listen.ts';
import type { AdminDienste } from './admin/rechte.ts';
import { erstelleZugangDienst } from './admin/zugang.ts';
import { ANLASS_SCHNITTSTELLEN } from './anlass/schnittstellen.ts';
import type { AnlassDienste } from './anlass/typen.ts';
import { CM_SCHNITTSTELLEN } from './cm/schnittstellen.ts';
import type { CmDienste } from './cm/typen.ts';
import { erstelleDb } from './db/index.ts';
import { GESPRAECH_SCHNITTSTELLEN } from './gespraech/schnittstellen.ts';
import { erstelleBremsen } from './login/bremse.ts';
import { ChallengeSpeicher } from './login/challenge.ts';
import { PASSKEY_SCHNITTSTELLEN } from './login/passkey-schnittstellen.ts';
import { erstellePasskeyDienst, type PasskeyDienst } from './login/passkey.ts';
import { erstelleSitzung, pruefeSitzung } from './login/sitzung.ts';
import { MITTEILUNG_SCHNITTSTELLEN } from './mitteilung/schnittstellen.ts';
import type { MitteilungAdminDienste, MitteilungDienste } from './mitteilung/typen.ts';
import { erstelleEmailWechselDienst } from './profil/email-wechsel.ts';
import { PROFIL_SCHNITTSTELLEN } from './profil/schnittstellen.ts';
import type { ProfilDienste } from './profil/typen.ts';

const db = erstelleDb(process.env.DATABASE_URL!);
afterAll(async () => {
	await db.$client.end();
});

const logs = [
	vi.spyOn(console, 'error').mockImplementation(() => {}),
	vi.spyOn(console, 'warn').mockImplementation(() => {}),
	vi.spyOn(console, 'log').mockImplementation(() => {})
];
// SI-05: Auch die Grundprüfung loggt nichts.
afterEach(() => {
	try {
		for (const l of logs) expect(l).not.toHaveBeenCalled();
	} finally {
		for (const l of logs) l.mockClear();
	}
});

// Sitzungen mit derselben Zeit wie in den übrigen Datenbanktests (2026-11), nie mit einem
// Datum weit in der Zukunft: Ein Login räumt in der gemeinsamen Test-Datenbank alle Sitzungen weg,
// die von seiner Zeit aus ein Jahr nicht genutzt wurden, also auch die paralleler Testdateien.
const start = new Date('2026-11-02T12:00:00Z');

type Anfrage = ReturnType<typeof ereignis>;
type Aufruf = (e: Anfrage) => Promise<Response>;

/** Die Einträge einer Liste, je mit den Diensten ihres Moduls verbunden; Name `modul.funktion`. */
function eintraege<D>(
	modul: string,
	liste: Record<string, (d: D, e: Anfrage) => Promise<Response>>,
	d: D
): [string, Aufruf][] {
	return Object.entries(liste).map(([name, fn]) => [`${modul}.${name}`, (e) => fn(d, e)]);
}

const mailer = vi.fn(async () => {});

// Eine neue Liste der Mitglieder gehört hier hinein und in MITGLIEDER in `routen.test.ts`
// (dort sichert der dritte Test, dass jede Route der Mitglieder eine gelistete Funktion ruft).
function mitgliederDienste() {
	const cm: CmDienste = {
		db,
		bestaetigung: vi.fn(async () => {}),
		melde: vi.fn(async () => {}),
		jetzt: () => start
	};
	const anlass: AnlassDienste = { db, jetzt: () => start };
	const profil: ProfilDienste = {
		db,
		wechsel: erstelleEmailWechselDienst({
			db,
			schluessel: 'x'.repeat(40),
			kontakt: 'kontakt@example.org',
			mailer,
			bremsen: erstelleBremsen(() => start.getTime()),
			jetzt: () => start
		}),
		jetzt: () => start
	};
	const passkey: PasskeyDienst = erstellePasskeyDienst({
		db,
		pruefer: testPruefer().pruefer,
		bremsen: erstelleBremsen(() => start.getTime()),
		challenges: new ChallengeSpeicher({ jetzt: () => start.getTime() }),
		jetzt: () => start
	});
	const mitteilung: MitteilungDienste = { db, vapidOeffentlich: null, jetzt: () => start };
	return [
		...eintraege('cm', CM_SCHNITTSTELLEN, cm),
		...eintraege('anlass', ANLASS_SCHNITTSTELLEN, anlass),
		...eintraege('profil', PROFIL_SCHNITTSTELLEN, profil),
		...eintraege('gespraech', GESPRAECH_SCHNITTSTELLEN, cm),
		...eintraege('passkey', PASSKEY_SCHNITTSTELLEN, passkey),
		...eintraege('mitteilung', MITTEILUNG_SCHNITTSTELLEN, mitteilung)
	];
}

function verwaltungsDienste() {
	const post: { text: string }[] = [];
	const zugang = erstelleZugangDienst({
		db,
		schluessel: 'x'.repeat(40),
		kontakt: 'kontakt@example.org',
		mailer: async (n) => {
			post.push(n);
		},
		bremsen: erstelleBremsen(),
		jetzt: () => start
	});
	const d: MitteilungAdminDienste = {
		db,
		zugang,
		hinweis: vi.fn<AdminDienste['hinweis']>(async () => {}),
		brief: {
			schluessel: 'y'.repeat(40),
			adresse: 'https://mytco.example.org',
			kontakt: 'kontakt@example.org'
		},
		jetzt: () => start,
		push: vi.fn<NonNullable<MitteilungAdminDienste['push']>>(async () => 'ok'),
		mailer: vi.fn<MitteilungAdminDienste['mailer']>(async () => {}),
		adresse: 'https://mytco.example.org'
	};
	// Eine neue Liste der Verwaltung gehört in `VERWALTUNGS_LISTEN` (gilt auch für Routen-Test und
	// Rechte-Matrix).
	const liste = Object.entries(VERWALTUNGS_LISTEN).flatMap(([modul, l]) => eintraege(modul, l, d));
	return { liste, zugang, post };
}

const schreibend = (name: string) => name.split('.')[1].startsWith('post');

/** Anfrage wie aus dem Browser, mit Pfad-Parametern, die jede Schnittstelle versteht. */
const anfrage = (name: string, opt: Parameters<typeof ereignis>[0] = {}) =>
	ereignis({
		method: schreibend(name) ? 'POST' : 'GET',
		body: {},
		params: { id: '1', kennung: 'k'.repeat(43) },
		...opt
	});

async function antwortVon(name: string, r: Response) {
	const text = await r.text();
	return [name, r.status, text === '' ? null : JSON.parse(text)];
}

/**
 * Ausnahmen von «ohne Sitzung 401 { fehler: 'abgemeldet' }», mit der heutigen Antwort.
 * Gewollt: Kalender und Passkey-Anmeldung sind ohne Sitzung erreichbar.
 */
const OHNE_SITZUNG_ANDERS: Record<string, [number, unknown]> = {
	// SI-19: Die Kalenderdatei gibt es ohne Sitzung, nur über ihre nicht erratbare Kennung.
	'anlass.getKalender': [404, { fehler: 'nicht-gefunden' }],
	// Anmelden mit Passkey: vor dem Login, darum ohne Sitzung.
	'passkey.postAnmeldenOptionen': [200, expect.objectContaining({ vorgang: expect.any(String) })],
	'passkey.postAnmelden': [400, { fehler: 'falsch' }]
};

/**
 * Ausnahmen von «Verwaltung ohne Rolle 403 { fehler: 'kein-admin' }», mit der heutigen Antwort.
 * Gewollt: Die «Ansicht als …» lässt sich immer beenden, sie führt nur zu den echten Rollen zurück.
 */
const OHNE_ROLLE_ANDERS: Record<string, [number, unknown]> = {
	'admin.postAnsichtBeenden': [200, {}]
};

/**
 * Ausnahmen von «Verwaltung unbestätigt 403 { fehler: 'unbestaetigt' }», mit der heutigen Antwort.
 * Gewollt: Der Zugang wird erst bestätigt (SI-08), die Ansicht lässt sich immer beenden.
 */
const UNBESTAETIGT_ANDERS: Record<string, [number, unknown]> = {
	'admin.getZugang': [200, { bestaetigt: false, rollen: ['mytco'] }],
	'admin.postZugangCode': [202, {}],
	'admin.postZugang': [400, { fehler: 'falsch' }],
	'admin.postAnsichtBeenden': [200, {}]
};

/** Ausnahmen von «schreibend ohne JSON 415 { fehler: 'format' }», mit der heutigen Antwort. */
const OHNE_JSON_ANDERS: Record<string, [number, unknown]> = {};

/**
 * Ausnahmen von «schreibend ohne Sitzung und ohne JSON 415 { fehler: 'format' }», mit der heutigen
 * Antwort. Leer: Jede schreibende Schnittstelle prüft heute zuerst das Format, dann die Sitzung.
 */
const OHNE_BEIDES_ANDERS: Record<string, [number, unknown]> = {};

describe('Grundprüfung der Schnittstellen', () => {
	// Hier nur Zählung und Ausnahmen. Dass keine Route an den Listen vorbei eine Funktion ruft,
	// sichert der dritte Test in `routen.test.ts`.
	test('die Listen der Mitglieder haben 36 Einträge, und jede Ausnahme gehört zu einem', () => {
		const namen = mitgliederDienste().map(([name]) => name);
		expect(namen).toHaveLength(36);
		// Jede Ausnahme gehört zu einem Eintrag; eine veraltete Ausnahme fällt so auf.
		for (const name of Object.keys(OHNE_SITZUNG_ANDERS)) expect(namen).toContain(name);
	});

	test('jede Schnittstelle der Mitglieder antwortet ohne Sitzung 401 (benannte Ausnahmen)', async () => {
		for (const [name, fn] of mitgliederDienste()) {
			const r = await fn(anfrage(name));
			const [status, koerper] = OHNE_SITZUNG_ANDERS[name] ?? [401, { fehler: 'abgemeldet' }];
			expect(await antwortVon(name, r)).toEqual([name, status, koerper]);
			expect([name, r.headers.get('cache-control')]).toEqual([name, 'no-store']);
		}
	});

	test('die Listen der Verwaltung haben 62 Einträge, und jede Ausnahme gehört zu einem', () => {
		const namen = verwaltungsDienste().liste.map(([name]) => name);
		expect(namen).toHaveLength(62);
		expect(new Set(namen).size).toBe(namen.length);
		for (const name of [...Object.keys(OHNE_ROLLE_ANDERS), ...Object.keys(UNBESTAETIGT_ANDERS)]) {
			expect(namen).toContain(name);
		}
	});

	// RR-07, RR-09 über alle Listen der Verwaltung. Ohne Rolle: ein Mitglied ohne Verwaltungsrolle;
	// unbestätigt: der MyTCO-Admin ohne eingelösten Code (er liest jeden Bereich, darum gilt die
	// Erwartung für jede Liste).
	test('jede Schnittstelle der Verwaltung antwortet ohne Sitzung 401, ohne Rolle 403, unbestätigt 403 (benannte Ausnahmen)', async () => {
		const { liste } = verwaltungsDienste();
		const konto = async (rollen?: string[]) => {
			const m = await legeMitgliedAn(db, { rollen });
			const kennung = await erstelleSitzung(db, m.kontoId, start);
			return { konto: (await pruefeSitzung(db, kennung, start))!.konto, cookie: kennung };
		};
		const ohneRolle = await konto();
		const unbestaetigt = await konto(['mytco']);
		for (const [name, fn] of liste) {
			const ohne = await fn(anfrage(name));
			expect(await antwortVon(name, ohne)).toEqual([name, 401, { fehler: 'abgemeldet' }]);
			expect([name, ohne.headers.get('cache-control')]).toEqual([name, 'no-store']);
			const keine = await fn(anfrage(name, ohneRolle));
			const [s1, k1] = OHNE_ROLLE_ANDERS[name] ?? [403, { fehler: 'kein-admin' }];
			expect(await antwortVon(name, keine)).toEqual([name, s1, k1]);
			expect([name, keine.headers.get('cache-control')]).toEqual([name, 'no-store']);
			const unb = await fn(anfrage(name, unbestaetigt));
			const [s2, k2] = UNBESTAETIGT_ANDERS[name] ?? [403, { fehler: 'unbestaetigt' }];
			expect(await antwortVon(name, unb)).toEqual([name, s2, k2]);
			expect([name, unb.headers.get('cache-control')]).toEqual([name, 'no-store']);
		}
	});

	test('jede schreibende Schnittstelle der Mitglieder weist mit Sitzung, aber ohne JSON 415 ab', async () => {
		const m = await legeMitgliedAn(db);
		const kennung = await erstelleSitzung(db, m.kontoId, start);
		const konto = (await pruefeSitzung(db, kennung, start))!.konto;
		const geprueft = mitgliederDienste().filter(([name]) => schreibend(name));
		expect(geprueft).toHaveLength(26);
		for (const [name, fn] of geprueft) {
			const r = await fn(
				anfrage(name, { body: 'kein JSON', contentType: 'text/plain', konto, cookie: kennung })
			);
			const [status, koerper] = OHNE_JSON_ANDERS[name] ?? [415, { fehler: 'format' }];
			expect(await antwortVon(name, r)).toEqual([name, status, koerper]);
			expect([name, r.headers.get('cache-control')]).toEqual([name, 'no-store']);
		}
	});

	test('jede schreibende Schnittstelle der Verwaltung weist mit bestätigter Sitzung, aber ohne JSON 415 ab', async () => {
		const v = verwaltungsDienste();
		const m = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder', 'cm'] });
		const kennung = await erstelleSitzung(db, m.kontoId, start);
		const konto = (await pruefeSitzung(db, kennung, start))!.konto;
		await (
			await v.zugang.fordereCodeAn(konto)
		).arbeit;
		expect(await v.zugang.bestaetige(konto, v.post.at(-1)!.text.slice(0, 6))).toBe('ok');
		const geprueft = v.liste.filter(([name]) => schreibend(name));
		expect(geprueft).toHaveLength(42);
		for (const [name, fn] of geprueft) {
			const r = await fn(
				anfrage(name, { body: 'kein JSON', contentType: 'text/plain', konto, cookie: kennung })
			);
			const [status, koerper] = OHNE_JSON_ANDERS[name] ?? [415, { fehler: 'format' }];
			expect(await antwortVon(name, r)).toEqual([name, status, koerper]);
			expect([name, r.headers.get('cache-control')]).toEqual([name, 'no-store']);
		}
	});

	// Reihenfolge der Prüfungen (Charakterisierung vor Schritt 06): Fehlen Sitzung und JSON zugleich,
	// gewinnt heute das Format. Die beiden Tests oben prüfen die Bedingungen getrennt und hängen
	// darum nicht an der Reihenfolge; dieser hält sie fest, damit ein Umbau sie nicht still dreht.
	test('jede schreibende Schnittstelle antwortet ohne Sitzung und ohne JSON 415 (Format vor Sitzung)', async () => {
		const geprueft = [...mitgliederDienste(), ...verwaltungsDienste().liste].filter(([name]) =>
			schreibend(name)
		);
		expect(geprueft).toHaveLength(26 + 42);
		for (const name of Object.keys(OHNE_BEIDES_ANDERS)) {
			expect(geprueft.map(([n]) => n)).toContain(name);
		}
		for (const [name, fn] of geprueft) {
			const r = await fn(anfrage(name, { body: 'kein JSON', contentType: 'text/plain' }));
			const [status, koerper] = OHNE_BEIDES_ANDERS[name] ?? [415, { fehler: 'format' }];
			expect(await antwortVon(name, r)).toEqual([name, status, koerper]);
			expect([name, r.headers.get('cache-control')]).toEqual([name, 'no-store']);
		}
	});
});
