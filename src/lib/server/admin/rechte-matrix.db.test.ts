import { count } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import {
	legeEigeneDatenbankAn,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import type { Db } from '../db/index.ts';
import {
	aenderung,
	anlass,
	kategorie,
	mitglied,
	mitteilung,
	sitzung,
	turnier
} from '../db/schema.ts';
import { erstelleBremsen } from '../login/bremse.ts';
import { erstelleSitzung, pruefeSitzung, type AngemeldetesKonto } from '../login/sitzung.ts';
import {
	MITTEILUNG_ADMIN_SCHNITTSTELLEN,
	type MitteilungAdminDienste
} from '../mitteilung/schnittstellen.ts';
import { TURNIER_SCHNITTSTELLEN, postKategorien, postTurniere } from '../turnier/schnittstellen.ts';
import { legeAnlassAn } from '../anlass/anlaesse.ts';
import { ROLLEN } from './rollen.ts';
import {
	ADMIN_SCHNITTSTELLEN,
	getMitglied,
	getMitglieder,
	getRollen,
	getVerlauf,
	postAdminAnlaesse,
	postRollen,
	type AdminDienste
} from './schnittstellen.ts';
import { erstelleZugangDienst } from './zugang.ts';

// Die Zeilenzahlen sind global; darum eine eigene Datenbank statt der gemeinsamen.
let eigene: EigeneDatenbank | undefined;
const db = (): Db => eigene!.db;

beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('rechte_matrix');
});

afterAll(async () => {
	await eigene?.abbauen();
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

// Schreibende Schnittstellen, die der MyTCO-Admin benutzen darf: Rollen vergeben, die eigene
// Bestätigung der Verwaltung (SI-08) und die «Ansicht als …» seiner Sitzung.
const ERLAUBT_FUER_MYTCO: readonly string[] = [
	'postRollen',
	'postZugang',
	'postZugangCode',
	'postAnsicht',
	'postAnsichtBeenden'
];

function baue() {
	const post: { text: string }[] = [];
	const zugang = erstelleZugangDienst({
		db: db(),
		schluessel: 'x'.repeat(40),
		kontakt: 'kontakt@example.org',
		mailer: async (n) => {
			post.push(n);
		},
		bremsen: erstelleBremsen(),
		jetzt: () => start
	});
	// Mit Push und Mailer der Mitteilungen; beide dürfen hier nie aufgerufen werden.
	const d: MitteilungAdminDienste = {
		db: db(),
		zugang,
		hinweis: vi.fn<AdminDienste['hinweis']>(async () => {}),
		jetzt: () => start,
		push: vi.fn<NonNullable<MitteilungAdminDienste['push']>>(async () => 'ok'),
		mailer: vi.fn<MitteilungAdminDienste['mailer']>(async () => {}),
		adresse: 'https://mytco.example.org'
	};
	return { d, post };
}

async function einloggen(kontoId: number): Promise<AngemeldetesKonto> {
	const kennung = await erstelleSitzung(db(), kontoId, start);
	return (await pruefeSitzung(db(), kennung, start))!.konto;
}

async function bestaetigt(s: ReturnType<typeof baue>, rollen: string[]) {
	const m = await legeMitgliedAn(db(), { rollen });
	const konto = await einloggen(m.kontoId);
	await (
		await s.d.zugang.fordereCodeAn(konto)
	).arbeit;
	expect(await s.d.zugang.bestaetige(konto, s.post.at(-1)!.text.slice(0, 6))).toBe('ok');
	return { ...m, konto };
}

const hole = (konto: AngemeldetesKonto, extra: { params?: Record<string, string> } = {}) =>
	ereignis({ method: 'GET', konto, ...extra });

async function zeilen() {
	const n = async (
		t: typeof mitglied | typeof anlass | typeof turnier | typeof kategorie | typeof mitteilung
	) => (await db().select({ n: count() }).from(t))[0].n;
	const [aenderungen] = await db().select({ n: count() }).from(aenderung);
	const [sitzungen] = await db().select({ n: count() }).from(sitzung);
	const kategorien = await db()
		.select({ id: kategorie.id, status: kategorie.status })
		.from(kategorie);
	return {
		mitglied: await n(mitglied),
		anlass: await n(anlass),
		turnier: await n(turnier),
		mitteilung: await n(mitteilung),
		kategorie: kategorien,
		aenderung: aenderungen.n,
		sitzung: sitzungen.n
	};
}

describe('Rechte je Bereich (Regeln 2, 3, 4, 7)', () => {
	test('MyTCO-Admin: jede schreibende Schnittstelle ausser Rollen → 403 kein-recht', async () => {
		const s = baue();
		// Zuerst angelegt: Mitglied, Anlass, Turnier und Kategorie tragen dieselbe Nummer. So zielt jede
		// Schnittstelle auf etwas Bestehendes, und ein Durchlassen fiele an den Zeilen auf.
		const ziel = await legeMitgliedAn(db());
		await einloggen(ziel.kontoId);
		const mitgliederAdmin = await bestaetigt(s, ['mitglieder']);
		const cm = await bestaetigt(s, ['cm']);
		const a = await postAdminAnlaesse(
			s.d,
			ereignis({
				konto: mitgliederAdmin.konto,
				body: {
					titel: 'GV Erfunden',
					beginn: '2027-03-19T19:30',
					ort: 'Clubhaus',
					einladung: 'Traktanden',
					anmeldeschluss: '2027-03-16T23:59'
				}
			})
		);
		const t = await postTurniere(
			s.d,
			ereignis({
				konto: cm.konto,
				body: {
					jahr: 2071,
					name: 'Clubmeisterschaft 2071',
					anmeldeschluss: '2071-05-31',
					nummern: []
				}
			})
		);
		const { id: turnierId } = await t.json();
		const k = await postKategorien(
			s.d,
			ereignis({
				konto: cm.konto,
				params: { id: String(turnierId) },
				body: { name: 'Doppel offen', geschlecht: 'offen', art: 'doppel', mindestsumme: 9 }
			})
		);
		expect([a.status, t.status, k.status]).toEqual([201, 201, 201]);
		const ids = [ziel.mitgliedId, (await a.json()).id, turnierId, (await k.json()).id];
		expect(new Set(ids).size).toBe(1);
		const id = String(ids[0]);

		const mytco = await bestaetigt(s, ['mytco']);
		const schreibende = Object.entries({
			...ADMIN_SCHNITTSTELLEN,
			...TURNIER_SCHNITTSTELLEN,
			...MITTEILUNG_ADMIN_SCHNITTSTELLEN
			// Schreibend ist alles, was nicht liest: Auch ein künftiges delete… oder put… fällt hier auf.
		}).filter(([name]) => !name.startsWith('get') && !ERLAUBT_FUER_MYTCO.includes(name));
		expect(schreibende.length).toBeGreaterThanOrEqual(17);
		const vorher = await zeilen();
		for (const [name, fn] of schreibende) {
			const r = await fn(s.d, ereignis({ konto: mytco.konto, body: {}, params: { id } }));
			expect([name, r.status, await r.json()]).toEqual([name, 403, { fehler: 'kein-recht' }]);
		}
		expect(await zeilen()).toEqual(vorher);
		expect(s.d.hinweis).not.toHaveBeenCalled();
		expect(s.d.push).not.toHaveBeenCalled();
		expect(s.d.mailer).not.toHaveBeenCalled();
	});

	test('MyTCO-Admin: postRollen bleibt erlaubt', async () => {
		const s = baue();
		const mytco = await bestaetigt(s, ['mytco']);
		const ziel = await legeMitgliedAn(db());
		const r = await postRollen(
			s.d,
			ereignis({
				konto: mytco.konto,
				body: { rollen: ['cm'], vorher: [] },
				params: { id: String(ziel.mitgliedId) }
			})
		);
		expect([r.status, await r.json()]).toEqual([200, {}]);
	});

	test('Mitglieder-Admin: postRollen → 403 kein-admin', async () => {
		const s = baue();
		const m = await bestaetigt(s, ['mitglieder']);
		const ziel = await legeMitgliedAn(db());
		const r = await postRollen(
			s.d,
			ereignis({
				konto: m.konto,
				body: { rollen: ['mytco'], vorher: [] },
				params: { id: String(ziel.mitgliedId) }
			})
		);
		expect([r.status, await r.json()]).toEqual([403, { fehler: 'kein-admin' }]);
		const liste = await getRollen(s.d, hole(m.konto));
		expect([liste.status, await liste.json()]).toEqual([403, { fehler: 'kein-admin' }]);
	});

	test('CM-Admin: getMitglieder → 403 kein-admin', async () => {
		const s = baue();
		const cm = await bestaetigt(s, ['cm']);
		const r = await getMitglieder(s.d, hole(cm.konto));
		expect([r.status, await r.json()]).toEqual([403, { fehler: 'kein-admin' }]);
	});

	test('MyTCO-Admin liest Mitglieder, Turniere, Verlauf, Mitteilungen → 200', async () => {
		const s = baue();
		const mytco = await bestaetigt(s, ['mytco']);
		const ziel = await legeMitgliedAn(db(), { nachname: 'Lesbar' });
		const anlassId = String(
			await legeAnlassAn(db(), ziel.mitgliedId, {
				titel: 'GV Erfunden',
				beginn: new Date('2027-03-19T18:30:00Z'),
				ort: 'Clubhaus',
				einladung: '',
				anmeldeschluss: new Date('2027-03-16T22:59:00Z')
			})
		);
		const antworten = [
			await getMitglieder(s.d, hole(mytco.konto)),
			await getMitglied(s.d, hole(mytco.konto, { params: { id: String(ziel.mitgliedId) } })),
			await TURNIER_SCHNITTSTELLEN.getTurniere(s.d, hole(mytco.konto)),
			await getVerlauf(s.d, hole(mytco.konto)),
			await ADMIN_SCHNITTSTELLEN.getFairgate(s.d, hole(mytco.konto)),
			await ADMIN_SCHNITTSTELLEN.getAdminAnlaesse(s.d, hole(mytco.konto)),
			await getRollen(s.d, hole(mytco.konto)),
			await MITTEILUNG_ADMIN_SCHNITTSTELLEN.getVereinMitteilungen(s.d, hole(mytco.konto)),
			await MITTEILUNG_ADMIN_SCHNITTSTELLEN.getAnlassMitteilungen(
				s.d,
				hole(mytco.konto, { params: { id: anlassId } })
			)
		];
		expect(antworten.map((r) => r.status)).toEqual([200, 200, 200, 200, 200, 200, 200, 200, 200]);
		const liste = (await antworten[0].json()) as { id: number }[];
		expect(liste.map((z) => z.id)).toContain(ziel.mitgliedId);
	});

	test('Unbestätigt: lesbarer Bereich → unbestaetigt vor kein-recht; fremder Bereich → kein-admin', async () => {
		const s = baue();
		const mytco = await einloggen((await legeMitgliedAn(db(), { rollen: ['mytco'] })).kontoId);
		const cm = await einloggen((await legeMitgliedAn(db(), { rollen: ['cm'] })).kontoId);
		const faelle: [string, AngemeldetesKonto, number, string][] = [
			['postMitglieder', mytco, 403, 'unbestaetigt'],
			['getRollen', mytco, 403, 'unbestaetigt'],
			['postMitglieder', cm, 403, 'kein-admin'],
			['getRollen', cm, 403, 'kein-admin'],
			['postVereinSenden', mytco, 403, 'unbestaetigt'],
			['getVereinMitteilungen', mytco, 403, 'unbestaetigt'],
			['postVereinSenden', cm, 403, 'kein-admin'],
			['getVereinMitteilungen', cm, 403, 'kein-admin']
		];
		const alle = {
			...ADMIN_SCHNITTSTELLEN,
			...TURNIER_SCHNITTSTELLEN,
			...MITTEILUNG_ADMIN_SCHNITTSTELLEN
		};
		for (const [name, konto, status, fehler] of faelle) {
			const fn = alle[name as keyof typeof alle];
			const r = await fn(
				s.d,
				ereignis({ method: name.startsWith('get') ? 'GET' : 'POST', body: {}, konto })
			);
			expect([name, r.status, await r.json()]).toEqual([name, status, { fehler }]);
		}
	});

	test('getRollen listet nur aktive, nicht gesperrte Konten', async () => {
		const s = baue();
		const mytco = await bestaetigt(s, ['mytco']);
		const aktiv = await legeMitgliedAn(db(), {
			vorname: 'Lia',
			nachname: 'Zuletzt',
			rollen: ['lizenz', 'cm']
		});
		const auchAktiv = await legeMitgliedAn(db(), {
			vorname: 'Lou',
			nachname: 'Anfang',
			rollen: ['lizenz']
		});
		const gesperrt = await legeMitgliedAn(db(), { gesperrt: true, rollen: ['lizenz', 'mytco'] });
		const ausgetreten = await legeMitgliedAn(db(), { status: 'ausgetreten', rollen: ['lizenz'] });
		const geloescht = await legeMitgliedAn(db(), { status: 'geloescht', rollen: ['lizenz'] });

		const r = await getRollen(s.d, hole(mytco.konto));
		expect(r.status).toBe(200);
		expect(r.headers.get('cache-control')).toBe('no-store');
		const liste = (await r.json()) as {
			rolle: string;
			mitglieder: { id: number; name: string }[];
		}[];
		expect(liste.map((z) => z.rolle)).toEqual([...ROLLEN]);
		const von = (rolle: string) => liste.find((z) => z.rolle === rolle)!.mitglieder;
		// Nach Nachname, wie die Mitgliederliste; nur Nummer und Name, keine Kontaktdaten.
		expect(von('lizenz')).toEqual([
			{ id: auchAktiv.mitgliedId, name: 'Anfang, Lou' },
			{ id: aktiv.mitgliedId, name: 'Zuletzt, Lia' }
		]);
		expect(von('cm').map((m) => m.id)).toContain(aktiv.mitgliedId);
		expect(von('mytco').map((m) => m.id)).toContain(mytco.mitgliedId);
		const alleIds = liste.flatMap((z) => z.mitglieder.map((m) => m.id));
		for (const weg of [gesperrt, ausgetreten, geloescht]) {
			expect(alleIds).not.toContain(weg.mitgliedId);
		}
		for (const m of liste.flatMap((z) => z.mitglieder)) {
			expect(Object.keys(m).sort()).toEqual(['id', 'name']);
		}
	});
});
