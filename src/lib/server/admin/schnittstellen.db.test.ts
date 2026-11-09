import { and, eq } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import {
	anmeldung,
	anmeldungSpieler,
	kontoRolle,
	mitglied,
	partnerAnfrage,
	sitzung
} from '../db/schema.ts';
import type { MitteilungAdminDienste } from '../mitteilung/schnittstellen.ts';
import { legeKategorieAn, legeTurnierAn } from '../turnier/turniere.ts';
import { erstelleBremsen } from '../login/bremse.ts';
import { antwort, getSitzung } from '../login/schnittstellen.ts';
import { erstelleSitzung, pruefeSitzung, type AngemeldetesKonto } from '../login/sitzung.ts';
import {
	ADMIN_SCHNITTSTELLEN,
	postMitglied,
	postMitglieder,
	postRollen,
	postSitzungen,
	getBriefe,
	postBriefe,
	postBrief,
	postEinlesen,
	postEinlesenVorschau,
	postAustritt,
	postWiedereintritt,
	postLoeschen,
	postLoeschenRueckgaengig,
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
	liest,
	schreibt,
	type AdminDienste
} from './schnittstellen.ts';
import { getAnlaesse } from '../anlass/schnittstellen.ts';
import { erstelleZugangDienst } from './zugang.ts';
import { erstelleHinweis } from './hinweis-mail.ts';
import { ladeMitglied } from './mitglieder.ts';
import { MAX_BRIEFE } from './briefe.ts';
import { setzeAnsicht } from './ansicht.ts';

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
const ADRESSE = 'https://mytco.example.org';
const BRIEF = {
	schluessel: 'y'.repeat(40),
	adresse: ADRESSE,
	kontakt: 'kontakt@example.org'
};

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
	const hinweis = vi.fn<AdminDienste['hinweis']>(async () => {});
	// Meldungen zum Doppel (FR-47): ohne VAPID gehen sie per E-Mail.
	const mails: { an: string; betreff: string; text: string }[] = [];
	const d: MitteilungAdminDienste = {
		db,
		zugang,
		hinweis,
		brief: BRIEF,
		jetzt: () => start,
		push: null,
		mailer: async (n) => {
			mails.push(n);
		},
		adresse: ADRESSE
	};
	return { d, post, hinweis, mails };
}

async function einloggen(kontoId: number): Promise<AngemeldetesKonto> {
	const kennung = await erstelleSitzung(db, kontoId, start);
	return (await pruefeSitzung(db, kennung, start))!.konto;
}

async function bestaetigterAdmin(
	s: ReturnType<typeof baue>,
	rollen: string[] = ['mytco', 'mitglieder']
) {
	const m = await legeMitgliedAn(db, { rollen });
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
		const unbestaetigt = await einloggen(
			(await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] })).kontoId
		);
		const geschuetzt = Object.entries(ADMIN_SCHNITTSTELLEN).filter(
			([name]) =>
				!['getZugang', 'postZugang', 'postZugangCode', 'postAnsichtBeenden'].includes(name)
		);
		expect(geschuetzt).toHaveLength(26);
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

	test('RR-07: cm bekommt an Admin-Endpunkten 403 kein-admin', async () => {
		const s = baue();
		const cm = await bestaetigterAdmin(s, ['cm']);
		// War Admin und CM; Admin wird entzogen: die bestätigte Sitzung verliert die Admin-Endpunkte sofort.
		const ehemals = await bestaetigterAdmin(s, ['mitglieder', 'cm']);
		await db
			.delete(kontoRolle)
			.where(and(eq(kontoRolle.kontoId, ehemals.kontoId), eq(kontoRolle.rolle, 'mitglieder')));
		const geschuetzt = Object.entries(ADMIN_SCHNITTSTELLEN).filter(
			([name]) =>
				!['getZugang', 'postZugang', 'postZugangCode', 'postAnsichtBeenden'].includes(name)
		);
		expect(geschuetzt).toHaveLength(26);
		for (const [name, fn] of geschuetzt) {
			for (const konto of [cm.konto, ehemals.konto]) {
				const r = await fn(
					s.d,
					ereignis({
						method: name.startsWith('get') ? 'GET' : 'POST',
						body: {},
						params: { id: '1' },
						konto
					})
				);
				expect([name, r.status, await r.json()]).toEqual([name, 403, { fehler: 'kein-admin' }]);
			}
		}
	});

	test('RR-07: getZugang nennt die Rollen', async () => {
		const s = baue();
		const status = async (konto: AngemeldetesKonto) =>
			(await getZugang(s.d, ereignis({ method: 'GET', konto }))).json();
		const cm = await legeMitgliedAn(db, { rollen: ['cm'] });
		expect(await status(await einloggen(cm.kontoId))).toEqual({
			bestaetigt: false,
			rollen: ['cm']
		});
		const beide = await bestaetigterAdmin(s, ['cm', 'mitglieder', 'lizenz', 'mytco']);
		expect(await status(beide.konto)).toEqual({
			bestaetigt: true,
			mitgliedId: beide.mitgliedId,
			rollen: ['mytco', 'mitglieder', 'cm']
		});
		const lizenz = await einloggen((await legeMitgliedAn(db, { rollen: ['lizenz'] })).kontoId);
		const r = await getZugang(s.d, ereignis({ method: 'GET', konto: lizenz }));
		expect([r.status, await r.json()]).toEqual([403, { fehler: 'kein-admin' }]);
	});

	test('RR-07, RR-09: liest und schreibt prüfen den Bereich, schreibt nur mit JSON', async () => {
		const s = baue();
		const ok = async (mitgliedId: number, koerper?: Record<string, unknown>) =>
			antwort(200, { mitgliedId, koerper });
		const lesen = (konto?: AngemeldetesKonto) =>
			liest(s.d, ereignis({ method: 'GET', konto }), 'cm', (id) => ok(id));
		const aendern = (konto?: AngemeldetesKonto, contentType?: string) =>
			schreibt(
				s.d,
				ereignis({ body: contentType ? '{}' : { a: 1 }, contentType, konto }),
				'cm',
				(urheber, koerper) => ok(urheber.mitgliedId, koerper)
			);

		const cm = await bestaetigterAdmin(s, ['cm']);
		const r = await lesen(cm.konto);
		expect([r.status, await r.json()]).toEqual([200, { mitgliedId: cm.mitgliedId }]);
		const a = await aendern(cm.konto);
		expect([a.status, await a.json()]).toEqual([
			200,
			{ mitgliedId: cm.mitgliedId, koerper: { a: 1 } }
		]);
		const t = await aendern(cm.konto, 'text/plain');
		expect([t.status, await t.json()]).toEqual([415, { fehler: 'format' }]);

		// Regel 3: Der MyTCO-Admin liest den CM-Bereich, schreiben darf er dort nicht.
		const mytco = await bestaetigterAdmin(s, ['mytco']);
		const l = await lesen(mytco.konto);
		expect([l.status, await l.json()]).toEqual([200, { mitgliedId: mytco.mitgliedId }]);
		const w = await aendern(mytco.konto);
		expect([w.status, await w.json()]).toEqual([403, { fehler: 'kein-recht' }]);

		// Regel 4: Der Mitglieder-Admin vertritt den CM-Admin nicht.
		const mitglieder = await bestaetigterAdmin(s, ['mitglieder']);
		const lizenz = await einloggen((await legeMitgliedAn(db, { rollen: ['lizenz'] })).kontoId);
		const normal = await einloggen((await legeMitgliedAn(db)).kontoId);
		const unbestaetigt = await einloggen((await legeMitgliedAn(db, { rollen: ['cm'] })).kontoId);
		const faelle: [AngemeldetesKonto | undefined, number, string][] = [
			[undefined, 401, 'abgemeldet'],
			[normal, 403, 'kein-admin'],
			[lizenz, 403, 'kein-admin'],
			[mitglieder.konto, 403, 'kein-admin'],
			[unbestaetigt, 403, 'unbestaetigt']
		];
		for (const [konto, status, fehler] of faelle) {
			for (const r of [await lesen(konto), await aendern(konto)]) {
				expect([r.status, await r.json()]).toEqual([status, { fehler }]);
			}
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
			postBriefe,
			postBrief,
			postAustritt,
			postWiedereintritt,
			postLoeschen,
			postLoeschenRueckgaengig,
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
		const m = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
		const konto = await einloggen(m.kontoId);
		const status = async () => (await getZugang(s.d, ereignis({ method: 'GET', konto }))).json();
		expect(await status()).toEqual({ bestaetigt: false, rollen: ['mytco', 'mitglieder'] });

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
		expect(await status()).toEqual({
			bestaetigt: true,
			mitgliedId: m.mitgliedId,
			rollen: ['mytco', 'mitglieder']
		});
	});

	test('SI-08: zu viele Code-Anforderungen → 429 zu-viele', async () => {
		const s = baue();
		const m = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
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

	async function angelegt(s: ReturnType<typeof baue>, konto: AngemeldetesKonto) {
		const angaben = eindeutig();
		const neu = await postMitglieder(s.d, ereignis({ body: angaben, konto }));
		const { id } = (await neu.json()) as { id: number };
		const vorher = (await ladeMitglied(db, id, start))!.angaben;
		return { angaben, id, vorher };
	}

	test('SI-09: postMitglied schickt den Hinweis an die alte Adresse', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		const { angaben, id, vorher } = await angelegt(s, admin.konto);
		const ohneEmail = await postMitglied(
			s.d,
			ereignis({
				body: { ...angaben, ort: 'Aarau', vorher },
				params: { id: String(id) },
				konto: admin.konto
			})
		);
		expect(ohneEmail.status).toBe(200);
		expect(s.hinweis).not.toHaveBeenCalled();

		const neueEmail = `neu-${id}@example.org`;
		const mitEmail = await postMitglied(
			s.d,
			ereignis({
				body: { ...angaben, ort: 'Aarau', email: neueEmail, vorher: { ...vorher, ort: 'Aarau' } },
				params: { id: String(id) },
				konto: admin.konto
			})
		);
		expect(mitEmail.status).toBe(200);
		expect(s.hinweis).toHaveBeenCalledTimes(1);
		expect(s.hinweis).toHaveBeenCalledWith(angaben.email);
	});

	test('SI-09: kein Hinweis an die alte Adresse bei vergeben/veraltet', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		const { angaben, id, vorher } = await angelegt(s, admin.konto);
		const andere = await angelegt(s, admin.konto);
		const vergeben = await postMitglied(
			s.d,
			ereignis({
				body: { ...angaben, email: andere.angaben.email, vorher },
				params: { id: String(id) },
				konto: admin.konto
			})
		);
		expect([vergeben.status, await vergeben.json()]).toEqual([
			409,
			{ fehler: 'vergeben', feld: 'email' }
		]);
		const veraltet = await postMitglied(
			s.d,
			ereignis({
				body: { ...angaben, email: `neu-${id}@example.org`, vorher: { ...vorher, ort: 'Aarau' } },
				params: { id: String(id) },
				konto: admin.konto
			})
		);
		expect([veraltet.status, await veraltet.json()]).toEqual([409, { fehler: 'veraltet' }]);
		expect(s.hinweis).not.toHaveBeenCalled();
		const [gespeichert] = await db.select().from(mitglied).where(eq(mitglied.id, id));
		expect(gespeichert.email).toBe(angaben.email);
	});

	test('SI-09: scheitert der Hinweis, bleibt die Änderung gespeichert', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		const { angaben, id, vorher } = await angelegt(s, admin.konto);
		const hinweis = erstelleHinweis({
			mailer: async () => {
				throw new Error('SMTP-Fehler');
			},
			kontakt: 'kontakt@example.org',
			bremsen: erstelleBremsen()
		});
		const neueEmail = `neu-${id}@example.org`;
		const r = await postMitglied(
			{ ...s.d, hinweis },
			ereignis({
				body: { ...angaben, email: neueEmail, vorher },
				params: { id: String(id) },
				konto: admin.konto
			})
		);
		expect(r.status).toBe(200);
		const [gespeichert] = await db.select().from(mitglied).where(eq(mitglied.id, id));
		expect(gespeichert.email).toBe(neueEmail);
		// Der Hinweis läuft ohne Warten; die eine feste Logzeile erwarten und zurücksetzen.
		const fehlerLog = logs[0];
		await vi.waitFor(() => expect(fehlerLog).toHaveBeenCalledTimes(1));
		expect(fehlerLog.mock.calls).toEqual([['Hinweis-Mail nicht versandt']]);
		fehlerLog.mockClear();
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

	test('RR-03: Rollen setzen; ungültige Namen → 400; unbekannt → 404', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		const ziel = await legeMitgliedAn(db);
		const roll = (rollen: unknown, vorher: unknown, id = String(ziel.mitgliedId)) =>
			postRollen(s.d, ereignis({ body: { rollen, vorher }, params: { id }, konto: admin.konto }));

		expect((await roll(['cm', 'lizenz'], [])).status).toBe(200);
		// Die alte Rolle admin gibt es nicht mehr.
		for (const schlecht of ['admin', ['admin'], ['root'], ['cm', 'cm'], [1], undefined]) {
			expect((await roll(schlecht, ['cm', 'lizenz'])).status).toBe(400);
		}
		expect((await roll(['cm'], [], '999999999')).status).toBe(404);
		expect((await roll(['cm'], [], 'abc')).status).toBe(404);

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

	test('A-LOGIN-01: Mitglieder-Admin erzeugt Briefe für eine Auswahl', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s, ['mitglieder']);
		const a = await legeMitgliedAn(db);
		const b = await legeMitgliedAn(db);
		const r = await postBriefe(
			s.d,
			ereignis({ body: { ids: [a.mitgliedId, b.mitgliedId] }, konto: admin.konto })
		);
		expect(r.status).toBe(200);
		const { briefe } = (await r.json()) as { briefe: { mitgliedId: number; html: string }[] };
		expect(briefe).toHaveLength(2);
		for (const brief of briefe) expect(brief.html).toContain('class="brief"');
		expect(briefe.map((x) => x.mitgliedId).sort()).toEqual([a.mitgliedId, b.mitgliedId].sort());
	});

	test('A-LOGIN-01: Liste der Briefe für den MyTCO-Admin lesbar', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s, ['mytco']);
		const r = await getBriefe(s.d, ereignis({ method: 'GET', konto: admin.konto }));
		expect(r.status).toBe(200);
		expect(Array.isArray(await r.json())).toBe(true);
	});

	test('SI-10: Eingabe ohne Liste, leer, doppelt, zu gross oder über MAX_BRIEFE → 400', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s, ['mitglieder']);
		const m = await legeMitgliedAn(db);
		const zuviele = Array.from({ length: MAX_BRIEFE + 1 }, (_, i) => i + 1);
		const schlecht: unknown[] = [
			{},
			{ ids: 'x' },
			{ ids: [] },
			{ ids: [m.mitgliedId, m.mitgliedId] },
			{ ids: [0] },
			{ ids: [-1] },
			{ ids: [1.5] },
			{ ids: ['1'] },
			{ ids: [2 ** 31] },
			{ ids: zuviele }
		];
		for (const body of schlecht) {
			const r = await postBriefe(s.d, ereignis({ body, konto: admin.konto }));
			expect([JSON.stringify(body).slice(0, 30), r.status, await r.json()]).toEqual([
				JSON.stringify(body).slice(0, 30),
				400,
				{ fehler: 'eingabe' }
			]);
		}
	});

	test('A-LOGIN-01: nicht möglich → 409 mit Anzahl, kein Code ausgestellt', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s, ['mitglieder']);
		const ok = await legeMitgliedAn(db);
		const weg = await legeMitgliedAn(db, { status: 'ausgetreten' });
		const r = await postBriefe(
			s.d,
			ereignis({ body: { ids: [ok.mitgliedId, weg.mitgliedId] }, konto: admin.konto })
		);
		expect([r.status, await r.json()]).toEqual([409, { fehler: 'nicht-moeglich', anzahl: 1 }]);
	});

	test('A-LOGIN-01: einzelner Brief für ein ausgetretenes Mitglied → 409 nicht-moeglich, unbekannte ID → 404', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s, ['mitglieder']);
		const ok = await legeMitgliedAn(db);
		const gut = await postBrief(
			s.d,
			ereignis({ body: {}, params: { id: String(ok.mitgliedId) }, konto: admin.konto })
		);
		expect(gut.status).toBe(200);
		expect(((await gut.json()) as { briefe: unknown[] }).briefe).toHaveLength(1);
		const weg = await legeMitgliedAn(db, { status: 'ausgetreten' });
		const r = await postBrief(
			s.d,
			ereignis({ body: {}, params: { id: String(weg.mitgliedId) }, konto: admin.konto })
		);
		expect([r.status, await r.json()]).toEqual([409, { fehler: 'nicht-moeglich', anzahl: 1 }]);
		for (const id of ['999999999', 'abc']) {
			const n = await postBrief(s.d, ereignis({ body: {}, params: { id }, konto: admin.konto }));
			expect([id, n.status]).toEqual([id, 404]);
		}
		const geloescht = await legeMitgliedAn(db, { status: 'geloescht' });
		const g = await postBrief(
			s.d,
			ereignis({ body: {}, params: { id: String(geloescht.mitgliedId) }, konto: admin.konto })
		);
		expect(g.status).toBe(404);
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
			await postRollen(s.d, ereignis({ body: { rollen: [], vorher: [] }, params: p, konto: k })),
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

	test('RR-07: GET /api/sitzung meldet verwaltung: true mit Rolle admin, ohne mitgliedId und sitzungHash', async () => {
		const admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
		const normal = await legeMitgliedAn(db);
		const ra = await getSitzung(ereignis({ konto: await einloggen(admin.kontoId) }), db);
		const rn = await getSitzung(ereignis({ konto: await einloggen(normal.kontoId) }), db);
		expect(await ra.json()).toEqual({
			vorname: 'Test',
			rufname: null,
			passkeyHinweis: false,
			verwaltung: true,
			ansicht: null,
			nachrichtenOffen: 0
		});
		expect(await rn.json()).toMatchObject({ verwaltung: false });
		expect((await getSitzung(ereignis(), db)).status).toBe(401);
	});

	test('RR-07: Startseite zeigt die Verwaltung auch für cm', async () => {
		const cm = await legeMitgliedAn(db, { rollen: ['cm'] });
		const lizenz = await legeMitgliedAn(db, { rollen: ['lizenz'] });
		const sitzung = async (kontoId: number) =>
			(await getSitzung(ereignis({ konto: await einloggen(kontoId) }), db)).json();
		expect(await sitzung(cm.kontoId)).toMatchObject({ verwaltung: true });
		expect(await sitzung(lizenz.kontoId)).toMatchObject({ verwaltung: false });
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

describe('Mitgliedschaft: Austritt, Wiedereintritt, Löschung', () => {
	const post = (
		fn: typeof postAustritt,
		s: ReturnType<typeof baue>,
		konto: AngemeldetesKonto,
		id: string
	) => fn(s.d, ereignis({ body: {}, params: { id }, konto }));

	test('Austritt: 200, zweiter Aufruf 409 veraltet; unbekannte ID und ungültige ID 404', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s, ['mitglieder']);
		const ziel = await legeMitgliedAn(db);
		const id = String(ziel.mitgliedId);
		const ok = await post(postAustritt, s, admin.konto, id);
		expect([ok.status, await ok.json()]).toEqual([200, {}]);
		expect((await ladeMitglied(db, ziel.mitgliedId, start))!.status).toBe('ausgetreten');
		const nochmal = await post(postAustritt, s, admin.konto, id);
		expect([nochmal.status, await nochmal.json()]).toEqual([409, { fehler: 'veraltet' }]);
		for (const falsch of ['999999999', 'abc']) {
			const r = await post(postAustritt, s, admin.konto, falsch);
			expect([falsch, r.status, await r.json()]).toEqual([
				falsch,
				404,
				{ fehler: 'nicht-gefunden' }
			]);
		}
	});

	/** Offenes Doppel in einem freien Jahr mit Anmeldeschluss nach `start`. */
	async function offenesDoppel() {
		for (;;) {
			const jahr = 3000 + Math.floor(Math.random() * 6000);
			const t = await legeTurnierAn(db, {
				jahr,
				name: `Clubmeisterschaft ${jahr}`,
				anmeldeschluss: `${jahr}-05-31`,
				nummern: []
			});
			if (t.ergebnis !== 'ok') continue;
			const k = await legeKategorieAn(db, t.id, {
				name: 'Herren Doppel',
				geschlecht: 'herren',
				art: 'doppel',
				jahrgangVon: null,
				jahrgangBis: null,
				klassierungVon: null,
				klassierungBis: null,
				mindestsumme: 9
			});
			if (k.ergebnis !== 'ok') throw new Error(`Kategorie: ${k.ergebnis}`);
			return { turnierId: t.id, kategorieId: k.id };
		}
	}

	const meldung = (an: string, text: string, turnierId: number) => ({
		an,
		betreff: 'Clubmeisterschaft',
		text: `${text}\n\n${ADRESSE}/clubmeisterschaft/${turnierId}`
	});

	for (const [name, fn] of [
		['Austritt', postAustritt],
		['Löschung vormerken', postLoeschen]
	] as const) {
		test(`FR-04, FR-47: ${name} meldet dem Partner den Rückzug und dem Dritten die hinfällige Anfrage`, async () => {
			const s = baue();
			const admin = await bestaetigterAdmin(s, ['mitglieder']);
			const ziel = await legeMitgliedAn(db);
			const partner = await legeMitgliedAn(db);
			const dritter = await legeMitgliedAn(db);
			const { turnierId, kategorieId } = await offenesDoppel();
			const [a] = await db
				.insert(anmeldung)
				.values({ kategorieId, status: 'bestaetigt', angemeldetAm: start, geaendertAm: start })
				.returning({ id: anmeldung.id });
			await db.insert(anmeldungSpieler).values([
				{ anmeldungId: a.id, mitgliedId: ziel.mitgliedId },
				{ anmeldungId: a.id, mitgliedId: partner.mitgliedId }
			]);
			await db.insert(partnerAnfrage).values({
				kategorieId,
				vonId: dritter.mitgliedId,
				anId: ziel.mitgliedId,
				gestelltAm: start
			});

			const r = await post(fn, s, admin.konto, String(ziel.mitgliedId));

			expect([r.status, await r.json()]).toEqual([200, {}]);
			// Die Antwort wartet nicht auf die Meldungen; der Test wartet auf den Versand.
			await vi.waitFor(() => expect(s.mails).toHaveLength(2));
			expect(s.mails).toEqual(
				expect.arrayContaining([
					meldung(
						partner.email,
						'Eure Anmeldung für «Herren Doppel» ist zurückgezogen.',
						turnierId
					),
					meldung(dritter.email, 'Die Anfrage für «Herren Doppel» ist hinfällig.', turnierId)
				])
			);
			const [z] = await db.select().from(anmeldung).where(eq(anmeldung.id, a.id));
			expect(z.status).toBe('zurueckgezogen');
		});
	}

	test('FR-04, FR-47: Anfragen in beide Richtungen mit demselben Dritten ergeben eine Meldung', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s, ['mitglieder']);
		const ziel = await legeMitgliedAn(db);
		const dritter = await legeMitgliedAn(db);
		const { turnierId, kategorieId } = await offenesDoppel();
		await db.insert(partnerAnfrage).values([
			{ kategorieId, vonId: dritter.mitgliedId, anId: ziel.mitgliedId, gestelltAm: start },
			{ kategorieId, vonId: ziel.mitgliedId, anId: dritter.mitgliedId, gestelltAm: start }
		]);

		const r = await post(postAustritt, s, admin.konto, String(ziel.mitgliedId));

		expect([r.status, await r.json()]).toEqual([200, {}]);
		await vi.waitFor(() => expect(s.mails.length).toBeGreaterThan(0));
		// Beide Meldungen starten vor der Antwort; eine zweite käme gleich nach der ersten.
		await new Promise((fertig) => setTimeout(fertig, 500));
		expect(s.mails).toEqual([
			meldung(dritter.email, 'Die Anfrage für «Herren Doppel» ist hinfällig.', turnierId)
		]);
	});

	test('Ablauf: Wiedereintritt, Löschung vormerken und zurücknehmen; falscher Zustand 409', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s, ['mitglieder']);
		const ziel = await legeMitgliedAn(db);
		const id = String(ziel.mitgliedId);
		const status = async () => (await ladeMitglied(db, ziel.mitgliedId, start))!.status;
		const veraltet = [409, { fehler: 'veraltet' }];
		for (const fn of [postWiedereintritt, postLoeschenRueckgaengig]) {
			const r = await post(fn, s, admin.konto, id);
			expect([r.status, await r.json()]).toEqual(veraltet);
		}
		expect((await post(postAustritt, s, admin.konto, id)).status).toBe(200);
		expect((await post(postWiedereintritt, s, admin.konto, id)).status).toBe(200);
		expect(await status()).toBe('aktiv');
		expect((await post(postLoeschen, s, admin.konto, id)).status).toBe(200);
		expect(await status()).toBe('vorgemerkt');
		const doppelt = await post(postLoeschen, s, admin.konto, id);
		expect([doppelt.status, await doppelt.json()]).toEqual(veraltet);
		expect((await post(postLoeschenRueckgaengig, s, admin.konto, id)).status).toBe(200);
		expect(await status()).toBe('aktiv');
		for (const fn of [postWiedereintritt, postLoeschen, postLoeschenRueckgaengig]) {
			const r = await post(fn, s, admin.konto, '999999999');
			expect([r.status, await r.json()]).toEqual([404, { fehler: 'nicht-gefunden' }]);
		}
	});

	test('RR-10: eigener Austritt und eigenes Vormerken → 409 eigenes-konto, nichts geändert', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s, ['mitglieder']);
		const id = String(admin.mitgliedId);
		for (const fn of [postAustritt, postLoeschen]) {
			const r = await post(fn, s, admin.konto, id);
			expect([r.status, await r.json()]).toEqual([409, { fehler: 'eigenes-konto' }]);
		}
		expect((await ladeMitglied(db, admin.mitgliedId, start))!.status).toBe('aktiv');
		// Das Login bleibt: keine Sitzung beendet.
		expect(await db.select().from(sitzung).where(eq(sitzung.kontoId, admin.kontoId))).toHaveLength(
			1
		);
	});

	test('Wiedereintritt nach der Frist → 409 frist-abgelaufen', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s, ['mitglieder']);
		const ziel = await legeMitgliedAn(db, { status: 'ausgetreten' });
		await db
			.update(mitglied)
			.set({ austrittAm: new Date('2025-01-01T00:00:00Z') })
			.where(eq(mitglied.id, ziel.mitgliedId));
		const r = await post(postWiedereintritt, s, admin.konto, String(ziel.mitgliedId));
		expect([r.status, await r.json()]).toEqual([409, { fehler: 'frist-abgelaufen' }]);
	});

	test('ohne JSON → Formatfehler; in der Ansicht als … → 403 nur-ansehen', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s, ['mytco', 'mitglieder']);
		const ziel = await legeMitgliedAn(db);
		const id = String(ziel.mitgliedId);
		for (const fn of [postAustritt, postWiedereintritt, postLoeschen, postLoeschenRueckgaengig]) {
			const r = await fn(
				s.d,
				ereignis({ contentType: 'text/plain', body: '{}', params: { id }, konto: admin.konto })
			);
			expect([r.status, await r.json()]).toEqual([415, { fehler: 'format' }]);
		}
		await setzeAnsicht(db, admin.konto.sitzungHash, 'mitglieder');
		const inAnsicht: AngemeldetesKonto = { ...admin.konto, ansicht: 'mitglieder' };
		for (const fn of [postAustritt, postWiedereintritt, postLoeschen, postLoeschenRueckgaengig]) {
			const r = await post(fn, s, inAnsicht, id);
			expect([r.status, await r.json()]).toEqual([403, { fehler: 'nur-ansehen' }]);
		}
		expect((await ladeMitglied(db, ziel.mitgliedId, start))!.status).toBe('aktiv');
	});
});

describe('Einlesen', () => {
	const KOPF = 'mitgliedernummer;vorname;nachname;strasse;plz;ort;email';
	const zeile = () => {
		const id = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
		return `S${id};Sina;Schnittstelle;Erfundenweg 1;4600;Olten;schnitt-${id}@example.org`;
	};

	test('A-MITGLIED-07: Vorschau und Übernahme durch den Mitglieder-Admin', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s, ['mitglieder']);
		const text = `${KOPF}\n${zeile()}\n${zeile()}\n`;
		const v = await postEinlesenVorschau(s.d, ereignis({ body: { text }, konto: admin.konto }));
		expect(v.status).toBe(200);
		const vorschau = (await v.json()) as {
			neu: unknown[];
			fehlerhaft: unknown[];
			vorhanden: unknown[];
		};
		expect([vorschau.neu.length, vorschau.fehlerhaft.length, vorschau.vorhanden.length]).toEqual([
			2, 0, 0
		]);
		const r = await postEinlesen(
			s.d,
			ereignis({ body: { text, erwartet: 2 }, konto: admin.konto })
		);
		expect([r.status, await r.json()]).toEqual([200, { angelegt: 2 }]);
		const nochmal = await postEinlesen(
			s.d,
			ereignis({ body: { text, erwartet: 2 }, konto: admin.konto })
		);
		expect([nochmal.status, await nochmal.json()]).toEqual([409, { fehler: 'veraltet' }]);
	});

	test('A-MITGLIED-07: Fehler der Datei → 400 mit Grund, ohne Inhalt der Datei', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s, ['mitglieder']);
		const text = 'vorname;iban\nSina;CH00\n';
		for (const fn of [postEinlesenVorschau, postEinlesen]) {
			const r = await fn(s.d, ereignis({ body: { text, erwartet: 1 }, konto: admin.konto }));
			const antwort = await r.json();
			expect(r.status).toBe(400);
			expect(antwort).toMatchObject({
				fehler: 'datei',
				datei: { grund: 'spalten', unbekannt: ['iban'] }
			});
			expect(JSON.stringify(antwort)).not.toContain('CH00');
		}
	});

	test('SI-10: Text fehlt oder ist keine Zeichenkette, erwartet keine ganze Zahl → 400', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s, ['mitglieder']);
		for (const body of [{}, { text: 5 }, { text: ['a'] }]) {
			const r = await postEinlesenVorschau(s.d, ereignis({ body, konto: admin.konto }));
			expect([r.status, await r.json()]).toEqual([400, { fehler: 'eingabe' }]);
		}
		for (const body of [
			{ text: 'x' },
			{ text: 'x', erwartet: '2' },
			{ text: 'x', erwartet: 1.5 }
		]) {
			const r = await postEinlesen(s.d, ereignis({ body, konto: admin.konto }));
			expect([r.status, await r.json()]).toEqual([400, { fehler: 'eingabe' }]);
		}
	});
});
