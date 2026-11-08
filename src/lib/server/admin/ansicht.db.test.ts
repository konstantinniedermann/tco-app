import { and, eq } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { legeAnlassAn } from '../anlass/anlaesse.ts';
import { postAnmeldung } from '../anlass/schnittstellen.ts';
import { erstelleDb } from '../db/index.ts';
import {
	aenderung,
	anlassAnmeldung,
	kontoRolle,
	mitglied,
	sitzung,
	turnier
} from '../db/schema.ts';
import { erstelleBremsen } from '../login/bremse.ts';
import { erstelleLoginDienst } from '../login/dienst.ts';
import { getSitzung, postLogout } from '../login/schnittstellen.ts';
import { erstelleSitzung, pruefeSitzung, type AngemeldetesKonto } from '../login/sitzung.ts';
import { postTurniere } from '../turnier/schnittstellen.ts';
import { riegel } from './ansicht.ts';
import { setzeRollen } from './rollen.ts';
import {
	getZugang,
	postAnsicht,
	postAnsichtBeenden,
	postMitglieder,
	type AdminDienste
} from './schnittstellen.ts';
import { erstelleZugangDienst } from './zugang.ts';

const db = erstelleDb(process.env.DATABASE_URL!);
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

function baue() {
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
	const d: AdminDienste = {
		db,
		zugang,
		hinweis: vi.fn<AdminDienste['hinweis']>(async () => {}),
		brief: {
			schluessel: 'y'.repeat(40),
			adresse: 'https://mytco.example.org',
			kontakt: 'kontakt@example.org'
		},
		jetzt: () => start
	};
	return { d, post };
}

// Liest die Sitzung neu, wie der Hook es bei jeder Anfrage tut.
async function lade(kennung: string): Promise<AngemeldetesKonto | undefined> {
	return (await pruefeSitzung(db, kennung, start))?.konto;
}

async function angemeldet(rollen: string[], bestaetigen: boolean, s = baue()) {
	const m = await legeMitgliedAn(db, { rollen });
	const kennung = await erstelleSitzung(db, m.kontoId, start);
	const konto = (await lade(kennung))!;
	if (bestaetigen) {
		await (
			await s.d.zugang.fordereCodeAn(konto)
		).arbeit;
		expect(await s.d.zugang.bestaetige(konto, s.post.at(-1)!.text.slice(0, 6))).toBe('ok');
	}
	return { ...m, kennung, konto, s };
}

const schalteEin = (d: AdminDienste, konto: AngemeldetesKonto, body: unknown) =>
	postAnsicht(d, ereignis({ url: 'http://localhost/api/admin/ansicht', body, konto }));

// Wie hooks.server.ts: Der Riegel kommt vor jeder Schnittstelle unter /api/.
async function wieHook(e: ReturnType<typeof ereignis>, fn: () => Promise<Response>) {
	return riegel(e.request.method, e.url.pathname, e.locals.konto?.ansicht ?? null) ?? fn();
}

async function verlaufVon(mitgliedId: number) {
	return db.select().from(aenderung).where(eq(aenderung.mitgliedId, mitgliedId));
}

describe('Ansicht als … (Server)', () => {
	test('MyTCO-Admin schaltet Ansicht CM-Admin ein: getZugang zeigt rollen [cm]', async () => {
		const a = await angemeldet(['mytco', 'mitglieder'], true);
		const r = await schalteEin(a.s.d, a.konto, { rolle: 'cm' });
		expect([r.status, await r.json()]).toEqual([200, {}]);
		expect(r.headers.get('cache-control')).toBe('no-store');
		const konto = (await lade(a.kennung))!;
		expect(konto.ansicht).toBe('cm');
		const z = await getZugang(a.s.d, ereignis({ method: 'GET', konto }));
		expect(await z.json()).toEqual({ bestaetigt: true, mitgliedId: a.mitgliedId, rollen: ['cm'] });
		// Nichts wird geändert, darum kein Eintrag im Änderungsverlauf.
		expect(await verlaufVon(a.mitgliedId)).toEqual([]);
		const ende = await postAnsichtBeenden(a.s.d, ereignis({ konto }));
		expect([ende.status, await ende.json()]).toEqual([200, {}]);
		expect((await lade(a.kennung))!.ansicht).toBeNull();
		expect(await verlaufVon(a.mitgliedId)).toEqual([]);
	});

	test('Mitglieder-Admin ohne mytco: postAnsicht → 403 kein-admin', async () => {
		const a = await angemeldet(['mitglieder', 'cm'], true);
		const r = await schalteEin(a.s.d, a.konto, { rolle: 'cm' });
		expect([r.status, await r.json()]).toEqual([403, { fehler: 'kein-admin' }]);
		const normal = await angemeldet([], false);
		const n = await schalteEin(normal.s.d, normal.konto, { rolle: 'cm' });
		expect([n.status, await n.json()]).toEqual([403, { fehler: 'kein-admin' }]);
		expect((await lade(a.kennung))!.ansicht).toBeNull();
		const ohne = await postAnsicht(a.s.d, ereignis({ body: { rolle: 'cm' } }));
		expect([ohne.status, await ohne.json()]).toEqual([401, { fehler: 'abgemeldet' }]);
	});

	test('unbestätigt: postAnsicht → 403 unbestaetigt', async () => {
		const a = await angemeldet(['mytco'], false);
		const r = await schalteEin(a.s.d, a.konto, { rolle: 'mitglied' });
		expect([r.status, await r.json()]).toEqual([403, { fehler: 'unbestaetigt' }]);
		expect((await lade(a.kennung))!.ansicht).toBeNull();
	});

	test('Ansicht Mitglied: getSitzung verwaltung false, ansicht mitglied', async () => {
		const a = await angemeldet(['mytco'], true);
		const vorher = await getSitzung(ereignis({ method: 'GET', konto: a.konto }), db);
		expect(await vorher.json()).toEqual({
			vorname: 'Test',
			rufname: null,
			passkeyHinweis: false,
			verwaltung: true,
			ansicht: null
		});
		expect((await schalteEin(a.s.d, a.konto, { rolle: 'mitglied' })).status).toBe(200);
		const konto = (await lade(a.kennung))!;
		const r = await getSitzung(ereignis({ method: 'GET', konto }), db);
		expect(await r.json()).toEqual({
			vorname: 'Test',
			rufname: null,
			passkeyHinweis: false,
			verwaltung: false,
			ansicht: 'mitglied'
		});
		const z = await getZugang(a.s.d, ereignis({ method: 'GET', konto }));
		expect([z.status, await z.json()]).toEqual([403, { fehler: 'kein-admin' }]);
		// Lizenz-Admin öffnet die Verwaltung noch nicht.
		await postAnsichtBeenden(a.s.d, ereignis({ konto }));
		expect((await schalteEin(a.s.d, konto, { rolle: 'lizenz' })).status).toBe(200);
		const lizenz = (await lade(a.kennung))!;
		expect(
			await (await getSitzung(ereignis({ method: 'GET', konto: lizenz }), db)).json()
		).toMatchObject({ verwaltung: false, ansicht: 'lizenz' });
	});

	test('mytco entzogen: Ansicht gilt nicht mehr, echte Rollen zurück', async () => {
		const a = await angemeldet(['mytco', 'mitglieder'], true);
		expect((await schalteEin(a.s.d, a.konto, { rolle: 'cm' })).status).toBe(200);
		await db
			.delete(kontoRolle)
			.where(and(eq(kontoRolle.kontoId, a.kontoId), eq(kontoRolle.rolle, 'mytco')));
		const konto = (await lade(a.kennung))!;
		expect(konto.ansicht).toBeNull();
		const z = await getZugang(a.s.d, ereignis({ method: 'GET', konto }));
		expect(await z.json()).toEqual({
			bestaetigt: true,
			mitgliedId: a.mitgliedId,
			rollen: ['mitglieder']
		});
		const e = ereignis({ url: 'http://localhost/api/profil', body: {}, konto });
		expect(await wieHook(e, async () => new Response(null, { status: 204 }))).toMatchObject({
			status: 204
		});
	});

	test('in der Ansicht scheitert eine Anmeldung zum Anlass mit 403 nur-ansehen und ändert nichts', async () => {
		const a = await angemeldet(['mytco'], true);
		const anlassId = await legeAnlassAn(db, a.mitgliedId, {
			titel: 'GV Erfunden',
			beginn: new Date('2027-03-19T18:30:00Z'),
			ort: 'Clubhaus',
			einladung: 'Traktanden',
			anmeldeschluss: new Date('2027-03-16T22:59:00Z')
		});
		expect((await schalteEin(a.s.d, a.konto, { rolle: 'mitglied' })).status).toBe(200);
		const konto = (await lade(a.kennung))!;
		const anlassDienste = { db, jetzt: () => start };
		const melde = (k: AngemeldetesKonto) => {
			const e = ereignis({
				url: `http://localhost/api/anlaesse/${anlassId}/anmeldung`,
				body: { antwort: 'kommt' },
				params: { id: String(anlassId) },
				konto: k
			});
			return wieHook(e, () => postAnmeldung(anlassDienste, e));
		};
		const r = await melde(konto);
		expect([r.status, await r.json()]).toEqual([403, { fehler: 'nur-ansehen' }]);
		const zeilen = () =>
			db.select().from(anlassAnmeldung).where(eq(anlassAnmeldung.anlassId, anlassId));
		expect(await zeilen()).toEqual([]);
		// Die Gegenprobe: Ohne Ansicht geht dieselbe Anmeldung durch.
		await postAnsichtBeenden(a.s.d, ereignis({ konto }));
		expect((await melde((await lade(a.kennung))!)).status).toBe(200);
		expect(await zeilen()).toHaveLength(1);
	});

	test('Logout beendet die Ansicht', async () => {
		const a = await angemeldet(['mytco'], true);
		expect((await schalteEin(a.s.d, a.konto, { rolle: 'cm' })).status).toBe(200);
		const konto = (await lade(a.kennung))!;
		const login = erstelleLoginDienst({
			db,
			schluessel: 'x'.repeat(40),
			kontakt: 'kontakt@example.org',
			mailer: async () => {},
			bremsen: erstelleBremsen(),
			jetzt: () => start
		});
		const e = ereignis({ url: 'http://localhost/api/logout', cookie: a.kennung, konto });
		const r = await wieHook(e, () => postLogout(login, e));
		expect(r.status).toBe(204);
		expect(await lade(a.kennung)).toBeUndefined();
		expect(await db.select().from(sitzung).where(eq(sitzung.kontoId, a.kontoId))).toEqual([]);
	});

	test('eine zweite Sitzung desselben Kontos sieht keine Ansicht', async () => {
		const a = await angemeldet(['mytco'], true);
		const zweite = await erstelleSitzung(db, a.kontoId, start);
		expect((await schalteEin(a.s.d, a.konto, { rolle: 'cm' })).status).toBe(200);
		expect((await lade(a.kennung))!.ansicht).toBe('cm');
		expect((await lade(zweite))!.ansicht).toBeNull();
	});

	test('ungültige Rolle → 400 eingabe', async () => {
		const a = await angemeldet(['mytco'], true);
		for (const body of [{ rolle: 'mytco' }, { rolle: 'admin' }, { rolle: null }, {}, '{kaputt']) {
			const r = await schalteEin(a.s.d, a.konto, body);
			expect([r.status, await r.json()]).toEqual([400, { fehler: 'eingabe' }]);
		}
		expect((await lade(a.kennung))!.ansicht).toBeNull();
		const text = await postAnsicht(
			a.s.d,
			ereignis({ body: { rolle: 'cm' }, contentType: 'text/plain', konto: a.konto })
		);
		expect([text.status, await text.json()]).toEqual([415, { fehler: 'format' }]);
		const textEnde = await postAnsichtBeenden(
			a.s.d,
			ereignis({ contentType: 'text/plain', konto: a.konto })
		);
		expect(textEnde.status).toBe(415);
	});

	// Zweite Schicht: Auch ohne den Riegel im Hook schreibt keine Schnittstelle in der Ansicht.
	test('in der Ansicht cm scheitert postTurniere direkt mit 403 nur-ansehen, die DB bleibt gleich', async () => {
		const a = await angemeldet(['mytco'], true);
		expect((await schalteEin(a.s.d, a.konto, { rolle: 'cm' })).status).toBe(200);
		const konto = (await lade(a.kennung))!;
		const name = `Clubmeisterschaft ${crypto.randomUUID()}`;
		const r = await postTurniere(
			a.s.d,
			ereignis({
				konto,
				body: { jahr: 2093, name, anmeldeschluss: '2093-05-31', nummern: [] }
			})
		);
		expect([r.status, await r.json()]).toEqual([403, { fehler: 'nur-ansehen' }]);
		expect(await db.select().from(turnier).where(eq(turnier.name, name))).toEqual([]);
	});

	test('in der Ansicht mitglieder scheitert postMitglieder direkt mit 403 nur-ansehen, die DB bleibt gleich', async () => {
		const a = await angemeldet(['mytco'], true);
		expect((await schalteEin(a.s.d, a.konto, { rolle: 'mitglieder' })).status).toBe(200);
		const konto = (await lade(a.kennung))!;
		const email = `neu-${crypto.randomUUID()}@example.org`;
		const r = await postMitglieder(
			a.s.d,
			ereignis({
				konto,
				body: {
					vorname: 'Erika',
					nachname: 'Beispiel',
					strasse: 'Erfundenweg 1',
					plz: '4600',
					ort: 'Olten',
					email
				}
			})
		);
		expect([r.status, await r.json()]).toEqual([403, { fehler: 'nur-ansehen' }]);
		expect(await db.select().from(mitglied).where(eq(mitglied.email, email))).toEqual([]);
		expect(await verlaufVon(a.mitgliedId)).toEqual([]);
	});

	test('mytco entzogen und wieder vergeben: die alte Ansicht lebt nicht wieder auf', async () => {
		// Ein zweiter MyTCO-Admin, damit der Entzug nicht an der Untergrenze scheitert.
		const anderer = await legeMitgliedAn(db, { rollen: ['mytco'] });
		const a = await angemeldet(['mytco', 'mitglieder'], true);
		const zweite = await erstelleSitzung(db, a.kontoId, start);
		expect((await schalteEin(a.s.d, a.konto, { rolle: 'cm' })).status).toBe(200);
		await db.update(sitzung).set({ ansichtRolle: 'lizenz' }).where(eq(sitzung.kontoId, a.kontoId));
		const urheber = { art: 'admin' as const, mitgliedId: anderer.mitgliedId };
		expect(
			await setzeRollen(db, urheber, a.kontoId, ['mitglieder'], ['mytco', 'mitglieder'], start)
		).toBe('ok');
		expect(
			await setzeRollen(db, urheber, a.kontoId, ['mytco', 'mitglieder'], ['mitglieder'], start)
		).toBe('ok');
		expect((await lade(a.kennung))!.ansicht).toBeNull();
		expect((await lade(zweite))!.ansicht).toBeNull();
	});

	test('Beenden ohne Rolle und ohne Ansicht ist harmlos, ohne Sitzung 401', async () => {
		const normal = await angemeldet([], false);
		const r = await postAnsichtBeenden(normal.s.d, ereignis({ konto: normal.konto }));
		expect([r.status, await r.json()]).toEqual([200, {}]);
		const ohne = await postAnsichtBeenden(normal.s.d, ereignis());
		expect([ohne.status, await ohne.json()]).toEqual([401, { fehler: 'abgemeldet' }]);
	});
});
