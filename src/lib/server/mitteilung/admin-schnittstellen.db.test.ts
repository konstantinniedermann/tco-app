import { randomUUID } from 'node:crypto';
import { asc, count } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import {
	legeEigeneDatenbankAn,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { vorlagenAnlass } from '../../mitteilung/vorlagen.ts';
import { riegel, setzeAnsicht } from '../admin/ansicht.ts';
import { erstelleZugangDienst } from '../admin/zugang.ts';
import { legeAnlassAn, melde } from '../anlass/anlaesse.ts';
import type { Db } from '../db/index.ts';
import { mitteilung, pushAbo, sitzung } from '../db/schema.ts';
import { erstelleBremsen } from '../login/bremse.ts';
import type { Mailer } from '../login/dienst.ts';
import { erstelleSitzung, pruefeSitzung, type AngemeldetesKonto } from '../login/sitzung.ts';
import {
	MITTEILUNG_ADMIN_SCHNITTSTELLEN,
	getAnlassMitteilungen,
	getVereinMitteilungen,
	postAnlassSenden,
	postAnlassVorschau,
	postVereinSenden,
	postVereinVorschau,
	type MitteilungAdminDienste
} from './schnittstellen.ts';
import type { PushSender } from './versand.ts';

// FR-45 löscht alte Einträge über alle Bezüge, und der Verein sind alle aktiven Mitglieder: darum
// eine eigene Datenbank statt der gemeinsamen.
let eigene: EigeneDatenbank | undefined;
const db = (): Db => eigene!.db;

beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('mitteilung_admin');
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

// Sitzungen und fachliche Zeit wie in den übrigen Tests (Aufräumen beim Login).
const JETZT = new Date('2026-11-02T12:00:00Z');
const TAG = 24 * 60 * 60 * 1000;
const ADRESSE = 'https://mytco.example.org';
const WERTE = () => ({
	titel: `GV ${randomUUID().slice(0, 8)}`,
	beginn: new Date('2027-03-19T18:30:00Z'),
	ort: 'Clubhaus',
	einladung: 'Traktanden',
	anmeldeschluss: new Date('2027-03-16T22:59:00Z')
});
const NACHRICHT = {
	titel: 'Erinnerung GV',
	text: 'Bitte melde dich bis Di, 16. März an oder ab.',
	weg: 'push-sonst-mail'
};

type Zuruf = { endpunkt: string; nutzlast: string };

function baue(teil: { push?: PushSender | null; mailer?: Mailer } = {}) {
	const post: { text: string }[] = [];
	const zugang = erstelleZugangDienst({
		db: db(),
		schluessel: 'x'.repeat(40),
		kontakt: 'kontakt@example.org',
		mailer: async (n) => {
			post.push(n);
		},
		bremsen: erstelleBremsen(),
		jetzt: () => JETZT
	});
	const pushes: Zuruf[] = [];
	const mails: Parameters<Mailer>[0][] = [];
	const d: MitteilungAdminDienste = {
		db: db(),
		zugang,
		hinweis: async () => {},
		brief: {
			schluessel: 'y'.repeat(40),
			adresse: 'https://mytco.example.org',
			kontakt: 'kontakt@example.org'
		},
		jetzt: () => JETZT,
		push:
			teil.push === undefined
				? async (abo, nutzlast) => {
						pushes.push({ endpunkt: abo.endpunkt, nutzlast });
						return 'ok';
					}
				: teil.push,
		mailer:
			teil.mailer ??
			(async (n) => {
				mails.push(n);
			}),
		adresse: ADRESSE
	};
	return { d, post, pushes, mails };
}

async function einloggen(kontoId: number): Promise<AngemeldetesKonto & { kennung: string }> {
	const kennung = await erstelleSitzung(db(), kontoId, JETZT);
	return { ...(await pruefeSitzung(db(), kennung, JETZT))!.konto, kennung };
}

async function bestaetigt(
	s: ReturnType<typeof baue>,
	rollen: string[],
	name: { vorname?: string; nachname?: string } = {}
) {
	const m = await legeMitgliedAn(db(), { ...name, rollen });
	const konto = await einloggen(m.kontoId);
	await (
		await s.d.zugang.fordereCodeAn(konto)
	).arbeit;
	expect(await s.d.zugang.bestaetige(konto, s.post.at(-1)!.text.slice(0, 6))).toBe('ok');
	return { ...m, konto };
}

async function abo(kontoId: number) {
	const sitzungHash = randomUUID();
	await db().insert(sitzung).values({
		kennungHash: sitzungHash,
		kontoId,
		sitzungsversion: 1,
		erstelltAm: JETZT,
		zuletztGenutzt: JETZT
	});
	const a = {
		endpunkt: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`,
		p256dh: 'erfundener-schluessel',
		auth: 'erfundenes-geheimnis'
	};
	await db()
		.insert(pushAbo)
		.values({ ...a, sitzungHash, kontoId, eingerichtetAm: JETZT });
	return a;
}

async function neuerAnlass(von: number) {
	const w = WERTE();
	return { id: await legeAnlassAn(db(), von, w), w };
}

/** Mitglied mit Antwort auf den Anlass. */
async function mitAntwort(
	anlassId: number,
	antwort: 'kommt' | 'kommt-nicht',
	name: { vorname?: string; nachname?: string } = {}
) {
	const m = await legeMitgliedAn(db(), name);
	expect(await melde(db(), anlassId, m.mitgliedId, { antwort, bemerkung: null }, JETZT)).toBe('ok');
	return m;
}

const hole = (konto: AngemeldetesKonto, params: Record<string, string> = {}) =>
	ereignis({ method: 'GET', konto, params });
const schicke = (konto: AngemeldetesKonto, body: unknown, params: Record<string, string> = {}) =>
	ereignis({ konto, body, params });

const anzahlEintraege = async () => (await db().select({ n: count() }).from(mitteilung))[0].n;

describe('Schnittstellen für Mitteilungen (Verwaltung)', () => {
	test('FR-42: Mitglieder-Admin sendet, Verlauf zeigt den Eintrag ohne Namen', async () => {
		const s = baue();
		const admin = await bestaetigt(s, ['mitglieder'], { vorname: 'Ada', nachname: 'Absender' });
		const { id, w } = await neuerAnlass(admin.mitgliedId);
		const mitPush = await mitAntwort(id, 'kommt', { nachname: 'Pushwerth' });
		const ohnePush = await mitAntwort(id, 'kommt', { nachname: 'Mailinger' });
		await mitAntwort(id, 'kommt-nicht', { nachname: 'Fernbleib' });
		const a = await abo(mitPush.kontoId);
		const params = { id: String(id) };

		const r = await postAnlassSenden(
			s.d,
			schicke(admin.konto, { ...NACHRICHT, auswahl: 'kommt' }, params)
		);
		expect([r.status, await r.json()]).toEqual([
			201,
			{ push: 1, mails: 1, ersatzMails: 0, nichtErreichbar: 0 }
		]);
		const link = `${ADRESSE}/anlass/${id}`;
		expect(s.pushes).toEqual([
			{
				endpunkt: a.endpunkt,
				nutzlast: JSON.stringify({ titel: NACHRICHT.titel, text: NACHRICHT.text, link })
			}
		]);
		expect(s.mails.map((m) => m.an)).toEqual([ohnePush.email]);
		expect(s.mails[0].text).toContain(link);

		const g = await getAnlassMitteilungen(s.d, hole(admin.konto, params));
		expect(g.status).toBe(200);
		expect(g.headers.get('cache-control')).toBe('no-store');
		const roh = await g.text();
		expect(JSON.parse(roh)).toEqual({
			vorlagen: vorlagenAnlass(w),
			verlauf: [
				{
					gesendetAm: JETZT.toISOString(),
					absender: 'Absender, Ada',
					titel: NACHRICHT.titel,
					text: NACHRICHT.text,
					auswahl: 'kommt',
					weg: 'push-sonst-mail',
					push: 1,
					mails: 1,
					ersatzMails: 0,
					nichtErreichbar: 0
				}
			]
		});
		// Keine Empfänger im Verlauf, weder Name noch Adresse.
		for (const teil of ['Pushwerth', 'Mailinger', 'Fernbleib', ohnePush.email, a.endpunkt]) {
			expect(roh).not.toContain(teil);
		}
		// Der Verlauf des Vereins kennt den Eintrag des Anlasses nicht.
		const v = await getVereinMitteilungen(s.d, hole(admin.konto));
		expect([v.status, await v.json()]).toEqual([200, { vorlagen: [], verlauf: [] }]);
	});

	test('FR-42: Verein sendet an alle, Link auf die Startseite, Verlauf getrennt', async () => {
		const s = baue();
		const admin = await bestaetigt(s, ['mitglieder'], { vorname: 'Vera', nachname: 'Vorstand' });
		const vorher = await postVereinVorschau(
			s.d,
			schicke(admin.konto, { ...NACHRICHT, auswahl: 'alle' })
		);
		expect(vorher.status).toBe(200);
		const p = await vorher.json();
		const r = await postVereinSenden(s.d, schicke(admin.konto, { ...NACHRICHT, auswahl: 'alle' }));
		expect(r.status).toBe(201);
		const z = await r.json();
		expect(z.push + z.mails + z.ersatzMails + z.nichtErreichbar).toBe(p.anzahl);
		expect(s.mails).toHaveLength(z.mails);
		expect(s.mails.map((m) => m.an)).toContain(admin.email);
		expect(s.mails[0].text).toContain(`${ADRESSE}/\n`);
		const v = await (await getVereinMitteilungen(s.d, hole(admin.konto))).json();
		expect(v.vorlagen).toEqual([]);
		expect(v.verlauf).toHaveLength(1);
		expect(v.verlauf[0]).toMatchObject({ absender: 'Vorstand, Vera', auswahl: 'alle', ...z });
		// Beim Verein gibt es nur «alle».
		const falsch = await postVereinSenden(
			s.d,
			schicke(admin.konto, { ...NACHRICHT, auswahl: 'kommt' })
		);
		expect([falsch.status, await falsch.json()]).toEqual([
			400,
			{ fehler: 'eingabe', felder: ['auswahl'] }
		]);
	});

	test('FR-42: unbekannter Anlass 404, falsche Eingabe 400 mit Feldern', async () => {
		const s = baue();
		const admin = await bestaetigt(s, ['mitglieder']);
		const vorher = await anzahlEintraege();
		for (const id of ['999999', 'abc']) {
			for (const [name, fn] of Object.entries({
				getAnlassMitteilungen,
				postAnlassVorschau,
				postAnlassSenden
			})) {
				const e = name.startsWith('get')
					? hole(admin.konto, { id })
					: schicke(admin.konto, { ...NACHRICHT, auswahl: 'alle' }, { id });
				const r = await fn(s.d, e);
				expect([name, id, r.status, await r.json()]).toEqual([
					name,
					id,
					404,
					{ fehler: 'nicht-gefunden' }
				]);
			}
		}
		const { id } = await neuerAnlass(admin.mitgliedId);
		const r = await postAnlassSenden(
			s.d,
			schicke(
				admin.konto,
				{ titel: ' ', text: 'x', auswahl: 'niemand', weg: 'brief' },
				{ id: String(id) }
			)
		);
		expect([r.status, await r.json()]).toEqual([
			400,
			{ fehler: 'eingabe', felder: ['titel', 'auswahl', 'weg'] }
		]);
		expect(await anzahlEintraege()).toBe(vorher);
		expect(s.mails).toEqual([]);
		expect(s.pushes).toEqual([]);
	});

	test('FR-42: CM-Admin 403', async () => {
		const s = baue();
		const admin = await bestaetigt(s, ['mitglieder']);
		const { id } = await neuerAnlass(admin.mitgliedId);
		const cm = await bestaetigt(s, ['cm']);
		const alle = Object.entries(MITTEILUNG_ADMIN_SCHNITTSTELLEN);
		expect(alle).toHaveLength(6);
		for (const [name, fn] of alle) {
			const e = name.startsWith('get')
				? hole(cm.konto, { id: String(id) })
				: schicke(cm.konto, { ...NACHRICHT, auswahl: 'alle' }, { id: String(id) });
			const r = await fn(s.d, e);
			expect([name, r.status, await r.json()]).toEqual([name, 403, { fehler: 'kein-admin' }]);
		}
		expect(s.mails).toEqual([]);
	});

	test('FR-42: MyTCO-Admin liest den Verlauf, Senden 403', async () => {
		const s = baue();
		const admin = await bestaetigt(s, ['mitglieder']);
		const { id } = await neuerAnlass(admin.mitgliedId);
		const params = { id: String(id) };
		await mitAntwort(id, 'kommt');
		expect(
			(
				await postAnlassSenden(
					s.d,
					schicke(admin.konto, { ...NACHRICHT, auswahl: 'kommt' }, params)
				)
			).status
		).toBe(201);
		const mytco = await bestaetigt(s, ['mytco']);
		const anlass = await getAnlassMitteilungen(s.d, hole(mytco.konto, params));
		expect(anlass.status).toBe(200);
		expect((await anlass.json()).verlauf).toHaveLength(1);
		expect((await getVereinMitteilungen(s.d, hole(mytco.konto))).status).toBe(200);

		const vorher = await anzahlEintraege();
		const gesendet = s.mails.length;
		const body = { ...NACHRICHT, auswahl: 'alle' };
		for (const [name, r] of [
			['postAnlassVorschau', await postAnlassVorschau(s.d, schicke(mytco.konto, body, params))],
			['postAnlassSenden', await postAnlassSenden(s.d, schicke(mytco.konto, body, params))],
			['postVereinVorschau', await postVereinVorschau(s.d, schicke(mytco.konto, body))],
			['postVereinSenden', await postVereinSenden(s.d, schicke(mytco.konto, body))]
		] as const) {
			expect([name, r.status, await r.json()]).toEqual([name, 403, { fehler: 'kein-recht' }]);
		}
		expect(await anzahlEintraege()).toBe(vorher);
		expect(s.mails).toHaveLength(gesendet);
	});

	test('FR-42: Ansicht als … senden 403 nur-ansehen', async () => {
		const s = baue();
		const admin = await bestaetigt(s, ['mitglieder']);
		const { id } = await neuerAnlass(admin.mitgliedId);
		// Der MyTCO-Admin sieht MyTCO als Mitglieder-Admin; seine Sitzung trägt die Ansicht.
		const mytco = await bestaetigt(s, ['mytco']);
		await setzeAnsicht(db(), mytco.konto.sitzungHash, 'mitglieder');
		const inAnsicht = (await pruefeSitzung(db(), mytco.konto.kennung, JETZT))!.konto;
		expect(inAnsicht.ansicht).toBe('mitglieder');
		const vorher = await anzahlEintraege();
		const body = { ...NACHRICHT, auswahl: 'alle' };
		const params = { id: String(id) };
		for (const r of [
			await postAnlassSenden(s.d, schicke(inAnsicht, body, params)),
			await postVereinSenden(s.d, schicke(inAnsicht, body))
		]) {
			expect([r.status, await r.json()]).toEqual([403, { fehler: 'nur-ansehen' }]);
		}
		// Erste Schicht: der Riegel im Hook lässt die Anfrage gar nicht durch.
		for (const pfad of [
			`/api/admin/anlaesse/${id}/mitteilungen/senden`,
			'/api/admin/mitteilungen/senden'
		]) {
			const r = riegel('POST', pfad, 'mitglieder');
			expect([pfad, r?.status, await r?.json()]).toEqual([pfad, 403, { fehler: 'nur-ansehen' }]);
		}
		expect(await anzahlEintraege()).toBe(vorher);
		expect(s.mails).toEqual([]);
	});

	test('FR-45: Senden löscht Einträge älter als 365 Tage, jüngere bleiben', async () => {
		const s = baue();
		const admin = await bestaetigt(s, ['mitglieder']);
		const { id } = await neuerAnlass(admin.mitgliedId);
		const { id: anderer } = await neuerAnlass(admin.mitgliedId);
		await db().delete(mitteilung);
		const spaeter = new Date(JETZT.getTime() + 400 * TAG);
		const eintrag = (titel: string, alter: number, anlassId: number | null) => ({
			bezug: anlassId === null ? ('verein' as const) : ('anlass' as const),
			anlassId,
			absenderId: admin.mitgliedId,
			gesendetAm: new Date(spaeter.getTime() - alter),
			titel,
			text: 'Alt',
			auswahl: 'alle',
			weg: 'push' as const
		});
		await db()
			.insert(mitteilung)
			.values([
				eintrag('zu alt, Verein', 365 * TAG + 1000, null),
				eintrag('zu alt, anderer Anlass', 366 * TAG, anderer),
				eintrag('genau ein Jahr', 365 * TAG, id),
				eintrag('jung, Verein', 364 * TAG, null),
				eintrag('jung, Anlass', TAG, id)
			]);
		const d = { ...s.d, jetzt: () => spaeter };
		const r = await postAnlassSenden(
			d,
			schicke(admin.konto, { ...NACHRICHT, titel: 'Neu', auswahl: 'kommt' }, { id: String(id) })
		);
		expect(r.status).toBe(201);
		const titel = await db()
			.select({ titel: mitteilung.titel })
			.from(mitteilung)
			.orderBy(asc(mitteilung.gesendetAm));
		expect(titel.map((t) => t.titel)).toEqual([
			'genau ein Jahr',
			'jung, Verein',
			'jung, Anlass',
			'Neu'
		]);
		// Neueste zuerst.
		const v = await (await getAnlassMitteilungen(d, hole(admin.konto, { id: String(id) }))).json();
		expect(v.verlauf.map((e: { titel: string }) => e.titel)).toEqual([
			'Neu',
			'jung, Anlass',
			'genau ein Jahr'
		]);
	});

	test('FR-45: Verlauf zeigt nur das letzte Jahr, auch ohne Senden', async () => {
		const s = baue();
		const admin = await bestaetigt(s, ['mitglieder']);
		const { id } = await neuerAnlass(admin.mitgliedId);
		const spaeter = new Date(JETZT.getTime() + 400 * TAG);
		const eintrag = (titel: string, alter: number) => ({
			bezug: 'anlass' as const,
			anlassId: id,
			absenderId: admin.mitgliedId,
			gesendetAm: new Date(spaeter.getTime() - alter),
			titel,
			text: 'Alt',
			auswahl: 'alle',
			weg: 'push' as const
		});
		await db()
			.insert(mitteilung)
			.values([
				eintrag('zu alt', 365 * TAG + 1000),
				eintrag('genau ein Jahr', 365 * TAG),
				eintrag('jung', TAG)
			]);
		const d = { ...s.d, jetzt: () => spaeter };
		const v = await (await getAnlassMitteilungen(d, hole(admin.konto, { id: String(id) }))).json();
		expect(v.verlauf.map((e: { titel: string }) => e.titel)).toEqual(['jung', 'genau ein Jahr']);
	});

	test('FR-43: Vorschau liefert Namen nach Nachname', async () => {
		const s = baue();
		const admin = await bestaetigt(s, ['mitglieder']);
		const { id } = await neuerAnlass(admin.mitgliedId);
		const zwahlen = await mitAntwort(id, 'kommt', { vorname: 'Anna', nachname: 'Zwahlen' });
		await mitAntwort(id, 'kommt', { vorname: 'Beat', nachname: 'Abt' });
		await mitAntwort(id, 'kommt', { vorname: 'Cleo', nachname: 'Meier' });
		await mitAntwort(id, 'kommt-nicht', { vorname: 'Dora', nachname: 'Bern' });
		await abo(zwahlen.kontoId);
		const vorher = await anzahlEintraege();
		const body = { ...NACHRICHT, auswahl: 'kommt' };
		const params = { id: String(id) };
		const r = await postAnlassVorschau(s.d, schicke(admin.konto, body, params));
		expect([r.status, await r.json()]).toEqual([
			200,
			{
				anzahl: 3,
				push: 1,
				mails: 2,
				nichtErreichbar: 0,
				namen: ['Abt, Beat', 'Meier, Cleo', 'Zwahlen, Anna']
			}
		]);
		// Ohne VAPID zählt jeder als ohne Push.
		const o = await postAnlassVorschau({ ...s.d, push: null }, schicke(admin.konto, body, params));
		expect(await o.json()).toMatchObject({ anzahl: 3, push: 0, mails: 3 });
		// Die Vorschau schickt nichts und schreibt nichts.
		expect(s.pushes).toEqual([]);
		expect(s.mails).toEqual([]);
		expect(await anzahlEintraege()).toBe(vorher);
	});

	test('SI-05: nichts geloggt', async () => {
		// Push und Mail scheitern mit Fehlern, die Personendaten enthalten könnten.
		const s = baue({
			push: async () => {
				throw new Error('Push an test@example.org gescheitert');
			},
			mailer: async (n) => {
				throw new Error(`SMTP lehnt ${n.an} ab`);
			}
		});
		const admin = await bestaetigt(s, ['mitglieder']);
		const { id } = await neuerAnlass(admin.mitgliedId);
		const m = await mitAntwort(id, 'kommt');
		await abo(m.kontoId);
		const r = await postAnlassSenden(
			s.d,
			schicke(admin.konto, { ...NACHRICHT, auswahl: 'kommt' }, { id: String(id) })
		);
		expect([r.status, await r.json()]).toEqual([
			201,
			{ push: 0, mails: 0, ersatzMails: 0, nichtErreichbar: 1 }
		]);
		// Die Prüfung, dass nichts geloggt wurde, macht afterEach.
	});
});
