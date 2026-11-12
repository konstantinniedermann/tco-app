import { eq } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { mitglied, turnier } from '../db/schema.ts';
import { meldeAn } from '../cm/anmeldungen.ts';
import { erstelleBremsen } from '../login/bremse.ts';
import { erstelleSitzung, pruefeSitzung, type AngemeldetesKonto } from '../login/sitzung.ts';
import type { MitteilungAdminDienste } from '../mitteilung/typen.ts';
import { erstelleZugangDienst } from '../admin/zugang.ts';
import {
	TURNIER_SCHNITTSTELLEN,
	getKategorie,
	getTurnier,
	getTurniere,
	postKategorie,
	postKategorieAbsagen,
	postKategorien,
	postTurnier,
	postTurnierStatus,
	postTurniere
} from './schnittstellen.ts';

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

function baue(jetzt: Date = start) {
	const post: { an: string; text: string }[] = [];
	// Meldungen an die Spieler (FR-47): ohne VAPID gehen sie per E-Mail.
	const mails: { an: string; betreff: string; text: string }[] = [];
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
		hinweis: async () => {},
		brief: {
			schluessel: 'y'.repeat(40),
			adresse: 'https://mytco.example.org',
			kontakt: 'kontakt@example.org'
		},
		jetzt: () => jetzt,
		push: null,
		mailer: async (n) => {
			mails.push(n);
		},
		adresse: ADRESSE
	};
	return { d, post, mails };
}

async function einloggen(kontoId: number): Promise<AngemeldetesKonto> {
	const kennung = await erstelleSitzung(db, kontoId, start);
	return (await pruefeSitzung(db, kennung, start))!.konto;
}

async function bestaetigt(s: ReturnType<typeof baue>, rollen: string[]) {
	const m = await legeMitgliedAn(db, { rollen });
	const konto = await einloggen(m.kontoId);
	await (
		await s.d.zugang.fordereCodeAn(konto)
	).arbeit;
	expect(await s.d.zugang.bestaetige(konto, s.post.at(-1)!.text.slice(0, 6))).toBe('ok');
	return konto;
}

// Jahre 2061 bis 2069 gehören dieser Datei, je eines pro Test; vorher aufräumen (gemeinsame DB).
async function freiesJahr(jahr: number) {
	await db.delete(turnier).where(eq(turnier.jahr, jahr));
	return jahr;
}

const turnierAngaben = (jahr: number, extra: object = {}) => ({
	jahr,
	name: `Clubmeisterschaft ${jahr}`,
	anmeldeschluss: `${jahr}-05-31`,
	nummern: [{ bezeichnung: 'Herren', nummer: '123456' }],
	...extra
});

const EINZEL = {
	name: 'Herren R4-R6',
	geschlecht: 'herren',
	art: 'einzel',
	klassierungVon: 'R4',
	klassierungBis: 'R6'
};
const DOPPEL = { name: 'Doppel offen', geschlecht: 'offen', art: 'doppel', mindestsumme: 9 };

const post = (konto: AngemeldetesKonto, body: unknown, params: Record<string, string> = {}) =>
	ereignis({ konto, body, params });
const hole = (konto: AngemeldetesKonto, params: Record<string, string> = {}) =>
	ereignis({ konto, method: 'GET', params });

describe('Turnier-Schnittstellen', () => {
	test('A-TURNIER-01, A-TURNIER-02, RR-07: cm legt Turnier mit Nummern an und liest es', async () => {
		const s = baue();
		const cm = await bestaetigt(s, ['cm']);
		const jahr = await freiesJahr(2061);
		const neu = await postTurniere(s.d, post(cm, turnierAngaben(jahr)));
		expect(neu.status).toBe(201);
		const { id } = await neu.json();
		const detail = await getTurnier(s.d, hole(cm, { id: String(id) }));
		expect(detail.status).toBe(200);
		expect(await detail.json()).toMatchObject({
			id,
			jahr,
			name: `Clubmeisterschaft ${jahr}`,
			status: 'vorbereitung',
			nummern: [{ bezeichnung: 'Herren', nummer: '123456' }],
			kategorien: []
		});
		const liste = await (await getTurniere(s.d, hole(cm))).json();
		expect(liste.find((t: { id: number }) => t.id === id)).toMatchObject({ jahr, kategorien: 0 });
		const geaendert = await postTurnier(
			s.d,
			post(cm, turnierAngaben(jahr, { name: 'Neuer Name', nummern: [] }), { id: String(id) })
		);
		expect(geaendert.status).toBe(200);
		expect(await (await getTurnier(s.d, hole(cm, { id: String(id) }))).json()).toMatchObject({
			name: 'Neuer Name',
			nummern: []
		});
		const falsch = await postTurniere(s.d, post(cm, turnierAngaben(jahr, { name: '' })));
		expect(falsch.status).toBe(400);
		expect(await falsch.json()).toMatchObject({
			fehler: 'eingabe',
			felder: { name: expect.any(String) }
		});
		expect((await getTurnier(s.d, hole(cm, { id: '999999999' }))).status).toBe(404);
		expect((await getTurnier(s.d, hole(cm, { id: 'x' }))).status).toBe(404);
	});

	test('A-TURNIER-03, FR-34: cm legt Einzel- und Doppelkategorie an, Fehler kommen beim Feld', async () => {
		const s = baue();
		const cm = await bestaetigt(s, ['cm']);
		const jahr = await freiesJahr(2062);
		const { id } = await (await postTurniere(s.d, post(cm, turnierAngaben(jahr)))).json();
		const p = { id: String(id) };
		const einzel = await postKategorien(s.d, post(cm, EINZEL, p));
		expect(einzel.status).toBe(201);
		const doppel = await postKategorien(s.d, post(cm, DOPPEL, p));
		expect(doppel.status).toBe(201);
		const k = await getKategorie(s.d, hole(cm, { id: String((await einzel.json()).id) }));
		expect(await k.json()).toMatchObject({
			name: EINZEL.name,
			art: 'einzel',
			klassierungVon: 'R4',
			turnierId: id,
			turnierjahr: jahr
		});
		const ohneKlassierung = await postKategorien(
			s.d,
			post(cm, { ...EINZEL, name: 'Andere', klassierungVon: null, klassierungBis: null }, p)
		);
		expect(ohneKlassierung.status).toBe(400);
		expect((await ohneKlassierung.json()).felder).toHaveProperty('klassierungVon');
		// Jahrgang wird gegen das Turnierjahr geprüft.
		const zuSpaet = await postKategorien(
			s.d,
			post(cm, { ...EINZEL, name: 'Jung', jahrgangBis: jahr + 1 }, p)
		);
		expect(zuSpaet.status).toBe(400);
		expect((await zuSpaet.json()).felder).toHaveProperty('jahrgangBis');
		const doppelt = await postKategorien(s.d, post(cm, { ...EINZEL, name: 'herren r4-r6' }, p));
		expect(doppelt.status).toBe(409);
		expect(await doppelt.json()).toEqual({ fehler: 'vergeben', feld: 'name' });
		expect((await postKategorien(s.d, post(cm, EINZEL, { id: '999999999' }))).status).toBe(404);
		// Ändern: gleicher Name bei der eigenen Kategorie geht, bei der anderen nicht.
		const eigene = String((await (await getTurnier(s.d, hole(cm, p))).json()).kategorien[0].id);
		const ok = await postKategorie(
			s.d,
			post(cm, { ...EINZEL, klassierungBis: 'R7' }, { id: eigene })
		);
		expect(ok.status).toBe(200);
		const kollision = await postKategorie(
			s.d,
			post(cm, { ...EINZEL, name: DOPPEL.name }, { id: eigene })
		);
		expect(kollision.status).toBe(409);
		expect(await kollision.json()).toEqual({ fehler: 'vergeben', feld: 'name' });
		expect((await postKategorie(s.d, post(cm, EINZEL, { id: '999999999' }))).status).toBe(404);
	});

	test('A-ANMELDUNG-07, FR-33: öffnen, schliessen, wieder öffnen; nach Ablauf 409 schluss-vorbei', async () => {
		const s = baue();
		const cm = await bestaetigt(s, ['cm']);
		const jahr = await freiesJahr(2063);
		const { id } = await (await postTurniere(s.d, post(cm, turnierAngaben(jahr)))).json();
		const p = { id: String(id) };
		const status = async (d: MitteilungAdminDienste, body: unknown) => {
			const a = await postTurnierStatus(d, post(cm, body, p));
			return [a.status, await a.json()];
		};
		expect(await status(s.d, { status: 'offen' })).toEqual([409, { fehler: 'keine-kategorie' }]);
		await postKategorien(s.d, post(cm, EINZEL, p));
		expect(await status(s.d, { status: 'geschlossen' })).toEqual([409, { fehler: 'unzulaessig' }]);
		expect(await status(s.d, { status: 'offen' })).toEqual([200, {}]);
		expect((await (await getTurnier(s.d, hole(cm, p))).json()).status).toBe('offen');
		expect(await status(s.d, { status: 'offen' })).toEqual([409, { fehler: 'unzulaessig' }]);
		expect(await status(s.d, { status: 'geschlossen' })).toEqual([200, {}]);
		expect(await status(s.d, { status: 'offen' })).toEqual([200, {}]);
		expect(await status(s.d, { status: 'vorbereitung' })).toEqual([400, { fehler: 'eingabe' }]);
		expect(await status(s.d, {})).toEqual([400, { fehler: 'eingabe' }]);
		// Nach dem Anmeldeschluss gilt das Turnier als geschlossen; wieder öffnen geht nicht.
		const spaet = baue(new Date(`${jahr}-06-01T12:00:00Z`)).d;
		expect((await (await getTurnier(spaet, hole(cm, p))).json()).status).toBe('geschlossen');
		expect(await status(spaet, { status: 'offen' })).toEqual([409, { fehler: 'schluss-vorbei' }]);
		const nirgends = await postTurnierStatus(
			s.d,
			post(cm, { status: 'offen' }, { id: '999999999' })
		);
		expect(nirgends.status).toBe(404);
	});

	test('FR-33: Jahr doppelt ergibt 409 vergeben mit feld jahr', async () => {
		const s = baue();
		const cm = await bestaetigt(s, ['cm']);
		const jahr = await freiesJahr(2064);
		const anderes = await freiesJahr(2065);
		const { id } = await (await postTurniere(s.d, post(cm, turnierAngaben(jahr)))).json();
		const zweites = await postTurniere(s.d, post(cm, turnierAngaben(jahr)));
		expect(zweites.status).toBe(409);
		expect(await zweites.json()).toEqual({ fehler: 'vergeben', feld: 'jahr' });
		const { id: id2 } = await (await postTurniere(s.d, post(cm, turnierAngaben(anderes)))).json();
		const umziehen = await postTurnier(s.d, post(cm, turnierAngaben(jahr), { id: String(id2) }));
		expect(umziehen.status).toBe(409);
		expect(await umziehen.json()).toEqual({ fehler: 'vergeben', feld: 'jahr' });
		expect(id).not.toBe(id2);
		expect(
			(await postTurnier(s.d, post(cm, turnierAngaben(jahr), { id: '999999999' }))).status
		).toBe(404);
	});

	test('FR-55: Kontaktperson: nur CM-Admins, sonst 400 mit Feld kontakt', async () => {
		const s = baue();
		const cm = await bestaetigt(s, ['cm']);
		const jahr = await freiesJahr(2071);
		const { id } = await (await postTurniere(s.d, post(cm, turnierAngaben(jahr)))).json();
		const admin = await legeMitgliedAn(db, { rollen: ['cm'] });
		const ohne = await legeMitgliedAn(db);
		const falsch = await postTurnier(
			s.d,
			post(cm, turnierAngaben(jahr, { kontakt: ohne.mitgliedId }), { id: String(id) })
		);
		expect(falsch.status).toBe(400);
		expect(await falsch.json()).toEqual({
			fehler: 'eingabe',
			felder: { kontakt: 'Diese Person ist nicht CM-Admin.' }
		});
		const gut = await postTurnier(
			s.d,
			post(cm, turnierAngaben(jahr, { kontakt: admin.mitgliedId }), { id: String(id) })
		);
		expect(gut.status).toBe(200);
		const t = await (await getTurnier(s.d, hole(cm, { id: String(id) }))).json();
		expect(t.kontakt).toMatchObject({ mitgliedId: admin.mitgliedId, gueltig: true });
	});

	test('FR-35: absagen, danach ändern ergibt 409 abgesagt', async () => {
		const s = baue();
		const cm = await bestaetigt(s, ['cm']);
		const jahr = await freiesJahr(2066);
		const { id } = await (await postTurniere(s.d, post(cm, turnierAngaben(jahr)))).json();
		const { id: kid } = await (
			await postKategorien(s.d, post(cm, EINZEL, { id: String(id) }))
		).json();
		const k = { id: String(kid) };
		expect((await postKategorieAbsagen(s.d, post(cm, {}, k))).status).toBe(200);
		expect(await (await getKategorie(s.d, hole(cm, k))).json()).toMatchObject({
			status: 'abgesagt'
		});
		const aendern = await postKategorie(s.d, post(cm, EINZEL, k));
		expect(aendern.status).toBe(409);
		expect(await aendern.json()).toEqual({ fehler: 'abgesagt' });
		// Der Name ist wieder frei.
		expect((await postKategorien(s.d, post(cm, EINZEL, { id: String(id) }))).status).toBe(201);
		expect((await postKategorieAbsagen(s.d, post(cm, {}, { id: '999999999' }))).status).toBe(404);
		expect((await postKategorieAbsagen(s.d, post(cm, {}, { id: 'x' }))).status).toBe(404);
	});

	test('FR-36, FR-35: 409 unpassend und hat-anmeldungen mit anzahl', async () => {
		const s = baue();
		const cm = await bestaetigt(s, ['cm']);
		const jahr = await freiesJahr(2067);
		const { id } = await (await postTurniere(s.d, post(cm, turnierAngaben(jahr)))).json();
		const { id: kid } = await (
			await postKategorien(s.d, post(cm, EINZEL, { id: String(id) }))
		).json();
		const k = { id: String(kid) };
		const vorSchluss = new Date(`${jahr}-05-01T10:00:00Z`);
		expect(
			(
				await postTurnierStatus(
					baue(vorSchluss).d,
					post(cm, { status: 'offen' }, { id: String(id) })
				)
			).status
		).toBe(200);
		const m = await legeMitgliedAn(db, {});
		await db
			.update(mitglied)
			.set({ geschlecht: 'm', jahrgang: 1990, klassierung: 'R5' })
			.where(eq(mitglied.id, m.mitgliedId));
		expect(await meldeAn(db, kid, m.mitgliedId, vorSchluss)).toBe('ok');

		const enger = { ...EINZEL, klassierungVon: 'R1', klassierungBis: 'R2' };
		for (const trotzdem of [undefined, false, 'true', 1]) {
			const r = await postKategorie(s.d, post(cm, { ...enger, trotzdem }, k));
			expect([r.status, await r.json()]).toEqual([409, { fehler: 'unpassend', anzahl: 1 }]);
		}
		const ok = await postKategorie(s.d, post(cm, { ...enger, trotzdem: true }, k));
		expect([ok.status, await ok.json()]).toEqual([200, {}]);
		// FR-36: Einzel oder Doppel wechseln geht mit Anmeldung nicht, auch nicht mit trotzdem.
		const gesperrt = await postKategorie(s.d, post(cm, { ...DOPPEL, trotzdem: true }, k));
		expect([gesperrt.status, await gesperrt.json()]).toEqual([409, { fehler: 'art-gesperrt' }]);
		const a = await postKategorieAbsagen(s.d, post(cm, {}, k));
		expect([a.status, await a.json()]).toEqual([409, { fehler: 'hat-anmeldungen', anzahl: 1 }]);
		expect((await (await getKategorie(s.d, hole(cm, k))).json()).anmeldungen).toBe(1);
	});

	test('RR-07: ohne Rolle 403, unbestätigt 403 unbestaetigt, MyTCO-Admin nur lesend, Mitglieder- und Lizenz-Admin 403, ändernd ohne JSON 415', async () => {
		const s = baue();
		const normal = await einloggen((await legeMitgliedAn(db)).kontoId);
		const unbestaetigt = await einloggen((await legeMitgliedAn(db, { rollen: ['cm'] })).kontoId);
		const cm = await bestaetigt(s, ['cm']);
		const mytco = await bestaetigt(s, ['mytco']);
		const mitglieder = await bestaetigt(s, ['mitglieder']);
		// `lizenz` öffnet die Verwaltung noch nicht und kann sie darum auch nicht bestätigen.
		const lizenz = await einloggen((await legeMitgliedAn(db, { rollen: ['lizenz'] })).kontoId);
		const mach = (name: string, konto?: AngemeldetesKonto) =>
			ereignis({
				method: name.startsWith('get') ? 'GET' : 'POST',
				body: {},
				params: { id: '999999999' },
				konto
			});
		expect(Object.keys(TURNIER_SCHNITTSTELLEN)).toHaveLength(9);
		for (const [name, fn] of Object.entries(TURNIER_SCHNITTSTELLEN)) {
			const ohne = await fn(s.d, mach(name));
			expect([name, ohne.status, await ohne.json()]).toEqual([name, 401, { fehler: 'abgemeldet' }]);
			const keine = await fn(s.d, mach(name, normal));
			expect([name, keine.status, await keine.json()]).toEqual([
				name,
				403,
				{ fehler: 'kein-admin' }
			]);
			const unb = await fn(s.d, mach(name, unbestaetigt));
			expect([name, unb.status, await unb.json()]).toEqual([name, 403, { fehler: 'unbestaetigt' }]);
			const a = await fn(s.d, mach(name, cm));
			expect([name, a.status]).not.toContain(401);
			expect([name, a.status]).not.toContain(403);
			// Regel 3: Der MyTCO-Admin liest; Regel 4: Der Mitglieder-Admin vertritt den CM-Admin nicht.
			const m = await fn(s.d, mach(name, mytco));
			if (name.startsWith('post')) {
				expect([name, m.status, await m.json()]).toEqual([name, 403, { fehler: 'kein-recht' }]);
			} else {
				expect([name, m.status]).not.toContain(403);
			}
			const v = await fn(s.d, mach(name, mitglieder));
			expect([name, v.status, await v.json()]).toEqual([name, 403, { fehler: 'kein-admin' }]);
			const l = await fn(s.d, mach(name, lizenz));
			expect([name, l.status, await l.json()]).toEqual([name, 403, { fehler: 'kein-admin' }]);
			if (name.startsWith('post')) {
				const roh = ereignis({
					konto: cm,
					body: 'x',
					contentType: 'text/plain',
					params: { id: '1' }
				});
				expect([name, (await fn(s.d, roh)).status]).toEqual([name, 415]);
			}
		}
		// Abgewiesenes und Unbekanntes meldet niemandem etwas.
		expect(s.mails).toEqual([]);
	});

	test('SI-05: keine Schnittstelle loggt', async () => {
		const s = baue();
		const cm = await bestaetigt(s, ['cm']);
		const jahr = await freiesJahr(2067);
		const { id } = await (await postTurniere(s.d, post(cm, turnierAngaben(jahr)))).json();
		await postTurniere(s.d, post(cm, turnierAngaben(jahr)));
		await postKategorien(s.d, post(cm, EINZEL, { id: String(id) }));
		await postKategorien(s.d, post(cm, EINZEL, { id: String(id) }));
		await postTurnier(s.d, post(cm, {}, { id: String(id) }));
		// Die Prüfung, dass nichts geloggt wurde, läuft in afterEach.
		for (const l of logs) expect(l).not.toHaveBeenCalled();
	});
});
