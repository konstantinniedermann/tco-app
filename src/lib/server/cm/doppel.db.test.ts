import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { anmeldung, partnerAnfrage } from '../db/schema.ts';
import { legeKategorieAn, legeTurnierAn } from '../turnier/turniere.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

// Die gemeinsame Test-Datenbank hat Turniere anderer Tests: jedes Turnier bekommt ein eigenes Jahr.
const zufallsJahr = () => 3000 + Math.floor(Math.random() * 6000);

async function doppelKategorie() {
	for (;;) {
		const jahr = zufallsJahr();
		const t = await legeTurnierAn(db, {
			jahr,
			name: `Clubmeisterschaft ${jahr}`,
			anmeldeschluss: `${jahr}-05-31`,
			nummern: []
		});
		if (t.ergebnis !== 'ok') continue;
		const k = await legeKategorieAn(db, t.id, {
			name: 'Herren Doppel',
			geschlecht: 'herren',
			art: 'doppel',
			jahrgangVon: null,
			jahrgangBis: null,
			klassierungVon: null,
			klassierungBis: null,
			mindestsumme: 10
		});
		if (k.ergebnis !== 'ok') throw new Error(`Kategorie: ${k.ergebnis}`);
		return k.id;
	}
}

describe('Schema Partner-Anfrage und Suchtext', () => {
	test('FR-48: offene Anfrage je Paar nur einmal', async () => {
		const kategorieId = await doppelKategorie();
		const von = (await legeMitgliedAn(db)).mitgliedId;
		const an = (await legeMitgliedAn(db)).mitgliedId;
		const zeile = { kategorieId, vonId: von, anId: an, gestelltAm: new Date() };

		await db.insert(partnerAnfrage).values(zeile);
		await expect(db.insert(partnerAnfrage).values(zeile)).rejects.toThrow();
		// Die Gegenrichtung ist ein anderes Paar.
		await db.insert(partnerAnfrage).values({ ...zeile, vonId: an, anId: von });
	});

	test('FR-48: eine Anfrage an sich selbst ist nicht möglich', async () => {
		const kategorieId = await doppelKategorie();
		const m = (await legeMitgliedAn(db)).mitgliedId;
		await expect(
			db.insert(partnerAnfrage).values({ kategorieId, vonId: m, anId: m, gestelltAm: new Date() })
		).rejects.toThrow();
	});

	test('FR-47: Suchtext höchstens 120 Zeichen', async () => {
		const kategorieId = await doppelKategorie();
		const jetzt = new Date();
		const neu = (suchtext: string) =>
			db
				.insert(anmeldung)
				.values({ kategorieId, suchtext, angemeldetAm: jetzt, geaendertAm: jetzt })
				.returning({ id: anmeldung.id });

		const [ok] = await neu('a'.repeat(120));
		expect(ok.id).toBeGreaterThan(0);
		await expect(neu('a'.repeat(121))).rejects.toThrow();
		const [zeile] = await db.select().from(anmeldung).where(eq(anmeldung.id, ok.id));
		expect(zeile.suchtext).toHaveLength(120);
	});
});
