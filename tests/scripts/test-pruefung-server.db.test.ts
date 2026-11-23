import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { legeEigeneDatenbankAn, type EigeneDatenbank } from '../hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../hilfen/mitglieder.ts';
import { ladeRollen } from '../../src/lib/server/admin/rollen.ts';
import { aenderung, icAbruf, konto, kontoRolle, mitglied } from '../../src/lib/server/db/schema.ts';
import {
	legePruefkontenAn,
	pruefeServer,
	PRUEFKONTEN,
	zeile,
	type Befund
} from '../../scripts/test-pruefung-server.ts';

const JETZT = new Date('2026-11-23T10:00:00Z');
const STUNDE = 60 * 60 * 1000;
const TEST_ENV = { MAIL_NUR_AN: 'pl@example.org', IC_ABRUF: 'an' };

let e: EigeneDatenbank;
beforeAll(async () => {
	e = await legeEigeneDatenbankAn('pruefungserver');
}, 30_000);
afterAll(async () => {
	await e.abbauen();
});

const adressen = PRUEFKONTEN.map((k) => k.email);

async function pruefkonten() {
	return e.db
		.select({
			mitgliedId: mitglied.id,
			email: mitglied.email,
			kontoId: konto.id,
			benutzt: konto.briefCodeBenutztAm
		})
		.from(mitglied)
		.innerJoin(konto, eq(konto.mitgliedId, mitglied.id))
		.where(inArray(mitglied.email, adressen));
}

const befund = (befunde: Befund[], punkt: Befund['punkt']) =>
	befunde.find((b) => b.punkt === punkt);

describe('legePruefkontenAn', () => {
	test('legt Spieler und Mitglieder-Admin an, beim zweiten Lauf nichts doppelt', async () => {
		await legePruefkontenAn(e.db, JETZT);
		await legePruefkontenAn(e.db, new Date(JETZT.getTime() + STUNDE));

		const konten = await pruefkonten();
		expect(konten.map((k) => k.email).sort()).toEqual([...adressen].sort());
		for (const k of konten) expect(k.benutzt).toEqual(JETZT);

		const pia = konten.find((k) => k.email === 'pia.pruefung@example.org')!;
		const paul = konten.find((k) => k.email === 'paul.pruefung@example.org')!;
		expect(await ladeRollen(e.db, pia.kontoId)).toEqual(['mitglieder']);
		expect(await ladeRollen(e.db, paul.kontoId)).toEqual([]);
		const verlauf = await e.db
			.select()
			.from(aenderung)
			.where(eq(aenderung.mitgliedId, pia.mitgliedId));
		expect(verlauf).toHaveLength(1);
	});
});

describe('pruefeServer', () => {
	beforeEach(async () => {
		await e.db.delete(icAbruf);
		await e.db.delete(kontoRolle).where(eq(kontoRolle.rolle, 'mytco'));
	});

	async function legeMytcoAdminAn() {
		await legeMitgliedAn(e.db, { rollen: ['mytco'] });
	}

	async function abruf(saison: number, vorStunden: number) {
		await e.db.insert(icAbruf).values({
			saison,
			wettbewerb: 'ic',
			versuchtAm: new Date(JETZT.getTime() - vorStunden * STUNDE),
			wort: 'ok'
		});
	}

	test('alles ok: Zeitgeber an, Abruf der laufenden Saison vor 2 h, MyTCO-Admin da', async () => {
		await legeMytcoAdminAn();
		await abruf(2026, 2);
		const befunde = await pruefeServer(e.db, TEST_ENV, JETZT);
		expect(befunde.map((b) => b.punkt).sort()).toEqual(['admin', 'ic-abruf', 'zeitgeber']);
		expect(befunde.every((b) => b.ok)).toBe(true);
	});

	test('Zeitgeber aus oder Interclub-Abruf nicht an: rot', async () => {
		await legeMytcoAdminAn();
		await abruf(2026, 2);
		expect(
			befund(await pruefeServer(e.db, { ...TEST_ENV, ZEITGEBER: 'aus' }, JETZT), 'zeitgeber')?.ok
		).toBe(false);
		expect(
			befund(await pruefeServer(e.db, { ...TEST_ENV, IC_ABRUF: undefined }, JETZT), 'zeitgeber')?.ok
		).toBe(false);
	});

	test('Abruf vor 27 h oder nur aus dem Vorjahr: rot; vor 25 h: ok (Nachtpause)', async () => {
		await legeMytcoAdminAn();
		await abruf(2026, 27);
		expect(befund(await pruefeServer(e.db, TEST_ENV, JETZT), 'ic-abruf')?.ok).toBe(false);
		await e.db.delete(icAbruf);
		await abruf(2025, 1);
		expect(befund(await pruefeServer(e.db, TEST_ENV, JETZT), 'ic-abruf')?.ok).toBe(false);
		await e.db.delete(icAbruf);
		await abruf(2026, 25);
		expect(befund(await pruefeServer(e.db, TEST_ENV, JETZT), 'ic-abruf')?.ok).toBe(true);
	});

	test('ohne MyTCO-Admin: rot', async () => {
		await abruf(2026, 2);
		expect(befund(await pruefeServer(e.db, TEST_ENV, JETZT), 'admin')?.ok).toBe(false);
	});

	test('die Zeilen enthalten nur feste Texte, keine Adresse', async () => {
		await legeMytcoAdminAn();
		const zeilen = (await pruefeServer(e.db, TEST_ENV, JETZT)).map(zeile);
		for (const z of zeilen) {
			expect(z).toMatch(/^pruefung: (zeitgeber|ic-abruf|admin) (ok|rot) /);
			expect(z).not.toContain('@');
		}
	});
});
