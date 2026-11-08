import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
	legeBeispielAnlassAn,
	legeBeispielClubabendAn,
	meldeBeispielAntworten
} from '../../scripts/beispiel-anlass.ts';
import {
	ANZAHL_BEISPIEL_MITGLIEDER,
	beispielMitglieder,
	legeBeispielMitgliederAn
} from '../../scripts/beispiel-mitglieder.ts';
import { anlass, anlassAnmeldung, konto, mitglied } from '../../src/lib/server/db/schema.ts';
import { legeEigeneDatenbankAn, type EigeneDatenbank } from '../hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../hilfen/mitglieder.ts';

let eigene: EigeneDatenbank;
beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('bestand');
});
afterAll(async () => {
	await eigene.abbauen();
});

const jetzt = new Date('2026-11-08T10:00:00Z');

describe('Testbestand für make seed', () => {
	test('legt 185 erfundene Mitglieder mit Konto an, auch zweimal nur einmal', async () => {
		const erste = await legeBeispielMitgliederAn(eigene.db, jetzt);
		const zweite = await legeBeispielMitgliederAn(eigene.db, jetzt);
		expect(zweite).toEqual(erste);
		expect(new Set(erste).size).toBe(ANZAHL_BEISPIEL_MITGLIEDER);
		expect(await eigene.db.$count(mitglied)).toBe(ANZAHL_BEISPIEL_MITGLIEDER);
		expect(await eigene.db.$count(konto)).toBe(ANZAHL_BEISPIEL_MITGLIEDER);
		expect(await eigene.db.$count(mitglied, eq(mitglied.status, 'ausgetreten'))).toBe(8);
	});

	test('erkennt ein Mitglied mit lokal geänderter E-Mail an der Mitgliedernummer', async () => {
		const ids = await legeBeispielMitgliederAn(eigene.db, jetzt);
		await eigene.db
			.update(mitglied)
			.set({ email: 'neu.adresse@example.org' })
			.where(eq(mitglied.id, ids[0]));
		expect(await legeBeispielMitgliederAn(eigene.db, jetzt)).toEqual(ids);
		expect(await eigene.db.$count(mitglied)).toBe(ANZAHL_BEISPIEL_MITGLIEDER);
	});

	test('Angaben sind gemischt und nur unter example.org (DS-08)', () => {
		const werte = beispielMitglieder(jetzt);
		expect(werte.every((w) => w.email?.endsWith('@example.org'))).toBe(true);
		expect(werte.some((w) => w.rufname)).toBe(true);
		expect(werte.some((w) => w.telefon === null)).toBe(true);
		expect(new Set(werte.map((w) => w.klassierung)).size).toBeGreaterThan(5);
		expect(new Set(werte.map((w) => w.geschlecht))).toEqual(new Set(['w', 'm']));
	});

	test('A-ANLASS-01: zweiter Anlass rund einen Monat später, mit gemischten Antworten', async () => {
		const { mitgliedId } = await legeMitgliedAn(eigene.db);
		const ids = await legeBeispielMitgliederAn(eigene.db, jetzt);
		const gv = await legeBeispielAnlassAn(eigene.db, mitgliedId, jetzt);
		const clubabend = await legeBeispielClubabendAn(eigene.db, mitgliedId, jetzt);
		expect(await legeBeispielClubabendAn(eigene.db, mitgliedId, jetzt)).toBe(clubabend);
		const [c] = await eigene.db.select().from(anlass).where(eq(anlass.id, clubabend));
		// 8. Dezember 2026, 18.30 Uhr in Zürich (Winterzeit), Schluss drei Tage vorher um 23.59 Uhr.
		expect(c.beginn).toEqual(new Date('2026-12-08T17:30:00Z'));
		expect(c.anmeldeschluss).toEqual(new Date('2026-12-05T22:59:00Z'));

		for (let lauf = 0; lauf < 2; lauf++) {
			await meldeBeispielAntworten(eigene.db, gv, ids, jetzt, 0);
			await meldeBeispielAntworten(eigene.db, clubabend, ids, jetzt, 1);
		}
		const zaehle = async (id: number) => {
			const zeilen = await eigene.db
				.select({ antwort: anlassAnmeldung.antwort })
				.from(anlassAnmeldung)
				.where(eq(anlassAnmeldung.anlassId, id));
			return {
				kommt: zeilen.filter((z) => z.antwort === 'kommt').length,
				nicht: zeilen.filter((z) => z.antwort === 'kommt-nicht').length
			};
		};
		const aufGv = await zaehle(gv);
		const aufClubabend = await zaehle(clubabend);
		// Ausgetretene antworten nicht; die übrigen rund ein Drittel «kommt», ein Zehntel «kommt nicht».
		expect(aufGv.kommt).toBeGreaterThan(50);
		expect(aufGv.nicht).toBeGreaterThan(10);
		expect(aufClubabend.kommt).toBeGreaterThan(50);
		expect(aufClubabend).not.toEqual(aufGv);
	});
});
