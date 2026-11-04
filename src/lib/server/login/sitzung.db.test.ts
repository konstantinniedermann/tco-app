import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
	legeEigeneDatenbankAn,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { konto, mitglied, sitzung } from '../db/schema.ts';
import {
	SITZUNG_GUELTIG_MS,
	beendeAlleSitzungen,
	beendePasskeyHinweis,
	beendeSitzung,
	erstelleSitzung,
	pruefeSitzung
} from './sitzung.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

const jetzt = new Date('2026-11-02T12:00:00Z');
const nach = (ms: number) => new Date(jetzt.getTime() + ms);
const STUNDE = 60 * 60 * 1000;
const TAG = 24 * STUNDE;
const hash = (kennung: string) => createHash('sha256').update(kennung).digest('hex');
const zeile = async (kennung: string) =>
	(
		await db
			.select()
			.from(sitzung)
			.where(eq(sitzung.kennungHash, hash(kennung)))
	)[0];

describe('Sitzungen', () => {
	test('SI-06: Kennung hat 32 Zufallsbytes und steht nur als Hash in der Datenbank', async () => {
		const { kontoId } = await legeMitgliedAn(db);
		const kennung = await erstelleSitzung(db, kontoId, jetzt);
		expect(kennung).toMatch(/^[A-Za-z0-9_-]{43}$/);
		const zeilen = await db.select().from(sitzung).where(eq(sitzung.kontoId, kontoId));
		expect(zeilen).toHaveLength(1);
		expect(zeilen[0].kennungHash).not.toBe(kennung);
		expect(zeilen[0].kennungHash).toBe(hash(kennung));
		expect(zeilen[0].erstelltAm).toEqual(jetzt);
		expect(zeilen[0].zuletztGenutzt).toEqual(jetzt);
		expect(zeilen[0].sitzungsversion).toBe(1);
	});

	test('pruefeSitzung liefert Konto und Vorname', async () => {
		const { kontoId, mitgliedId, vorname } = await legeMitgliedAn(db, { vorname: 'Erfunden' });
		const kennung = await erstelleSitzung(db, kontoId, jetzt);
		expect(await pruefeSitzung(db, kennung, jetzt)).toEqual({
			konto: { kontoId, mitgliedId, vorname, passkeyHinweis: false, sitzungHash: hash(kennung) },
			verlaengert: false
		});
		expect(await pruefeSitzung(db, 'unbekannt', jetzt)).toBeNull();
	});

	test('A-LOGIN-07: neue Sitzung ohne Angabe hat keinen Passkey-Hinweis', async () => {
		const { kontoId } = await legeMitgliedAn(db);
		const kennung = await erstelleSitzung(db, kontoId, jetzt);
		expect((await pruefeSitzung(db, kennung, jetzt))?.konto.passkeyHinweis).toBe(false);
	});

	test('A-LOGIN-07: Sitzung mit passkeyHinweis zeigt ihn, beendePasskeyHinweis nimmt ihn weg', async () => {
		const { kontoId } = await legeMitgliedAn(db);
		const kennung = await erstelleSitzung(db, kontoId, jetzt, undefined, { passkeyHinweis: true });
		expect((await pruefeSitzung(db, kennung, jetzt))?.konto.passkeyHinweis).toBe(true);
		await beendePasskeyHinweis(db, kennung);
		expect((await pruefeSitzung(db, kennung, jetzt))?.konto.passkeyHinweis).toBe(false);
	});

	test('SI-06: Login mit altem Cookie löscht dessen Sitzung', async () => {
		const { kontoId } = await legeMitgliedAn(db);
		const alt = await erstelleSitzung(db, kontoId, jetzt);
		const neu = await erstelleSitzung(db, kontoId, jetzt, alt);
		expect(await zeile(alt)).toBeUndefined();
		expect(await zeile(neu)).toBeDefined();
	});

	test('FR-24/SI-07: beendeAlleSitzungen erhöht die Sitzungsversion und beendet alle Geräte', async () => {
		const { kontoId } = await legeMitgliedAn(db);
		const a = await erstelleSitzung(db, kontoId, jetzt);
		const b = await erstelleSitzung(db, kontoId, jetzt);
		await beendeAlleSitzungen(db, kontoId);
		// Die Zeilen sind gelöscht, nicht nur über die Sitzungsversion ungültig.
		expect(await zeile(a)).toBeUndefined();
		expect(await zeile(b)).toBeUndefined();
		expect(await pruefeSitzung(db, a, jetzt)).toBeNull();
		expect(await pruefeSitzung(db, b, jetzt)).toBeNull();
		const [k] = await db.select().from(konto).where(eq(konto.id, kontoId));
		expect(k.sitzungsversion).toBe(2);
		const neu = await erstelleSitzung(db, kontoId, jetzt);
		expect((await zeile(neu)).sitzungsversion).toBe(2);
		expect(await pruefeSitzung(db, neu, jetzt)).not.toBeNull();
	});

	test('SI-07: Sitzung mit älterer Sitzungsversion ist ungültig', async () => {
		const { kontoId } = await legeMitgliedAn(db);
		const kennung = await erstelleSitzung(db, kontoId, jetzt);
		await db.execute(
			sql`update konto set sitzungsversion = sitzungsversion + 1 where id = ${kontoId}`
		);
		expect(await zeile(kennung)).toBeDefined();
		expect(await pruefeSitzung(db, kennung, jetzt)).toBeNull();
	});

	test('gesperrtes Konto → null', async () => {
		const { kontoId } = await legeMitgliedAn(db);
		const kennung = await erstelleSitzung(db, kontoId, jetzt);
		await db.update(konto).set({ gesperrt: true }).where(eq(konto.id, kontoId));
		expect(await pruefeSitzung(db, kennung, jetzt)).toBeNull();
	});

	test('nicht aktives Mitglied → null', async () => {
		const { kontoId, mitgliedId } = await legeMitgliedAn(db);
		const kennung = await erstelleSitzung(db, kontoId, jetzt);
		await db.update(mitglied).set({ status: 'ausgetreten' }).where(eq(mitglied.id, mitgliedId));
		expect(await pruefeSitzung(db, kennung, jetzt)).toBeNull();
	});

	test('abgelaufene Sitzung → null', async () => {
		const { kontoId } = await legeMitgliedAn(db);
		const kennung = await erstelleSitzung(db, kontoId, jetzt);
		expect(await pruefeSitzung(db, kennung, nach(SITZUNG_GUELTIG_MS + 1))).toBeNull();
	});

	test('gleitend: nach 25 h wird zuletzt_genutzt neu gesetzt und verlaengert gemeldet', async () => {
		const { kontoId } = await legeMitgliedAn(db);
		const kennung = await erstelleSitzung(db, kontoId, jetzt);
		const spaeter = nach(25 * STUNDE);
		const r = await pruefeSitzung(db, kennung, spaeter);
		expect(r?.verlaengert).toBe(true);
		expect((await zeile(kennung)).zuletztGenutzt).toEqual(spaeter);
	});

	test('gleitend: nach 1 h keine Verlängerung und Zeile unverändert', async () => {
		const { kontoId } = await legeMitgliedAn(db);
		const kennung = await erstelleSitzung(db, kontoId, jetzt);
		const r = await pruefeSitzung(db, kennung, nach(STUNDE));
		expect(r?.verlaengert).toBe(false);
		expect((await zeile(kennung)).zuletztGenutzt).toEqual(jetzt);
	});

	test('beendeSitzung löscht nur diese Zeile', async () => {
		const { kontoId } = await legeMitgliedAn(db);
		const a = await erstelleSitzung(db, kontoId, jetzt);
		const b = await erstelleSitzung(db, kontoId, jetzt);
		await beendeSitzung(db, a);
		expect(await zeile(a)).toBeUndefined();
		expect(await zeile(b)).toBeDefined();
	});
});

// erstelleSitzung räumt global auf. In der gemeinsamen Test-Datenbank würde jede andere Datei,
// die eine Sitzung mit einem um mehr als einen Tag späteren «jetzt» anlegt, die Sitzung `frisch`
// löschen. Darum bekommt dieser Test eine eigene Datenbank.
describe('Sitzungen aufräumen', () => {
	let eigene: EigeneDatenbank | undefined;

	beforeAll(async () => {
		eigene = await legeEigeneDatenbankAn('sitzung');
	});

	afterAll(async () => {
		await eigene?.abbauen();
	});

	test('abgelaufene Sitzungen löscht erstelleSitzung', async () => {
		const edb = eigene!.db;
		const zeileIn = async (kennung: string) =>
			(
				await edb
					.select()
					.from(sitzung)
					.where(eq(sitzung.kennungHash, hash(kennung)))
			)[0];
		const { kontoId } = await legeMitgliedAn(edb);
		const andere = await legeMitgliedAn(edb);
		const alt = await erstelleSitzung(edb, kontoId, nach(-366 * TAG));
		const frisch = await erstelleSitzung(edb, andere.kontoId, nach(-364 * TAG));
		await erstelleSitzung(edb, kontoId, jetzt);
		expect(await zeileIn(alt)).toBeUndefined();
		expect(await zeileIn(frisch)).toBeDefined();
	});
});
