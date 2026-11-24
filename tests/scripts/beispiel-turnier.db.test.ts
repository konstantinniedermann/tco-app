import { and, count, eq, inArray, isNotNull, isNull, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { legeBeispielAnlassAn, meldeBeispielAntworten } from '../../scripts/beispiel-anlass.ts';
import {
	beispielJahr,
	legeBeispielGespraecheAn,
	legeBeispielTurnierAn,
	setzeBeispielKontakt
} from '../../scripts/beispiel-turnier.ts';
import { beispielTurnierSpieler } from '../../scripts/beispiel-turnier-fuellung.ts';
import {
	anlassAnmeldung,
	anmeldung,
	anmeldungSpieler,
	gespraech,
	kategorie,
	konto,
	mitglied,
	partnerAnfrage,
	turnier,
	turniernummer
} from '../../src/lib/server/db/schema.ts';
import { sucheDoppelPartner, stelleAnfrage } from '../../src/lib/server/cm/doppel.ts';
import { legeEigeneDatenbankAn, type EigeneDatenbank } from '../hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../hilfen/mitglieder.ts';

let eigene: EigeneDatenbank;
beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('beispielturnier');
});
afterAll(async () => {
	await eigene.abbauen();
});

/** Zurück auf den Stand eines früheren Seeds: Auffüllung und die zwei neuen Kategorien weg. */
async function zurueckAufFrueherenStand() {
	const auffuellung = eigene.db
		.select({ id: mitglied.id })
		.from(mitglied)
		.where(like(mitglied.mitgliedernummer, '30%'));
	const ihre = eigene.db
		.select({ id: anmeldungSpieler.anmeldungId })
		.from(anmeldungSpieler)
		.where(inArray(anmeldungSpieler.mitgliedId, auffuellung));
	await eigene.db.delete(anmeldung).where(inArray(anmeldung.id, ihre));
	await eigene.db.delete(mitglied).where(like(mitglied.mitgliedernummer, '30%'));
	await eigene.db
		.delete(kategorie)
		.where(inArray(kategorie.name, ['Damen R1–R3', 'Seniorinnen 40+']));
}

describe('Beispielturnier für make seed', () => {
	test('A-TURNIER-01: Beispielturnier 2027 mit 10 Kategorien, zweiter Lauf legt nichts doppelt an', async () => {
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
			'Damen R1–R3',
			'Damen R4–R9',
			'Herren Doppel',
			'Herren R1–R6',
			'Herren R7–R9',
			'Junioren U18',
			'Mixed Doppel',
			'Senioren 45+',
			'Seniorinnen 40+'
		]);
	});

	test('A-ANMELDUNG-01: Jede Kategorie hat 10–16 aktive Anmeldungen, jeder Spieler ein Konto mit Login, zweiter Lauf ändert nichts', async () => {
		const jetzt = new Date('2026-11-06T10:00:00Z');
		await legeBeispielTurnierAn(eigene.db, jetzt);
		const zaehlen = async () =>
			eigene.db
				.select({ name: kategorie.name, n: count() })
				.from(anmeldung)
				.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
				.where(inArray(anmeldung.status, ['bestaetigt', 'beantragt']))
				.groupBy(kategorie.name)
				.orderBy(kategorie.name);
		const erste = await zaehlen();
		expect(erste).toHaveLength(10);
		for (const { name, n } of erste) {
			expect(n, name).toBeGreaterThanOrEqual(10);
			expect(n, name).toBeLessThanOrEqual(16);
		}
		const ohneLogin = await eigene.db
			.select({ email: mitglied.email })
			.from(anmeldungSpieler)
			.innerJoin(mitglied, eq(mitglied.id, anmeldungSpieler.mitgliedId))
			.leftJoin(konto, eq(konto.mitgliedId, mitglied.id))
			.where(isNull(konto.briefCodeBenutztAm));
		expect(ohneLogin).toEqual([]);
		await legeBeispielTurnierAn(eigene.db, jetzt);
		expect(await zaehlen()).toEqual(erste);
	});

	test('A-TURNIER-01: Ein Beispielturnier aus einem früheren Seed (8 Kategorien, ohne Auffüllung) bekommt die neuen Kategorien und wird aufgefüllt', async () => {
		const jetzt = new Date('2026-11-06T10:00:00Z');
		await legeBeispielTurnierAn(eigene.db, jetzt);
		await zurueckAufFrueherenStand();

		await legeBeispielTurnierAn(eigene.db, jetzt);
		const zahlen = await eigene.db
			.select({ name: kategorie.name, n: count(anmeldung.id) })
			.from(kategorie)
			.leftJoin(
				anmeldung,
				and(
					eq(anmeldung.kategorieId, kategorie.id),
					inArray(anmeldung.status, ['bestaetigt', 'beantragt'])
				)
			)
			.groupBy(kategorie.name);
		expect(zahlen).toHaveLength(10);
		for (const { name, n } of zahlen) expect(n, name).toBeGreaterThanOrEqual(10);
	});

	test('A-TURNIER-01: Ist eine Beispielkategorie lokal abgesagt, läuft der Seed durch und füllt nicht auf', async () => {
		const jetzt = new Date('2026-11-06T10:00:00Z');
		await legeBeispielTurnierAn(eigene.db, jetzt);
		await zurueckAufFrueherenStand();
		await eigene.db
			.update(kategorie)
			.set({ status: 'abgesagt' })
			.where(eq(kategorie.name, 'Junioren U18'));

		await legeBeispielTurnierAn(eigene.db, jetzt);
		const [{ n }] = await eigene.db
			.select({ n: count() })
			.from(mitglied)
			.where(like(mitglied.mitgliedernummer, '30%'));
		expect(n).toBe(0);
		await eigene.db
			.update(kategorie)
			.set({ status: 'aktiv' })
			.where(eq(kategorie.name, 'Junioren U18'));
		await legeBeispielTurnierAn(eigene.db, jetzt);
	}, 20_000);

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
		// Nur die Anmeldungen der Beispielspieler, mit allen ihren Spielern; die Auffüllung bringt
		// weitere Paare und Suchende.
		const beispiel = ['Max', 'Lena', 'Sara', 'Paul', 'Urs', 'Nico'];
		const ihre = new Set(
			doppel.filter((d) => beispiel.includes(d.vorname)).map((d) => d.anmeldungId)
		);
		const je = (name: string) =>
			doppel.filter((d) => d.kategorie === name && ihre.has(d.anmeldungId));
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

	test('FR-48: Wer im Beispielturnier allein sucht, lässt sich in der Partnersuche finden und anfragen', async () => {
		const jetzt = new Date('2026-11-06T10:00:00Z');
		await legeBeispielTurnierAn(eigene.db, jetzt);
		// Eine Spielerin wie die Persona Hanna: alle Angaben, passt ins Damen Doppel.
		const { mitgliedId } = await legeMitgliedAn(eigene.db, { vorname: 'Hanna' });
		await eigene.db
			.update(mitglied)
			.set({ geschlecht: 'w', jahrgang: 2000, klassierung: 'R5' })
			.where(eq(mitglied.id, mitgliedId));
		const [damen] = await eigene.db
			.select({ id: kategorie.id })
			.from(kategorie)
			.where(eq(kategorie.name, 'Damen Doppel'));

		const treffer = await sucheDoppelPartner(eigene.db, damen.id, mitgliedId, 'Erdacht', jetzt);
		expect(treffer).toHaveLength(1);
		expect(treffer[0]).toMatchObject({
			suchtPartner: true,
			kommentar: 'Suche jemanden auf R5–R7-Niveau, eher abends.'
		});
		expect(await stelleAnfrage(eigene.db, damen.id, mitgliedId, treffer[0].mitgliedId, jetzt)).toBe(
			'ok'
		);
	});

	test('A-ANLASS-01: Die 80 Spieler der Auffüllung antworten gemischt auf die Beispiel-GV', async () => {
		const jetzt = new Date('2026-11-06T10:00:00Z');
		await legeBeispielTurnierAn(eigene.db, jetzt);
		const spieler = await beispielTurnierSpieler(eigene.db);
		expect(spieler).toHaveLength(80);
		const mitNummer = await eigene.db
			.select({ id: mitglied.id })
			.from(mitglied)
			.where(like(mitglied.mitgliedernummer, '30%'));
		expect([...spieler].sort((a, b) => a - b)).toEqual(
			mitNummer.map((m) => m.id).sort((a, b) => a - b)
		);

		const { mitgliedId } = await legeMitgliedAn(eigene.db);
		const gv = await legeBeispielAnlassAn(eigene.db, mitgliedId, jetzt);
		await meldeBeispielAntworten(eigene.db, gv, spieler, jetzt, 0);
		const antworten = await eigene.db
			.select({ antwort: anlassAnmeldung.antwort })
			.from(anlassAnmeldung)
			.where(and(eq(anlassAnmeldung.anlassId, gv), inArray(anlassAnmeldung.mitgliedId, spieler)));
		const zahl = (a: string) => antworten.filter((x) => x.antwort === a).length;
		expect(zahl('kommt')).toBeGreaterThan(0);
		expect(zahl('kommt-nicht')).toBeGreaterThan(0);
		expect(antworten.length).toBeLessThan(spieler.length);
	});

	test('FR-55: Kontaktperson: setzt sie nur, solange keine gewählt ist', async () => {
		const jetzt = new Date('2026-11-06T10:00:00Z');
		await legeBeispielTurnierAn(eigene.db, jetzt);
		const erste = await legeMitgliedAn(eigene.db, { rollen: ['cm'] });
		const zweite = await legeMitgliedAn(eigene.db, { rollen: ['cm'] });
		await setzeBeispielKontakt(eigene.db, erste.mitgliedId, jetzt);
		await setzeBeispielKontakt(eigene.db, zweite.mitgliedId, jetzt);
		const [t] = await eigene.db
			.select({ kontakt: turnier.kontaktMitgliedId })
			.from(turnier)
			.where(eq(turnier.jahr, 2027));
		expect(t.kontakt).toBe(erste.mitgliedId);
	});
});

describe('Beispielturnier nach dem Anmeldeschluss des laufenden Jahres', () => {
	test('A-TURNIER-01: Das Jahr ist das laufende bis zum Ende des 31.05. (Zürich), danach das nächste', () => {
		expect(beispielJahr(new Date('2026-11-06T10:00:00Z'))).toBe(2027);
		expect(beispielJahr(new Date('2027-01-01T00:30:00+01:00'))).toBe(2027);
		expect(beispielJahr(new Date('2027-05-31T23:00:00+02:00'))).toBe(2027);
		expect(beispielJahr(new Date('2027-06-01T00:30:00+02:00'))).toBe(2028);
	});

	let spaeter: EigeneDatenbank;
	beforeAll(async () => {
		spaeter = await legeEigeneDatenbankAn('beispielturnier_spaeter');
	});
	afterAll(async () => {
		await spaeter.abbauen();
	});

	test('A-TURNIER-01: Nach dem 31.05. legt der Seed die CM des nächsten Jahres offen an, aufgefüllt, mit Kontaktperson und Gesprächen', async () => {
		// 15.06.2027: Die CM 2027 ist zu, die nächste Anmeldung ist die von 2028.
		const jetzt = new Date('2027-06-15T10:00:00Z');
		await legeBeispielTurnierAn(spaeter.db, jetzt);
		const [t] = await spaeter.db.select().from(turnier);
		expect(t).toMatchObject({
			jahr: 2028,
			name: 'Clubmeisterschaft 2028',
			anmeldeschluss: '2028-05-31',
			status: 'offen'
		});
		const proKategorie = await spaeter.db
			.select({ name: kategorie.name, n: count() })
			.from(anmeldung)
			.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
			.where(inArray(anmeldung.status, ['bestaetigt', 'beantragt']))
			.groupBy(kategorie.name);
		expect(proKategorie).toHaveLength(10);
		for (const { name, n } of proKategorie) expect(n, name).toBeGreaterThanOrEqual(10);

		const hanna = await legeMitgliedAn(spaeter.db, { rollen: ['cm'] });
		await setzeBeispielKontakt(spaeter.db, hanna.mitgliedId, jetzt);
		await legeBeispielGespraecheAn(spaeter.db, hanna.mitgliedId, jetzt);
		const [mitKontakt] = await spaeter.db
			.select({ kontakt: turnier.kontaktMitgliedId })
			.from(turnier)
			.where(eq(turnier.jahr, 2028));
		expect(mitKontakt.kontakt).toBe(hanna.mitgliedId);
		// Max und Lena gehören zum Beispielturnier; Kurt (Persona) fehlt in diesem Test.
		const gespraeche = await spaeter.db
			.select({ id: gespraech.id })
			.from(gespraech)
			.where(eq(gespraech.turnierId, t.id));
		expect(gespraeche).toHaveLength(2);
		// Ein voller Seed: einzeln rund 1 s, im vollen Lauf mit Abdeckung deutlich mehr.
	}, 20_000);
});

describe('Beispielturnier im Folgejahr auf einer bestehenden Datenbank', () => {
	let bestehend: EigeneDatenbank;
	beforeAll(async () => {
		bestehend = await legeEigeneDatenbankAn('beispielturnier_folgejahr');
	});
	afterAll(async () => {
		await bestehend.abbauen();
	});

	test('A-ANMELDUNG-01: Nach einem Seed für 2027 füllt der Seed ab dem 1.6.2027 auch die CM 2028 auf, die CM 2027 bleibt', async () => {
		await legeBeispielTurnierAn(bestehend.db, new Date('2026-11-06T10:00:00Z'));
		const zaehlen = async (jahr: number) =>
			bestehend.db
				.select({ name: kategorie.name, n: count() })
				.from(anmeldung)
				.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
				.innerJoin(turnier, eq(turnier.id, kategorie.turnierId))
				.where(and(eq(turnier.jahr, jahr), inArray(anmeldung.status, ['bestaetigt', 'beantragt'])))
				.groupBy(kategorie.name)
				.orderBy(kategorie.name);
		const vorher = await zaehlen(2027);

		const spaeter = new Date('2027-06-15T10:00:00Z');
		await legeBeispielTurnierAn(bestehend.db, spaeter);
		const neu = await zaehlen(2028);
		expect(neu).toHaveLength(10);
		for (const { name, n } of neu) {
			expect(n, name).toBeGreaterThanOrEqual(10);
			expect(n, name).toBeLessThanOrEqual(16);
		}
		expect(await zaehlen(2027)).toEqual(vorher);
		// Ein zweiter Lauf im Folgejahr legt nichts doppelt an.
		await legeBeispielTurnierAn(bestehend.db, spaeter);
		expect(await zaehlen(2028)).toEqual(neu);
		// Drei Seeds mit je 80 Spielern: einzeln rund 2 s, im vollen Lauf mit Abdeckung über 5 s.
	}, 20_000);
});
