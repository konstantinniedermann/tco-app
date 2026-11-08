import { and, count, eq, isNotNull, isNull } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { legeBeispielTurnierAn } from '../../scripts/beispiel-turnier.ts';
import {
	anmeldung,
	anmeldungSpieler,
	kategorie,
	mitglied,
	partnerAnfrage,
	turnier,
	turniernummer
} from '../../src/lib/server/db/schema.ts';
import { legeEigeneDatenbankAn, type EigeneDatenbank } from '../hilfen/eigene-datenbank.ts';

let eigene: EigeneDatenbank;
beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('beispielturnier');
});
afterAll(async () => {
	await eigene.abbauen();
});

describe('Beispielturnier für make seed', () => {
	test('A-TURNIER-01: Beispielturnier 2027 mit 8 Kategorien, zweiter Lauf legt nichts doppelt an', async () => {
		const jetzt = new Date('2026-11-06T10:00:00Z');
		await legeBeispielTurnierAn(eigene.db, jetzt);
		await legeBeispielTurnierAn(eigene.db, jetzt);
		const turniere = await eigene.db.select().from(turnier);
		expect(turniere).toHaveLength(1);
		expect(turniere[0]).toMatchObject({
			jahr: 2027,
			name: 'Clubmeisterschaft 2027',
			anmeldeschluss: '2027-05-31',
			status: 'offen'
		});
		const nummern = await eigene.db.select().from(turniernummer);
		expect(nummern.map((n) => n.nummer).sort()).toEqual(['123456', '123457']);
		const kategorien = await eigene.db.select().from(kategorie);
		expect(kategorien.map((k) => k.name).sort()).toEqual([
			'Damen Doppel',
			'Damen R4–R9',
			'Herren Doppel',
			'Herren R1–R6',
			'Herren R7–R9',
			'Junioren U18',
			'Mixed Doppel',
			'Senioren 45+'
		]);
	});

	test('A-ANMELDUNG-01: Beispielturnier hat erfundene Anmeldungen, zweiter Lauf legt nichts doppelt an', async () => {
		const jetzt = new Date('2026-11-06T10:00:00Z');
		await legeBeispielTurnierAn(eigene.db, jetzt);
		const lesen = async () =>
			eigene.db
				.select({ kategorie: kategorie.name, email: mitglied.email })
				.from(anmeldung)
				.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
				.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
				.innerJoin(mitglied, eq(mitglied.id, anmeldungSpieler.mitgliedId));
		const erste = await lesen();
		expect(new Set(erste.map((a) => a.email)).size).toBeGreaterThanOrEqual(4);
		expect(erste.every((a) => a.email!.endsWith('@example.org'))).toBe(true);
		for (const name of ['Herren R1–R6', 'Herren R7–R9', 'Damen R4–R9']) {
			expect(erste.some((a) => a.kategorie === name)).toBe(true);
		}
		await legeBeispielTurnierAn(eigene.db, jetzt);
		expect(await lesen()).toHaveLength(erste.length);
	});

	test('FR-08: Beispielturnier hat einen Wildcard-Antrag mit Kommentar, zweiter Lauf legt ihn nicht doppelt an', async () => {
		const jetzt = new Date('2026-11-06T10:00:00Z');
		await legeBeispielTurnierAn(eigene.db, jetzt);
		await legeBeispielTurnierAn(eigene.db, jetzt);
		const antraege = await eigene.db
			.select({ kategorie: kategorie.name, email: mitglied.email, kommentar: anmeldung.kommentar })
			.from(anmeldung)
			.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
			.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
			.innerJoin(mitglied, eq(mitglied.id, anmeldungSpieler.mitgliedId))
			.where(eq(anmeldung.status, 'beantragt'));
		expect(antraege).toEqual([
			{
				kategorie: 'Herren R1–R6',
				email: 'urs.probe@example.org',
				kommentar: 'Möchte mich mit Stärkeren messen.'
			}
		]);
	});

	test('Rufname: zwei erfundene Spieler haben einen, einer davon gleich dem Vornamen in anderer Schreibweise', async () => {
		await legeBeispielTurnierAn(eigene.db, new Date('2026-11-06T10:00:00Z'));
		const mitRufname = await eigene.db
			.select({ vorname: mitglied.vorname, rufname: mitglied.rufname })
			.from(mitglied)
			.where(isNotNull(mitglied.rufname));
		expect(mitRufname.sort((a, b) => a.vorname.localeCompare(b.vorname))).toEqual([
			{ vorname: 'Lena', rufname: 'lena' },
			{ vorname: 'Max', rufname: 'Maxi' }
		]);
	});

	test('A-ANMELDUNG-04, FR-48, FR-49: Beispielturnier hat ein Paar, zwei Suchende, eine offene Anfrage und einen Spieler ohne Klassierung, zweiter Lauf ändert nichts', async () => {
		const jetzt = new Date('2026-11-06T10:00:00Z');
		const zeilen = async () => ({
			mitglied: (await eigene.db.select({ n: count() }).from(mitglied))[0].n,
			anmeldung: (await eigene.db.select({ n: count() }).from(anmeldung))[0].n,
			spieler: (await eigene.db.select({ n: count() }).from(anmeldungSpieler))[0].n,
			anfragen: (await eigene.db.select({ n: count() }).from(partnerAnfrage))[0].n
		});
		await legeBeispielTurnierAn(eigene.db, jetzt);
		const erste = await zeilen();
		await legeBeispielTurnierAn(eigene.db, jetzt);
		expect(await zeilen()).toEqual(erste);

		const doppel = await eigene.db
			.select({
				kategorie: kategorie.name,
				anmeldungId: anmeldung.id,
				suchtext: anmeldung.suchtext,
				vorname: mitglied.vorname
			})
			.from(anmeldung)
			.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
			.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
			.innerJoin(mitglied, eq(mitglied.id, anmeldungSpieler.mitgliedId))
			.where(and(eq(kategorie.art, 'doppel'), eq(anmeldung.status, 'bestaetigt')));
		const je = (name: string) => doppel.filter((d) => d.kategorie === name);
		const mixed = je('Mixed Doppel');
		expect(mixed.map((d) => d.vorname).sort()).toEqual(['Lena', 'Max']);
		expect(new Set(mixed.map((d) => d.anmeldungId)).size).toBe(1);
		expect(mixed[0].suchtext).toBeNull();
		expect(je('Damen Doppel').map(({ vorname, suchtext }) => ({ vorname, suchtext }))).toEqual([
			{ vorname: 'Sara', suchtext: 'Suche jemanden auf R5–R7-Niveau, eher abends.' }
		]);
		expect(je('Herren Doppel').map(({ vorname, suchtext }) => ({ vorname, suchtext }))).toEqual([
			{ vorname: 'Paul', suchtext: null }
		]);

		const anfragen = await eigene.db
			.select({ kategorie: kategorie.name, vonId: partnerAnfrage.vonId, anId: partnerAnfrage.anId })
			.from(partnerAnfrage)
			.innerJoin(kategorie, eq(kategorie.id, partnerAnfrage.kategorieId));
		const vorname = async (id: number) =>
			(await eigene.db.select().from(mitglied).where(eq(mitglied.id, id)))[0].vorname;
		expect(anfragen).toHaveLength(1);
		expect(anfragen[0].kategorie).toBe('Herren Doppel');
		expect([await vorname(anfragen[0].vonId), await vorname(anfragen[0].anId)]).toEqual([
			'Urs',
			'Paul'
		]);

		const ohneKlassierung = await eigene.db
			.select({ email: mitglied.email })
			.from(mitglied)
			.where(isNull(mitglied.klassierung));
		expect(ohneKlassierung).toEqual([{ email: 'nico.musterli@example.org' }]);
	});
});
