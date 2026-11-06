import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
	legeEigeneDatenbankAn,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import type { Db } from '../db/index.ts';
import { aenderung, kontoRolle } from '../db/schema.ts';
import { istMytcoAdmin, ladeRollen, setzeRollen, verwaltungsrollen } from './rollen.ts';

// «Letzter MyTCO-Admin» ist eine globale Eigenschaft; die gemeinsame Test-Datenbank teilen sich
// mehrere Dateien. Darum bekommt diese Datei eine eigene Datenbank.
let eigene: EigeneDatenbank | undefined;
let db: Db;

beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('rollen');
	db = eigene.db;
});

afterAll(async () => {
	await eigene?.abbauen();
});

const jetzt = new Date('2026-11-02T12:00:00Z');

async function leereRollen() {
	await db.delete(kontoRolle);
}

const verlaufVon = (mitgliedId: number) =>
	db.select().from(aenderung).where(eq(aenderung.mitgliedId, mitgliedId));

describe('Rollen', () => {
	test('A-ROLLE-01, A-ROLLE-03, RR-01, FR-03: MyTCO-Admin vergibt und entzieht Rollen, Verlauf je Rolle', async () => {
		await leereRollen();
		const admin = await legeMitgliedAn(db, { rollen: ['mytco'] });
		const ziel = await legeMitgliedAn(db);
		const urheber = { art: 'admin', mitgliedId: admin.mitgliedId } as const;

		expect(await setzeRollen(db, urheber, ziel.kontoId, ['cm', 'lizenz'], [], jetzt)).toBe('ok');
		expect((await ladeRollen(db, ziel.kontoId)).sort()).toEqual(['cm', 'lizenz']);
		expect(await setzeRollen(db, urheber, ziel.kontoId, ['cm'], ['lizenz', 'cm'], jetzt)).toBe(
			'ok'
		);
		expect(await ladeRollen(db, ziel.kontoId)).toEqual(['cm']);

		const verlauf = await verlaufVon(ziel.mitgliedId);
		expect(verlauf.map((z) => [z.aktion, z.detail, z.urheberMitgliedId]).sort()).toEqual([
			['rolle-entzogen', 'lizenz', admin.mitgliedId],
			['rolle-vergeben', 'cm', admin.mitgliedId],
			['rolle-vergeben', 'lizenz', admin.mitgliedId]
		]);
	});

	test('Unveränderte Rollen: kein Verlaufseintrag', async () => {
		await leereRollen();
		const admin = await legeMitgliedAn(db, { rollen: ['mytco'] });
		const ziel = await legeMitgliedAn(db, { rollen: ['cm'] });
		const urheber = { art: 'admin', mitgliedId: admin.mitgliedId } as const;
		expect(await setzeRollen(db, urheber, ziel.kontoId, ['cm'], ['cm'], jetzt)).toBe('ok');
		expect(await verlaufVon(ziel.mitgliedId)).toHaveLength(0);
	});

	test('setzeRollen: unbekanntes Konto ergibt nicht-gefunden', async () => {
		expect(await setzeRollen(db, { art: 'automatisch' }, 2_000_000_000, ['cm'], [], jetzt)).toBe(
			'nicht-gefunden'
		);
	});

	test('veralteter Stand wird abgewiesen', async () => {
		await leereRollen();
		const admin = await legeMitgliedAn(db, { rollen: ['mytco'] });
		const ziel = await legeMitgliedAn(db, { rollen: ['cm'] });
		const urheber = { art: 'admin', mitgliedId: admin.mitgliedId } as const;
		// Die Seite hat «ohne Rollen» geladen, inzwischen hat jemand cm vergeben.
		expect(await setzeRollen(db, urheber, ziel.kontoId, ['lizenz'], [], jetzt)).toBe('veraltet');
		expect(await ladeRollen(db, ziel.kontoId)).toEqual(['cm']);
		expect(await verlaufVon(ziel.mitgliedId)).toHaveLength(0);
	});

	test('RR-03: der letzte MyTCO-Admin kann mytco nicht abgeben', async () => {
		await leereRollen();
		const admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
		const urheber = { art: 'admin', mitgliedId: admin.mitgliedId } as const;
		expect(
			await setzeRollen(db, urheber, admin.kontoId, ['cm'], ['mitglieder', 'mytco'], jetzt)
		).toBe('letzter-mytco');
		expect((await ladeRollen(db, admin.kontoId)).sort()).toEqual(['mitglieder', 'mytco']);
		expect(await istMytcoAdmin(db, admin.kontoId)).toBe(true);
		expect(await verlaufVon(admin.mitgliedId)).toHaveLength(0);
	});

	test('RR-03: mitglieder entziehen ist ohne Untergrenze', async () => {
		await leereRollen();
		const admin = await legeMitgliedAn(db, { rollen: ['mytco', 'mitglieder'] });
		const urheber = { art: 'admin', mitgliedId: admin.mitgliedId } as const;
		expect(
			await setzeRollen(db, urheber, admin.kontoId, ['mytco'], ['mytco', 'mitglieder'], jetzt)
		).toBe('ok');
		expect(await ladeRollen(db, admin.kontoId)).toEqual(['mytco']);
		const einziger = await legeMitgliedAn(db, { rollen: ['mitglieder'] });
		expect(await setzeRollen(db, urheber, einziger.kontoId, [], ['mitglieder'], jetzt)).toBe('ok');
		expect(await ladeRollen(db, einziger.kontoId)).toEqual([]);
	});

	test('RR-03: mit einem zweiten MyTCO-Admin darf die Rolle entzogen werden', async () => {
		await leereRollen();
		const a = await legeMitgliedAn(db, { rollen: ['mytco'] });
		const b = await legeMitgliedAn(db, { rollen: ['mytco'] });
		const urheber = { art: 'admin', mitgliedId: a.mitgliedId } as const;
		expect(await setzeRollen(db, urheber, a.kontoId, [], ['mytco'], jetzt)).toBe('ok');
		expect(await istMytcoAdmin(db, a.kontoId)).toBe(false);
		expect(await istMytcoAdmin(db, b.kontoId)).toBe(true);
	});

	test('RR-03: zwei MyTCO-Admins entziehen sich gleichzeitig die Rolle — einer bleibt', async () => {
		for (let lauf = 0; lauf < 5; lauf++) {
			await leereRollen();
			const a = await legeMitgliedAn(db, { rollen: ['mytco'] });
			const b = await legeMitgliedAn(db, { rollen: ['mytco'] });
			const ergebnisse = await Promise.all([
				setzeRollen(
					db,
					{ art: 'admin', mitgliedId: a.mitgliedId },
					b.kontoId,
					[],
					['mytco'],
					jetzt
				),
				setzeRollen(db, { art: 'admin', mitgliedId: b.mitgliedId }, a.kontoId, [], ['mytco'], jetzt)
			]);
			expect([...ergebnisse].sort()).toEqual(['letzter-mytco', 'ok']);
			const admins = [await istMytcoAdmin(db, a.kontoId), await istMytcoAdmin(db, b.kontoId)];
			expect(admins.filter(Boolean)).toHaveLength(1);
		}
	});

	test('RR-08: ein gesperrter zweiter MyTCO-Admin zählt nicht', async () => {
		await leereRollen();
		const gesperrt = await legeMitgliedAn(db, { rollen: ['mytco'], gesperrt: true });
		const ausgetreten = await legeMitgliedAn(db, { rollen: ['mytco'], status: 'ausgetreten' });
		expect(await istMytcoAdmin(db, gesperrt.kontoId)).toBe(false);
		expect(await istMytcoAdmin(db, ausgetreten.kontoId)).toBe(false);
		// Ein gesperrter oder ausgetretener MyTCO-Admin ist kein Ersatz: der aktive bleibt der letzte.
		const aktiv = await legeMitgliedAn(db, { rollen: ['mytco'] });
		expect(await setzeRollen(db, { art: 'automatisch' }, aktiv.kontoId, [], ['mytco'], jetzt)).toBe(
			'letzter-mytco'
		);
	});

	test('RR-07, RR-08: Verwaltungsrollen mytco, mitglieder und cm, nur ungesperrt und aktiv', async () => {
		const alle = await legeMitgliedAn(db, { rollen: ['lizenz', 'cm', 'mitglieder', 'mytco'] });
		const cm = await legeMitgliedAn(db, { rollen: ['cm'] });
		const lizenz = await legeMitgliedAn(db, { rollen: ['lizenz'] });
		const ohne = await legeMitgliedAn(db);
		const gesperrt = await legeMitgliedAn(db, { rollen: ['cm', 'mytco'], gesperrt: true });
		const ausgetreten = await legeMitgliedAn(db, { rollen: ['cm'], status: 'ausgetreten' });
		expect(await verwaltungsrollen(db, alle.kontoId)).toEqual(['mytco', 'mitglieder', 'cm']);
		expect(await verwaltungsrollen(db, cm.kontoId)).toEqual(['cm']);
		expect(await verwaltungsrollen(db, lizenz.kontoId)).toEqual([]);
		expect(await verwaltungsrollen(db, ohne.kontoId)).toEqual([]);
		expect(await verwaltungsrollen(db, gesperrt.kontoId)).toEqual([]);
		expect(await verwaltungsrollen(db, ausgetreten.kontoId)).toEqual([]);
		expect(await verwaltungsrollen(db, 2_000_000_000)).toEqual([]);
	});
});
