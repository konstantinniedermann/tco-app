import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { ladeVerlauf } from '../admin/verlauf.ts';
import { erstelleDb } from '../db/index.ts';
import { mitglied } from '../db/schema.ts';
import { setzeKlassierung, trageCmAngabenNach } from './angaben.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

// 23:30 UTC am 31.12. ist in Zürich schon das neue Jahr: der Jahrgang 2027 ist erlaubt.
const JETZT = new Date('2026-12-31T23:30:00Z');

async function neuesMitglied(teil: Partial<typeof mitglied.$inferInsert> = {}) {
	const m = await legeMitgliedAn(db);
	if (Object.keys(teil).length > 0) {
		await db.update(mitglied).set(teil).where(eq(mitglied.id, m.mitgliedId));
	}
	return m.mitgliedId;
}

async function zeile(id: number) {
	const [z] = await db.select().from(mitglied).where(eq(mitglied.id, id));
	return z;
}

const verlauf = (id: number) => ladeVerlauf(db, { mitgliedId: id, grenze: 20 });

describe('CM-Angaben', () => {
	test('FR-37: fehlende Angaben nachtragen, gesetztes Geschlecht bleibt, Verlauf ohne Werte', async () => {
		const id = await neuesMitglied({ geschlecht: 'w' });
		expect(
			await trageCmAngabenNach(
				db,
				id,
				{ klassierung: 'R3', geschlecht: 'm', jahrgang: 2027 },
				JETZT
			)
		).toEqual({ ergebnis: 'ok' });
		const z = await zeile(id);
		expect(z).toMatchObject({
			geschlecht: 'w',
			jahrgang: 2027,
			klassierung: 'R3',
			fairgateOffenSeit: null
		});
		const eintraege = await verlauf(id);
		expect(eintraege.map((e) => [e.aktion, e.detail]).sort()).toEqual([
			['feld-geaendert', 'jahrgang'],
			['feld-geaendert', 'klassierung']
		]);
		expect(eintraege.every((e) => e.urheber.endsWith('(selbst)'))).toBe(true);

		// Jahrgang als Text geht auch; schon gesetzte Angaben bleiben, auch bei ungültigem Wert.
		const zweit = await neuesMitglied({ klassierung: 'keine', jahrgang: 1980 });
		expect(
			await trageCmAngabenNach(db, zweit, { geschlecht: 'm', jahrgang: 'abc' }, JETZT)
		).toEqual({ ergebnis: 'ok' });
		expect(await zeile(zweit)).toMatchObject({
			geschlecht: 'm',
			jahrgang: 1980,
			klassierung: 'keine'
		});
		expect((await verlauf(zweit)).map((e) => e.detail)).toEqual(['geschlecht']);

		const dritt = await neuesMitglied({ geschlecht: 'm', klassierung: 'R9' });
		expect(await trageCmAngabenNach(db, dritt, { jahrgang: ' 1975 ' }, JETZT)).toEqual({
			ergebnis: 'ok'
		});
		expect((await zeile(dritt)).jahrgang).toBe(1975);
	});

	test('FR-37: ohne Klassierung ergibt Feldfehler', async () => {
		const id = await neuesMitglied();
		expect(await trageCmAngabenNach(db, id, { geschlecht: 'm', jahrgang: 1990 }, JETZT)).toEqual({
			ergebnis: 'eingabe',
			felder: { klassierung: 'Bitte deine Klassierung wählen.' }
		});
		// Nichts gespeichert, kein Verlauf.
		expect(await zeile(id)).toMatchObject({ geschlecht: null, jahrgang: null, klassierung: null });
		expect(await verlauf(id)).toEqual([]);

		expect(
			await trageCmAngabenNach(
				db,
				id,
				{ klassierung: 'R10', geschlecht: 'x', jahrgang: 1899 },
				JETZT
			)
		).toEqual({
			ergebnis: 'eingabe',
			felder: {
				klassierung: 'Bitte deine Klassierung wählen.',
				geschlecht: 'Bitte wählen.',
				jahrgang: 'Bitte ein Jahr zwischen 1900 und 2027 angeben.'
			}
		});
		expect(await trageCmAngabenNach(db, id, { klassierung: 'R1', jahrgang: 2028 }, JETZT)).toEqual({
			ergebnis: 'eingabe',
			felder: {
				geschlecht: 'Bitte wählen.',
				jahrgang: 'Bitte ein Jahr zwischen 1900 und 2027 angeben.'
			}
		});
		expect(
			await trageCmAngabenNach(
				db,
				id,
				{ klassierung: 'R1', geschlecht: 'm', jahrgang: 1990.5 },
				JETZT
			)
		).toMatchObject({
			ergebnis: 'eingabe',
			felder: { jahrgang: 'Bitte ein Jahr zwischen 1900 und 2027 angeben.' }
		});

		// Ist die Klassierung schon gesetzt, darf sie fehlen; ein ungültiger Wert bleibt ein Fehler.
		const gesetzt = await neuesMitglied({ klassierung: 'R2', geschlecht: 'w', jahrgang: 1970 });
		expect(await trageCmAngabenNach(db, gesetzt, {}, JETZT)).toEqual({ ergebnis: 'ok' });
		expect(await trageCmAngabenNach(db, gesetzt, { klassierung: 'Z' }, JETZT)).toEqual({
			ergebnis: 'eingabe',
			felder: { klassierung: 'Bitte deine Klassierung wählen.' }
		});
		expect(await verlauf(gesetzt)).toEqual([]);

		expect(await trageCmAngabenNach(db, -1, { klassierung: 'R1' }, JETZT)).toEqual({
			ergebnis: 'nicht-gefunden'
		});
	});

	test('FR-37: Klassierung im Profil ändern schreibt den Verlauf', async () => {
		const id = await neuesMitglied({ klassierung: 'R3', geschlecht: 'm', jahrgang: 1990 });
		expect(await setzeKlassierung(db, id, 'R5', JETZT)).toBe('ok');
		expect((await zeile(id)).klassierung).toBe('R5');
		expect((await verlauf(id)).map((e) => [e.aktion, e.detail])).toEqual([
			['feld-geaendert', 'klassierung']
		]);

		// Gleicher Wert: ok ohne neuen Eintrag.
		expect(await setzeKlassierung(db, id, 'R5', JETZT)).toBe('ok');
		expect(await verlauf(id)).toHaveLength(1);

		expect(await setzeKlassierung(db, id, 'R0', JETZT)).toBe('eingabe');
		expect(await setzeKlassierung(db, id, null, JETZT)).toBe('eingabe');
		expect((await zeile(id)).klassierung).toBe('R5');

		// Auch über die CM-Abfrage lässt sich die Klassierung jederzeit ändern.
		expect(await trageCmAngabenNach(db, id, { klassierung: 'keine' }, JETZT)).toEqual({
			ergebnis: 'ok'
		});
		expect((await zeile(id)).klassierung).toBe('keine');
		expect(await verlauf(id)).toHaveLength(2);

		expect(await setzeKlassierung(db, -1, 'R1', JETZT)).toBe('nicht-gefunden');
	});
});
