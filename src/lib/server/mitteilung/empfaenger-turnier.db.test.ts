import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { turnierjahre } from '../../../../tests/hilfen/turnierjahre.ts';
import { meldeAn } from '../cm/anmeldungen.ts';
import { erstelleDb } from '../db/index.ts';
import {
	anmeldung,
	anmeldungSpieler,
	kategorie,
	konto,
	mitglied,
	type AnmeldungStatus
} from '../db/schema.ts';
import type { KategorieWerte } from '../turnier/angaben.ts';
import { legeKategorieAn, legeTurnierAn, setzeStatus } from '../turnier/turniere.ts';
import { turnierEmpfaenger, type Empfaenger } from './empfaenger.ts';

const db = erstelleDb(process.env.DATABASE_URL!);
afterAll(async () => {
	await db.$client.end();
});

const logs = [
	vi.spyOn(console, 'error').mockImplementation(() => {}),
	vi.spyOn(console, 'warn').mockImplementation(() => {}),
	vi.spyOn(console, 'log').mockImplementation(() => {})
];
// SI-05: Die Empfänger-Suche loggt nichts.
afterEach(() => {
	try {
		for (const l of logs) expect(l).not.toHaveBeenCalled();
	} finally {
		for (const l of logs) l.mockClear();
	}
});

// Die gemeinsame Test-Datenbank hat Turniere anderer Tests: jedes Turnier bekommt ein eigenes Jahr
// aus dem Bereich dieser Datei (`tests/hilfen/turnierjahre.ts`).
const naechstesJahr = turnierjahre(import.meta.url);
// Anfang Mai, vor dem Anmeldeschluss am 31. Mai.
const jetztIn = (jahr: number) => new Date(`${jahr}-05-01T10:00:00Z`);

const HERREN_EINZEL: Omit<KategorieWerte, 'name'> = {
	geschlecht: 'herren',
	art: 'einzel',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: 'R1',
	klassierungBis: 'R5',
	mindestsumme: null
};
const HERREN_DOPPEL: Omit<KategorieWerte, 'name'> = {
	...HERREN_EINZEL,
	art: 'doppel',
	klassierungVon: null,
	klassierungBis: null,
	mindestsumme: 9
};

async function kategorieIn(turnierId: number, name: string, w: Omit<KategorieWerte, 'name'>) {
	const r = await legeKategorieAn(db, turnierId, { name, ...w });
	if (r.ergebnis !== 'ok') throw new Error(`Kategorie ${name}: ${r.ergebnis}`);
	return r.id;
}

/** Offenes Turnier in einem freien Jahr; `lege` legt die Kategorien vor dem Öffnen an. */
async function offenesTurnierMit<T>(lege: (turnierId: number) => Promise<T>) {
	const jahr = naechstesJahr();
	const r = await legeTurnierAn(db, {
		jahr,
		name: `Clubmeisterschaft ${jahr}`,
		anmeldeschluss: `${jahr}-05-31`,
		nummern: []
	});
	if (r.ergebnis !== 'ok') throw new Error(`Turnier ${jahr}: ${r.ergebnis}`);
	const k = await lege(r.id);
	expect(await setzeStatus(db, r.id, 'offen', jetztIn(jahr))).toBe('ok');
	return { id: r.id, jetzt: jetztIn(jahr), k };
}

/** Turnier mit einer Einzel- und einer Doppel-Kategorie der Herren. */
const herrenTurnier = () =>
	offenesTurnierMit(async (id) => ({
		einzel: await kategorieIn(id, 'Herren R1–R5', HERREN_EINZEL),
		doppel: await kategorieIn(id, 'Herren Doppel', HERREN_DOPPEL)
	}));

type Angaben = Partial<{
	geschlecht: 'w' | 'm' | null;
	jahrgang: number | null;
	klassierung: string | null;
}>;

/** Erfundener Spieler mit Konto; ohne Angaben ein Herr, Jahrgang 1990, R3. */
async function spieler(teil: Angaben = {}, gesperrt = false) {
	const m = await legeMitgliedAn(db, { gesperrt });
	await db
		.update(mitglied)
		.set({ geschlecht: 'm', jahrgang: 1990, klassierung: 'R3', ...teil })
		.where(eq(mitglied.id, m.mitgliedId));
	return m;
}

/** Erfundener Herr R3 ohne Konto (noch nie angemeldet). */
async function ohneKonto() {
	const [m] = await db
		.insert(mitglied)
		.values({
			vorname: 'Olga',
			nachname: 'Ohnekonto',
			strasse: 'Erfundenweg 2',
			plz: '4600',
			ort: 'Olten',
			email: `test-${randomUUID()}@example.org`,
			geschlecht: 'm',
			jahrgang: 1990,
			klassierung: 'R3'
		})
		.returning({ id: mitglied.id });
	return { mitgliedId: m.id };
}

/** Anmeldung direkt in der Datenbank, allein oder als Paar, in jedem Status. */
async function anmeldungMit(
	kategorieId: number,
	spielerIds: number[],
	status: AnmeldungStatus,
	jetzt: Date
) {
	const [a] = await db
		.insert(anmeldung)
		.values({ kategorieId, status, angemeldetAm: jetzt, geaendertAm: jetzt })
		.returning({ id: anmeldung.id });
	await db
		.insert(anmeldungSpieler)
		.values(spielerIds.map((mitgliedId) => ({ anmeldungId: a.id, mitgliedId })));
	return a.id;
}

// Die gemeinsame Test-Datenbank hat Mitglieder anderer Tests: jeder Test schaut nur auf seine.
// Ein Mitglied, das zweimal käme, stünde hier zweimal.
const ids = (liste: Empfaenger[], ...meine: { mitgliedId: number }[]) =>
	liste
		.filter((e) => meine.some((m) => m.mitgliedId === e.mitgliedId))
		.map((e) => e.mitgliedId)
		.sort((a, b) => a - b);
const sortiert = (...meine: { mitgliedId: number }[]) =>
	meine.map((m) => m.mitgliedId).sort((a, b) => a - b);

describe('Empfänger einer Mitteilung zum Turnier', () => {
	test('angemeldet je Kategorie', async () => {
		const t = await herrenTurnier();
		const { einzel, doppel } = t.k;
		const p1 = await spieler();
		const p2 = await spieler();
		const p3 = await spieler();
		const p4 = await spieler();
		const beantragt = await spieler({ klassierung: 'R7' });
		const abgelehnt = await spieler({ klassierung: 'R7' });
		const beide = await spieler();
		const still = await spieler();
		const meine = [p1, p2, p3, p4, beantragt, abgelehnt, beide, still];
		expect(await meldeAn(db, einzel, p1.mitgliedId, t.jetzt)).toBe('ok');
		await anmeldungMit(doppel, [p2.mitgliedId, p3.mitgliedId], 'bestaetigt', t.jetzt);
		await anmeldungMit(einzel, [p4.mitgliedId], 'zurueckgezogen', t.jetzt);
		await anmeldungMit(einzel, [beantragt.mitgliedId], 'beantragt', t.jetzt);
		await anmeldungMit(einzel, [abgelehnt.mitgliedId], 'abgelehnt', t.jetzt);
		expect(await meldeAn(db, einzel, beide.mitgliedId, t.jetzt)).toBe('ok');
		expect(await meldeAn(db, doppel, beide.mitgliedId, t.jetzt)).toBe('ok');

		const inEinzel = await turnierEmpfaenger(db, t.id, 'angemeldet', einzel);
		expect(ids(inEinzel, ...meine)).toEqual(sortiert(p1, beantragt, beide));
		const imDoppel = await turnierEmpfaenger(db, t.id, 'angemeldet', doppel);
		expect(ids(imDoppel, ...meine)).toEqual(sortiert(p2, p3, beide));
		// Wer in zwei Kategorien angemeldet ist, steht nur einmal da.
		const ueberall = await turnierEmpfaenger(db, t.id, 'angemeldet', null);
		expect(ids(ueberall, ...meine)).toEqual(sortiert(p1, p2, p3, beantragt, beide));
	});

	test('berechtigt mit Kategorie', async () => {
		const t = await herrenTurnier();
		const { einzel, doppel } = t.k;
		const r3 = await spieler();
		const r7 = await spieler({ klassierung: 'R7' });
		const dame = await spieler({ geschlecht: 'w' });
		const ohneJahrgang = await spieler({ jahrgang: null });
		const p1 = await spieler();
		const zurueck = await spieler();
		const meine = [r3, r7, dame, ohneJahrgang, p1, zurueck];
		expect(await meldeAn(db, einzel, p1.mitgliedId, t.jetzt)).toBe('ok');
		await anmeldungMit(einzel, [zurueck.mitgliedId], 'zurueckgezogen', t.jetzt);

		// R7 passt nur mit Wildcard; ohne Jahrgang fehlt eine Angabe.
		const einzelListe = await turnierEmpfaenger(db, t.id, 'berechtigt', einzel);
		expect(ids(einzelListe, ...meine)).toEqual(sortiert(r3, zurueck));
		// Im Doppel zählt die Klassierung allein nicht; wer anderswo angemeldet ist, zählt mit.
		// Fehlt der Jahrgang, zählt er auch im Doppel nicht, obwohl das Doppel ihn nicht prüft.
		const doppelListe = await turnierEmpfaenger(db, t.id, 'berechtigt', doppel);
		expect(ids(doppelListe, ...meine)).toEqual(sortiert(r3, r7, p1, zurueck));
	});

	test('berechtigt ohne Kategorie', async () => {
		const t = await herrenTurnier();
		const { einzel, doppel } = t.k;
		const r3 = await spieler();
		const ohneAngaben = await spieler({ geschlecht: null, jahrgang: null, klassierung: null });
		const dameOhneKlassierung = await spieler({ geschlecht: 'w', klassierung: null });
		const p1 = await spieler();
		const imDoppel = await spieler();
		const dame = await spieler({ geschlecht: 'w' });
		const zurueck = await spieler();
		const meine = [r3, ohneAngaben, dameOhneKlassierung, p1, imDoppel, dame, zurueck];
		expect(await meldeAn(db, einzel, p1.mitgliedId, t.jetzt)).toBe('ok');
		expect(await meldeAn(db, doppel, imDoppel.mitgliedId, t.jetzt)).toBe('ok');
		await anmeldungMit(einzel, [zurueck.mitgliedId], 'zurueckgezogen', t.jetzt);

		const liste = await turnierEmpfaenger(db, t.id, 'berechtigt', null);
		// Wer Angaben fehlen hat, zählt mit, auch eine Dame bei nur Herren-Kategorien.
		expect(ids(liste, ...meine)).toEqual(sortiert(r3, ohneAngaben, dameOhneKlassierung, zurueck));
	});

	test('Höchstzahl', async () => {
		const t = await offenesTurnierMit(async (id) => [
			await kategorieIn(id, 'Herren A', HERREN_EINZEL),
			await kategorieIn(id, 'Herren B', HERREN_EINZEL),
			await kategorieIn(id, 'Herren C', HERREN_EINZEL),
			await kategorieIn(id, 'Herren D', HERREN_EINZEL)
		]);
		const [a, b, c, vierte] = t.k;
		const voll = await spieler();
		const zwei = await spieler();
		for (const k of [a, b, c]) expect(await meldeAn(db, k, voll.mitgliedId, t.jetzt)).toBe('ok');
		for (const k of [a, b]) expect(await meldeAn(db, k, zwei.mitgliedId, t.jetzt)).toBe('ok');
		const liste = await turnierEmpfaenger(db, t.id, 'berechtigt', vierte);
		expect(ids(liste, voll, zwei)).toEqual(sortiert(zwei));
	});

	test('sucht Partner', async () => {
		const t = await herrenTurnier();
		const { einzel, doppel } = t.k;
		const allein = await spieler();
		const p2 = await spieler();
		const p3 = await spieler();
		const mitPartner = await spieler();
		const partnerOhneThema = await spieler();
		const imEinzel = await spieler();
		const zurueck = await spieler();
		const beantragt = await spieler();
		const meine = [allein, p2, p3, mitPartner, partnerOhneThema, imEinzel, zurueck, beantragt];
		expect(await meldeAn(db, doppel, allein.mitgliedId, t.jetzt)).toBe('ok');
		await anmeldungMit(doppel, [p2.mitgliedId, p3.mitgliedId], 'bestaetigt', t.jetzt);
		// Ein Paar bleibt ein Paar, auch wenn der Partner keine Mitteilungen zur CM bekommt.
		await anmeldungMit(
			doppel,
			[mitPartner.mitgliedId, partnerOhneThema.mitgliedId],
			'bestaetigt',
			t.jetzt
		);
		await db.update(konto).set({ themaCm: false }).where(eq(konto.id, partnerOhneThema.kontoId));
		expect(await meldeAn(db, einzel, imEinzel.mitgliedId, t.jetzt)).toBe('ok');
		await anmeldungMit(doppel, [zurueck.mitgliedId], 'zurueckgezogen', t.jetzt);
		// Im Doppel gibt es keinen Antrag; käme einer vor, sucht er nicht (nur bestätigt zählt).
		await anmeldungMit(doppel, [beantragt.mitgliedId], 'beantragt', t.jetzt);

		expect(ids(await turnierEmpfaenger(db, t.id, 'sucht-partner', doppel), ...meine)).toEqual(
			sortiert(allein)
		);
		expect(ids(await turnierEmpfaenger(db, t.id, 'sucht-partner', null), ...meine)).toEqual(
			sortiert(allein)
		);
		// Allein im Einzel sucht niemand einen Partner.
		expect(await turnierEmpfaenger(db, t.id, 'sucht-partner', einzel)).toEqual([]);
	});

	test('abgesagte Kategorie und fremdes Turnier', async () => {
		const t = await offenesTurnierMit(async (id) => ({
			einzel: await kategorieIn(id, 'Herren R1–R5', HERREN_EINZEL),
			damen: await kategorieIn(id, 'Damen R1–R5', { ...HERREN_EINZEL, geschlecht: 'damen' })
		}));
		const angemeldet = await spieler({ geschlecht: 'w' });
		const dame = await spieler({ geschlecht: 'w' });
		// Aktive Anmeldung in einer abgesagten Kategorie: kommt im Betrieb nicht vor (Absagen geht
		// nur ohne aktive Anmeldungen), zählt aber auch dann nirgends.
		await anmeldungMit(t.k.damen, [angemeldet.mitgliedId], 'bestaetigt', t.jetzt);
		await db.update(kategorie).set({ status: 'abgesagt' }).where(eq(kategorie.id, t.k.damen));
		for (const auswahl of ['alle', 'angemeldet', 'berechtigt', 'sucht-partner'] as const) {
			expect(await turnierEmpfaenger(db, t.id, auswahl, t.k.damen)).toEqual([]);
		}
		const ueberall = await turnierEmpfaenger(db, t.id, 'angemeldet', null);
		expect(ids(ueberall, angemeldet)).toEqual([]);
		// Die Dame passt nur in die abgesagte Kategorie.
		const berechtigt = await turnierEmpfaenger(db, t.id, 'berechtigt', null);
		expect(ids(berechtigt, angemeldet, dame)).toEqual([]);

		const fremd = await herrenTurnier();
		const dort = await spieler();
		expect(await meldeAn(db, fremd.k.einzel, dort.mitgliedId, fremd.jetzt)).toBe('ok');
		for (const auswahl of ['alle', 'angemeldet', 'berechtigt'] as const) {
			expect(await turnierEmpfaenger(db, t.id, auswahl, fremd.k.einzel)).toEqual([]);
		}
		expect(ids(await turnierEmpfaenger(db, t.id, 'angemeldet', null), dort)).toEqual([]);
		expect(await turnierEmpfaenger(db, 2_000_000_000, 'alle', null)).toEqual([]);
	});

	test('Thema Clubmeisterschaft aus', async () => {
		const t = await herrenTurnier();
		const { einzel } = t.k;
		const p1 = await spieler();
		const an = await spieler();
		const gesperrt = await spieler({}, true);
		const olga = await ohneKonto();
		const meine = [p1, an, gesperrt, olga];
		for (const m of [p1, an]) expect(await meldeAn(db, einzel, m.mitgliedId, t.jetzt)).toBe('ok');
		await anmeldungMit(einzel, [gesperrt.mitgliedId], 'bestaetigt', t.jetzt);
		await anmeldungMit(einzel, [olga.mitgliedId], 'bestaetigt', t.jetzt);
		await db
			.update(konto)
			.set({ themaCm: false, themaVerein: true, themaAnlaesse: true })
			.where(eq(konto.id, p1.kontoId));
		// Andere Themen aus zählen hier nicht.
		await db
			.update(konto)
			.set({ themaVerein: false, themaAnlaesse: false })
			.where(eq(konto.id, an.kontoId));

		// Ohne Konto: nur per Mail, die Themen gelten als an.
		const liste = await turnierEmpfaenger(db, t.id, 'angemeldet', einzel);
		expect(ids(liste, ...meine)).toEqual(sortiert(an, olga));
		expect(ids(await turnierEmpfaenger(db, t.id, 'alle', null), ...meine)).toEqual(
			sortiert(an, olga)
		);
	});
});
