// Schnittstellen der Verwaltung zu Anlässen (A-ANLASS-01). Mit Schritt 09 aus
// `admin/schnittstellen.db.test.ts` hierher gezogen: die zwei Rechte-Schleifen über die eigene
// Liste, 415 bei `text/plain` und der Ablauf anlegen, ändern, lesen, löschen. Die Schleife über alle
// Listen der Verwaltung steht in `grundpruefung.db.test.ts`.
import { and, eq } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import type { AdminDienste } from '../admin/rechte.ts';
import { erstelleZugangDienst } from '../admin/zugang.ts';
import { erstelleDb } from '../db/index.ts';
import { kontoRolle } from '../db/schema.ts';
import { erstelleBremsen } from '../login/bremse.ts';
import { erstelleSitzung, pruefeSitzung, type AngemeldetesKonto } from '../login/sitzung.ts';
import { getAnlaesse } from './schnittstellen.ts';
import {
	ANLASS_ADMIN_SCHNITTSTELLEN,
	getAdminAnlaesse,
	getAdminAnlass,
	postAdminAnlaesse,
	postAdminAnlass,
	postAdminAnlassLoeschen
} from './verwaltung-schnittstellen.ts';

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

describe('Anlass-Schnittstellen der Verwaltung', () => {
	test('RR-07, RR-09: jede antwortet ohne Sitzung 401, ohne Rolle 403, unbestätigt 403', async () => {
		const s = baue();
		const normal = await einloggen((await legeMitgliedAn(db)).kontoId);
		const unbestaetigt = await einloggen(
			(await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] })).kontoId
		);
		const geschuetzt = Object.entries(ANLASS_ADMIN_SCHNITTSTELLEN);
		expect(geschuetzt).toHaveLength(5);
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

	test('RR-07: cm bekommt an ihnen 403 kein-admin', async () => {
		const s = baue();
		const cm = await bestaetigterAdmin(s, ['cm']);
		// War Admin und CM; Admin wird entzogen: die bestätigte Sitzung verliert die Admin-Endpunkte sofort.
		const ehemals = await bestaetigterAdmin(s, ['mitglieder', 'cm']);
		await db
			.delete(kontoRolle)
			.where(and(eq(kontoRolle.kontoId, ehemals.kontoId), eq(kontoRolle.rolle, 'mitglieder')));
		const geschuetzt = Object.entries(ANLASS_ADMIN_SCHNITTSTELLEN);
		expect(geschuetzt).toHaveLength(5);
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

	test('SI-10: die ändernden lehnen text/plain mit 415 ab', async () => {
		const s = baue();
		const admin = await bestaetigterAdmin(s);
		for (const fn of [postAdminAnlaesse, postAdminAnlass, postAdminAnlassLoeschen]) {
			const r = await fn(
				s.d,
				ereignis({ contentType: 'text/plain', body: '{}', params: { id: '1' }, konto: admin.konto })
			);
			expect(r.status).toBe(415);
			expect(await r.json()).toEqual({ fehler: 'format' });
		}
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
