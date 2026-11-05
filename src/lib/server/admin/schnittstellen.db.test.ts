import { eq } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { mitglied } from '../db/schema.ts';
import { erstelleBremsen } from '../login/bremse.ts';
import { getSitzung } from '../login/schnittstellen.ts';
import { erstelleSitzung, pruefeSitzung, type AngemeldetesKonto } from '../login/sitzung.ts';
import {
	ADMIN_SCHNITTSTELLEN,
	postMitglied,
	postMitglieder,
	postRollen,
	postSitzungen,
	getMitglied,
	getMitglieder,
	getVerlauf,
	getFairgate,
	postFairgate,
	getZugang,
	postZugang,
	postZugangCode,
	getAdminAnlaesse,
	getAdminAnlass,
	postAdminAnlaesse,
	postAdminAnlass,
	postAdminAnlassLoeschen,
	type AdminDienste
} from './schnittstellen.ts';
import { getAnlaesse } from '../anlass/schnittstellen.ts';
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
	const post: { an: string; text: string }[] = [];
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
	const d: AdminDienste = { db, zugang, jetzt: () => start };
	return { d, post };
}

async function einloggen(kontoId: number): Promise<AngemeldetesKonto> {
	const kennung = await erstelleSitzung(db, kontoId, start);
	return (await pruefeSitzung(db, kennung, start))!.konto;
}

async function bestaetigterAdmin(s: ReturnType<typeof baue>) {
	const m = await legeMitgliedAn(db, { rollen: ['admin'] });
	const konto = await einloggen(m.kontoId);
	await (
		await s.d.zugang.fordereCodeAn(konto)
	).arbeit;
	expect(await s.d.zugang.bestaetige(konto, s.post.at(-1)!.text.slice(0, 6))).toBe('ok');
	return { ...m, konto };
}

const ANGABEN = {
	vorname: 'Erika',
	nachname: 'Beispiel',
	strasse: 'Erfundenweg 1',
	plz: '4600',
	ort: 'Olten',
	email: 'erika.beispiel@example.org'
};

// Vollständiger Stand wie in `Detail.angaben`, für `vorher` beim Speichern.
const STAND = {
	mitgliedernummer: null,
	...ANGABEN,
	telefon: null,
	geschlecht: null,
	jahrgang: null,
	lizenznummer: null
};

const eindeutig = () => ({ ...ANGABEN, email: `neu-${crypto.randomUUID()}@example.org` });

describe('Admin-Schnittstellen', () => {
	test('RR-07, RR-09: jede Admin-Schnittstelle antwortet ohne Sitzung 401, ohne Rolle 403, unbestätigt 403', async () => {
		const s = baue();
		const normal = await einloggen((await legeMitgliedAn(db)).kontoId);
		const unbestaetigt = await einloggen((await legeMitgliedAn(db, { rollen: ['admin'] })).kontoId);
		const geschuetzt = Object.entries(ADMIN_SCHNITTSTELLEN).filter(
			([name]) => !['getZugang', 'postZugang', 'postZugangCode'].includes(name)
		);
		expect(geschuetzt).toHaveLength(14);
		for (const [name, fn] of geschuetzt) {
			const mach = (konto?: AngemeldetesKonto) =>
				ereignis({
					method: name.startsWith('get') ? 'GET' : 'POST',
					body: {},
					params: { id: '1' },
					konto
				});
			const ohne = await fn(s.d, mach());
			expect([name, ohne.status, await ohne.json()]).toEqual([name, 401, { fehler: 'abgemeldet' }]);
			const keine = await fn(s.d, mach(normal));
			expect([name, keine.status, await keine.json()]).toEqual([
				name,
				403,
				{ fehler: 'kein-admin' }
			]);
			const unb = await fn(s.d, mach(unbestaetigt));
			expect([name, unb.status, await unb.json()]).toEqual([name, 403, { fehler: 'unbestaetigt' }]);
			expect(ohne.headers.get('cache-control')).toBe('no-store');
		}
	});

	test('SI-10: ändernde Admin-Schnittstellen lehnen text/plain mit 415 ab', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		const aendernde = [
			postZugangCode,
			postZugang,
			postMitglieder,
			postMitglied,
			postRollen,
			postSitzungen,
			postFairgate,
			postAdminAnlaesse,
			postAdminAnlass,
			postAdminAnlassLoeschen
		];
		for (const fn of aendernde) {
			const r = await fn(
				s.d,
				ereignis({ contentType: 'text/plain', body: '{}', params: { id: '1' }, konto: admin.konto })
			);
			expect(r.status).toBe(415);
			expect(await r.json()).toEqual({ fehler: 'format' });
		}
	});

	test('SI-08: Zugang: Status, Code anfordern, bestätigen, falscher Code', async () => {
		const s = baue();
		const m = await legeMitgliedAn(db, { rollen: ['admin'] });
		const konto = await einloggen(m.kontoId);
		const status = async () => (await getZugang(s.d, ereignis({ method: 'GET', konto }))).json();
		expect(await status()).toEqual({ bestaetigt: false });

		const normal = await einloggen((await legeMitgliedAn(db)).kontoId);
		expect((await getZugang(s.d, ereignis({ method: 'GET', konto: normal }))).status).toBe(403);
		expect((await getZugang(s.d, ereignis({ method: 'GET' }))).status).toBe(401);
		expect((await postZugangCode(s.d, ereignis({ body: {}, konto: normal }))).status).toBe(403);
		expect((await postZugang(s.d, ereignis({ body: { code: '1' } }))).status).toBe(401);

		const angefordert = await postZugangCode(s.d, ereignis({ body: {}, konto }));
		expect(angefordert.status).toBe(202);
		await vi.waitFor(() => expect(s.post).toHaveLength(1));
		const code = s.post[0].text.slice(0, 6);
		const falsch = await postZugang(
			s.d,
			ereignis({ body: { code: String((Number(code) + 1) % 1_000_000).padStart(6, '0') }, konto })
		);
		expect(falsch.status).toBe(400);
		expect(await falsch.json()).toEqual({ fehler: 'falsch' });
		const ok = await postZugang(s.d, ereignis({ body: { code }, konto }));
		expect(ok.status).toBe(200);
		expect(await status()).toEqual({ bestaetigt: true, mitgliedId: m.mitgliedId });
	});

	test('SI-08: zu viele Code-Anforderungen → 429 zu-viele', async () => {
		const s = baue();
		const m = await legeMitgliedAn(db, { rollen: ['admin'] });
		const konto = await einloggen(m.kontoId);
		const stati: number[] = [];
		for (let i = 0; i < 4; i++) {
			stati.push((await postZugangCode(s.d, ereignis({ body: {}, konto }))).status);
		}
		expect(stati).toEqual([202, 202, 202, 429]);
	});

	test('A-MITGLIED-01: POST mitglieder mit fehlender PLZ → 400 mit felder.plz', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		const ohnePlz: Partial<ReturnType<typeof eindeutig>> = eindeutig();
		delete ohnePlz.plz;
		const r = await postMitglieder(s.d, ereignis({ body: ohnePlz, konto: admin.konto }));
		expect(r.status).toBe(400);
		const koerper = (await r.json()) as { fehler: string; felder: Record<string, string> };
		expect(koerper.fehler).toBe('eingabe');
		expect(koerper.felder).toHaveProperty('plz');
	});

	test('FR-01, FR-26: Mitglied anlegen, lesen, ändern, doppelte E-Mail → 409, Verlauf', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		const angaben = eindeutig();
		const neu = await postMitglieder(s.d, ereignis({ body: angaben, konto: admin.konto }));
		expect(neu.status).toBe(201);
		const { id } = (await neu.json()) as { id: number };

		const doppelt = await postMitglieder(s.d, ereignis({ body: angaben, konto: admin.konto }));
		expect(doppelt.status).toBe(409);
		expect(await doppelt.json()).toEqual({ fehler: 'vergeben', feld: 'email' });

		const detail = await getMitglied(
			s.d,
			ereignis({ method: 'GET', params: { id: String(id) }, konto: admin.konto })
		);
		expect(detail.status).toBe(200);
		const geladen = (await detail.json()) as { angaben: Record<string, unknown> };
		expect(geladen).toMatchObject({ id, angaben: { vorname: 'Erika' } });

		const geaendert = await postMitglied(
			s.d,
			ereignis({
				body: { ...angaben, ort: 'Aarau', vorher: geladen.angaben },
				params: { id: String(id) },
				konto: admin.konto
			})
		);
		expect(geaendert.status).toBe(200);
		expect(await geaendert.json()).toEqual({ geaendert: ['ort'] });

		// Ein zweiter Admin mit dem alten Stand überschreibt nicht.
		const veraltet = await postMitglied(
			s.d,
			ereignis({
				body: { ...angaben, telefon: '+41 00 000 00 01', vorher: geladen.angaben },
				params: { id: String(id) },
				konto: admin.konto
			})
		);
		expect(veraltet.status).toBe(409);
		expect(await veraltet.json()).toEqual({ fehler: 'veraltet' });

		// Ohne oder mit kaputtem alten Stand → 400.
		for (const vorher of [undefined, { vorname: 'Erika' }]) {
			const ohne = await postMitglied(
				s.d,
				ereignis({ body: { ...angaben, vorher }, params: { id: String(id) }, konto: admin.konto })
			);
			expect(ohne.status).toBe(400);
			expect(await ohne.json()).toEqual({ fehler: 'eingabe' });
		}

		const kaputt = await postMitglied(
			s.d,
			ereignis({ body: { vorname: '' }, params: { id: String(id) }, konto: admin.konto })
		);
		expect(kaputt.status).toBe(400);

		const verlauf = await getVerlauf(
			s.d,
			ereignis({ method: 'GET', url: `http://localhost/x?mitglied=${id}`, konto: admin.konto })
		);
		expect(verlauf.status).toBe(200);
		const zeilen = (await verlauf.json()) as { aktion: string; detail: string | null }[];
		expect(zeilen.map((z) => [z.aktion, z.detail])).toEqual([
			['feld-geaendert', 'ort'],
			['angelegt', null]
		]);
	});

	test('RR-03: Rollen setzen; ungültige Namen → 400; letzter Admin → 409; unbekannt → 404', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		const ziel = await legeMitgliedAn(db);
		const roll = (rollen: unknown, id = String(ziel.mitgliedId)) =>
			postRollen(s.d, ereignis({ body: { rollen }, params: { id }, konto: admin.konto }));

		expect((await roll(['cm', 'lizenz'])).status).toBe(200);
		for (const schlecht of ['admin', ['root'], ['cm', 'cm'], [1], undefined]) {
			expect((await roll(schlecht)).status).toBe(400);
		}
		expect((await roll(['cm'], '999999999')).status).toBe(404);
		expect((await roll(['cm'], 'abc')).status).toBe(404);

		const detail = await getMitglied(
			s.d,
			ereignis({ method: 'GET', params: { id: String(ziel.mitgliedId) }, konto: admin.konto })
		);
		expect(((await detail.json()) as { rollen: string[] }).rollen.sort()).toEqual(['cm', 'lizenz']);
	});

	test('SI-07, FR-24: Sitzungen beenden; unbekanntes Mitglied → 404', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		const ziel = await legeMitgliedAn(db);
		const kennung = await erstelleSitzung(db, ziel.kontoId, start);
		expect(await pruefeSitzung(db, kennung, start)).not.toBeNull();
		const r = await postSitzungen(
			s.d,
			ereignis({ body: {}, params: { id: String(ziel.mitgliedId) }, konto: admin.konto })
		);
		expect(r.status).toBe(200);
		expect(await pruefeSitzung(db, kennung, start)).toBeNull();
		const weg = await postSitzungen(
			s.d,
			ereignis({ body: {}, params: { id: '999999999' }, konto: admin.konto })
		);
		expect(weg.status).toBe(404);
	});

	test('A-MITGLIED-02: Liste mit Suche und Status; ungültiger Status → 400', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		const eins = await legeMitgliedAn(db, { nachname: 'Zufallsname-Qwxz' });
		const url = (q: string) => `http://localhost/api/admin/mitglieder?${q}`;
		const liste = await getMitglieder(
			s.d,
			ereignis({ method: 'GET', url: url('suche=Qwxz'), konto: admin.konto })
		);
		expect(liste.status).toBe(200);
		const zeilen = (await liste.json()) as { id: number }[];
		expect(zeilen.map((z) => z.id)).toEqual([eins.mitgliedId]);
		const schlecht = await getMitglieder(
			s.d,
			ereignis({ method: 'GET', url: url('status=xyz'), konto: admin.konto })
		);
		expect(schlecht.status).toBe(400);
		const alle = await getMitglieder(
			s.d,
			ereignis({ method: 'GET', url: url('status=aktiv'), konto: admin.konto })
		);
		expect(alle.status).toBe(200);
	});

	test('A-MITGLIED-02: leerer Status-Filter («Alle») wirkt wie kein Filter', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		const eins = await legeMitgliedAn(db, { nachname: 'Leerfilter-Qwxy' });
		const r = await getMitglieder(
			s.d,
			ereignis({
				method: 'GET',
				url: 'http://localhost/api/admin/mitglieder?suche=Qwxy&status=',
				konto: admin.konto
			})
		);
		expect(r.status).toBe(200);
		expect(((await r.json()) as { id: number }[]).map((z) => z.id)).toEqual([eins.mitgliedId]);
	});

	test('Ids über dem Wertebereich der Datenbank → 404, bei ?mitglied= → 400', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		const gross = '2147483648';
		const p = { id: gross };
		const k = admin.konto;
		const antworten = [
			await getMitglied(s.d, ereignis({ method: 'GET', params: p, konto: k })),
			await postMitglied(
				s.d,
				ereignis({ body: { ...eindeutig(), vorher: STAND }, params: p, konto: k })
			),
			await postRollen(s.d, ereignis({ body: { rollen: [] }, params: p, konto: k })),
			await postSitzungen(s.d, ereignis({ body: {}, params: p, konto: k }))
		];
		expect(antworten.map((r) => r.status)).toEqual([404, 404, 404, 404]);
		const v = await getVerlauf(
			s.d,
			ereignis({ method: 'GET', url: `http://localhost/x?mitglied=${gross}`, konto: k })
		);
		expect(v.status).toBe(400);
		const grenze = await getMitglied(
			s.d,
			ereignis({ method: 'GET', params: { id: '2147483647' }, konto: k })
		);
		expect(grenze.status).toBe(404);
	});

	test('FR-26: Verlauf: Grenze wird begrenzt, ungültige Werte fallen auf Standard, mitglied ungültig → 400', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		const hole = (q: string) =>
			getVerlauf(
				s.d,
				ereignis({
					method: 'GET',
					url: `http://localhost/api/admin/verlauf${q}`,
					konto: admin.konto
				})
			);
		expect((await hole('')).status).toBe(200);
		expect((await hole('?grenze=100000')).status).toBe(200);
		expect((await hole('?grenze=abc')).status).toBe(200);
		expect((await hole('?mitglied=abc')).status).toBe(400);
		expect((await hole('?mitglied=0')).status).toBe(400);
	});

	test('RR-07: GET /api/sitzung meldet verwaltung: true nur mit Rolle admin, ohne mitgliedId und sitzungHash', async () => {
		const admin = await legeMitgliedAn(db, { rollen: ['admin'] });
		const normal = await legeMitgliedAn(db);
		const ra = await getSitzung(ereignis({ konto: await einloggen(admin.kontoId) }), db);
		const rn = await getSitzung(ereignis({ konto: await einloggen(normal.kontoId) }), db);
		expect(await ra.json()).toEqual({ vorname: 'Test', passkeyHinweis: false, verwaltung: true });
		expect(await rn.json()).toMatchObject({ verwaltung: false });
		expect((await getSitzung(ereignis(), db)).status).toBe(401);
	});

	test('A-KONTO-02: Liste Für Fairgate lesen und abhaken, ungültige und unbekannte Nummer 404', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		const m = await legeMitgliedAn(db);
		await db
			.update(mitglied)
			.set({ fairgateOffenSeit: start })
			.where(eq(mitglied.id, m.mitgliedId));
		const liste = await getFairgate(s.d, ereignis({ method: 'GET', konto: admin.konto }));
		expect(liste.status).toBe(200);
		const zeilen = (await liste.json()) as { id: number }[];
		expect(zeilen.map((z) => z.id)).toContain(m.mitgliedId);
		const abhaken = (id: string, seit: unknown = start.toISOString()) =>
			postFairgate(s.d, ereignis({ body: { seit }, params: { id }, konto: admin.konto }));
		const ohneSeit = await abhaken(String(m.mitgliedId), null);
		expect(ohneSeit.status).toBe(400);
		expect(await ohneSeit.json()).toEqual({ fehler: 'eingabe' });
		expect((await abhaken(String(m.mitgliedId), 'gestern')).status).toBe(400);
		const veraltet = await abhaken(String(m.mitgliedId), new Date(+start - 1000).toISOString());
		expect(veraltet.status).toBe(409);
		expect(await veraltet.json()).toEqual({ fehler: 'veraltet' });
		expect((await abhaken(String(m.mitgliedId))).status).toBe(200);
		const nochmal = await abhaken(String(m.mitgliedId));
		expect(nochmal.status).toBe(404);
		expect(await nochmal.json()).toEqual({ fehler: 'nicht-gefunden' });
		expect((await abhaken('abc')).status).toBe(404);
	});

	test('A-ANLASS-01: Admin legt Anlass an, ändert ihn, Mitglied sieht ihn, Admin löscht ihn', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		const titel = `GV ${crypto.randomUUID()}`;
		const angaben = {
			titel,
			beginn: '2027-03-19T19:30',
			ort: 'Clubhaus',
			einladung: 'Traktanden',
			anmeldeschluss: '2027-03-16T23:59'
		};
		const fehlt = await postAdminAnlaesse(
			s.d,
			ereignis({ body: { ...angaben, titel: ' ' }, konto: admin.konto })
		);
		expect([fehlt.status, await fehlt.json()]).toEqual([
			400,
			{ fehler: 'eingabe', felder: { titel: 'Bitte einen Titel angeben.' } }
		]);
		const neu = await postAdminAnlaesse(s.d, ereignis({ body: angaben, konto: admin.konto }));
		expect(neu.status).toBe(201);
		const { id } = await neu.json();

		const mitglied = await einloggen((await legeMitgliedAn(db)).kontoId);
		const sicht = await (
			await getAnlaesse({ db, jetzt: () => start }, ereignis({ method: 'GET', konto: mitglied }))
		).json();
		expect(sicht.map((a: { titel: string }) => a.titel)).toContain(titel);

		const geaendert = await postAdminAnlass(
			s.d,
			ereignis({
				body: { ...angaben, ort: 'Halle' },
				params: { id: String(id) },
				konto: admin.konto
			})
		);
		expect(geaendert.status).toBe(200);
		const detail = await (
			await getAdminAnlass(
				s.d,
				ereignis({ method: 'GET', params: { id: String(id) }, konto: admin.konto })
			)
		).json();
		expect(detail).toMatchObject({
			titel,
			ort: 'Halle',
			beginnLokal: '2027-03-19T19:30',
			schlussLokal: '2027-03-16T23:59',
			zahlen: { kommen: 0, kommenNicht: 0 },
			anmeldungen: []
		});
		const liste = await (
			await getAdminAnlaesse(s.d, ereignis({ method: 'GET', konto: admin.konto }))
		).json();
		expect(liste.map((a: { id: number }) => a.id)).toContain(id);

		const weg = await postAdminAnlassLoeschen(
			s.d,
			ereignis({ body: {}, params: { id: String(id) }, konto: admin.konto })
		);
		expect(weg.status).toBe(200);
		const nochmal = await postAdminAnlassLoeschen(
			s.d,
			ereignis({ body: {}, params: { id: String(id) }, konto: admin.konto })
		);
		expect([nochmal.status, await nochmal.json()]).toEqual([404, { fehler: 'nicht-gefunden' }]);
	});
});
