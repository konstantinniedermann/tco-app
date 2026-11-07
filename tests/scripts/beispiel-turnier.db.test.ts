import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { legeBeispielTurnierAn } from '../../scripts/beispiel-turnier.ts';
import {
	anmeldung,
	anmeldungSpieler,
	kategorie,
	mitglied,
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
		expect(erste.every((a) => a.email.endsWith('@example.org'))).toBe(true);
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
});
