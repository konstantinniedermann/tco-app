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
	test('A-ROLLE-02: legeAdminFest legt Mitglied an und gibt die Rolle admin, Urheber automatisch', async () => {
		const roh = angaben();
		expect(await legeAdminFest(db, roh, jetzt)).toEqual({ ergebnis: 'angelegt' });
		const [z] = await db
			.select({ kontoId: konto.id, mitgliedId: mitglied.id })
			.from(mitglied)
			.innerJoin(konto, eq(konto.mitgliedId, mitglied.id))
			.where(eq(mitglied.email, roh.email));
		expect(await ladeRollen(db, z.kontoId)).toEqual(['admin']);
		const verlauf = await db.select().from(aenderung).where(eq(aenderung.mitgliedId, z.mitgliedId));
		expect(verlauf.map((v) => [v.aktion, v.detail, v.urheberMitgliedId]).sort()).toEqual([
			['angelegt', null, null],
			['rolle-vergeben', 'admin', null]
		]);
	});

	test('legeAdminFest: bestehendes Mitglied (gleiche Nummer oder E-Mail) bekommt nur die Rolle', async () => {
		const b = angaben();
		const { kontoId } = await legeBestehendesAn(b);

		const ueberNummer = await legeAdminFest(
			db,
			{ ...angaben(), mitgliedernummer: b.mitgliedernummer },
			jetzt
		);
		expect(ueberNummer).toEqual({ ergebnis: 'rolle-vergeben' });
		expect(await ladeRollen(db, kontoId)).toEqual(['admin']);

		const ueberEmail = await legeAdminFest(
			db,
			{ ...angaben(), email: b.email.toUpperCase() },
			jetzt
		);
		expect(ueberEmail).toEqual({ ergebnis: 'schon-admin' });
		const zeilen = await db.select().from(mitglied).where(eq(mitglied.email, b.email));
		expect(zeilen).toHaveLength(1);
	});

	test('legeAdminFest: behält vorhandene Rollen beim Vergeben von admin', async () => {
		const b = angaben();
		const { kontoId } = await legeBestehendesAn(b);
		await db.insert(kontoRolle).values({ kontoId, rolle: 'cm' });
		expect(await legeAdminFest(db, b, jetzt)).toEqual({ ergebnis: 'rolle-vergeben' });
		expect((await ladeRollen(db, kontoId)).sort()).toEqual(['admin', 'cm']);
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

	test('machAdmin: macht ein Konto zum Admin, zweiter Aufruf ändert nichts', async () => {
		const { mitgliedId, kontoId } = await legeBestehendesAn(angaben());
		await machAdmin(db, kontoId, jetzt);
		await machAdmin(db, kontoId, jetzt);
		expect(await ladeRollen(db, kontoId)).toEqual(['admin']);
		const verlauf = await db.select().from(aenderung).where(eq(aenderung.mitgliedId, mitgliedId));
		expect(verlauf).toHaveLength(1);
	});
});
