import { createHash, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
	legeEigeneDatenbankAn,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import type { Db } from '../db/index.ts';
import { konto, passkey, pushAbo, sitzung } from '../db/schema.ts';
import { erstelleSitzung } from '../login/sitzung.ts';
import { ladeMitglied } from './mitglieder.ts';

let eigene: EigeneDatenbank | undefined;
let db: Db;

beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('einstellungen');
	db = eigene.db;
});

afterAll(async () => {
	await eigene?.abbauen();
});

const jetzt = new Date('2026-11-23T08:00:00Z');
const TAG = 24 * 60 * 60 * 1000;
const hash = (kennung: string) => createHash('sha256').update(kennung).digest('hex');

async function abo(kontoId: number, kennung: string, eingerichtetAm: Date) {
	await db.insert(pushAbo).values({
		endpunkt: `https://push.example.org/GEHEIM-ENDPUNKT-${randomUUID()}`,
		sitzungHash: hash(kennung),
		kontoId,
		p256dh: 'GEHEIM-P256',
		auth: 'GEHEIM-AUTH',
		eingerichtetAm
	});
}

describe('Einstellungen im Detail (Hilfe bei Problemen)', () => {
	test('zeigt Themen, gültige Geräte mit Push und Passkeys, ohne Geheimnisse', async () => {
		const m = await legeMitgliedAn(db);
		await db.update(konto).set({ themaCm: false }).where(eq(konto.id, m.kontoId));

		const alt = new Date(jetzt.getTime() - 30 * TAG);
		const altesGeraet = await erstelleSitzung(db, m.kontoId, alt);
		const neuesGeraet = await erstelleSitzung(db, m.kontoId, jetzt);
		await abo(m.kontoId, neuesGeraet, jetzt);

		// Abgelaufene Sitzung mit Push: kein Gerät mehr.
		const abgelaufen = await erstelleSitzung(db, m.kontoId, jetzt);
		await db
			.update(sitzung)
			.set({ zuletztGenutzt: new Date(jetzt.getTime() - 400 * TAG) })
			.where(eq(sitzung.kennungHash, hash(abgelaufen)));
		await abo(m.kontoId, abgelaufen, alt);

		await db.insert(passkey).values({
			kennung: `GEHEIM-PASSKEY-${randomUUID()}`,
			kontoId: m.kontoId,
			oeffentlicherSchluessel: 'GEHEIM-SCHLUESSEL',
			rpId: 'mytco.example.org',
			geraet: 'iPhone',
			eingerichtetAm: new Date('2026-05-01T10:00:00Z'),
			zuletztBenutzt: new Date('2026-10-02T09:00:00Z')
		});

		const d = (await ladeMitglied(db, m.mitgliedId, jetzt))!;
		expect(d.einstellungen).toEqual({
			themen: ['anlaesse', 'verein'],
			geraete: [
				{ angemeldetAm: jetzt, zuletztGenutzt: jetzt, pushSeit: jetzt },
				{ angemeldetAm: alt, zuletztGenutzt: alt, pushSeit: null }
			],
			passkeys: [
				{
					geraet: 'iPhone',
					eingerichtetAm: new Date('2026-05-01T10:00:00Z'),
					zuletztBenutzt: new Date('2026-10-02T09:00:00Z')
				}
			]
		});
		expect(JSON.stringify(d)).not.toContain('GEHEIM');
		expect(JSON.stringify(d)).not.toContain(hash(altesGeraet));
	});

	test('ohne Geräte und Passkeys: leere Listen, alle Themen an', async () => {
		const m = await legeMitgliedAn(db);
		const d = (await ladeMitglied(db, m.mitgliedId, jetzt))!;
		expect(d.einstellungen).toEqual({
			themen: ['anlaesse', 'cm', 'verein'],
			geraete: [],
			passkeys: []
		});
	});

	test('Sitzung mit alter Sitzungsversion zählt nicht als Gerät', async () => {
		const m = await legeMitgliedAn(db);
		const kennung = await erstelleSitzung(db, m.kontoId, jetzt);
		await abo(m.kontoId, kennung, jetzt);
		await db.update(konto).set({ sitzungsversion: 99 }).where(eq(konto.id, m.kontoId));
		const d = (await ladeMitglied(db, m.mitgliedId, jetzt))!;
		expect(d.einstellungen.geraete).toEqual([]);
	});
});
