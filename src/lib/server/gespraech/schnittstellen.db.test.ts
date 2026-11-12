import { eq } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import {
	legeEigeneDatenbankAn,
	ZEIT_EIGENE_DB
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { turnierjahre } from '../../../../tests/hilfen/turnierjahre.ts';
import { ERLAUBT_IN_ANSICHT, riegel } from '../admin/ansicht.ts';
import { erstelleZugangDienst } from '../admin/zugang.ts';
import { ladeCmAnsicht, laufendeTurniere } from '../cm/anmeldungen.ts';
import type { CmDienste } from '../cm/typen.ts';
import { erstelleDb } from '../db/index.ts';
import { gespraech, nachricht, turnier } from '../db/schema.ts';
import { erstelleBremsen } from '../login/bremse.ts';
import { getSitzung } from '../sitzung/schnittstellen.ts';
import { erstelleSitzung, pruefeSitzung, type AngemeldetesKonto } from '../login/sitzung.ts';
import type { MitteilungAdminDienste } from '../mitteilung/typen.ts';
import { ladeTurnier, legeTurnierAn, listeTurniere } from '../turnier/turniere.ts';
import {
	getAdminGespraech,
	getGespraech,
	getGespraeche,
	postAntwort,
	postGelesen,
	postGespraech,
	postZustand
} from './schnittstellen.ts';
import { ANTWORT_TEXT, NACHRICHT_TEXT, pfadMitglied, pfadVerwaltung } from './meldung.ts';
import { ladeEigenesGespraech, ladeGespraech } from './gespraech.ts';

// `let`: Der Sitzungs-Test tauscht sie gegen eine eigene Datenbank (siehe dort).
let db = erstelleDb(process.env.DATABASE_URL!);
afterAll(async () => {
	await db.$client.end();
});

const logs = [
	vi.spyOn(console, 'error').mockImplementation(() => {}),
	vi.spyOn(console, 'warn').mockImplementation(() => {}),
	vi.spyOn(console, 'log').mockImplementation(() => {})
];
// SI-05: Jeder Test dieser Datei beweist, dass die Schnittstellen nichts loggen.
afterEach(() => {
	try {
		for (const l of logs) expect(l).not.toHaveBeenCalled();
	} finally {
		for (const l of logs) l.mockClear();
	}
});

const start = new Date('2026-11-02T12:00:00Z');
const ADRESSE = 'https://mytco.example.org';
// Turnierjahre 9100 bis 9899 (`tests/hilfen/turnierjahre.ts`); nur der Sitzungs-Test zählt global
// und nutzt darum eine eigene Datenbank.
const naechstesJahr = turnierjahre(import.meta.url);
const SITZUNGSJAHR = 9950;
const mitJahr = (jahr: number) => new Date(`${jahr}-06-15T12:00:00+02:00`);

type Meldung = { titel: string; text: string; pfad: string };

function baue(jetzt: Date) {
	const post: { an: string; text: string }[] = [];
	const mails: { an: string; betreff: string; text: string }[] = [];
	const meldungen: { ids: number[]; m: Meldung }[] = [];
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
	const admin: MitteilungAdminDienste = {
		db,
		zugang,
		hinweis: async () => {},
		brief: { schluessel: 'y'.repeat(40), adresse: ADRESSE, kontakt: 'kontakt@example.org' },
		jetzt: () => jetzt,
		push: null,
		mailer: async (n) => {
			mails.push(n);
		},
		adresse: ADRESSE
	};
	const cm: CmDienste = {
		db,
		bestaetigung: async () => {},
		melde: async (ids, m) => {
			meldungen.push({ ids, m });
		},
		jetzt: () => jetzt
	};
	return { admin, cm, post, mails, meldungen };
}

type Bau = ReturnType<typeof baue>;

async function einloggen(kontoId: number): Promise<AngemeldetesKonto> {
	const kennung = await erstelleSitzung(db, kontoId, start);
	return (await pruefeSitzung(db, kennung, start))!.konto;
}

async function admin(s: Bau, rollen: string[], extra: { nachname?: string } = {}) {
	const m = await legeMitgliedAn(db, { rollen, ...extra });
	const konto = await einloggen(m.kontoId);
	await (
		await s.admin.zugang.fordereCodeAn(konto)
	).arbeit;
	expect(await s.admin.zugang.bestaetige(konto, s.post.at(-1)!.text.slice(0, 6))).toBe('ok');
	return { ...m, konto };
}

async function mitglied(extra: { vorname?: string; nachname?: string } = {}) {
	const m = await legeMitgliedAn(db, extra);
	return { ...m, konto: await einloggen(m.kontoId) };
}

/** Offenes Turnier mit gültiger Kontaktperson (CM-Admin); `jetzt` liegt im Turnierjahr. */
async function aufbau(opt: { jahr?: number; ohneKontakt?: boolean } = {}) {
	const jahr = opt.jahr ?? naechstesJahr();
	await db.delete(turnier).where(eq(turnier.jahr, jahr));
	const t = await legeTurnierAn(db, {
		jahr,
		name: `Clubmeisterschaft ${jahr}`,
		anmeldeschluss: `${jahr}-05-31`,
		nummern: []
	});
	if (t.ergebnis !== 'ok') throw new Error('Turnier');
	const s = baue(mitJahr(jahr));
	const kontakt = await admin(s, ['cm'], { nachname: 'Kontaktnachname' });
	await db
		.update(turnier)
		.set({ status: 'offen', kontaktMitgliedId: opt.ohneKontakt ? null : kontakt.mitgliedId })
		.where(eq(turnier.id, t.id));
	return { s, turnierId: t.id, jahr, kontakt, jetzt: mitJahr(jahr) };
}

const post = (konto: AngemeldetesKonto, body: unknown, id: number | string) =>
	ereignis({ konto, body, params: { id: String(id) } });
const hole = (konto: AngemeldetesKonto | undefined, id: number | string) =>
	ereignis({ konto, method: 'GET', params: { id: String(id) } });

async function schreibe(
	a: Awaited<ReturnType<typeof aufbau>>,
	m: { konto: AngemeldetesKonto },
	text: string
) {
	return postGespraech(a.s.cm, post(m.konto, { text }, a.turnierId));
}
async function gespraechId(turnierId: number, mitgliedId: number) {
	const [g] = await db.select().from(gespraech).where(eq(gespraech.turnierId, turnierId));
	expect(g.mitgliedId).toBe(mitgliedId);
	return g.id;
}
const warte = (ms = 80) => new Promise((r) => setTimeout(r, ms));

describe('A-TURNIER-04 Schnittstellen zum Gespräch', () => {
	test('A-TURNIER-04, RR-07: ohne Sitzung 401; Mitglieder-Admin und Mitglied bekommen auf Admin-Routen 403; MyTCO-Admin liest, schreibt nicht', async () => {
		const a = await aufbau();
		const m = await mitglied();
		await schreibe(a, m, 'Frage');
		const gid = await gespraechId(a.turnierId, m.mitgliedId);

		// Mitglieder-Routen
		for (const r of [
			await getGespraech(a.s.cm, hole(undefined, a.turnierId)),
			await postGespraech(a.s.cm, ereignis({ body: { text: 'x' }, params: { id: '1' } })),
			await postGelesen(a.s.cm, ereignis({ body: { bis: 'x' }, params: { id: '1' } }))
		]) {
			expect([r.status, await r.json()]).toEqual([401, { fehler: 'abgemeldet' }]);
		}
		// Admin-Routen ohne Sitzung
		for (const r of [
			await getGespraeche(a.s.admin, hole(undefined, a.turnierId)),
			await getAdminGespraech(a.s.admin, hole(undefined, gid)),
			await postAntwort(a.s.admin, ereignis({ body: {}, params: { id: String(gid) } })),
			await postZustand(a.s.admin, ereignis({ body: {}, params: { id: String(gid) } }))
		]) {
			expect(r.status).toBe(401);
		}

		const mitgliederAdmin = await admin(a.s, ['mitglieder']);
		const gewoehnlich = m.konto;
		for (const konto of [mitgliederAdmin.konto, gewoehnlich]) {
			for (const r of [
				await getGespraeche(a.s.admin, hole(konto, a.turnierId)),
				await getAdminGespraech(a.s.admin, hole(konto, gid)),
				await postAntwort(a.s.admin, post(konto, { text: 'x', nachLetzter: 0 }, gid)),
				await postZustand(a.s.admin, post(konto, { zustand: 'erledigt' }, gid))
			]) {
				expect([r.status, await r.json()]).toEqual([403, { fehler: 'kein-admin' }]);
			}
		}

		const mytco = await admin(a.s, ['mytco']);
		expect((await getGespraeche(a.s.admin, hole(mytco.konto, a.turnierId))).status).toBe(200);
		expect((await getAdminGespraech(a.s.admin, hole(mytco.konto, gid))).status).toBe(200);
		for (const r of [
			await postAntwort(a.s.admin, post(mytco.konto, { text: 'x', nachLetzter: 0 }, gid)),
			await postZustand(a.s.admin, post(mytco.konto, { zustand: 'erledigt' }, gid))
		]) {
			expect([r.status, await r.json()]).toEqual([403, { fehler: 'kein-recht' }]);
		}
		expect(await db.select().from(nachricht).where(eq(nachricht.gespraechId, gid))).toHaveLength(1);
	});

	test('A-TURNIER-04, FR-50: Nachricht nach trim 1 bis 1000 Zeichen, gezählt in Codepunkten', async () => {
		const a = await aufbau();
		const m = await mitglied();
		for (const text of ['', '   ', 'a'.repeat(1001), 42, null]) {
			const r = await schreibe(a, m, text as string);
			expect([r.status, await r.json()]).toEqual([
				400,
				{ fehler: 'eingabe', felder: { text: 'Schreib 1 bis 1000 Zeichen.' } }
			]);
		}
		const ok = await schreibe(a, m, '🎾'.repeat(1000));
		expect(ok.status).toBe(200);
		expect(
			await db.select().from(gespraech).where(eq(gespraech.turnierId, a.turnierId))
		).toHaveLength(1);
		const getrimmt = await schreibe(a, m, '  Hallo  ');
		const g = await getrimmt.json();
		expect(g.nachrichten.at(-1)).toMatchObject({ von: 'du', text: 'Hallo' });
		expect(g.nachrichten.at(-1)).not.toHaveProperty('adminMitgliedId');
		// Der Verwaltung gilt dieselbe Regel.
		const gid = await gespraechId(a.turnierId, m.mitgliedId);
		const r = await postAntwort(
			a.s.admin,
			post(a.kontakt.konto, { text: ' ', nachLetzter: 0 }, gid)
		);
		expect([r.status, await r.json()]).toEqual([
			400,
			{ fehler: 'eingabe', felder: { text: 'Schreib 1 bis 1000 Zeichen.' } }
		]);
	});

	test('FR-53, A-TURNIER-04: Nachricht meldet genau die Kontaktperson, ohne Inhalt und Namen; ohne Kontaktperson keine Meldung', async () => {
		const a = await aufbau();
		const m = await mitglied({ vorname: 'Fragevorname', nachname: 'Fragenachname' });
		const r = await schreibe(a, m, 'Geheimer Fragetext');
		expect(r.status).toBe(200);
		await warte();
		const gid = await gespraechId(a.turnierId, m.mitgliedId);
		expect(a.s.meldungen).toEqual([
			{
				ids: [a.kontakt.mitgliedId],
				m: {
					titel: 'Clubmeisterschaft',
					text: NACHRICHT_TEXT,
					pfad: pfadVerwaltung(a.turnierId, gid)
				}
			}
		]);
		const alles = JSON.stringify(a.s.meldungen);
		for (const verboten of ['Geheimer Fragetext', 'Fragevorname', 'Fragenachname']) {
			expect(alles).not.toContain(verboten);
		}

		const ohne = await aufbau({ ohneKontakt: true });
		const m2 = await mitglied();
		const r2 = await schreibe(ohne, m2, 'Frage');
		expect([r2.status, await r2.json()]).toEqual([409, { fehler: 'nur-lesen' }]);
		await warte();
		expect(ohne.s.meldungen).toEqual([]);
		expect(
			await db.select().from(gespraech).where(eq(gespraech.turnierId, ohne.turnierId))
		).toEqual([]);
	});

	test('FR-53: Antwort meldet das Mitglied ohne Text und Namen; der Verlauf der Leitung trägt den Admin, der des Mitglieds nicht', async () => {
		const a = await aufbau();
		const m = await mitglied();
		await schreibe(a, m, 'Frage');
		const gid = await gespraechId(a.turnierId, m.mitgliedId);
		const andere = await admin(a.s, ['cm'], { nachname: 'Andernachname' });
		const r = await postAntwort(
			a.s.admin,
			post(andere.konto, { text: 'Geheime Antwort', nachLetzter: 0, trotzdem: true }, gid)
		);
		expect(r.status).toBe(200);
		const verlauf = await r.json();
		expect(verlauf.nachrichten.at(-1)).toMatchObject({
			von: 'leitung',
			admin: { nachname: 'Andernachname' }
		});
		await vi.waitFor(() => expect(a.s.mails).toHaveLength(1));
		const mail = a.s.mails[0];
		expect(mail.an).toBe(m.email);
		expect(mail.text).toContain(ANTWORT_TEXT);
		expect(mail.text).toContain(ADRESSE + pfadMitglied(a.turnierId));
		for (const verboten of ['Geheime Antwort', 'Andernachname', 'Frage']) {
			expect(mail.betreff + mail.text).not.toContain(verboten);
		}
		// Das Mitglied sieht nur «leitung».
		const eigen = await (await getGespraech(a.s.cm, hole(m.konto, a.turnierId))).json();
		expect(JSON.stringify(eigen)).not.toMatch(/Andernachname|adminId|adminMitgliedId/);
		expect(eigen.nachrichten.at(-1)).toMatchObject({ von: 'leitung', text: 'Geheime Antwort' });
		// Auch die Admin-Antwort der Verwaltung führt nur im Verlauf der Leitung Namen.
		expect((await (await getAdminGespraech(a.s.admin, hole(andere.konto, gid))).json()).id).toBe(
			gid
		);
	});

	test('FR-53: Antwortet der Admin dem eigenen Gespräch (er schrieb als Mitglied), geht keine Meldung', async () => {
		const a = await aufbau();
		const selbst = await admin(a.s, ['cm']);
		await schreibe(a, selbst, 'Frage des Admins');
		const gid = await gespraechId(a.turnierId, selbst.mitgliedId);
		const r = await postAntwort(
			a.s.admin,
			post(selbst.konto, { text: 'Antwort an mich', nachLetzter: 0, trotzdem: true }, gid)
		);
		expect(r.status).toBe(200);
		await warte();
		expect(a.s.mails).toEqual([]);
	});

	test('A-TURNIER-04, FR-50: veralteter Stand ergibt 409 inzwischen mit dem Verlauf, trotzdem sendet', async () => {
		const a = await aufbau();
		const m = await mitglied();
		await schreibe(a, m, 'Frage');
		const gid = await gespraechId(a.turnierId, m.mitgliedId);
		const erster = await admin(a.s, ['cm']);
		const zweiter = await admin(a.s, ['cm']);
		const stand = (await ladeGespraech(db, gid, a.jetzt))!.nachrichten.at(-1)!.id;
		expect(
			(await postAntwort(a.s.admin, post(erster.konto, { text: 'Erste', nachLetzter: stand }, gid)))
				.status
		).toBe(200);
		const veraltet = await postAntwort(
			a.s.admin,
			post(zweiter.konto, { text: 'Zweite', nachLetzter: stand }, gid)
		);
		const k = await veraltet.json();
		expect([veraltet.status, k.fehler]).toEqual([409, 'inzwischen']);
		expect(k.gespraech.nachrichten.map((n: { text: string }) => n.text)).toEqual([
			'Frage',
			'Erste'
		]);
		const trotzdem = await postAntwort(
			a.s.admin,
			post(zweiter.konto, { text: 'Zweite', nachLetzter: stand, trotzdem: true }, gid)
		);
		expect(trotzdem.status).toBe(200);
		expect((await trotzdem.json()).nachrichten.map((n: { text: string }) => n.text)).toEqual([
			'Frage',
			'Erste',
			'Zweite'
		]);
		// Unbekanntes Gespräch, kaputter Stand
		expect(
			(await postAntwort(a.s.admin, post(erster.konto, { text: 'x', nachLetzter: 0 }, 2147483646)))
				.status
		).toBe(404);
		expect((await postAntwort(a.s.admin, post(erster.konto, { text: 'x' }, gid))).status).toBe(400);
	});

	test('FR-51, A-TURNIER-04: nach dem Turnierjahr ergibt der Zustand 409 nur-lesen', async () => {
		const a = await aufbau();
		const m = await mitglied();
		await schreibe(a, m, 'Frage');
		const gid = await gespraechId(a.turnierId, m.mitgliedId);
		const spaet = baue(new Date(`${a.jahr + 1}-01-01T00:30:00+01:00`));
		const r = await postZustand(spaet.admin, post(a.kontakt.konto, { zustand: 'erledigt' }, gid));
		expect([r.status, await r.json()]).toEqual([409, { fehler: 'nur-lesen' }]);
		expect((await ladeGespraech(db, gid, a.jetzt))?.zustand).toBe('offen');
	});

	test('FR-52, A-TURNIER-04: Zustand setzen; unbekannt oder ungültig wird abgewiesen', async () => {
		const a = await aufbau();
		const m = await mitglied();
		await schreibe(a, m, 'Frage');
		const gid = await gespraechId(a.turnierId, m.mitgliedId);
		const r = await postZustand(a.s.admin, post(a.kontakt.konto, { zustand: 'erledigt' }, gid));
		expect([r.status, (await r.json()).zustand]).toEqual([200, 'erledigt']);
		const liste = await (await getGespraeche(a.s.admin, hole(a.kontakt.konto, a.turnierId))).json();
		expect(liste.zeilen[0]).toMatchObject({ id: gid, zustand: 'erledigt' });
		expect(
			(await postZustand(a.s.admin, post(a.kontakt.konto, { zustand: 'x' }, gid))).status
		).toBe(400);
		expect(
			(await postZustand(a.s.admin, post(a.kontakt.konto, { zustand: 'offen' }, 2147483646))).status
		).toBe(404);
		expect((await getGespraeche(a.s.admin, hole(a.kontakt.konto, 2147483646))).status).toBe(404);
	});

	test('A-TURNIER-04, FR-52: gelesen markiert bis zur gezeigten Nachricht und nur vorwärts; ungültig 400', async () => {
		const a = await aufbau();
		const m = await mitglied();
		await schreibe(a, m, 'Frage');
		const gid = await gespraechId(a.turnierId, m.mitgliedId);
		await postAntwort(
			a.s.admin,
			post(a.kontakt.konto, { text: 'Antwort', nachLetzter: 0, trotzdem: true }, gid)
		);
		const neu = async () =>
			(await ladeEigenesGespraech(db, a.turnierId, m.mitgliedId, a.jetzt))!.nachrichten.some(
				(n) => n.neu
			);
		expect(await neu()).toBe(true);
		for (const bis of [undefined, 'gestern', 5, null]) {
			expect((await postGelesen(a.s.cm, post(m.konto, { bis }, a.turnierId))).status).toBe(400);
		}
		const letzte = (await ladeGespraech(db, gid, a.jetzt))!.nachrichten.at(-1)!;
		const bis = new Date(new Date(letzte.gesendetAm).getTime() + 1000);
		const r = await postGelesen(a.s.cm, post(m.konto, { bis: bis.toISOString() }, a.turnierId));
		expect(r.status).toBe(204);
		expect(await neu()).toBe(false);
		// Ein älterer Zeitpunkt macht nichts wieder «neu».
		await postGelesen(a.s.cm, post(m.konto, { bis: new Date(0).toISOString() }, a.turnierId));
		expect(await neu()).toBe(false);
	});

	test('A-TURNIER-04, FR-52: gelesen kappt einen Zeitpunkt in der Zukunft auf jetzt, spätere Antworten bleiben neu', async () => {
		const a = await aufbau();
		const m = await mitglied();
		await schreibe(a, m, 'Frage');
		const gid = await gespraechId(a.turnierId, m.mitgliedId);
		const r = await postGelesen(
			a.s.cm,
			post(m.konto, { bis: '9999-01-01T00:00:00Z' }, a.turnierId)
		);
		expect(r.status).toBe(204);
		const [g] = await db.select().from(gespraech).where(eq(gespraech.id, gid));
		expect(g.gelesenAm?.getTime()).toBe(a.jetzt.getTime());
		await db.insert(nachricht).values({
			gespraechId: gid,
			von: 'leitung',
			adminMitgliedId: a.kontakt.mitgliedId,
			text: 'Später',
			gesendetAm: new Date(a.jetzt.getTime() + 60_000)
		});
		const spaeter = new Date(a.jetzt.getTime() + 120_000);
		const eigen = await ladeEigenesGespraech(db, a.turnierId, m.mitgliedId, spaeter);
		expect(eigen?.nachrichten.at(-1)).toMatchObject({ text: 'Später', neu: true });
	});

	test('A-TURNIER-04: Mitglied sieht ein Turnier in Vorbereitung nicht (404)', async () => {
		const a = await aufbau();
		await db.update(turnier).set({ status: 'vorbereitung' }).where(eq(turnier.id, a.turnierId));
		const m = await mitglied();
		expect((await getGespraech(a.s.cm, hole(m.konto, a.turnierId))).status).toBe(404);
		expect((await schreibe(a, m, 'x')).status).toBe(404);
		expect((await getGespraech(a.s.cm, hole(m.konto, 'abc'))).status).toBe(404);
	});

	test('A-TURNIER-04, RR-09: «Ansicht als …» weist gelesen und Nachricht ab, die Routen stehen nicht in der Erlaubnisliste', () => {
		for (const pfad of [
			'/api/cm/7/gespraech',
			'/api/cm/7/gespraech/gelesen',
			'/api/admin/gespraeche/7',
			'/api/admin/gespraeche/7/zustand'
		]) {
			expect(ERLAUBT_IN_ANSICHT as readonly string[]).not.toContain(pfad);
			const absage = riegel('POST', pfad, 'cm');
			expect(absage?.status).toBe(403);
		}
		expect(riegel('GET', '/api/cm/7/gespraech', 'cm')).toBeNull();
	});

	test('A-TURNIER-04, RR-09: In der Ansicht schreibt auch der Handler der Verwaltung nicht', async () => {
		const a = await aufbau();
		const m = await mitglied();
		await schreibe(a, m, 'Frage');
		const gid = await gespraechId(a.turnierId, m.mitgliedId);
		const inAnsicht = { ...a.kontakt.konto, ansicht: 'cm' } as AngemeldetesKonto;
		const r = await postAntwort(a.s.admin, post(inAnsicht, { text: 'x', nachLetzter: 0 }, gid));
		expect([r.status, await r.json()]).toEqual([403, { fehler: 'nur-ansehen' }]);
	});

	test(
		'FR-52, A-TURNIER-04: getSitzung zählt offene Gespräche nur bei wirksamer Rolle cm',
		ZEIT_EIGENE_DB,
		async () => {
			// Die Zahl ist global und die gemeinsame Datenbank wird parallel beschrieben: eigene Datenbank.
			const eigene = await legeEigeneDatenbankAn('gespraech_sitzung');
			const gemeinsame = db;
			db = eigene.db;
			try {
				await pruefeSitzungsZahl();
			} finally {
				db = gemeinsame;
				await eigene.abbauen();
			}
		}
	);

	test('FR-52, A-TURNIER-04: CM-Ansicht, Turnierliste und Verwaltung tragen die Gesprächsfelder', async () => {
		const a = await aufbau();
		const m = await mitglied();
		const leer = await ladeCmAnsicht(db, a.turnierId, m.mitgliedId, a.jetzt);
		expect(leer?.gespraech).toEqual({ vorhanden: false, neueAntwort: false, schreiben: true });
		expect(leer?.turnier.neueAntwort).toBe(false);
		await schreibe(a, m, 'Frage');
		const gid = await gespraechId(a.turnierId, m.mitgliedId);
		await postAntwort(
			a.s.admin,
			post(a.kontakt.konto, { text: 'Antwort', nachLetzter: 0, trotzdem: true }, gid)
		);
		const mit = await ladeCmAnsicht(db, a.turnierId, m.mitgliedId, a.jetzt);
		expect(mit?.gespraech).toEqual({ vorhanden: true, neueAntwort: true, schreiben: true });
		expect(mit?.turnier.neueAntwort).toBe(true);
		const stand = (await laufendeTurniere(db, m.mitgliedId, a.jetzt)).find(
			(t) => t.id === a.turnierId
		);
		expect(stand?.neueAntwort).toBe(true);
		const fremd = await mitglied();
		const fremdStand = (await laufendeTurniere(db, fremd.mitgliedId, a.jetzt)).find(
			(t) => t.id === a.turnierId
		);
		expect(fremdStand?.neueAntwort).toBe(false);

		expect((await listeTurniere(db, a.jetzt)).find((t) => t.id === a.turnierId)?.offen).toBe(1);
		expect((await ladeTurnier(db, a.turnierId, a.jetzt))?.nachrichten).toEqual({
			offen: 1,
			erledigt: 0
		});
	});
});

async function gespraechIdVon(turnierId: number, mitgliedId: number) {
	const zeilen = await db.select().from(gespraech).where(eq(gespraech.turnierId, turnierId));
	return zeilen.find((g) => g.mitgliedId === mitgliedId)!.id;
}

async function pruefeSitzungsZahl() {
	const a = await aufbau({ jahr: SITZUNGSJAHR });
	const m1 = await mitglied();
	const m2 = await mitglied();
	const m3 = await mitglied();
	await schreibe(a, m1, 'Eins');
	await schreibe(a, m2, 'Zwei');
	await schreibe(a, m3, 'Drei');
	await postZustand(
		a.s.admin,
		post(a.kontakt.konto, { zustand: 'erledigt' }, await gespraechIdVon(a.turnierId, m3.mitgliedId))
	);
	const sitzung = async (konto: AngemeldetesKonto) =>
		(await (await getSitzung(ereignis({ method: 'GET', konto }), db, () => a.jetzt)).json())
			.nachrichtenOffen;
	expect(await sitzung(a.kontakt.konto)).toBe(2);
	const mytco = await admin(a.s, ['mytco']);
	expect(await sitzung(mytco.konto)).toBe(0);
	expect(await sitzung({ ...mytco.konto, ansicht: 'cm' } as AngemeldetesKonto)).toBe(2);
	expect(await sitzung({ ...a.kontakt.konto, ansicht: 'mitglieder' } as AngemeldetesKonto)).toBe(0);
	expect(await sitzung(m1.konto)).toBe(0);
}
