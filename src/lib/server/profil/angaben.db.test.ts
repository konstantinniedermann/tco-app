import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { aenderung, mitglied } from '../db/schema.ts';
import { aendereAngaben } from '../admin/mitglieder.ts';
import { aendereEigeneAngaben, ladeEigeneAngaben, setzeRufname } from './angaben.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

const jetzt = new Date('2026-11-05T12:00:00Z');

async function lea() {
	const { mitgliedId } = await legeMitgliedAn(db, { vorname: 'Lea', nachname: 'Beispiel' });
	const vorher = await ladeEigeneAngaben(db, mitgliedId);
	if (!vorher) throw new Error('Mitglied fehlt');
	return { mitgliedId, vorher };
}

async function zeile(id: number) {
	const [z] = await db.select().from(mitglied).where(eq(mitglied.id, id));
	return z;
}

describe('aendereEigeneAngaben', () => {
	test('A-KONTO-01: Telefon ändern speichert, schreibt Verlauf als Mitglied und markiert für Fairgate', async () => {
		const { mitgliedId, vorher } = await lea();
		const r = await aendereEigeneAngaben(
			db,
			mitgliedId,
			{ telefon: '079 123 45 67' },
			vorher,
			jetzt
		);
		expect(r).toEqual({ ergebnis: 'ok', geaendert: ['telefon'] });
		const z = await zeile(mitgliedId);
		expect(z.telefon).toBe('079 123 45 67');
		expect(z.fairgateOffenSeit).toEqual(jetzt);
		const v = await db.select().from(aenderung).where(eq(aenderung.mitgliedId, mitgliedId));
		expect(v).toHaveLength(1);
		expect(v[0]).toMatchObject({
			urheberArt: 'mitglied',
			urheberMitgliedId: mitgliedId,
			aktion: 'feld-geaendert',
			detail: 'telefon'
		});
	});

	test('A-KONTO-02: Adresse ändern markiert für Fairgate', async () => {
		const { mitgliedId, vorher } = await lea();
		const r = await aendereEigeneAngaben(
			db,
			mitgliedId,
			{ strasse: 'Neuweg 2', plz: '8000', ort: 'Zürich' },
			vorher,
			jetzt
		);
		expect(r).toEqual({ ergebnis: 'ok', geaendert: ['strasse', 'plz', 'ort'] });
		const z = await zeile(mitgliedId);
		expect(z).toMatchObject({ strasse: 'Neuweg 2', plz: '8000', ort: 'Zürich' });
		expect(z.fairgateOffenSeit).toEqual(jetzt);
	});

	test('A-KONTO-01: Lizenznummer ändern und leeren markiert nicht für Fairgate', async () => {
		const { mitgliedId, vorher } = await lea();
		const r1 = await aendereEigeneAngaben(db, mitgliedId, { lizenznummer: 'AB123' }, vorher, jetzt);
		expect(r1).toEqual({ ergebnis: 'ok', geaendert: ['lizenznummer'] });
		expect((await zeile(mitgliedId)).lizenznummer).toBe('AB123');
		const mitLizenz = await ladeEigeneAngaben(db, mitgliedId);
		const r2 = await aendereEigeneAngaben(db, mitgliedId, { lizenznummer: '' }, mitLizenz!, jetzt);
		expect(r2).toEqual({ ergebnis: 'ok', geaendert: ['lizenznummer'] });
		const z = await zeile(mitgliedId);
		expect(z.lizenznummer).toBeNull();
		expect(z.fairgateOffenSeit).toBeNull();
	});

	test('A-KONTO-01: Telefon leeren ist erlaubt', async () => {
		const { mitgliedId, vorher } = await lea();
		await aendereEigeneAngaben(db, mitgliedId, { telefon: '079 123 45 67' }, vorher, jetzt);
		const mitTelefon = await ladeEigeneAngaben(db, mitgliedId);
		const r = await aendereEigeneAngaben(db, mitgliedId, { telefon: '' }, mitTelefon!, jetzt);
		expect(r).toEqual({ ergebnis: 'ok', geaendert: ['telefon'] });
		expect((await zeile(mitgliedId)).telefon).toBeNull();
	});

	test('A-KONTO-01: Name, Jahrgang und E-Mail im Körper werden ignoriert', async () => {
		const { mitgliedId, vorher } = await lea();
		// Wie ein Körper aus dem Netz: ungeprüfte Schlüssel, nicht nur eigene Felder.
		const koerper = {
			vorname: 'X',
			email: 'x@example.org',
			jahrgang: 1950,
			telefon: '079 000 00 00'
		};
		const r = await aendereEigeneAngaben(db, mitgliedId, koerper, vorher, jetzt);
		expect(r).toEqual({ ergebnis: 'ok', geaendert: ['telefon'] });
		const z = await zeile(mitgliedId);
		expect(z.vorname).toBe('Lea');
		expect(z.email).toBe(vorher.email);
		expect(z.jahrgang).toBeNull();
	});

	test('A-KONTO-02: leere Strasse ergibt Fehler beim Feld', async () => {
		const { mitgliedId, vorher } = await lea();
		const r = await aendereEigeneAngaben(db, mitgliedId, { strasse: '' }, vorher, jetzt);
		expect(r).toEqual({ ergebnis: 'eingabe', fehler: { strasse: 'fehlt' } });
		expect((await zeile(mitgliedId)).strasse).toBe('Erfundenweg 1');
	});

	test('A-KONTO-01: veralteter Stand (zweiter Tab) wird abgewiesen', async () => {
		const { mitgliedId, vorher } = await lea();
		await aendereEigeneAngaben(db, mitgliedId, { telefon: '079 111 11 11' }, vorher, jetzt);
		const r = await aendereEigeneAngaben(
			db,
			mitgliedId,
			{ telefon: '079 222 22 22' },
			vorher,
			jetzt
		);
		expect(r).toEqual({ ergebnis: 'veraltet' });
		expect((await zeile(mitgliedId)).telefon).toBe('079 111 11 11');
	});

	test('A-KONTO-02: erneute Änderung setzt den Fairgate-Marker auf das neueste Datum', async () => {
		const { mitgliedId, vorher } = await lea();
		await aendereEigeneAngaben(db, mitgliedId, { telefon: '079 111 11 11' }, vorher, jetzt);
		const spaeter = new Date('2026-11-06T08:00:00Z');
		const mitTel = await ladeEigeneAngaben(db, mitgliedId);
		await aendereEigeneAngaben(db, mitgliedId, { ort: 'Aarau' }, mitTel!, spaeter);
		expect((await zeile(mitgliedId)).fairgateOffenSeit).toEqual(spaeter);
	});

	test('unbekanntes Mitglied ergibt nicht-gefunden', async () => {
		const { vorher } = await lea();
		const r = await aendereEigeneAngaben(db, 2147483000, { telefon: '' }, vorher, jetzt);
		expect(r).toEqual({ ergebnis: 'nicht-gefunden' });
	});
});

describe('setzeRufname', () => {
	test('setzt, ändert und löscht den Rufnamen', async () => {
		const { mitgliedId } = await lea();
		expect(await setzeRufname(db, mitgliedId, 'Hannes', jetzt)).toEqual({ ergebnis: 'ok' });
		expect((await zeile(mitgliedId)).rufname).toBe('Hannes');
		expect(await setzeRufname(db, mitgliedId, 'Hans', jetzt)).toEqual({ ergebnis: 'ok' });
		expect((await zeile(mitgliedId)).rufname).toBe('Hans');
		expect(await setzeRufname(db, mitgliedId, '', jetzt)).toEqual({ ergebnis: 'ok' });
		expect((await zeile(mitgliedId)).rufname).toBeNull();
		const v = await db.select().from(aenderung).where(eq(aenderung.mitgliedId, mitgliedId));
		expect(v).toHaveLength(3);
		for (const e of v) {
			expect(e).toMatchObject({
				urheberArt: 'mitglied',
				urheberMitgliedId: mitgliedId,
				aktion: 'feld-geaendert',
				detail: 'rufname'
			});
		}
	});

	test('leer und Leerzeichen werden null', async () => {
		const { mitgliedId } = await lea();
		await setzeRufname(db, mitgliedId, 'Hannes', jetzt);
		expect(await setzeRufname(db, mitgliedId, '   ', jetzt)).toEqual({ ergebnis: 'ok' });
		expect((await zeile(mitgliedId)).rufname).toBeNull();
	});

	test('gleicher Wert schreibt keinen Verlauf', async () => {
		const { mitgliedId } = await lea();
		await setzeRufname(db, mitgliedId, 'Hannes', jetzt);
		expect(await setzeRufname(db, mitgliedId, ' Hannes ', jetzt)).toEqual({ ergebnis: 'ok' });
		await setzeRufname(db, mitgliedId, '', jetzt);
		expect(await setzeRufname(db, mitgliedId, '', jetzt)).toEqual({ ergebnis: 'ok' });
		const v = await db.select().from(aenderung).where(eq(aenderung.mitgliedId, mitgliedId));
		expect(v).toHaveLength(2);
	});

	test('zu lang ist eingabe', async () => {
		const { mitgliedId } = await lea();
		await setzeRufname(db, mitgliedId, 'Hannes', jetzt);
		expect(await setzeRufname(db, mitgliedId, 'ABCDEFGHIJK', jetzt)).toEqual({
			ergebnis: 'eingabe',
			fehler: 'Höchstens 10 Zeichen.'
		});
		expect((await zeile(mitgliedId)).rufname).toBe('Hannes');
	});

	test('setzt für Fairgate offen nicht', async () => {
		const { mitgliedId } = await lea();
		await setzeRufname(db, mitgliedId, 'Hannes', jetzt);
		expect((await zeile(mitgliedId)).fairgateOffenSeit).toBeNull();
	});

	test('gelöschtes oder unbekanntes Mitglied ist nicht-gefunden', async () => {
		expect(await setzeRufname(db, 2147483000, 'Hannes', jetzt)).toEqual({
			ergebnis: 'nicht-gefunden'
		});
		const { mitgliedId } = await lea();
		await db.update(mitglied).set({ status: 'geloescht' }).where(eq(mitglied.id, mitgliedId));
		expect(await setzeRufname(db, mitgliedId, 'Hannes', jetzt)).toEqual({
			ergebnis: 'nicht-gefunden'
		});
	});

	test('Admin-Angaben lassen Rufname stehen', async () => {
		const { mitgliedId, vorher } = await lea();
		await setzeRufname(db, mitgliedId, 'Hannes', jetzt);
		const r = await aendereAngaben(
			db,
			{ art: 'admin', mitgliedId },
			mitgliedId,
			{ ...vorher, telefon: '079 111 22 33' },
			vorher,
			jetzt
		);
		expect(r.ergebnis).toBe('ok');
		const z = await zeile(mitgliedId);
		expect(z.telefon).toBe('079 111 22 33');
		expect(z.rufname).toBe('Hannes');
	});
});
