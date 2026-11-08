import { and, eq } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { anmeldung, anmeldungSpieler, konto, mitglied, partnerAnfrage } from '../db/schema.ts';
import { erstelleSitzung, pruefeSitzung } from '../login/sitzung.ts';
import { legeKategorieAn, legeTurnierAn, setzeStatus } from '../turnier/turniere.ts';
import type { BestaetigungInhalt } from './mail.ts';
import { baueBestaetigungsMail, erstelleBestaetigung } from './mail.ts';
import {
	getCmAnsicht,
	getCmPartner,
	getCmTurniere,
	postCmAbmeldung,
	postCmAngaben,
	postCmAnfrage,
	postCmAnfrageAblehnen,
	postCmAnfrageAnnehmen,
	postCmAnfrageZurueck,
	postCmAnmeldung,
	postCmSuchtext,
	postCmWildcard,
	type CmDienste
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
// SI-05: Die Schnittstellen loggen nichts; die Ausnahme (Mailfehler) prüft ihr Test selbst.
afterEach(() => {
	try {
		for (const l of logs) expect(l).not.toHaveBeenCalled();
	} finally {
		for (const l of logs) l.mockClear();
	}
});

const SITZUNG_ZEIT = new Date('2026-11-02T12:00:00Z');

type Meldung = { titel: string; text: string; pfad: string };

function baue(jetzt: Date) {
	const mails: { an: string; i: BestaetigungInhalt }[] = [];
	const meldungen: { ids: number[]; m: Meldung }[] = [];
	const d: CmDienste = {
		db,
		bestaetigung: async (an, i) => {
			mails.push({ an, i });
		},
		melde: async (ids, m) => {
			meldungen.push({ ids, m });
		},
		jetzt: () => jetzt
	};
	return { d, mails, meldungen };
}

/** Offenes Turnier in freiem Jahr mit Herren-Kategorien R1–R5; `jetzt` liegt vor dem Anmeldeschluss. */
async function turnier(namen: string[]) {
	for (;;) {
		const jahr = 3000 + Math.floor(Math.random() * 6000);
		const t = await legeTurnierAn(db, {
			jahr,
			name: `Clubmeisterschaft ${jahr}`,
			anmeldeschluss: `${jahr}-05-31`,
			nummern: []
		});
		if (t.ergebnis !== 'ok') continue;
		const kategorien: number[] = [];
		for (const name of namen) {
			const k = await legeKategorieAn(db, t.id, {
				name,
				geschlecht: 'herren',
				art: 'einzel',
				jahrgangVon: null,
				jahrgangBis: null,
				klassierungVon: 'R1',
				klassierungBis: 'R5',
				mindestsumme: null
			});
			if (k.ergebnis !== 'ok') throw new Error('Kategorie');
			kategorien.push(k.id);
		}
		const jetzt = new Date(`${jahr}-05-01T10:00:00Z`);
		expect(await setzeStatus(db, t.id, 'offen', jetzt)).toBe('ok');
		return { id: t.id, jahr, jetzt, kategorien };
	}
}

async function mitgliedMit(
	angaben: object = { geschlecht: 'm', jahrgang: 1990, klassierung: 'R3' },
	rollen: string[] = []
) {
	const m = await legeMitgliedAn(db, { vorname: 'Vreni', rollen });
	await db.update(mitglied).set(angaben).where(eq(mitglied.id, m.mitgliedId));
	const kennung = await erstelleSitzung(db, m.kontoId, SITZUNG_ZEIT);
	const konto = (await pruefeSitzung(db, kennung, SITZUNG_ZEIT))!.konto;
	return { ...m, konto };
}

const anmelden = (d: CmDienste, konto: object, kategorie: number) =>
	postCmAnmeldung(d, ereignis({ params: { id: String(kategorie) }, konto: konto as never }));

describe('Schnittstellen der CM (Mitglied)', () => {
	test('SI-05: ohne Sitzung 401, ohne JSON 415, keine Schnittstelle loggt', async () => {
		const { d, mails } = baue(new Date('2099-01-01T10:00:00Z'));
		const m = await mitgliedMit();
		const alle = [
			['GET', getCmTurniere],
			['GET', getCmAnsicht],
			['POST', postCmAngaben],
			['POST', postCmAnmeldung],
			['POST', postCmAbmeldung],
			['POST', postCmWildcard],
			['GET', getCmPartner],
			['POST', postCmAnfrage],
			['POST', postCmAnfrageAnnehmen],
			['POST', postCmAnfrageAblehnen],
			['POST', postCmAnfrageZurueck],
			['POST', postCmSuchtext]
		] as const;
		for (const [method, fn] of alle) {
			const r = await fn(d, ereignis({ method, body: {}, params: { id: '1' } }));
			expect([r.status, await r.json()]).toEqual([401, { fehler: 'abgemeldet' }]);
			expect(r.headers.get('cache-control')).toBe('no-store');
		}
		for (const [, fn] of alle.filter(([x]) => x === 'POST')) {
			const r = await fn(
				d,
				ereignis({ body: '{}', contentType: 'text/plain', params: { id: '1' }, konto: m.konto })
			);
			expect([r.status, await r.json()]).toEqual([415, { fehler: 'format' }]);
		}
		const nichtZahl = await getCmAnsicht(
			d,
			ereignis({ method: 'GET', params: { id: 'angaben' }, konto: m.konto })
		);
		expect(nichtZahl.status).toBe(404);
		expect(mails).toEqual([]);
	});

	test('A-ANMELDUNG-01, A-ANMELDUNG-05: anmelden antwortet mit neuer Ansicht und schickt eine Bestätigung', async () => {
		const t = await turnier(['Herren A', 'Herren B']);
		const { d, mails } = baue(t.jetzt);
		const m = await mitgliedMit();
		const liste = await (
			await getCmTurniere(d, ereignis({ method: 'GET', konto: m.konto }))
		).json();
		expect(liste.find((x: { id: number }) => x.id === t.id)).toMatchObject({ anzahl: 0 });

		const r = await anmelden(d, m.konto, t.kategorien[0]);
		expect(r.status).toBe(200);
		const ansicht = await r.json();
		expect(ansicht.turnier.anzahl).toBe(1);
		expect(ansicht.eigene).toEqual([
			{ anmeldungId: expect.any(Number), kategorie: 'Herren A', status: 'bestaetigt' }
		]);
		expect(mails).toEqual([
			{
				an: m.email,
				i: {
					turniername: `Clubmeisterschaft ${t.jahr}`,
					aktion: 'an',
					kategorie: 'Herren A',
					eigene: ['Herren A'],
					anmeldeschluss: `${t.jahr}-05-31`
				}
			}
		]);

		const ab = await postCmAbmeldung(
			d,
			ereignis({ params: { id: String(ansicht.eigene[0].anmeldungId) }, konto: m.konto })
		);
		expect(ab.status).toBe(200);
		expect((await ab.json()).turnier.anzahl).toBe(0);
		expect(mails[1].i).toMatchObject({ aktion: 'ab', kategorie: 'Herren A', eigene: [] });
		// Fremde oder unbekannte Anmeldung: 404, keine Mail.
		const fremd = await postCmAbmeldung(
			d,
			ereignis({ params: { id: String(ansicht.eigene[0].anmeldungId) }, konto: m.konto })
		);
		expect(fremd.status).toBe(404);
		expect(mails).toHaveLength(2);
	});

	test('FR-06: vierte Anmeldung 409 voll, keine Mail', async () => {
		const t = await turnier(['A', 'B', 'C', 'D']);
		const { d, mails } = baue(t.jetzt);
		const m = await mitgliedMit();
		for (const k of t.kategorien.slice(0, 3))
			expect((await anmelden(d, m.konto, k)).status).toBe(200);
		const r = await anmelden(d, m.konto, t.kategorien[3]);
		expect([r.status, await r.json()]).toEqual([409, { fehler: 'voll' }]);
		expect(mails).toHaveLength(3);
		const doppelt = await anmelden(d, m.konto, t.kategorien[0]);
		expect([doppelt.status, await doppelt.json()]).toEqual([409, { fehler: 'schon-angemeldet' }]);
		const weg = await anmelden(d, m.konto, 2_000_000_000);
		expect(weg.status).toBe(404);
	});

	test('FR-37: Angaben nachtragen, danach erscheinen die Kategorien', async () => {
		const t = await turnier(['Herren A']);
		const { d } = baue(t.jetzt);
		const m = await mitgliedMit({ geschlecht: null, jahrgang: null, klassierung: null });
		const vorher = await (
			await getCmAnsicht(
				d,
				ereignis({ method: 'GET', params: { id: String(t.id) }, konto: m.konto })
			)
		).json();
		expect(vorher.kategorien).toEqual([]);
		expect(vorher.fehlt).toEqual(['klassierung', 'geschlecht', 'jahrgang']);
		const nein = await anmelden(d, m.konto, t.kategorien[0]);
		expect([nein.status, await nein.json()]).toEqual([409, { fehler: 'angaben-fehlen' }]);

		const schlecht = await postCmAngaben(
			d,
			ereignis({ body: { klassierung: 'R3' }, konto: m.konto })
		);
		expect(schlecht.status).toBe(400);
		expect((await schlecht.json()).felder).toHaveProperty('geschlecht');

		const ok = await postCmAngaben(
			d,
			ereignis({ body: { klassierung: 'R3', geschlecht: 'm', jahrgang: 1990 }, konto: m.konto })
		);
		expect([ok.status, await ok.json()]).toEqual([200, {}]);
		const nachher = await (
			await getCmAnsicht(
				d,
				ereignis({ method: 'GET', params: { id: String(t.id) }, konto: m.konto })
			)
		).json();
		expect(nachher.fehlt).toEqual([]);
		expect(nachher.kategorien.map((k: { name: string }) => k.name)).toEqual(['Herren A']);
	});

	test('FR-05: nach Anmeldeschluss 409 geschlossen', async () => {
		const t = await turnier(['Herren A']);
		const spaet = baue(new Date(`${t.jahr}-06-01T00:00:00+02:00`));
		const m = await mitgliedMit();
		const r = await anmelden(spaet.d, m.konto, t.kategorien[0]);
		expect([r.status, await r.json()]).toEqual([409, { fehler: 'geschlossen' }]);
		expect(spaet.mails).toEqual([]);
	});

	test('A-ANMELDUNG-05: Mailversand gestört, Anmeldung gilt trotzdem (200)', async () => {
		const t = await turnier(['Herren A']);
		const d: CmDienste = {
			db,
			jetzt: () => t.jetzt,
			melde: async () => {},
			bestaetigung: erstelleBestaetigung({
				kontakt: 'kontakt@example.org',
				mailer: async () => {
					throw new Error('smtp://geheim:passwort@example.org nicht erreichbar');
				}
			})
		};
		const m = await mitgliedMit();
		const r = await anmelden(d, m.konto, t.kategorien[0]);
		expect(r.status).toBe(200);
		expect((await r.json()).turnier.anzahl).toBe(1);
		// SI-05: nur die feste Zeile, nichts vom Fehler.
		expect(logs[0].mock.calls).toEqual([['Bestätigungs-Mail nicht versandt']]);
		logs[0].mockClear();
	});

	test('FR-47, SI-05: Meldung an die CM-Admins gestört, Antrag gilt trotzdem und nichts wird geloggt', async () => {
		const t = await turnier(['Herren A']);
		const { d } = baue(t.jetzt);
		let versucht = false;
		d.melde = async () => {
			versucht = true;
			throw new Error('push://geheim nicht erreichbar');
		};
		const m = await mitgliedMit({ geschlecht: 'm', jahrgang: 1990, klassierung: 'R8' });
		const r = await postCmWildcard(
			d,
			ereignis({
				params: { id: String(t.kategorien[0]) },
				body: { kommentar: 'Bitte' },
				konto: m.konto as never
			})
		);
		expect(r.status).toBe(200);
		await vi.waitFor(() => expect(versucht).toBe(true));
		// Ohne Abfangen wäre das eine unbehandelte Ablehnung, an der Vitest den Lauf scheitern lässt.
		await new Promise((fertig) => setTimeout(fertig, 0));
	});

	test('A-ANMELDUNG-10, FR-08, FR-47: Wildcard beantragen schickt die Bestätigung und meldet den CM-Admins ohne Namen', async () => {
		const t = await turnier(['Herren A']);
		const [k] = t.kategorien;
		const { d, mails, meldungen } = baue(t.jetzt);
		const hanna = await legeMitgliedAn(db, { vorname: 'Hanna', rollen: ['cm'] });
		const m = await mitgliedMit({ geschlecht: 'm', jahrgang: 1990, klassierung: 'R8' });
		const beantrage = (body: unknown, kategorie = k, konto: object = m.konto) =>
			postCmWildcard(
				d,
				ereignis({ params: { id: String(kategorie) }, body, konto: konto as never })
			);

		const vorher = await (
			await getCmAnsicht(
				d,
				ereignis({ method: 'GET', params: { id: String(t.id) }, konto: m.konto })
			)
		).json();
		expect(vorher.wildcard).toEqual([
			expect.objectContaining({ id: k, name: 'Herren A', anmeldungId: null })
		]);

		// Kommentar Pflicht, 1–300 Zeichen nach trim.
		for (const body of [
			{},
			{ kommentar: '   ' },
			{ kommentar: 7 },
			{ kommentar: 'x'.repeat(301) }
		]) {
			const r = await beantrage(body);
			expect([r.status, await r.json()]).toEqual([
				400,
				{ fehler: 'eingabe', felder: { kommentar: expect.any(String) } }
			]);
		}
		expect([mails, meldungen]).toEqual([[], []]);

		const r = await beantrage({ kommentar: '  Ich möchte mich mit Stärkeren messen.  ' });
		expect(r.status).toBe(200);
		const ansicht = await r.json();
		expect(ansicht.eigene).toEqual([
			{ anmeldungId: expect.any(Number), kategorie: 'Herren A', status: 'beantragt' }
		]);
		expect(ansicht.wildcard).toEqual([
			expect.objectContaining({ id: k, anmeldungId: ansicht.eigene[0].anmeldungId })
		]);
		const [zeile] = await db
			.select({ kommentar: anmeldung.kommentar, status: anmeldung.status })
			.from(anmeldung)
			.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
			.where(and(eq(anmeldung.kategorieId, k), eq(anmeldungSpieler.mitgliedId, m.mitgliedId)));
		expect(zeile).toEqual({
			kommentar: 'Ich möchte mich mit Stärkeren messen.',
			status: 'beantragt'
		});
		expect(mails).toEqual([
			{
				an: m.email,
				i: {
					turniername: `Clubmeisterschaft ${t.jahr}`,
					aktion: 'antrag',
					kategorie: 'Herren A',
					eigene: ['Herren A (beantragt)'],
					anmeldeschluss: `${t.jahr}-05-31`
				}
			}
		]);
		// Die Antwort wartet nicht auf die Meldung an die CM-Admins.
		await vi.waitFor(() => expect(meldungen).toHaveLength(1));
		expect(meldungen[0].ids).toContain(hanna.mitgliedId);
		expect(meldungen[0].ids).not.toContain(m.mitgliedId);
		// DS-05: ohne Namen des Spielers.
		expect(meldungen[0].m).toEqual({
			titel: 'Wildcard-Antrag',
			text: 'Neuer Wildcard-Antrag für «Herren A».',
			pfad: `/verwaltung/turniere/${t.id}/kategorien/${k}`
		});

		const nochmals = await beantrage({ kommentar: 'Nochmals.' });
		expect([nochmals.status, await nochmals.json()]).toEqual([409, { fehler: 'schon-angemeldet' }]);
		const r3 = await mitgliedMit();
		const passt = await beantrage({ kommentar: 'Bitte.' }, k, r3.konto);
		expect([passt.status, await passt.json()]).toEqual([409, { fehler: 'keine-wildcard' }]);
		const weg = await beantrage({ kommentar: 'Bitte.' }, 2_000_000_000);
		expect(weg.status).toBe(404);
		expect([mails.length, meldungen.length]).toEqual([1, 1]);

		// Zurückziehen = abmelden, mit der gewohnten Bestätigung.
		const ab = await postCmAbmeldung(
			d,
			ereignis({ params: { id: String(ansicht.eigene[0].anmeldungId) }, konto: m.konto })
		);
		expect(ab.status).toBe(200);
		expect(mails[1].i).toMatchObject({ aktion: 'ab', kategorie: 'Herren A', eigene: [] });
		expect(meldungen).toHaveLength(1);
	});

	test('A-ANMELDUNG-10, FR-47: beantragt ein CM-Admin selbst, geht die Meldung nicht an ihn', async () => {
		const t = await turnier(['Herren A']);
		const { d, meldungen } = baue(t.jetzt);
		const anderer = await legeMitgliedAn(db, { vorname: 'Hanna', rollen: ['cm'] });
		const ich = await mitgliedMit({ geschlecht: 'm', jahrgang: 1990, klassierung: 'R8' }, ['cm']);
		const r = await postCmWildcard(
			d,
			ereignis({
				params: { id: String(t.kategorien[0]) },
				body: { kommentar: 'Bitte.' },
				konto: ich.konto
			})
		);
		expect(r.status).toBe(200);
		await vi.waitFor(() => expect(meldungen).toHaveLength(1));
		expect(meldungen[0].ids).toContain(anderer.mitgliedId);
		expect(meldungen[0].ids).not.toContain(ich.mitgliedId);
	});
});

/** Offenes Turnier mit einem offenen Doppel (Mindestsumme 9) und einem Herren-Einzel. */
async function doppelTurnier() {
	for (;;) {
		const jahr = 3000 + Math.floor(Math.random() * 6000);
		const t = await legeTurnierAn(db, {
			jahr,
			name: `Clubmeisterschaft ${jahr}`,
			anmeldeschluss: `${jahr}-05-31`,
			nummern: []
		});
		if (t.ergebnis !== 'ok') continue;
		const lege = async (name: string, art: 'einzel' | 'doppel') => {
			const k = await legeKategorieAn(db, t.id, {
				name,
				geschlecht: 'offen',
				art,
				jahrgangVon: null,
				jahrgangBis: null,
				klassierungVon: art === 'einzel' ? 'N1' : null,
				klassierungBis: art === 'einzel' ? 'R9' : null,
				mindestsumme: art === 'doppel' ? 9 : null
			});
			if (k.ergebnis !== 'ok') throw new Error('Kategorie');
			return k.id;
		};
		const doppel = await lege('Offenes Doppel', 'doppel');
		const einzel = await lege('Offenes Einzel', 'einzel');
		const jetzt = new Date(`${jahr}-05-01T10:00:00Z`);
		expect(await setzeStatus(db, t.id, 'offen', jetzt)).toBe('ok');
		return { id: t.id, jahr, jetzt, doppel, einzel };
	}
}

/** Erfundener Spieler mit Login (Brief-Code eingelöst) und Sitzung; ohne Angaben ein Herr, R5. */
async function spielerMitLogin(vorname: string, nachname: string, angaben: object = {}) {
	const m = await legeMitgliedAn(db, { vorname, nachname });
	await db
		.update(mitglied)
		.set({ geschlecht: 'm', jahrgang: 1990, klassierung: 'R5', ...angaben })
		.where(eq(mitglied.id, m.mitgliedId));
	await db
		.update(konto)
		.set({ briefCodeBenutztAm: new Date('2026-01-05T10:00:00Z') })
		.where(eq(konto.id, m.kontoId));
	const kennung = await erstelleSitzung(db, m.kontoId, SITZUNG_ZEIT);
	return { ...m, konto: (await pruefeSitzung(db, kennung, SITZUNG_ZEIT))!.konto };
}

type Spieler = Awaited<ReturnType<typeof spielerMitLogin>>;

const mit = (s: Spieler, params: Record<string, string>, body: unknown = {}, extra = {}) =>
	ereignis({ params, body, konto: s.konto as never, ...extra });
const suche = (d: CmDienste, s: Spieler, kategorie: number, text: string) =>
	getCmPartner(
		d,
		ereignis({
			method: 'GET',
			params: { id: String(kategorie) },
			url: `http://localhost/api/cm/kategorien/${kategorie}/partner?suche=${encodeURIComponent(text)}`,
			konto: s.konto as never
		})
	);
const anfragen = (d: CmDienste, s: Spieler, kategorie: number, body: unknown) =>
	postCmAnfrage(d, mit(s, { id: String(kategorie) }, body));
const anfrageId = async (von: number, an: number) =>
	(
		await db
			.select({ id: partnerAnfrage.id })
			.from(partnerAnfrage)
			.where(and(eq(partnerAnfrage.vonId, von), eq(partnerAnfrage.anId, an)))
	)[0]?.id;

describe('Schnittstellen der CM zum Doppel (Mitglied)', () => {
	test('A-ANMELDUNG-04, FR-49: allein anmelden speichert den getrimmten Suchtext, bestätigt nur dem Handelnden, meldet niemandem', async () => {
		const t = await doppelTurnier();
		const { d, mails, meldungen } = baue(t.jetzt);
		const lea = await spielerMitLogin('Lea', 'Marbach');
		const r = await postCmAnmeldung(
			d,
			mit(lea, { id: String(t.doppel) }, { suchtext: '  abends frei  ' })
		);
		expect(r.status).toBe(200);
		const ansicht = await r.json();
		expect(ansicht.kategorien.find((k: { id: number }) => k.id === t.doppel).eigen).toEqual({
			art: 'sucht',
			kommentar: 'abends frei'
		});
		expect(mails.map((m) => [m.an, m.i.aktion])).toEqual([[lea.email, 'an']]);
		expect(meldungen).toEqual([]);

		// Leer wird zu «kein Suchtext», ein Nicht-Text ebenso.
		for (const suchtext of ['   ', 42]) {
			const marco = await spielerMitLogin('Marco', 'Beispiel');
			const ok = await postCmAnmeldung(d, mit(marco, { id: String(t.doppel) }, { suchtext }));
			expect(ok.status).toBe(200);
			expect(
				(await ok.json()).kategorien.find((k: { id: number }) => k.id === t.doppel).eigen
			).toEqual({ art: 'sucht', kommentar: null });
		}
	});

	test('A-ANMELDUNG-05: Bestätigungsmail nach Doppel-Anmeldung, allein mit «sucht Partner», nach dem Annehmen mit dem Partner', async () => {
		const t = await doppelTurnier();
		const { d, mails } = baue(t.jetzt);
		const lea = await spielerMitLogin('Lea', 'Marbach');
		const marco = await spielerMitLogin('Marco', 'Beispiel');
		const inhalt = (eigene: string[]) => ({
			turniername: `Clubmeisterschaft ${t.jahr}`,
			aktion: 'an',
			kategorie: 'Offenes Doppel',
			eigene,
			anmeldeschluss: `${t.jahr}-05-31`
		});

		expect((await postCmAnmeldung(d, mit(lea, { id: String(t.doppel) }))).status).toBe(200);
		expect(mails).toEqual([{ an: lea.email, i: inhalt(['Offenes Doppel (sucht Partner)']) }]);
		expect(baueBestaetigungsMail(mails[0].i, 'cm@example.org').text).toContain(
			'Deine Anmeldungen für die Clubmeisterschaft'
		);
		expect(baueBestaetigungsMail(mails[0].i, 'cm@example.org').text).toContain(
			'- Offenes Doppel (sucht Partner)'
		);

		// Marco fragt an, Lea nimmt an: Die Bestätigung geht an Lea, die gehandelt hat.
		mails.length = 0;
		expect((await anfragen(d, marco, t.doppel, { anId: lea.mitgliedId })).status).toBe(200);
		const id = await anfrageId(marco.mitgliedId, lea.mitgliedId);
		expect((await postCmAnfrageAnnehmen(d, mit(lea, { id: String(id) }))).status).toBe(200);
		expect(mails).toEqual([{ an: lea.email, i: inhalt(['Offenes Doppel (mit Marco Beispiel)']) }]);
		expect(baueBestaetigungsMail(mails[0].i, 'cm@example.org').text).toContain(
			'- Offenes Doppel (mit Marco Beispiel)'
		);
	});

	test('FR-49: Suchtext mit 121 Zeichen wird abgewiesen, mit 120 genommen; nichts gespeichert, keine Mail', async () => {
		const t = await doppelTurnier();
		const { d, mails } = baue(t.jetzt);
		const lea = await spielerMitLogin('Lea', 'Marbach');
		const zu = await postCmAnmeldung(
			d,
			mit(lea, { id: String(t.doppel) }, { suchtext: 'a'.repeat(121) })
		);
		expect([zu.status, await zu.json()]).toEqual([
			400,
			{ fehler: 'eingabe', felder: { suchtext: 'Höchstens 120 Zeichen.' } }
		]);
		expect(mails).toEqual([]);
		const gespeichert = await db
			.select({ id: anmeldung.id })
			.from(anmeldungSpieler)
			.innerJoin(anmeldung, eq(anmeldung.id, anmeldungSpieler.anmeldungId))
			.where(eq(anmeldungSpieler.mitgliedId, lea.mitgliedId));
		expect(gespeichert).toEqual([]);

		const ok = await postCmAnmeldung(
			d,
			mit(lea, { id: String(t.doppel) }, { suchtext: 'a'.repeat(120) })
		);
		expect(ok.status).toBe(200);
	});

	test('FR-49: Suchtext ändern und leeren; 121 Zeichen 400; fremde Anmeldung 404; nach Anmeldeschluss 409', async () => {
		const t = await doppelTurnier();
		const { d, meldungen } = baue(t.jetzt);
		const lea = await spielerMitLogin('Lea', 'Marbach');
		const fremd = await spielerMitLogin('Fred', 'Fremd');
		const id = (await (await postCmAnmeldung(d, mit(lea, { id: String(t.doppel) }))).json())
			.eigene[0].anmeldungId;
		const setze = (s: Spieler, body: unknown, dienste = d) =>
			postCmSuchtext(dienste, mit(s, { id: String(id) }, body));
		const eigen = async (r: Response) =>
			(await r.json()).kategorien.find((k: { id: number }) => k.id === t.doppel).eigen;

		const neu = await setze(lea, { suchtext: ' Dienstag ' });
		expect(neu.status).toBe(200);
		expect(await eigen(neu)).toEqual({ art: 'sucht', kommentar: 'Dienstag' });
		expect(await eigen(await setze(lea, { suchtext: '' }))).toEqual({
			art: 'sucht',
			kommentar: null
		});
		const zu = await setze(lea, { suchtext: 'a'.repeat(121) });
		expect([zu.status, await zu.json()]).toEqual([
			400,
			{ fehler: 'eingabe', felder: { suchtext: 'Höchstens 120 Zeichen.' } }
		]);
		expect((await setze(fremd, { suchtext: 'x' })).status).toBe(404);
		const spaet = baue(new Date(`${t.jahr}-06-01T10:00:00Z`));
		const zuspaet = await setze(lea, { suchtext: 'x' }, spaet.d);
		expect([zuspaet.status, await zuspaet.json()]).toEqual([409, { fehler: 'geschlossen' }]);
		expect(meldungen).toEqual([]);
	});

	test('FR-48, FR-47: suchen, anfragen (Meldung an den Angefragten), annehmen (Meldung an den Anfragenden, Hinfälliges an Dritte)', async () => {
		const t = await doppelTurnier();
		const { d, mails, meldungen } = baue(t.jetzt);
		// Die gemeinsame Test-Datenbank kennt weitere «Marbach»: ein eigener Nachname hält die Suche eindeutig.
		const nachname = `Marbach${Math.random().toString(36).slice(2, 8)}`;
		// Mit Rufnamen: Treffer, Ansicht und Meldungen nennen ihn wie die übrige CM-Seite.
		const lea = await spielerMitLogin('Lea', nachname, { rufname: 'Lele' });
		const marco = await spielerMitLogin('Marco', 'Beispiel', { rufname: 'Mäc' });
		const leaName = { rufname: 'Lele', vorname: 'Lea', nachname };
		const dora = await spielerMitLogin('Dora', 'Dritte');
		await postCmAnmeldung(d, mit(lea, { id: String(t.doppel) }));
		mails.length = 0;

		const s = await suche(d, marco, t.doppel, nachname);
		expect(s.status).toBe(200);
		const treffer = (await s.json()).filter(
			(x: { mitgliedId: number }) => x.mitgliedId === lea.mitgliedId
		);
		expect(treffer).toEqual([expect.objectContaining({ name: leaName, anfrageId: null })]);
		// Die Suche findet auch den Rufnamen.
		const perRufname = await (await suche(d, marco, t.doppel, `Lele ${nachname}`)).json();
		expect(perRufname.map((x: { mitgliedId: number }) => x.mitgliedId)).toEqual([lea.mitgliedId]);

		const a = await anfragen(d, marco, t.doppel, { anId: lea.mitgliedId });
		expect(a.status).toBe(200);
		expect(
			(await a.json()).kategorien.find((k: { id: number }) => k.id === t.doppel)
		).toMatchObject({ meineAnfragen: [{ an: leaName }] });
		const andere = await anfragen(d, dora, t.doppel, { anId: lea.mitgliedId });
		expect(andere.status).toBe(200);
		expect(meldungen).toEqual([
			{
				ids: [lea.mitgliedId],
				m: {
					titel: 'Clubmeisterschaft',
					text: 'Mäc (Marco Beispiel) möchte mit dir «Offenes Doppel» spielen. Annehmen oder ablehnen kannst du in MyTCO.',
					pfad: `/clubmeisterschaft/${t.id}`
				}
			},
			{
				ids: [lea.mitgliedId],
				m: expect.objectContaining({ text: expect.stringContaining('Dora Dritte möchte') })
			}
		]);
		expect(mails).toEqual([]);

		meldungen.length = 0;
		const id = await anfrageId(marco.mitgliedId, lea.mitgliedId);
		const ok = await postCmAnfrageAnnehmen(d, mit(lea, { id: String(id) }));
		expect(ok.status).toBe(200);
		const ansicht = await ok.json();
		expect(ansicht.kategorien.find((k: { id: number }) => k.id === t.doppel).eigen).toMatchObject({
			art: 'paar',
			partner: { name: { rufname: 'Mäc', vorname: 'Marco', nachname: 'Beispiel' } }
		});
		// Bestätigung nur an Lea (sie hat angenommen), nicht an Marco oder Dora.
		expect(mails.map((m) => [m.an, m.i.aktion])).toEqual([[lea.email, 'an']]);
		expect(meldungen.map((x) => [x.ids, x.m.text])).toEqual([
			[
				[marco.mitgliedId],
				`Lele (Lea ${nachname}) hat angenommen. Ihr seid für «Offenes Doppel» angemeldet.`
			],
			[
				[dora.mitgliedId],
				`Lele (Lea ${nachname}) hat inzwischen einen Partner für «Offenes Doppel». Die Anfrage ist hinfällig.`
			]
		]);
		for (const x of meldungen) expect(x.m.pfad).toBe(`/clubmeisterschaft/${t.id}`);
		// Zweimal annehmen: die Anfrage ist weg.
		expect((await postCmAnfrageAnnehmen(d, mit(lea, { id: String(id) }))).status).toBe(404);
		expect(meldungen).toHaveLength(2);
	});

	test('FR-48, FR-47: ablehnen meldet dem Anfragenden ohne Grund, zurückziehen meldet niemandem; beides ohne Mail, nur für Beteiligte', async () => {
		const t = await doppelTurnier();
		const { d, mails, meldungen } = baue(t.jetzt);
		const lea = await spielerMitLogin('Lea', 'Marbach');
		const marco = await spielerMitLogin('Marco', 'Beispiel');
		const dora = await spielerMitLogin('Dora', 'Dritte');
		for (const s of [lea, marco, dora]) await postCmAnmeldung(d, mit(s, { id: String(t.doppel) }));
		mails.length = 0;
		await anfragen(d, marco, t.doppel, { anId: lea.mitgliedId });
		await anfragen(d, dora, t.doppel, { anId: lea.mitgliedId });
		meldungen.length = 0;

		const a1 = await anfrageId(marco.mitgliedId, lea.mitgliedId);
		const a2 = await anfrageId(dora.mitgliedId, lea.mitgliedId);
		// Weder der Anfragende darf ablehnen noch ein Dritter annehmen oder zurückziehen.
		expect((await postCmAnfrageAblehnen(d, mit(marco, { id: String(a1) }))).status).toBe(404);
		expect((await postCmAnfrageAnnehmen(d, mit(dora, { id: String(a1) }))).status).toBe(404);
		expect((await postCmAnfrageZurueck(d, mit(lea, { id: String(a1) }))).status).toBe(404);

		const ab = await postCmAnfrageAblehnen(d, mit(lea, { id: String(a1) }));
		expect(ab.status).toBe(200);
		expect(meldungen.map((x) => [x.ids, x.m.text])).toEqual([
			[[marco.mitgliedId], 'Lea Marbach hat deine Anfrage für «Offenes Doppel» abgelehnt.']
		]);
		const zurueck = await postCmAnfrageZurueck(d, mit(dora, { id: String(a2) }));
		expect(zurueck.status).toBe(200);
		expect(
			(await zurueck.json()).kategorien.find((k: { id: number }) => k.id === t.doppel).meineAnfragen
		).toEqual([]);
		expect(meldungen).toHaveLength(1);
		expect(mails).toEqual([]);
		expect(await anfrageId(marco.mitgliedId, lea.mitgliedId)).toBeUndefined();
		expect(await anfrageId(dora.mitgliedId, lea.mitgliedId)).toBeUndefined();
	});

	test('FR-10, FR-47: Paar abmelden meldet dem Partner den Namen des Abmeldenden, Bestätigung nur an ihn selbst', async () => {
		const t = await doppelTurnier();
		const { d, mails, meldungen } = baue(t.jetzt);
		const lea = await spielerMitLogin('Lea', 'Marbach');
		const marco = await spielerMitLogin('Marco', 'Beispiel', { rufname: 'Mäc' });
		await postCmAnmeldung(d, mit(lea, { id: String(t.doppel) }));
		await anfragen(d, marco, t.doppel, { anId: lea.mitgliedId });
		const ok = await postCmAnfrageAnnehmen(
			d,
			mit(lea, { id: String(await anfrageId(marco.mitgliedId, lea.mitgliedId)) })
		);
		const anmeldungId = (await ok.json()).eigene[0].anmeldungId;
		mails.length = 0;
		meldungen.length = 0;

		const ab = await postCmAbmeldung(d, mit(marco, { id: String(anmeldungId) }));
		expect(ab.status).toBe(200);
		expect(mails.map((m) => [m.an, m.i.aktion])).toEqual([[marco.email, 'ab']]);
		expect(meldungen.map((x) => [x.ids, x.m.text])).toEqual([
			[
				[lea.mitgliedId],
				'Mäc (Marco Beispiel) hat sich von «Offenes Doppel» abgemeldet. Eure Anmeldung ist zurückgezogen.'
			]
		]);
	});

	test('Review Focus 4: beide melden gleichzeitig ab, höchstens eine Meldung', async () => {
		const t = await doppelTurnier();
		const { d, meldungen } = baue(t.jetzt);
		const lea = await spielerMitLogin('Lea', 'Marbach');
		const marco = await spielerMitLogin('Marco', 'Beispiel');
		await postCmAnmeldung(d, mit(lea, { id: String(t.doppel) }));
		await anfragen(d, marco, t.doppel, { anId: lea.mitgliedId });
		const ok = await postCmAnfrageAnnehmen(
			d,
			mit(lea, { id: String(await anfrageId(marco.mitgliedId, lea.mitgliedId)) })
		);
		const id = String((await ok.json()).eigene[0].anmeldungId);
		meldungen.length = 0;
		const antworten = await Promise.all([
			postCmAbmeldung(d, mit(lea, { id })),
			postCmAbmeldung(d, mit(marco, { id }))
		]);
		expect(antworten.map((r) => r.status).sort()).toEqual([200, 404]);
		expect(meldungen).toHaveLength(1);
	});

	test('Review Focus 3: direkt an die Schnittstelle gerichtete Anfragen werden abgewiesen, nichts gespeichert, keine Meldung', async () => {
		const t = await doppelTurnier();
		const { d, mails, meldungen } = baue(t.jetzt);
		const lea = await spielerMitLogin('Lea', 'Marbach');
		const ohneLogin = await legeMitgliedAn(db, { vorname: 'Olga' });
		await db
			.update(mitglied)
			.set({ geschlecht: 'm', jahrgang: 1990, klassierung: 'R5' })
			.where(eq(mitglied.id, ohneLogin.mitgliedId));
		const stark = await spielerMitLogin('Sven', 'Stark', { klassierung: 'N1' });
		const staerker = await spielerMitLogin('Sina', 'Staerker', { klassierung: 'R2' });
		const ziel = await spielerMitLogin('Zora', 'Ziel');
		const ausgabe = async (r: Response) => [r.status, await r.json()];

		expect(await ausgabe(await anfragen(d, lea, t.doppel, { anId: lea.mitgliedId }))).toEqual([
			409,
			{ fehler: 'passt-nicht' }
		]);
		expect(await ausgabe(await anfragen(d, lea, t.doppel, { anId: ohneLogin.mitgliedId }))).toEqual(
			[404, { fehler: 'nicht-gefunden' }]
		);
		// N1 (0) und R2 (2) ergeben zusammen weniger als die Mindestsumme 9.
		expect(
			await ausgabe(await anfragen(d, stark, t.doppel, { anId: staerker.mitgliedId }))
		).toEqual([409, { fehler: 'passt-nicht' }]);
		// Einzel-Kategorie und unbekannte Kategorie.
		expect((await anfragen(d, lea, t.einzel, { anId: ziel.mitgliedId })).status).toBe(404);
		expect((await anfragen(d, lea, 2_000_000_000, { anId: ziel.mitgliedId })).status).toBe(404);
		// Kaputte Körper: keine Zahl, fehlend, negativ, Bruch, Text.
		for (const anId of ['x', undefined, -1, 1.5, null, String(ziel.mitgliedId)]) {
			expect((await anfragen(d, lea, t.doppel, { anId })).status).toBe(404);
		}
		// Nach Anmeldeschluss.
		const spaet = baue(new Date(`${t.jahr}-06-01T10:00:00Z`));
		expect(
			await ausgabe(await anfragen(spaet.d, lea, t.doppel, { anId: ziel.mitgliedId }))
		).toEqual([409, { fehler: 'geschlossen' }]);

		expect(
			await db.select().from(partnerAnfrage).where(eq(partnerAnfrage.kategorieId, t.doppel))
		).toEqual([]);
		expect(meldungen).toEqual([]);
		expect(mails).toEqual([]);

		// Zweite gleiche Anfrage: schon-angefragt, nur eine Meldung.
		expect((await anfragen(d, lea, t.doppel, { anId: ziel.mitgliedId })).status).toBe(200);
		expect(await ausgabe(await anfragen(d, lea, t.doppel, { anId: ziel.mitgliedId }))).toEqual([
			409,
			{ fehler: 'schon-angefragt' }
		]);
		expect(meldungen).toHaveLength(1);
	});

	test('FR-47, SI-05: Meldung gestört, Anfrage gilt trotzdem und nichts wird geloggt', async () => {
		const t = await doppelTurnier();
		const { d } = baue(t.jetzt);
		let versucht = false;
		d.melde = async () => {
			versucht = true;
			throw new Error('push://geheim nicht erreichbar');
		};
		const lea = await spielerMitLogin('Lea', 'Marbach');
		const marco = await spielerMitLogin('Marco', 'Beispiel');
		const r = await anfragen(d, marco, t.doppel, { anId: lea.mitgliedId });
		expect(r.status).toBe(200);
		await vi.waitFor(() => expect(versucht).toBe(true));
		await new Promise((fertig) => setTimeout(fertig, 0));
	});
});
