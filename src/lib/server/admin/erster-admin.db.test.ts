import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
	legeEigeneDatenbankAn,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import type { Db } from '../db/index.ts';
import { aenderung, konto, kontoRolle, mitglied } from '../db/schema.ts';
import { legeAdminFest, machAdmin } from './erster-admin.ts';
import { ladeRollen } from './rollen.ts';

// «Es gibt noch keinen Admin» ist global; darum eine eigene Datenbank.
let eigene: EigeneDatenbank | undefined;
let db: Db;

beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('erster_admin');
	db = eigene.db;
});

afterAll(async () => {
	await eigene?.abbauen();
});

const jetzt = new Date('2026-11-04T12:00:00Z');
const MYTCO_UND_MITGLIEDER = ['mitglieder', 'mytco'];

function angaben(teil: Record<string, string> = {}) {
	const eindeutig = randomUUID().replaceAll('-', '').slice(0, 8);
	return {
		mitgliedernummer: `N${eindeutig}`,
		vorname: 'Paula',
		nachname: 'Leitung',
		strasse: 'Erfundenweg 1',
		plz: '4600',
		ort: 'Olten',
		email: `admin-${eindeutig}@example.org`,
		...teil
	};
}

async function legeBestehendesAn(roh: ReturnType<typeof angaben>) {
	const [m] = await db.insert(mitglied).values(roh).returning({ id: mitglied.id });
	const [k] = await db.insert(konto).values({ mitgliedId: m.id }).returning({ id: konto.id });
	return { mitgliedId: m.id, kontoId: k.id };
}

describe('Erster Admin', () => {
	test('A-ROLLE-02: legeAdminFest legt Mitglied an, der erste Admin bekommt mytco und mitglieder, Urheber automatisch', async () => {
		const roh = angaben();
		expect(await legeAdminFest(db, roh, jetzt)).toEqual({ ergebnis: 'angelegt' });
		const [z] = await db
			.select({ kontoId: konto.id, mitgliedId: mitglied.id })
			.from(mitglied)
			.innerJoin(konto, eq(konto.mitgliedId, mitglied.id))
			.where(eq(mitglied.email, roh.email));
		expect((await ladeRollen(db, z.kontoId)).sort()).toEqual(['mitglieder', 'mytco']);
		const verlauf = await db.select().from(aenderung).where(eq(aenderung.mitgliedId, z.mitgliedId));
		expect(verlauf.map((v) => [v.aktion, v.detail, v.urheberMitgliedId]).sort()).toEqual([
			['angelegt', null, null],
			['rolle-vergeben', 'mitglieder', null],
			['rolle-vergeben', 'mytco', null]
		]);
	});

	test('legeAdminFest: bestehendes Mitglied (gleiche Nummer und E-Mail) bekommt nur die Rolle', async () => {
		const b = angaben();
		const { kontoId } = await legeBestehendesAn(b);

		const erst = await legeAdminFest(db, { ...b, vorname: 'Anders' }, jetzt);
		expect(erst).toEqual({ ergebnis: 'rolle-vergeben' });
		expect((await ladeRollen(db, kontoId)).sort()).toEqual(MYTCO_UND_MITGLIEDER);

		const nochmal = await legeAdminFest(db, { ...b, email: b.email.toUpperCase() }, jetzt);
		expect(nochmal).toEqual({ ergebnis: 'schon-admin' });
		const zeilen = await db.select().from(mitglied).where(eq(mitglied.email, b.email));
		expect(zeilen).toHaveLength(1);
	});

	test('legeAdminFest: Nummer in anderer Gross-/Kleinschreibung findet dasselbe Mitglied', async () => {
		const b = angaben();
		const { kontoId } = await legeBestehendesAn(b);
		const r = await legeAdminFest(
			db,
			{ ...b, mitgliedernummer: b.mitgliedernummer.toLowerCase() },
			jetzt
		);
		expect(r).toEqual({ ergebnis: 'rolle-vergeben' });
		expect((await ladeRollen(db, kontoId)).sort()).toEqual(MYTCO_UND_MITGLIEDER);
		const zeilen = await db.select().from(mitglied).where(eq(mitglied.email, b.email));
		expect(zeilen).toHaveLength(1);
	});

	test('legeAdminFest: E-Mail passt, Nummer in der Datenbank anders geschrieben → Rolle', async () => {
		const b = angaben();
		const { kontoId } = await legeBestehendesAn(b);
		const r = await legeAdminFest(
			db,
			{ ...b, mitgliedernummer: b.mitgliedernummer.toLowerCase(), email: b.email.toUpperCase() },
			jetzt
		);
		expect(r).toEqual({ ergebnis: 'rolle-vergeben' });
		expect((await ladeRollen(db, kontoId)).sort()).toEqual(MYTCO_UND_MITGLIEDER);
	});

	test('legeAdminFest: gleiche E-Mail, Nummer in der Datenbank leer → Rolle', async () => {
		const b = angaben();
		const [m] = await db
			.insert(mitglied)
			.values({ ...b, mitgliedernummer: null })
			.returning({ id: mitglied.id });
		const [k] = await db.insert(konto).values({ mitgliedId: m.id }).returning({ id: konto.id });
		expect(await legeAdminFest(db, b, jetzt)).toEqual({ ergebnis: 'rolle-vergeben' });
		expect((await ladeRollen(db, k.id)).sort()).toEqual(MYTCO_UND_MITGLIEDER);
	});

	const WIDERSPRUCH = {
		ergebnis: 'fehler',
		fehler: {
			mitgliedernummer: 'passt nicht zur E-Mail',
			email: 'passt nicht zur Mitgliedernummer'
		}
	};

	test('legeAdminFest: Nummer gehört A, E-Mail gehört B → fehler, niemand wird Admin', async () => {
		const a = await legeBestehendesAn(angaben());
		const b = await legeBestehendesAn(angaben());
		const [ma] = await db
			.select({ n: mitglied.mitgliedernummer })
			.from(mitglied)
			.where(eq(mitglied.id, a.mitgliedId));
		const [mb] = await db
			.select({ e: mitglied.email })
			.from(mitglied)
			.where(eq(mitglied.id, b.mitgliedId));
		const roh = angaben({ mitgliedernummer: ma.n!, email: mb.e! });
		expect(await legeAdminFest(db, roh, jetzt)).toEqual(WIDERSPRUCH);
		expect(await ladeRollen(db, a.kontoId)).toEqual([]);
		expect(await ladeRollen(db, b.kontoId)).toEqual([]);
	});

	test('legeAdminFest: Nummer passt, E-Mail weicht ab → fehler, nichts geändert', async () => {
		const b = angaben();
		const { kontoId } = await legeBestehendesAn(b);
		const r = await legeAdminFest(db, { ...b, email: angaben().email }, jetzt);
		expect(r).toEqual(WIDERSPRUCH);
		expect(await ladeRollen(db, kontoId)).toEqual([]);
	});

	test('legeAdminFest: E-Mail passt, andere Nummer in der Datenbank → fehler, nichts geändert', async () => {
		const b = angaben();
		const { kontoId } = await legeBestehendesAn(b);
		const r = await legeAdminFest(
			db,
			{ ...b, mitgliedernummer: angaben().mitgliedernummer },
			jetzt
		);
		expect(r).toEqual(WIDERSPRUCH);
		expect(await ladeRollen(db, kontoId)).toEqual([]);
	});

	test('legeAdminFest: bestehendes Mitglied ohne Konto bekommt erst beim Vergeben eines', async () => {
		const b = angaben();
		const [m] = await db.insert(mitglied).values(b).returning({ id: mitglied.id });
		expect(await legeAdminFest(db, b, jetzt)).toEqual({ ergebnis: 'rolle-vergeben' });
		const [k] = await db.select({ id: konto.id }).from(konto).where(eq(konto.mitgliedId, m.id));
		expect((await ladeRollen(db, k.id)).sort()).toEqual(MYTCO_UND_MITGLIEDER);
	});

	test('legeAdminFest: behält vorhandene Rollen beim Vergeben von mytco und mitglieder', async () => {
		const b = angaben();
		const { kontoId } = await legeBestehendesAn(b);
		await db.insert(kontoRolle).values({ kontoId, rolle: 'cm' });
		expect(await legeAdminFest(db, b, jetzt)).toEqual({ ergebnis: 'rolle-vergeben' });
		expect((await ladeRollen(db, kontoId)).sort()).toEqual(['cm', 'mitglieder', 'mytco']);
	});

	test('legeAdminFest: besteht er schon mit mytco, gibt es schon-admin und nichts ändert sich', async () => {
		const b = angaben();
		const { mitgliedId, kontoId } = await legeBestehendesAn(b);
		await db.insert(kontoRolle).values({ kontoId, rolle: 'mytco' });
		expect(await legeAdminFest(db, b, jetzt)).toEqual({ ergebnis: 'schon-admin' });
		expect(await ladeRollen(db, kontoId)).toEqual(['mytco']);
		expect(await db.select().from(aenderung).where(eq(aenderung.mitgliedId, mitgliedId))).toEqual(
			[]
		);
	});

	test('legeAdminFest: nur mitglieder genügt nicht, mytco kommt dazu', async () => {
		const b = angaben();
		const { kontoId } = await legeBestehendesAn(b);
		await db.insert(kontoRolle).values({ kontoId, rolle: 'mitglieder' });
		expect(await legeAdminFest(db, b, jetzt)).toEqual({ ergebnis: 'rolle-vergeben' });
		expect((await ladeRollen(db, kontoId)).sort()).toEqual(MYTCO_UND_MITGLIEDER);
	});

	test('legeAdminFest: fehlende Pflichtangaben → fehler, nichts angelegt', async () => {
		const vorher = await db.select().from(mitglied);
		const r = await legeAdminFest(db, angaben({ nachname: '', mitgliedernummer: '' }), jetzt);
		expect(r).toEqual({
			ergebnis: 'fehler',
			fehler: expect.objectContaining({ nachname: 'fehlt', mitgliedernummer: 'fehlt' })
		});
		expect(await db.select().from(mitglied)).toHaveLength(vorher.length);
	});

	test('machAdmin: gibt mytco und mitglieder, zweiter Aufruf ändert nichts', async () => {
		const { mitgliedId, kontoId } = await legeBestehendesAn(angaben());
		await machAdmin(db, kontoId, jetzt);
		await machAdmin(db, kontoId, jetzt);
		expect((await ladeRollen(db, kontoId)).sort()).toEqual(MYTCO_UND_MITGLIEDER);
		const verlauf = await db.select().from(aenderung).where(eq(aenderung.mitgliedId, mitgliedId));
		expect(verlauf).toHaveLength(2);
	});
});
