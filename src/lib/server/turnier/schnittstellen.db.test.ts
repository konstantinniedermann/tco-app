import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { aenderung, anmeldung, anmeldungSpieler, turnier, mitglied } from '../db/schema.ts';
import { meldeAn } from '../cm/anmeldungen.ts';
import { erstelleBremsen } from '../login/bremse.ts';
import { erstelleSitzung, pruefeSitzung, type AngemeldetesKonto } from '../login/sitzung.ts';
import type { MitteilungAdminDienste } from '../mitteilung/schnittstellen.ts';
import { erstelleZugangDienst } from '../admin/zugang.ts';
import type { KategorieWerte } from './angaben.ts';
import { legeKategorieAn, legeTurnierAn, setzeStatus } from './turniere.ts';
import {
	TURNIER_SCHNITTSTELLEN,
	getAnmeldungen,
	getKategorie,
	getSpieler,
	getTurnier,
	getTurniere,
	postAnmeldungLoeschen,
	postAnmeldungVonHand,
	postEntscheid,
	postKategorie,
	postKategorieAbsagen,
	postKategorien,
	postKlassierung,
	postTurnier,
	postTurnierStatus,
	postTurniere,
	postVerschieben
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
		expect(Object.keys(TURNIER_SCHNITTSTELLEN)).toHaveLength(16);
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

// Anmeldungen verwalten (Teil 4): Turniere in zufälligen Jahren wie in cm/verwaltung.db.test.ts,
// damit sie sich nicht mit den festen Jahren oben und anderen Testdateien überschneiden.
const zufallsJahr = () => 3000 + Math.floor(Math.random() * 6000);

async function kategorieIn(turnierId: number, name: string, teil: Partial<KategorieWerte> = {}) {
	const r = await legeKategorieAn(db, turnierId, {
		name,
		geschlecht: 'herren',
		art: 'einzel',
		jahrgangVon: null,
		jahrgangBis: null,
		klassierungVon: 'R1',
		klassierungBis: 'R5',
		mindestsumme: null,
		...teil
	});
	if (r.ergebnis !== 'ok') throw new Error(`Kategorie ${name}: ${r.ergebnis}`);
	return r.id;
}

/** Turnier mit den Kategorien (Herren R1–R5, ausser angegeben), offen oder in Vorbereitung. */
async function cmTurnier(kategorien: [string, Partial<KategorieWerte>?][], offen = true) {
	for (;;) {
		const jahr = zufallsJahr();
		const r = await legeTurnierAn(db, {
			jahr,
			name: `Clubmeisterschaft ${jahr}`,
			anmeldeschluss: `${jahr}-05-31`,
			nummern: []
		});
		if (r.ergebnis !== 'ok') continue;
		const ids: number[] = [];
		for (const [name, teil] of kategorien) ids.push(await kategorieIn(r.id, name, teil));
		const jetzt = new Date(`${jahr}-05-01T10:00:00Z`);
		if (offen) expect(await setzeStatus(db, r.id, 'offen', jetzt)).toBe('ok');
		return { id: r.id, jetzt, kategorien: ids };
	}
}

/** Erfundener Spieler: Herr, Jahrgang 1990, ohne Angabe R3. */
async function spieler(klassierung: string | null = 'R3', nachname = 'Muster') {
	const m = await legeMitgliedAn(db, { nachname });
	await db
		.update(mitglied)
		.set({ geschlecht: 'm', jahrgang: 1990, klassierung })
		.where(eq(mitglied.id, m.mitgliedId));
	return m;
}

async function antrag(kategorieId: number, mitgliedId: number, jetzt: Date) {
	const [a] = await db
		.insert(anmeldung)
		.values({
			kategorieId,
			status: 'beantragt',
			kommentar: 'Möchte mich messen.',
			angemeldetAm: jetzt,
			geaendertAm: jetzt
		})
		.returning({ id: anmeldung.id });
	await db.insert(anmeldungSpieler).values({ anmeldungId: a.id, mitgliedId });
	return a.id;
}

async function statusVon(anmeldungId: number) {
	const [a] = await db
		.select({ status: anmeldung.status, kategorieId: anmeldung.kategorieId })
		.from(anmeldung)
		.where(eq(anmeldung.id, anmeldungId));
	return a;
}

/** Die eine Anmeldung des Mitglieds in dieser Kategorie. */
async function anmeldungIn(kategorieId: number, mitgliedId: number) {
	const [a] = await db
		.select({ id: anmeldung.id })
		.from(anmeldung)
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.where(
			and(eq(anmeldung.kategorieId, kategorieId), eq(anmeldungSpieler.mitgliedId, mitgliedId))
		);
	return a.id;
}

const link = (turnierId: number) => `${ADRESSE}/clubmeisterschaft/${turnierId}`;
const meldung = (an: string, text: string, turnierId: number) => ({
	an,
	betreff: 'Clubmeisterschaft',
	text: `${text}\n\n${link(turnierId)}`
});

const antwortVon = async (r: Response) => [r.status, await r.json()];

describe('Anmeldungen verwalten (Teil 4)', () => {
	test('A-ANMELDUNG-06, FR-46, FR-47: von Hand anmelden warnt, mit trotzdem gilt es, Meldung an den Spieler', async () => {
		const t = await cmTurnier([['Herren A']]);
		const s = baue(t.jetzt);
		const cm = await bestaetigt(s, ['cm']);
		const k = { id: String(t.kategorien[0]) };
		const r8 = await spieler('R8');

		const warnung = await postAnmeldungVonHand(s.d, post(cm, { mitgliedId: r8.mitgliedId }, k));
		expect(await antwortVon(warnung)).toEqual([
			409,
			{ fehler: 'warnung', warnungen: ['passt-nicht'] }
		]);
		expect(s.mails).toEqual([]);
		const ok = await postAnmeldungVonHand(
			s.d,
			post(cm, { mitgliedId: r8.mitgliedId, trotzdem: true }, k)
		);
		expect(await antwortVon(ok)).toEqual([200, {}]);
		// M-1: Die Antwort wartet nicht auf die Meldung; der Test wartet auf den Versand.
		await vi.waitFor(() =>
			expect(s.mails).toEqual([
				meldung(
					r8.email,
					'Der CM-Admin hat dich in «Herren A» angemeldet. Gegner sehen deine E-Mail und Telefonnummer.',
					t.id
				)
			])
		);
		const doppelt = await postAnmeldungVonHand(
			s.d,
			post(cm, { mitgliedId: r8.mitgliedId, trotzdem: true }, k)
		);
		expect(await antwortVon(doppelt)).toEqual([409, { fehler: 'schon-angemeldet' }]);
		expect(s.mails).toHaveLength(1);

		// Liste der Kategorie: der Spieler, bestätigt.
		const liste = await getAnmeldungen(s.d, hole(cm, k));
		expect(liste.status).toBe(200);
		expect(await liste.json()).toEqual([
			expect.objectContaining({
				mitgliedId: r8.mitgliedId,
				status: 'bestaetigt',
				klassierung: 'R8',
				geschlecht: 'm',
				jahrgang: 1990
			})
		]);
		expect((await getAnmeldungen(s.d, hole(cm, { id: '999999999' }))).status).toBe(404);
		expect((await getAnmeldungen(s.d, hole(cm, { id: 'x' }))).status).toBe(404);
	});

	test('A-ANMELDUNG-06, FR-46: von Hand anmelden prüft die Eingabe, 404 und vorbereitung', async () => {
		const t = await cmTurnier([['Herren A']]);
		const vorbereitet = await cmTurnier([['Herren A']], false);
		const s = baue(t.jetzt);
		const cm = await bestaetigt(s, ['cm']);
		const k = { id: String(t.kategorien[0]) };
		const r3 = await spieler('R3');
		for (const body of [
			{},
			{ mitgliedId: String(r3.mitgliedId) },
			{ mitgliedId: 1.5 },
			{ mitgliedId: 0 },
			{ mitgliedId: 1e21 },
			{ mitgliedId: r3.mitgliedId, trotzdem: 'true' },
			{ mitgliedId: r3.mitgliedId, trotzdem: 1 }
		]) {
			const r = await postAnmeldungVonHand(s.d, post(cm, body, k));
			expect([body, ...(await antwortVon(r))]).toEqual([body, 400, { fehler: 'eingabe' }]);
		}
		const fremd = await postAnmeldungVonHand(
			s.d,
			post(cm, { mitgliedId: r3.mitgliedId }, { id: '999999999' })
		);
		expect(fremd.status).toBe(404);
		const niemand = await postAnmeldungVonHand(s.d, post(cm, { mitgliedId: 999999999 }, k));
		expect(niemand.status).toBe(404);
		const vor = await postAnmeldungVonHand(
			s.d,
			post(cm, { mitgliedId: r3.mitgliedId }, { id: String(vorbereitet.kategorien[0]) })
		);
		expect(await antwortVon(vor)).toEqual([409, { fehler: 'vorbereitung' }]);
		expect(s.mails).toEqual([]);
	});

	test('FR-46, FR-47: verschieben warnt, mit trotzdem gilt es, Meldung von – nach', async () => {
		const t = await cmTurnier([
			['Herren A'],
			['Herren B', { klassierungVon: 'R6', klassierungBis: 'R9' }],
			['Herren C']
		]);
		const [a, b, c] = t.kategorien;
		const s = baue(t.jetzt);
		const cm = await bestaetigt(s, ['cm']);
		const r3 = await spieler('R3');
		expect(await meldeAn(db, a, r3.mitgliedId, t.jetzt)).toBe('ok');
		expect(await meldeAn(db, c, r3.mitgliedId, t.jetzt)).toBe('ok');
		const id = { id: String(await anmeldungIn(a, r3.mitgliedId)) };

		const warnung = await postVerschieben(s.d, post(cm, { kategorieId: b }, id));
		expect(await antwortVon(warnung)).toEqual([
			409,
			{ fehler: 'warnung', warnungen: ['passt-nicht'] }
		]);
		const besetzt = await postVerschieben(s.d, post(cm, { kategorieId: c, trotzdem: true }, id));
		expect(await antwortVon(besetzt)).toEqual([409, { fehler: 'schon-angemeldet' }]);
		expect(s.mails).toEqual([]);
		const ok = await postVerschieben(s.d, post(cm, { kategorieId: b, trotzdem: true }, id));
		expect(await antwortVon(ok)).toEqual([200, {}]);
		expect(await statusVon(Number(id.id))).toEqual({ status: 'bestaetigt', kategorieId: b });
		await vi.waitFor(() =>
			expect(s.mails).toEqual([
				meldung(r3.email, 'Der CM-Admin hat dich von «Herren A» nach «Herren B» verschoben.', t.id)
			])
		);

		for (const body of [{}, { kategorieId: String(a) }, { kategorieId: a, trotzdem: 'ja' }]) {
			const r = await postVerschieben(s.d, post(cm, body, id));
			expect([body, ...(await antwortVon(r))]).toEqual([body, 400, { fehler: 'eingabe' }]);
		}
		const weg = await postVerschieben(s.d, post(cm, { kategorieId: a }, { id: '999999999' }));
		expect(weg.status).toBe(404);
		expect(s.mails).toHaveLength(1);
	});

	test('FR-46, FR-47: löschen zieht die Anmeldung zurück, Meldung an den Spieler', async () => {
		const t = await cmTurnier([['Herren A']]);
		const s = baue(t.jetzt);
		const cm = await bestaetigt(s, ['cm']);
		const r3 = await spieler('R3');
		expect(await meldeAn(db, t.kategorien[0], r3.mitgliedId, t.jetzt)).toBe('ok');
		const anmeldungId = await anmeldungIn(t.kategorien[0], r3.mitgliedId);
		const id = { id: String(anmeldungId) };

		expect(await antwortVon(await postAnmeldungLoeschen(s.d, post(cm, {}, id)))).toEqual([200, {}]);
		expect((await statusVon(anmeldungId)).status).toBe('zurueckgezogen');
		await vi.waitFor(() =>
			expect(s.mails).toEqual([
				meldung(r3.email, 'Der CM-Admin hat deine Anmeldung für «Herren A» gelöscht.', t.id)
			])
		);
		expect((await postAnmeldungLoeschen(s.d, post(cm, {}, id))).status).toBe(404);
		expect((await postAnmeldungLoeschen(s.d, post(cm, {}, { id: 'x' }))).status).toBe(404);
		expect(s.mails).toHaveLength(1);
	});

	test('FR-08, FR-47: Entscheid bestätigt oder lehnt ab, Grund freiwillig bis 200 Zeichen', async () => {
		const t = await cmTurnier([['Herren A']]);
		const s = baue(t.jetzt);
		const cm = await bestaetigt(s, ['cm']);
		const k = t.kategorien[0];
		const [ja, nein, ohne, lang] = [
			await spieler('R8'),
			await spieler('R8'),
			await spieler('R8'),
			await spieler('R8')
		];
		const antraege = {
			ja: String(await antrag(k, ja.mitgliedId, t.jetzt)),
			nein: String(await antrag(k, nein.mitgliedId, t.jetzt)),
			ohne: String(await antrag(k, ohne.mitgliedId, t.jetzt)),
			lang: String(await antrag(k, lang.mitgliedId, t.jetzt))
		};
		const entscheid = (anmeldungId: string, body: unknown) =>
			postEntscheid(s.d, post(cm, body, { id: anmeldungId }));

		for (const body of [
			{},
			{ bestaetigt: 'ja' },
			{ bestaetigt: 1 },
			{ bestaetigt: false, grund: 5 },
			{ bestaetigt: false, grund: 'x'.repeat(201) },
			{ bestaetigt: false, grund: ` ${'x'.repeat(201)} ` }
		]) {
			const r = await entscheid(antraege.lang, body);
			expect([body, ...(await antwortVon(r))]).toEqual([body, 400, { fehler: 'eingabe' }]);
		}
		expect((await statusVon(Number(antraege.lang))).status).toBe('beantragt');
		expect(s.mails).toEqual([]);

		// Die Antwort wartet nicht auf die Meldung: nach jedem Entscheid auf die Mail warten, damit
		// die Reihenfolge feststeht.
		const zweihundert = 'y'.repeat(200);
		const entscheide: [string, object][] = [
			[antraege.ja, { bestaetigt: true }],
			[antraege.nein, { bestaetigt: false, grund: '  Zu stark.  ' }],
			[antraege.ohne, { bestaetigt: false, grund: '   ' }],
			[antraege.lang, { bestaetigt: false, grund: zweihundert }]
		];
		for (const [i, [anmeldungId, body]] of entscheide.entries()) {
			expect(await antwortVon(await entscheid(anmeldungId, body))).toEqual([200, {}]);
			await vi.waitFor(() => expect(s.mails).toHaveLength(i + 1));
		}
		expect((await statusVon(Number(antraege.ja))).status).toBe('bestaetigt');
		expect((await statusVon(Number(antraege.nein))).status).toBe('abgelehnt');
		expect(s.mails).toEqual([
			meldung(ja.email, 'Deine Wildcard für «Herren A» ist bestätigt.', t.id),
			meldung(nein.email, 'Deine Wildcard für «Herren A» ist abgelehnt. Grund: Zu stark.', t.id),
			meldung(ohne.email, 'Deine Wildcard für «Herren A» ist abgelehnt.', t.id),
			meldung(
				lang.email,
				`Deine Wildcard für «Herren A» ist abgelehnt. Grund: ${zweihundert}`,
				t.id
			)
		]);

		const nochmals = await entscheid(antraege.ja, { bestaetigt: false });
		expect(await antwortVon(nochmals)).toEqual([409, { fehler: 'nicht-beantragt' }]);
		expect((await entscheid('999999999', { bestaetigt: true })).status).toBe(404);
		expect(s.mails).toHaveLength(4);
	});

	test('FR-47: Die Antwort wartet nicht auf die Meldung an den Spieler', async () => {
		const t = await cmTurnier([['Herren A']]);
		const s = baue(t.jetzt);
		const cm = await bestaetigt(s, ['cm']);
		const r3 = await spieler('R3');
		expect(await meldeAn(db, t.kategorien[0], r3.mitgliedId, t.jetzt)).toBe('ok');
		const id = { id: String(await anmeldungIn(t.kategorien[0], r3.mitgliedId)) };
		// Der Versand hängt, bis der Test ihn freigibt.
		let freigeben = () => {};
		const haengt = new Promise<void>((r) => (freigeben = r));
		const versandt: string[] = [];
		const d = {
			...s.d,
			mailer: async (n: { an: string }) => {
				await haengt;
				versandt.push(n.an);
			}
		};
		expect(await antwortVon(await postAnmeldungLoeschen(d, post(cm, {}, id)))).toEqual([200, {}]);
		expect(versandt).toEqual([]);
		freigeben();
		await vi.waitFor(() => expect(versandt).toEqual([r3.email]));
	});

	test('FR-47, FR-26: Handelt der CM-Admin bei sich selbst, gibt es keine Meldung; der Verlauf nennt ihn', async () => {
		const t = await cmTurnier([['Herren A'], ['Herren B'], ['Herren C']]);
		const [a, b, c] = t.kategorien;
		const s = baue(t.jetzt);
		const cm = await bestaetigt(s, ['cm']);

		const an = await postAnmeldungVonHand(
			s.d,
			post(cm, { mitgliedId: cm.mitgliedId, trotzdem: true }, { id: String(a) })
		);
		expect(await antwortVon(an)).toEqual([200, {}]);
		const id = { id: String(await anmeldungIn(a, cm.mitgliedId)) };
		const weiter = await postVerschieben(s.d, post(cm, { kategorieId: b, trotzdem: true }, id));
		expect(await antwortVon(weiter)).toEqual([200, {}]);
		expect(await antwortVon(await postAnmeldungLoeschen(s.d, post(cm, {}, id)))).toEqual([200, {}]);
		const eigenerAntrag = { id: String(await antrag(c, cm.mitgliedId, t.jetzt)) };
		const ja = await postEntscheid(s.d, post(cm, { bestaetigt: true }, eigenerAntrag));
		expect(await antwortVon(ja)).toEqual([200, {}]);

		// Danach eine Meldung an einen anderen Spieler: Sie ist die einzige.
		const r3 = await spieler('R3');
		const fremd = await postAnmeldungVonHand(
			s.d,
			post(cm, { mitgliedId: r3.mitgliedId }, { id: String(a) })
		);
		expect(await antwortVon(fremd)).toEqual([200, {}]);
		await vi.waitFor(() => expect(s.mails).toHaveLength(1));
		expect(s.mails[0].an).toBe(r3.email);

		const verlauf = await db
			.select({
				urheberArt: aenderung.urheberArt,
				von: aenderung.urheberMitgliedId,
				aktion: aenderung.aktion,
				detail: aenderung.detail
			})
			.from(aenderung)
			.where(eq(aenderung.mitgliedId, cm.mitgliedId))
			.orderBy(aenderung.id);
		const eintrag = (aktion: string) => ({
			urheberArt: 'admin',
			von: cm.mitgliedId,
			aktion,
			detail: null
		});
		expect(verlauf).toEqual([
			eintrag('cm-anmeldung-geaendert'),
			eintrag('cm-anmeldung-geaendert'),
			eintrag('cm-anmeldung-geaendert'),
			eintrag('cm-anmeldung-geaendert')
		]);
	});

	test('A-ANMELDUNG-06: Spielersuche nach Namen, Suchtext höchstens 100 Zeichen', async () => {
		const s = baue();
		const cm = await bestaetigt(s, ['cm']);
		const name = `Suche${randomUUID().slice(0, 8)}`;
		const r5 = await spieler('R5', name);
		const suche = (text: string) =>
			getSpieler(
				s.d,
				ereignis({
					konto: cm,
					method: 'GET',
					url: `http://localhost/api/admin/spieler?suche=${encodeURIComponent(text)}`
				})
			);
		const treffer = await suche(name.toLowerCase());
		expect(treffer.status).toBe(200);
		expect(await treffer.json()).toEqual([
			{
				mitgliedId: r5.mitgliedId,
				name: { vorname: 'Test', rufname: null, nachname: name },
				geschlecht: 'm',
				jahrgang: 1990,
				klassierung: 'R5'
			}
		]);
		expect(await antwortVon(await suche('z'.repeat(100)))).toEqual([200, []]);
		expect(await antwortVon(await suche('z'.repeat(101)))).toEqual([400, { fehler: 'eingabe' }]);
		expect(await antwortVon(await getSpieler(s.d, hole(cm)))).toEqual([200, []]);
	});

	test('A-ANMELDUNG-06, FR-26: Klassierung korrigieren, mit dem CM-Admin im Verlauf, ohne Meldung', async () => {
		const s = baue();
		const cm = await bestaetigt(s, ['cm']);
		const r3 = await spieler('R3');
		const id = { id: String(r3.mitgliedId) };
		for (const body of [{}, { klassierung: 'R10' }, { klassierung: 'r5' }, { klassierung: 5 }]) {
			const r = await postKlassierung(s.d, post(cm, body, id));
			expect([body, ...(await antwortVon(r))]).toEqual([body, 400, { fehler: 'eingabe' }]);
		}
		expect(
			await antwortVon(await postKlassierung(s.d, post(cm, { klassierung: 'R5' }, id)))
		).toEqual([200, {}]);
		const [m] = await db
			.select({ klassierung: mitglied.klassierung })
			.from(mitglied)
			.where(eq(mitglied.id, r3.mitgliedId));
		expect(m.klassierung).toBe('R5');
		const verlauf = await db
			.select({ urheberArt: aenderung.urheberArt, von: aenderung.urheberMitgliedId })
			.from(aenderung)
			.where(eq(aenderung.mitgliedId, r3.mitgliedId));
		expect(verlauf).toEqual([{ urheberArt: 'admin', von: cm.mitgliedId }]);
		const niemand = await postKlassierung(
			s.d,
			post(cm, { klassierung: 'R5' }, { id: '999999999' })
		);
		expect(niemand.status).toBe(404);
		expect(s.mails).toEqual([]);
	});
});
