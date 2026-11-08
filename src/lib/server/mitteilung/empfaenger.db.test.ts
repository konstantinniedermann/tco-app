import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { aendereAnlass, legeAnlassAn, melde } from '../anlass/anlaesse.ts';
import { erstelleDb } from '../db/index.ts';
import { konto, mitglied, pushAbo, sitzung } from '../db/schema.ts';
import { anlassEmpfaenger, vereinEmpfaenger, type Empfaenger } from './empfaenger.ts';

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

const MINUTE = 60 * 1000;
// Sitzungen mit einer Zeit wie in den übrigen Tests: Ein Login räumt Sitzungen auf, die ein Jahr
// nicht genutzt wurden, und träfe mit 2099 die Sitzungen parallel laufender Tests.
const SITZUNG_ZEIT = new Date('2026-11-02T12:00:00Z');
// Fachliche Zeit vor dem Anmeldeschluss des Anlasses.
const JETZT = new Date('2099-03-01T10:00:00Z');
const WERTE = () => ({
	titel: `Anlass ${randomUUID()}`,
	beginn: new Date('2099-03-19T18:30:00Z'),
	ort: 'Clubhaus',
	einladung: '',
	anmeldeschluss: new Date('2099-03-16T22:59:00Z')
});

// Die gemeinsame Test-Datenbank hat Mitglieder anderer Tests: jeder Test schaut nur auf seine.
const nurMeine = (liste: Empfaenger[], ...meine: { mitgliedId: number }[]) =>
	liste.filter((e) => meine.some((m) => m.mitgliedId === e.mitgliedId));
const ids = (liste: Empfaenger[], ...meine: { mitgliedId: number }[]) =>
	nurMeine(liste, ...meine).map((e) => e.mitgliedId);

async function neuerAnlass() {
	const admin = await legeMitgliedAn(db, { status: 'ausgetreten' });
	const w = WERTE();
	return { id: await legeAnlassAn(db, admin.mitgliedId, w), w };
}

async function abo(kontoId: number) {
	const sitzungHash = randomUUID();
	await db.insert(sitzung).values({
		kennungHash: sitzungHash,
		kontoId,
		sitzungsversion: 1,
		erstelltAm: SITZUNG_ZEIT,
		zuletztGenutzt: SITZUNG_ZEIT
	});
	const a = {
		endpunkt: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`,
		p256dh: `schluessel-${randomUUID()}`,
		auth: `geheimnis-${randomUUID()}`
	};
	await db.insert(pushAbo).values({ ...a, sitzungHash, kontoId, eingerichtetAm: SITZUNG_ZEIT });
	return a;
}

async function ohneKonto(nachname = 'Ohnekonto') {
	const email = `test-${randomUUID()}@example.org`;
	const [m] = await db
		.insert(mitglied)
		.values({
			vorname: 'Olga',
			nachname,
			strasse: 'Erfundenweg 2',
			plz: '4600',
			ort: 'Olten',
			email
		})
		.returning({ id: mitglied.id });
	return { mitgliedId: m.id, email };
}

const themaAus = (kontoId: number, t: Partial<typeof konto.$inferInsert>) =>
	db.update(konto).set(t).where(eq(konto.id, kontoId));

describe('Empfänger einer Mitteilung', () => {
	test('FR-43: alle: aktive Mitglieder mit Abos, ohne Konto nur mit Mail, nach Name sortiert', async () => {
		const { id } = await neuerAnlass();
		const z = `-${randomUUID()}`;
		const berta = await legeMitgliedAn(db, {
			vorname: 'Berta',
			rufname: 'Bea',
			nachname: `Zaugg${z}`
		});
		const anna = await legeMitgliedAn(db, { vorname: 'Anna', nachname: `Zaugg${z}` });
		const olga = await ohneKonto(`Aebi${z}`);
		const a1 = await abo(berta.kontoId);
		const a2 = await abo(berta.kontoId);
		const liste = await anlassEmpfaenger(db, id, 'alle', JETZT);
		const meine = nurMeine(liste, berta, anna, olga);
		expect(meine).toEqual([
			{
				mitgliedId: olga.mitgliedId,
				name: { rufname: null, vorname: 'Olga', nachname: `Aebi${z}` },
				email: olga.email,
				abos: []
			},
			{
				mitgliedId: anna.mitgliedId,
				name: { rufname: null, vorname: 'Anna', nachname: `Zaugg${z}` },
				email: anna.email,
				abos: []
			},
			{
				mitgliedId: berta.mitgliedId,
				name: { rufname: 'Bea', vorname: 'Berta', nachname: `Zaugg${z}` },
				email: berta.email,
				abos: expect.arrayContaining([a1, a2])
			}
		]);
		expect(meine[2].abos).toHaveLength(2);
	});

	test('FR-43: keine-antwort: nur wer zu diesem Anlass nicht geantwortet hat', async () => {
		const { id } = await neuerAnlass();
		const { id: anderer } = await neuerAnlass();
		const kommt = await legeMitgliedAn(db);
		const nicht = await legeMitgliedAn(db);
		const still = await legeMitgliedAn(db);
		const nurAnderer = await legeMitgliedAn(db);
		const olga = await ohneKonto();
		await melde(db, id, kommt.mitgliedId, { antwort: 'kommt', bemerkung: null }, JETZT);
		await melde(db, id, nicht.mitgliedId, { antwort: 'kommt-nicht', bemerkung: null }, JETZT);
		await melde(db, anderer, nurAnderer.mitgliedId, { antwort: 'kommt', bemerkung: null }, JETZT);
		const liste = await anlassEmpfaenger(db, id, 'keine-antwort', JETZT);
		expect(ids(liste, kommt, nicht, still, nurAnderer, olga).sort()).toEqual(
			[still.mitgliedId, nurAnderer.mitgliedId, olga.mitgliedId].sort()
		);
	});

	test('FR-43: kommt: nur wer zugesagt hat', async () => {
		const { id } = await neuerAnlass();
		const kommt = await legeMitgliedAn(db);
		const nicht = await legeMitgliedAn(db);
		const still = await legeMitgliedAn(db);
		await melde(db, id, kommt.mitgliedId, { antwort: 'kommt', bemerkung: null }, JETZT);
		await melde(db, id, nicht.mitgliedId, { antwort: 'kommt-nicht', bemerkung: null }, JETZT);
		const liste = await anlassEmpfaenger(db, id, 'kommt', JETZT);
		expect(ids(liste, kommt, nicht, still)).toEqual([kommt.mitgliedId]);
	});

	test('FR-43: kommt-nicht: nur wer abgesagt hat', async () => {
		const { id } = await neuerAnlass();
		const kommt = await legeMitgliedAn(db);
		const nicht = await legeMitgliedAn(db);
		const still = await legeMitgliedAn(db);
		await melde(db, id, kommt.mitgliedId, { antwort: 'kommt', bemerkung: null }, JETZT);
		await melde(db, id, nicht.mitgliedId, { antwort: 'kommt-nicht', bemerkung: 'Ferien' }, JETZT);
		const liste = await anlassEmpfaenger(db, id, 'kommt-nicht', JETZT);
		expect(ids(liste, kommt, nicht, still)).toEqual([nicht.mitgliedId]);
	});

	test('FR-43: zu-pruefen: Antwort älter als die Terminänderung, wie FR-32', async () => {
		const { id, w } = await neuerAnlass();
		const alt = await legeMitgliedAn(db);
		const neu = await legeMitgliedAn(db);
		const still = await legeMitgliedAn(db);
		await melde(db, id, alt.mitgliedId, { antwort: 'kommt-nicht', bemerkung: null }, JETZT);
		await melde(db, id, neu.mitgliedId, { antwort: 'kommt', bemerkung: null }, JETZT);
		const geaendert = new Date(JETZT.getTime() + MINUTE);
		await aendereAnlass(db, id, { ...w, ort: 'Halle' }, geaendert);
		const spaeter = new Date(geaendert.getTime() + MINUTE);
		await melde(db, id, neu.mitgliedId, { antwort: 'kommt', bemerkung: null }, spaeter);
		const liste = await anlassEmpfaenger(db, id, 'zu-pruefen', spaeter);
		expect(ids(liste, alt, neu, still)).toEqual([alt.mitgliedId]);
	});

	test('FR-43: zu-pruefen ohne Terminänderung leer', async () => {
		const { id } = await neuerAnlass();
		const m = await legeMitgliedAn(db);
		await melde(db, id, m.mitgliedId, { antwort: 'kommt', bemerkung: null }, JETZT);
		expect(ids(await anlassEmpfaenger(db, id, 'zu-pruefen', JETZT), m)).toEqual([]);
	});

	test('FR-43: zu-pruefen nach Anmeldeschluss leer', async () => {
		const { id, w } = await neuerAnlass();
		const m = await legeMitgliedAn(db);
		await melde(db, id, m.mitgliedId, { antwort: 'kommt', bemerkung: null }, JETZT);
		await aendereAnlass(db, id, { ...w, ort: 'Halle' }, new Date(JETZT.getTime() + MINUTE));
		// Die Minute des Anmeldeschlusses zählt noch dazu (FR-28), die nächste nicht mehr.
		const letzteMinute = new Date(w.anmeldeschluss.getTime() + 30 * 1000);
		expect(ids(await anlassEmpfaenger(db, id, 'zu-pruefen', letzteMinute), m)).toEqual([
			m.mitgliedId
		]);
		const danach = new Date(w.anmeldeschluss.getTime() + MINUTE);
		expect(ids(await anlassEmpfaenger(db, id, 'zu-pruefen', danach), m)).toEqual([]);
	});

	test('FR-43: ausgetretenes Mitglied mit Abo bekommt nichts', async () => {
		const { id } = await neuerAnlass();
		const weg = await legeMitgliedAn(db, { status: 'ausgetreten' });
		const geloescht = await legeMitgliedAn(db, { status: 'geloescht' });
		await abo(weg.kontoId);
		await abo(geloescht.kontoId);
		for (const auswahl of ['alle', 'keine-antwort'] as const)
			expect(ids(await anlassEmpfaenger(db, id, auswahl, JETZT), weg, geloescht)).toEqual([]);
		expect(ids(await vereinEmpfaenger(db), weg, geloescht)).toEqual([]);
	});

	test('FR-43: gesperrtes Konto bekommt nichts, auch keine Mail', async () => {
		const { id } = await neuerAnlass();
		const gesperrt = await legeMitgliedAn(db, { gesperrt: true });
		await abo(gesperrt.kontoId);
		expect(ids(await anlassEmpfaenger(db, id, 'alle', JETZT), gesperrt)).toEqual([]);
		expect(ids(await vereinEmpfaenger(db), gesperrt)).toEqual([]);
	});

	test('FR-43: Thema Anlässe aus → nicht dabei', async () => {
		const { id } = await neuerAnlass();
		const aus = await legeMitgliedAn(db);
		const an = await legeMitgliedAn(db);
		await abo(aus.kontoId);
		await themaAus(aus.kontoId, { themaAnlaesse: false });
		await themaAus(an.kontoId, { themaVerein: false, themaCm: false });
		expect(ids(await anlassEmpfaenger(db, id, 'alle', JETZT), aus, an)).toEqual([an.mitgliedId]);
	});

	test('FR-43: Verein: aktive Mitglieder mit Thema Verein, ohne Konto nur mit Mail', async () => {
		const aus = await legeMitgliedAn(db);
		const an = await legeMitgliedAn(db);
		const olga = await ohneKonto();
		const a = await abo(an.kontoId);
		await themaAus(aus.kontoId, { themaVerein: false });
		await themaAus(an.kontoId, { themaAnlaesse: false });
		expect(nurMeine(await vereinEmpfaenger(db), aus, an, olga)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ mitgliedId: an.mitgliedId, abos: [a] }),
				expect.objectContaining({ mitgliedId: olga.mitgliedId, abos: [] })
			])
		);
		expect(ids(await vereinEmpfaenger(db), aus)).toEqual([]);
	});

	test('FR-43: unbekannter Anlass hat keine Empfänger', async () => {
		await legeMitgliedAn(db);
		expect(await anlassEmpfaenger(db, 2_000_000_000, 'alle', JETZT)).toEqual([]);
	});
});
