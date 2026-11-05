import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { aenderung, mitglied } from '../db/schema.ts';
import { aendereEigeneAngaben, ladeEigeneAngaben } from '../profil/angaben.ts';
import { listeFuerFairgate, markiereUebertragen } from './fairgate.ts';
import { aendereAngaben } from './mitglieder.ts';
import { schreibeVerlauf } from './verlauf.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

const t1 = new Date('2026-11-05T10:00:00Z');
const t2 = new Date('2026-11-05T11:00:00Z');
const t3 = new Date('2026-11-05T12:00:00Z');
const t4 = new Date('2026-11-05T13:00:00Z');

async function neuesMitglied() {
	const { mitgliedId, kontoId } = await legeMitgliedAn(db, {
		vorname: 'Lea',
		nachname: 'Beispiel'
	});
	return { mitgliedId, kontoId };
}

async function selbst(mitgliedId: number, neu: Record<string, string>, jetzt: Date) {
	const vorher = (await ladeEigeneAngaben(db, mitgliedId))!;
	const r = await aendereEigeneAngaben(db, mitgliedId, neu, vorher, jetzt);
	expect(r.ergebnis).toBe('ok');
}

// Der E-Mail-Wechsel schreibt Adresse, Markierung und Verlauf wie diese Hilfe.
async function emailWechsel(mitgliedId: number, email: string, jetzt: Date) {
	await db.transaction(async (tx) => {
		await tx
			.update(mitglied)
			.set({ email, fairgateOffenSeit: jetzt })
			.where(eq(mitglied.id, mitgliedId));
		await schreibeVerlauf(
			tx,
			mitgliedId,
			{ art: 'mitglied', mitgliedId },
			[{ aktion: 'feld-geaendert', detail: 'email' }],
			jetzt
		);
	});
}

const zeileVon = async (id: number) => (await listeFuerFairgate(db)).find((z) => z.id === id);

describe('Liste Für Fairgate', () => {
	test('A-KONTO-02: Selbständerung erscheint in der Liste mit geänderten Feldern', async () => {
		const { mitgliedId } = await neuesMitglied();
		await selbst(mitgliedId, { strasse: 'Neuweg 2', plz: '8000', ort: 'Zürich' }, t1);
		await emailWechsel(mitgliedId, `neu-${mitgliedId}@example.org`, t2);
		const z = await zeileVon(mitgliedId);
		expect(z).toBeDefined();
		expect(z!.name).toBe('Beispiel, Lea');
		expect(z!.felder).toEqual(['email', 'strasse', 'plz', 'ort']);
		expect(z!.angaben).toEqual({
			email: `neu-${mitgliedId}@example.org`,
			telefon: null,
			strasse: 'Neuweg 2',
			plz: '8000',
			ort: 'Zürich'
		});
	});

	test('A-KONTO-02: mehrere Änderungen bleiben ein Eintrag mit neuestem Datum', async () => {
		const { mitgliedId } = await neuesMitglied();
		await selbst(mitgliedId, { telefon: '079 123 45 67' }, t1);
		await selbst(mitgliedId, { telefon: '079 765 43 21' }, t3);
		const zeilen = (await listeFuerFairgate(db)).filter((z) => z.id === mitgliedId);
		expect(zeilen).toHaveLength(1);
		expect(zeilen[0].seit).toEqual(t3);
		expect(zeilen[0].felder).toEqual(['telefon']);
	});

	test('A-KONTO-02: Admin-Änderung erzeugt keinen Eintrag', async () => {
		const { mitgliedId } = await neuesMitglied();
		const { mitgliedId: adminId } = await legeMitgliedAn(db, { rollen: ['admin'] });
		const vorher = (await ladeEigeneAngaben(db, mitgliedId))!;
		const r = await aendereAngaben(
			db,
			{ art: 'admin', mitgliedId: adminId },
			mitgliedId,
			{ ...vorher, telefon: '079 000 00 00', ort: 'Aarau' },
			vorher,
			t1
		);
		expect(r.ergebnis).toBe('ok');
		expect(await zeileVon(mitgliedId)).toBeUndefined();
	});

	test('A-KONTO-02: Lizenznummer allein erzeugt keinen Eintrag', async () => {
		const { mitgliedId } = await neuesMitglied();
		await selbst(mitgliedId, { lizenznummer: '12345678' }, t1);
		expect(await zeileVon(mitgliedId)).toBeUndefined();
	});

	test('A-KONTO-02: Abhaken entfernt den Eintrag und schreibt Verlauf', async () => {
		const { mitgliedId } = await neuesMitglied();
		const { mitgliedId: adminId } = await legeMitgliedAn(db, { rollen: ['admin'] });
		await selbst(mitgliedId, { telefon: '079 123 45 67' }, t1);
		const urheber = { art: 'admin', mitgliedId: adminId } as const;
		expect(await markiereUebertragen(db, urheber, mitgliedId, t2)).toBe('ok');
		expect(await zeileVon(mitgliedId)).toBeUndefined();
		const v = await db.select().from(aenderung).where(eq(aenderung.mitgliedId, mitgliedId));
		expect(v.filter((e) => e.aktion === 'fairgate-uebertragen')).toMatchObject([
			{ urheberArt: 'admin', urheberMitgliedId: adminId, detail: null, zeitpunkt: t2 }
		]);
		expect(await markiereUebertragen(db, urheber, mitgliedId, t3)).toBe('nicht-offen');
		const danach = await db.select().from(aenderung).where(eq(aenderung.mitgliedId, mitgliedId));
		expect(danach.filter((e) => e.aktion === 'fairgate-uebertragen')).toHaveLength(1);
	});

	test('A-KONTO-02: unbekanntes Mitglied ist nicht offen', async () => {
		const { mitgliedId: adminId } = await legeMitgliedAn(db, { rollen: ['admin'] });
		expect(
			await markiereUebertragen(db, { art: 'admin', mitgliedId: adminId }, 2_000_000_000, t1)
		).toBe('nicht-offen');
	});

	test('A-KONTO-02: nach dem Abhaken zeigt eine neue Änderung nur die neuen Felder', async () => {
		const { mitgliedId } = await neuesMitglied();
		const { mitgliedId: adminId } = await legeMitgliedAn(db, { rollen: ['admin'] });
		await selbst(mitgliedId, { telefon: '079 123 45 67' }, t1);
		await markiereUebertragen(db, { art: 'admin', mitgliedId: adminId }, mitgliedId, t2);
		await selbst(mitgliedId, { ort: 'Aarau' }, t3);
		const z = await zeileVon(mitgliedId);
		expect(z!.felder).toEqual(['ort']);
		expect(z!.seit).toEqual(t3);
	});

	test('A-KONTO-02: älteste Änderung steht zuerst', async () => {
		const spaet = (await neuesMitglied()).mitgliedId;
		const frueh = (await neuesMitglied()).mitgliedId;
		await selbst(spaet, { telefon: '079 111 11 11' }, t4);
		await selbst(frueh, { telefon: '079 222 22 22' }, t1);
		const ids = (await listeFuerFairgate(db)).map((z) => z.id);
		expect(ids.indexOf(frueh)).toBeLessThan(ids.indexOf(spaet));
	});
});
