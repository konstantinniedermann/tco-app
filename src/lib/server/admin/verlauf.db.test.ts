import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { aenderung } from '../db/schema.ts';
import { ladeVerlauf, schreibeVerlauf } from './verlauf.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

const t0 = new Date('2026-11-02T12:00:00Z');
const nach = (min: number) => new Date(t0.getTime() + min * 60_000);

describe('Änderungsverlauf', () => {
	test('FR-26: schreibt je Eintrag eine Zeile, ohne Werte', async () => {
		const m = await legeMitgliedAn(db, { vorname: 'Verlaufsvorname' });
		await schreibeVerlauf(
			db,
			m.mitgliedId,
			{ art: 'admin', mitgliedId: m.mitgliedId },
			[
				{ aktion: 'feld-geaendert', detail: 'ort' },
				{ aktion: 'rolle-vergeben', detail: 'kassier' }
			],
			t0
		);
		const zeilen = await db.select().from(aenderung).where(eq(aenderung.mitgliedId, m.mitgliedId));
		expect(zeilen).toHaveLength(2);
		const spalten = JSON.stringify(zeilen);
		expect(spalten).not.toContain('Verlaufsvorname');
		expect(spalten).not.toContain(m.email);
		expect(spalten).not.toContain('Olten');
		expect(zeilen.map((z) => [z.aktion, z.detail, z.urheberArt]).sort()).toEqual([
			['feld-geaendert', 'ort', 'admin'],
			['rolle-vergeben', 'kassier', 'admin']
		]);
	});

	test('A-MITGLIED-06: ladeVerlauf zeigt Urheber mit Namen, automatisch als MyTCO, neueste zuerst', async () => {
		const urheber = await legeMitgliedAn(db, { vorname: 'Uma', nachname: 'Urheber' });
		const m = await legeMitgliedAn(db, { vorname: 'Max', nachname: 'Mitglied' });
		await schreibeVerlauf(
			db,
			m.mitgliedId,
			{ art: 'automatisch' },
			[{ aktion: 'angelegt' }],
			nach(0)
		);
		await schreibeVerlauf(
			db,
			m.mitgliedId,
			{ art: 'admin', mitgliedId: urheber.mitgliedId },
			[{ aktion: 'feld-geaendert', detail: 'ort' }],
			nach(5)
		);
		const zeilen = await ladeVerlauf(db, { mitgliedId: m.mitgliedId, grenze: 10 });
		expect(zeilen).toEqual([
			{
				zeitpunkt: nach(5),
				urheber: 'Urheber, Uma',
				aktion: 'feld-geaendert',
				detail: 'ort',
				mitglied: { id: m.mitgliedId, name: 'Mitglied, Max' }
			},
			{
				zeitpunkt: nach(0),
				urheber: 'MyTCO',
				aktion: 'angelegt',
				detail: null,
				mitglied: { id: m.mitgliedId, name: 'Mitglied, Max' }
			}
		]);
	});

	test('A-MITGLIED-06: gelöschter Urheber erscheint als gelöschtes Konto', async () => {
		const urheber = await legeMitgliedAn(db);
		const m = await legeMitgliedAn(db);
		await schreibeVerlauf(
			db,
			m.mitgliedId,
			{ art: 'mitglied', mitgliedId: urheber.mitgliedId },
			[{ aktion: 'angelegt' }],
			t0
		);
		await db
			.update(aenderung)
			.set({ urheberMitgliedId: null })
			.where(eq(aenderung.mitgliedId, m.mitgliedId));
		const zeilen = await ladeVerlauf(db, { mitgliedId: m.mitgliedId, grenze: 10 });
		expect(zeilen[0].urheber).toBe('gelöschtes Konto');
	});

	test('A-MITGLIED-06: Filter nach Mitglied und Grenze', async () => {
		const a = await legeMitgliedAn(db);
		const b = await legeMitgliedAn(db);
		for (let i = 0; i < 3; i++) {
			await schreibeVerlauf(
				db,
				a.mitgliedId,
				{ art: 'automatisch' },
				[{ aktion: 'angelegt' }],
				nach(i)
			);
		}
		await schreibeVerlauf(
			db,
			b.mitgliedId,
			{ art: 'automatisch' },
			[{ aktion: 'angelegt' }],
			nach(9)
		);
		const nurA = await ladeVerlauf(db, { mitgliedId: a.mitgliedId, grenze: 2 });
		expect(nurA).toHaveLength(2);
		expect(nurA.every((z) => z.mitglied.id === a.mitgliedId)).toBe(true);
		expect(nurA[0].zeitpunkt).toEqual(nach(2));
		const alle = await ladeVerlauf(db, { grenze: 1 });
		expect(alle).toHaveLength(1);
	});

	test('A-MITGLIED-06: Änderung durch das Mitglied selbst heisst «(selbst)»', async () => {
		const m = await legeMitgliedAn(db, { vorname: 'Lea', nachname: 'Beispiel' });
		await schreibeVerlauf(
			db,
			m.mitgliedId,
			{ art: 'mitglied', mitgliedId: m.mitgliedId },
			[{ aktion: 'feld-geaendert', detail: 'telefon' }],
			t0
		);
		const zeilen = await ladeVerlauf(db, { mitgliedId: m.mitgliedId, grenze: 10 });
		expect(zeilen[0].urheber).toBe('Beispiel, Lea (selbst)');
	});
});
