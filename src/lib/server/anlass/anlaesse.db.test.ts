import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeEigeneDatenbankAn } from '../../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { anlassAnmeldung, mitglied } from '../db/schema.ts';
import type { AnlassWerte } from './angaben.ts';
import {
	aendereAnlass,
	kommendeAnlaesse,
	ladeAnlassAdmin,
	ladeAnlassFuerMitglied,
	ladeKalenderAnlass,
	legeAnlassAn,
	listeAnlaesse,
	loescheAnlass,
	melde
} from './anlaesse.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

const MINUTE = 60 * 1000;
// Die gemeinsame Test-Datenbank hat Anlässe anderer Tests: jeder Test erkennt seine am Titel.
const werte = (teil: Partial<AnlassWerte> = {}): AnlassWerte => ({
	titel: `Anlass ${randomUUID()}`,
	beginn: new Date('2099-03-19T18:30:00Z'),
	ort: 'Clubhaus',
	einladung: 'Traktanden',
	anmeldeschluss: new Date('2099-03-16T22:59:00Z'),
	...teil
});
const JETZT = new Date('2099-03-01T10:00:00Z');

async function neu(teil: Partial<AnlassWerte> = {}) {
	const admin = await legeMitgliedAn(db);
	const w = werte(teil);
	return { id: await legeAnlassAn(db, admin.mitgliedId, w), w };
}

describe('Anlässe', () => {
	test('FR-27: kommende Anlässe für alle aktiven Mitglieder, vergangene nicht, nach Beginn sortiert', async () => {
		const spaet = await neu({ beginn: new Date('2099-05-01T10:00:00Z') });
		const frueh = await neu({ beginn: new Date('2099-04-01T10:00:00Z') });
		const vorbei = await neu({
			beginn: new Date('2099-02-01T10:00:00Z'),
			anmeldeschluss: new Date('2099-01-30T10:00:00Z')
		});
		const m = await legeMitgliedAn(db);
		const liste = await kommendeAnlaesse(db, m.mitgliedId, JETZT);
		const ids = liste.map((a) => a.id);
		expect(ids).not.toContain(vorbei.id);
		expect(ids.indexOf(frueh.id)).toBeLessThan(ids.indexOf(spaet.id));
		const a = liste.find((x) => x.id === frueh.id)!;
		expect(a).toMatchObject({ titel: frueh.w.titel, antwort: null, offen: true, zuPruefen: false });
		expect(a.kalenderKennung).toMatch(/^[A-Za-z0-9_-]{43}$/);
	});

	test('FR-28: Antwort bis und mit Anmeldeschluss, eine Minute danach geschlossen, alte Antwort bleibt', async () => {
		const { id, w } = await neu();
		const m = await legeMitgliedAn(db);
		expect(
			await melde(db, id, m.mitgliedId, { antwort: 'kommt', bemerkung: null }, w.anmeldeschluss)
		).toBe('ok');
		const spaeter = new Date(w.anmeldeschluss.getTime() + MINUTE);
		expect(
			await melde(db, id, m.mitgliedId, { antwort: 'kommt-nicht', bemerkung: null }, spaeter)
		).toBe('geschlossen');
		const a = await ladeAnlassFuerMitglied(db, id, m.mitgliedId, spaeter);
		expect(a).toMatchObject({ antwort: 'kommt', offen: false });
	});

	test('FR-28: die Minute des Anmeldeschlusses zählt ganz, 59 Sekunden danach geht noch', async () => {
		const { id, w } = await neu();
		const m = await legeMitgliedAn(db);
		const sekunde = (n: number) => new Date(w.anmeldeschluss.getTime() + n * 1000);
		expect(
			await melde(db, id, m.mitgliedId, { antwort: 'kommt', bemerkung: null }, sekunde(59))
		).toBe('ok');
		expect(await ladeAnlassFuerMitglied(db, id, m.mitgliedId, sekunde(59))).toMatchObject({
			offen: true
		});
		expect(await ladeAnlassFuerMitglied(db, id, m.mitgliedId, sekunde(60))).toMatchObject({
			offen: false
		});
	});

	test('FR-29: neue Antwort ersetzt die alte', async () => {
		const { id } = await neu();
		const m = await legeMitgliedAn(db);
		await melde(db, id, m.mitgliedId, { antwort: 'kommt', bemerkung: null }, JETZT);
		await melde(db, id, m.mitgliedId, { antwort: 'kommt-nicht', bemerkung: 'Ferien' }, JETZT);
		const admin = await ladeAnlassAdmin(db, id);
		expect(admin?.anmeldungen).toHaveLength(1);
		expect(admin?.anmeldungen[0]).toMatchObject({ antwort: 'kommt-nicht', bemerkung: 'Ferien' });
	});

	test('FR-30: Wechsel auf kommt löscht die Bemerkung', async () => {
		const { id } = await neu();
		const m = await legeMitgliedAn(db);
		await melde(db, id, m.mitgliedId, { antwort: 'kommt-nicht', bemerkung: 'Ferien' }, JETZT);
		await melde(db, id, m.mitgliedId, { antwort: 'kommt', bemerkung: 'bleibt nicht' }, JETZT);
		const a = await ladeAnlassFuerMitglied(db, id, m.mitgliedId, JETZT);
		expect(a).toMatchObject({ antwort: 'kommt', bemerkung: null });
	});

	test('Austritt: ausgetretene oder vorgemerkte Mitglieder können nicht antworten', async () => {
		const { id } = await neu();
		const weg = await legeMitgliedAn(db, { status: 'ausgetreten' });
		const vorgemerkt = await legeMitgliedAn(db, { status: 'vorgemerkt' });
		for (const m of [weg, vorgemerkt]) {
			expect(await melde(db, id, m.mitgliedId, { antwort: 'kommt', bemerkung: null }, JETZT)).toBe(
				'nicht-gefunden'
			);
		}
		const zeilen = await db.select().from(anlassAnmeldung).where(eq(anlassAnmeldung.anlassId, id));
		expect(zeilen).toHaveLength(0);
	});

	test('FR-31: loescheAnlass entfernt Anlass und Antworten', async () => {
		const { id } = await neu();
		const m = await legeMitgliedAn(db);
		await melde(db, id, m.mitgliedId, { antwort: 'kommt', bemerkung: null }, JETZT);
		expect(await loescheAnlass(db, id)).toBe('ok');
		expect(await loescheAnlass(db, id)).toBe('nicht-gefunden');
		expect(await ladeAnlassAdmin(db, id)).toBeNull();
		expect(await melde(db, id, m.mitgliedId, { antwort: 'kommt', bemerkung: null }, JETZT)).toBe(
			'nicht-gefunden'
		);
	});

	test('FR-32: Ändern von Beginn oder Ort markiert ältere Antworten als zu prüfen, neue Antwort hebt es auf', async () => {
		const { id, w } = await neu();
		const m = await legeMitgliedAn(db);
		await melde(db, id, m.mitgliedId, { antwort: 'kommt', bemerkung: null }, JETZT);
		const nachher = new Date(JETZT.getTime() + MINUTE);
		expect(await aendereAnlass(db, id, { ...w, ort: 'Halle' }, nachher)).toBe('ok');
		expect(await ladeAnlassFuerMitglied(db, id, m.mitgliedId, nachher)).toMatchObject({
			zuPruefen: true,
			ort: 'Halle'
		});
		const nochSpaeter = new Date(nachher.getTime() + MINUTE);
		await melde(db, id, m.mitgliedId, { antwort: 'kommt', bemerkung: null }, nochSpaeter);
		expect(await ladeAnlassFuerMitglied(db, id, m.mitgliedId, nochSpaeter)).toMatchObject({
			zuPruefen: false
		});
	});

	test('FR-32: nach dem Anmeldeschluss ist nichts mehr zu prüfen', async () => {
		const { id, w } = await neu();
		const m = await legeMitgliedAn(db);
		await melde(db, id, m.mitgliedId, { antwort: 'kommt', bemerkung: null }, JETZT);
		await aendereAnlass(db, id, { ...w, ort: 'Halle' }, new Date(JETZT.getTime() + MINUTE));
		const danach = new Date(w.anmeldeschluss.getTime() + 2 * MINUTE);
		expect(await ladeAnlassFuerMitglied(db, id, m.mitgliedId, danach)).toMatchObject({
			offen: false,
			zuPruefen: false
		});
	});

	test('FR-32: Ändern nur des Titels markiert nichts', async () => {
		const { id, w } = await neu();
		const m = await legeMitgliedAn(db);
		await melde(db, id, m.mitgliedId, { antwort: 'kommt', bemerkung: null }, JETZT);
		const nachher = new Date(JETZT.getTime() + MINUTE);
		await aendereAnlass(db, id, { ...w, titel: `${w.titel} neu` }, nachher);
		expect(await ladeAnlassFuerMitglied(db, id, m.mitgliedId, nachher)).toMatchObject({
			zuPruefen: false
		});
		expect(await aendereAnlass(db, 2_000_000_000, w, nachher)).toBe('nicht-gefunden');
	});

	test('ladeAnlassAdmin zählt keine Antwort nur bei aktiven Mitgliedern', async () => {
		// Eigene Datenbank: Die Zahl aller aktiven Mitglieder ist eine globale Aussage.
		const eigene = await legeEigeneDatenbankAn('anlass');
		try {
			const edb = eigene.db;
			const admin = await legeMitgliedAn(edb, { nachname: 'Zzz' });
			const id = await legeAnlassAn(edb, admin.mitgliedId, werte());
			const kommt = await legeMitgliedAn(edb, { nachname: 'Aaa' });
			const nicht = await legeMitgliedAn(edb, { nachname: 'Bbb' });
			await legeMitgliedAn(edb, { status: 'ausgetreten' });
			await melde(edb, id, kommt.mitgliedId, { antwort: 'kommt', bemerkung: null }, JETZT);
			await melde(edb, id, nicht.mitgliedId, { antwort: 'kommt-nicht', bemerkung: 'x' }, JETZT);
			const a = await ladeAnlassAdmin(edb, id);
			expect(a?.zahlen).toEqual({ kommen: 1, kommenNicht: 1, keineAntwort: 1 });
			expect(a?.anmeldungen.map((z) => [z.name, z.antwort, z.bemerkung])).toEqual([
				['Aaa, Test', 'kommt', null],
				['Bbb, Test', 'kommt-nicht', 'x']
			]);
			expect(await listeAnlaesse(edb)).toEqual([
				expect.objectContaining({ id, kommen: 1, kommenNicht: 1 })
			]);
		} finally {
			await eigene.abbauen();
		}
	});

	test('Zahlen und Anmeldungen zählen nur aktive Mitglieder, nicht ausgetretene oder vorgemerkte', async () => {
		const eigene = await legeEigeneDatenbankAn('anlass');
		try {
			const edb = eigene.db;
			const admin = await legeMitgliedAn(edb, { nachname: 'Zzz' });
			const id = await legeAnlassAn(edb, admin.mitgliedId, werte());
			const aktiv = await legeMitgliedAn(edb, { nachname: 'Aaa' });
			const weg = await legeMitgliedAn(edb, { nachname: 'Bbb' });
			const vorgemerkt = await legeMitgliedAn(edb, { nachname: 'Ccc' });
			for (const [m, antwort] of [
				[aktiv, 'kommt'],
				[weg, 'kommt'],
				[vorgemerkt, 'kommt-nicht']
			] as const) {
				await melde(edb, id, m.mitgliedId, { antwort, bemerkung: null }, JETZT);
			}
			await edb
				.update(mitglied)
				.set({ status: 'ausgetreten', austrittAm: JETZT })
				.where(eq(mitglied.id, weg.mitgliedId));
			await edb
				.update(mitglied)
				.set({ status: 'vorgemerkt', vorgemerktAm: JETZT, statusVorher: 'aktiv' })
				.where(eq(mitglied.id, vorgemerkt.mitgliedId));
			const a = await ladeAnlassAdmin(edb, id);
			expect(a?.zahlen).toEqual({ kommen: 1, kommenNicht: 0, keineAntwort: 1 });
			expect(a?.anmeldungen.map((z) => z.name)).toEqual(['Aaa, Test']);
			expect(await listeAnlaesse(edb)).toEqual([
				expect.objectContaining({ id, kommen: 1, kommenNicht: 0 })
			]);
		} finally {
			await eigene.abbauen();
		}
	});

	test('Kalender: richtige Kennung liefert den Anlass, unbekannte null', async () => {
		const { id, w } = await neu();
		const m = await legeMitgliedAn(db);
		const a = await ladeAnlassFuerMitglied(db, id, m.mitgliedId, JETZT);
		expect(await ladeKalenderAnlass(db, a!.kalenderKennung)).toEqual({
			kennung: a!.kalenderKennung,
			titel: w.titel,
			beginn: w.beginn,
			ort: w.ort,
			einladung: w.einladung
		});
		expect(await ladeKalenderAnlass(db, 'gibt-es-nicht')).toBeNull();
	});
});
