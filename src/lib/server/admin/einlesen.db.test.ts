import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { aenderung, konto, mitglied } from '../db/schema.ts';
import { liesEin, zeigeVorschau } from './einlesen.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

const jetzt = new Date('2026-11-08T09:00:00Z');
const KOPF = 'mitgliedernummer;vorname;nachname;strasse;plz;ort;email';

let urheber: { art: 'admin'; mitgliedId: number };

beforeAll(async () => {
	const admin = await legeMitgliedAn(db, { rollen: ['mitglieder'] });
	urheber = { art: 'admin', mitgliedId: admin.mitgliedId };
});

/** Erfundene Zeile mit eindeutiger Nummer und Adresse je Aufruf. */
function zeile(vorname: string) {
	const id = randomUUID().replaceAll('-', '').slice(0, 12);
	const nummer = `T${id}`;
	const email = `einlesen-${id}@example.org`;
	return {
		nummer,
		email,
		text: `${nummer};${vorname};Einlesetest;Erfundenweg 1;4600;Olten;${email}`
	};
}

const datei = (...zeilen: string[]) => [KOPF, ...zeilen].join('\n');

async function vorschau(text: string) {
	const v = await zeigeVorschau(db, text, jetzt);
	if (!v.ok) throw new Error(`Datei-Fehler ${v.grund}`);
	return v;
}

describe('zeigeVorschau', () => {
	test('A-MITGLIED-07: drei Gruppen – neu, fehlerhaft, schon vorhanden (jeder Status)', async () => {
		// Je ein bestehendes Mitglied für die Treffer über E-Mail, Nummer und beides.
		const mitNummer = async (status?: string) => {
			const m = await legeMitgliedAn(db, status ? { status } : {});
			const nummer = `V${randomUUID().replaceAll('-', '').slice(0, 12)}`;
			await db
				.update(mitglied)
				.set({ mitgliedernummer: nummer })
				.where(eq(mitglied.id, m.mitgliedId));
			return { ...m, nummer };
		};
		const fuerEmail = await legeMitgliedAn(db, { status: 'ausgetreten' });
		const fuerNummer = await mitNummer('vorgemerkt');
		const fuerBeides = await mitNummer();
		const neu = zeile('Nora');
		const perEmail = zeile('Emil');
		const perNummer = zeile('Nico');
		const v = await vorschau(
			datei(
				neu.text,
				perEmail.text.replace(perEmail.email, fuerEmail.email.toUpperCase()),
				perNummer.text.replace(perNummer.nummer, fuerNummer.nummer.toLowerCase()),
				`${fuerBeides.nummer};Berta;Einlesetest;Weg 1;4600;Olten;${fuerBeides.email}`,
				'X1;Fehler;Einlesetest;Weg 1;46;Olten;f@example.org'
			)
		);
		expect(v.neu).toEqual([{ zeile: 2, name: 'Nora Einlesetest' }]);
		expect(v.vorhanden).toEqual([
			{ zeile: 3, name: 'Emil Einlesetest', grund: 'email' },
			{ zeile: 4, name: 'Nico Einlesetest', grund: 'nummer' },
			{ zeile: 5, name: 'Berta Einlesetest', grund: 'beides' }
		]);
		expect(v.fehlerhaft).toEqual([
			{ zeile: 6, name: 'Fehler Einlesetest', fehler: { plz: '4 Ziffern' } }
		]);
	});

	test('A-MITGLIED-07: Fehler der Datei kommt durch', async () => {
		expect(await zeigeVorschau(db, 'vorname\nx', jetzt)).toMatchObject({
			ok: false,
			grund: 'spalten'
		});
	});
});

describe('liesEin', () => {
	test('A-MITGLIED-07, FR-01, FR-26: legt Mitglied und Konto ohne Brief-Code an, Verlauf «angelegt (Einlesen)»', async () => {
		const a = zeile('Anna');
		const b = zeile('Beat');
		const r = await liesEin(db, urheber, datei(a.text, b.text), 2, jetzt);
		expect(r).toEqual({ ergebnis: 'ok', angelegt: 2 });

		const neue = await db
			.select()
			.from(mitglied)
			.where(inArray(mitglied.email, [a.email, b.email]));
		expect(neue.map((m) => m.vorname).sort()).toEqual(['Anna', 'Beat']);
		expect(neue.every((m) => m.status === 'aktiv' && m.fairgateOffenSeit === null)).toBe(true);
		const konten = await db
			.select()
			.from(konto)
			.where(
				inArray(
					konto.mitgliedId,
					neue.map((m) => m.id)
				)
			);
		expect(konten).toHaveLength(2);
		expect(konten.every((k) => k.briefCodeHash === null && !k.gesperrt)).toBe(true);
		const verlauf = await db
			.select()
			.from(aenderung)
			.where(
				inArray(
					aenderung.mitgliedId,
					neue.map((m) => m.id)
				)
			);
		expect(verlauf).toHaveLength(2);
		expect(
			verlauf.every(
				(e) =>
					e.aktion === 'angelegt' &&
					e.detail === 'einlesen' &&
					e.urheberArt === 'admin' &&
					e.urheberMitgliedId === urheber.mitgliedId
			)
		).toBe(true);
	});

	test('A-MITGLIED-07: dieselbe Datei zweimal – das zweite Mal veraltet, danach alles vorhanden', async () => {
		const text = datei(zeile('Clara').text);
		expect(await liesEin(db, urheber, text, 1, jetzt)).toEqual({ ergebnis: 'ok', angelegt: 1 });
		expect(await liesEin(db, urheber, text, 1, jetzt)).toEqual({ ergebnis: 'veraltet' });
		const v = await vorschau(text);
		expect(v.neu).toEqual([]);
		expect(v.vorhanden).toHaveLength(1);
	});

	test('A-MITGLIED-07: gleichzeitige Übernahme derselben Datei legt niemanden doppelt an', async () => {
		const d = zeile('Dora');
		const text = datei(d.text);
		const ergebnisse = await Promise.all([
			liesEin(db, urheber, text, 1, jetzt),
			liesEin(db, urheber, text, 1, jetzt)
		]);
		expect(ergebnisse.map((r) => r.ergebnis).sort()).toEqual(['ok', 'veraltet']);
		const treffer = await db.select().from(mitglied).where(eq(mitglied.email, d.email));
		expect(treffer).toHaveLength(1);
	});

	test('A-MITGLIED-07: falsche erwartete Zahl – nichts angelegt', async () => {
		const e = zeile('Egon');
		expect(await liesEin(db, urheber, datei(e.text), 2, jetzt)).toEqual({ ergebnis: 'veraltet' });
		expect(await liesEin(db, urheber, datei(e.text), 0, jetzt)).toEqual({ ergebnis: 'veraltet' });
		const treffer = await db.select().from(mitglied).where(eq(mitglied.email, e.email));
		expect(treffer).toEqual([]);
	});

	test('A-MITGLIED-07: Fehler der Datei – nichts angelegt', async () => {
		expect(await liesEin(db, urheber, '', 1, jetzt)).toEqual({ ergebnis: 'datei', grund: 'leer' });
	});
});
