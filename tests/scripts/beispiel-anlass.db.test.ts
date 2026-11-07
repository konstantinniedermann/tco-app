import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { legeBeispielAnlassAn } from '../../scripts/beispiel-anlass.ts';
import { anlass, anlassAnmeldung, mitteilung } from '../../src/lib/server/db/schema.ts';
import { legeEigeneDatenbankAn, type EigeneDatenbank } from '../hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../hilfen/mitglieder.ts';

let eigene: EigeneDatenbank;
beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('beispiel');
});
afterAll(async () => {
	await eigene.abbauen();
});

describe('Beispiel-GV für make seed', () => {
	test('A-ANLASS-01: legeBeispielAnlassAn ist mehrfach ausführbar', async () => {
		const { mitgliedId } = await legeMitgliedAn(eigene.db);
		const jetzt = new Date('2026-11-05T10:00:00Z');
		await legeBeispielAnlassAn(eigene.db, mitgliedId, jetzt);
		await legeBeispielAnlassAn(eigene.db, mitgliedId, jetzt);
		const anlaesse = await eigene.db.select().from(anlass);
		expect(anlaesse).toHaveLength(1);
		expect(anlaesse[0]).toMatchObject({
			titel: 'Generalversammlung 2027',
			beginn: new Date('2027-03-19T18:30:00Z'),
			anmeldeschluss: new Date('2027-03-16T22:59:00Z')
		});
		const antworten = await eigene.db.select().from(anlassAnmeldung);
		expect(antworten.map((a) => a.antwort).sort()).toEqual([
			'kommt',
			'kommt',
			'kommt',
			'kommt-nicht'
		]);
		expect(antworten.find((a) => a.antwort === 'kommt-nicht')?.bemerkung).toBe(
			'Bin leider in den Ferien.'
		);
		// FR-42: genau ein erfundener Eintrag im Verlauf der Mitteilungen, auch nach zwei Läufen.
		const verlauf = await eigene.db.select().from(mitteilung);
		expect(verlauf).toHaveLength(1);
		expect(verlauf[0]).toMatchObject({
			bezug: 'anlass',
			anlassId: anlaesse[0].id,
			absenderId: mitgliedId,
			gesendetAm: jetzt,
			titel: 'Erinnerung: Generalversammlung 2027',
			auswahl: 'keine-antwort',
			weg: 'push-sonst-mail',
			push: 1,
			mails: 1
		});
	});
});
