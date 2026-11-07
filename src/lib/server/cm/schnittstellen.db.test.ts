import { and, eq } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { ereignis } from '../../../../tests/hilfen/anfrage.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { anmeldung, anmeldungSpieler, mitglied } from '../db/schema.ts';
import { erstelleSitzung, pruefeSitzung } from '../login/sitzung.ts';
import { legeKategorieAn, legeTurnierAn, setzeStatus } from '../turnier/turniere.ts';
import type { BestaetigungInhalt } from './mail.ts';
import { erstelleBestaetigung } from './mail.ts';
import {
	getCmAnsicht,
	getCmTurniere,
	postCmAbmeldung,
	postCmAngaben,
	postCmAnmeldung,
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
			['POST', postCmWildcard]
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
