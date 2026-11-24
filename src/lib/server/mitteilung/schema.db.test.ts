import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { turnierjahre } from '../../../../tests/hilfen/turnierjahre.ts';
import { legeAnlassAn } from '../anlass/anlaesse.ts';
import { erstelleDb } from '../db/index.ts';
import { anlass, konto, mitteilung, pushAbo, turnier } from '../db/schema.ts';
import { beendeSitzung, erstelleSitzung, pruefeSitzung } from '../login/sitzung.ts';

const db = erstelleDb(process.env.DATABASE_URL!);
const naechstesJahr = turnierjahre(import.meta.url);

afterAll(async () => {
	await db.$client.end();
});

// Sitzungen mit einer Zeit wie in den übrigen Tests: Ein Login räumt Sitzungen auf, die ein Jahr
// nicht genutzt wurden, und träfe mit 2099 die Sitzungen parallel laufender Tests.
const SITZUNG_ZEIT = new Date('2026-11-02T12:00:00Z');

describe('Mitteilungen: Datenmodell', () => {
	test('FR-40: Abmelden löscht das Push-Abo der Sitzung', async () => {
		const m = await legeMitgliedAn(db);
		const kennung = await erstelleSitzung(db, m.kontoId, SITZUNG_ZEIT);
		const { konto: k } = (await pruefeSitzung(db, kennung, SITZUNG_ZEIT))!;
		const endpunkt = `https://push.example.org/${randomUUID()}`;
		await db.insert(pushAbo).values({
			endpunkt,
			sitzungHash: k.sitzungHash,
			kontoId: m.kontoId,
			p256dh: 'schluessel',
			auth: 'geheimnis',
			eingerichtetAm: SITZUNG_ZEIT
		});
		await beendeSitzung(db, kennung);
		const rest = await db.select().from(pushAbo).where(eq(pushAbo.endpunkt, endpunkt));
		expect(rest).toEqual([]);
	});

	test('FR-41: neue Konten haben alle Themen an', async () => {
		const m = await legeMitgliedAn(db);
		const [k] = await db.select().from(konto).where(eq(konto.id, m.kontoId));
		expect(k).toMatchObject({ themaAnlaesse: true, themaCm: true, themaVerein: true });
	});

	test('FR-45: Löschen des Anlasses löscht seine Mitteilungen', async () => {
		const admin = await legeMitgliedAn(db);
		const anlassId = await legeAnlassAn(db, admin.mitgliedId, {
			titel: `Anlass ${randomUUID()}`,
			beginn: new Date('2099-03-19T18:30:00Z'),
			ort: 'Clubhaus',
			einladung: '',
			anmeldeschluss: new Date('2099-03-16T22:59:00Z')
		});
		const [z] = await db
			.insert(mitteilung)
			.values({
				bezug: 'anlass',
				anlassId,
				absenderId: admin.mitgliedId,
				gesendetAm: SITZUNG_ZEIT,
				titel: 'Hinweis',
				text: 'Text',
				auswahl: 'alle',
				weg: 'push'
			})
			.returning({ id: mitteilung.id });
		await db.delete(anlass).where(eq(anlass.id, anlassId));
		const rest = await db.select().from(mitteilung).where(eq(mitteilung.id, z.id));
		expect(rest).toEqual([]);
	});

	test('FR-45: Mitteilung zum Anlass ohne anlassId wird abgewiesen', async () => {
		const fehler = await db
			.insert(mitteilung)
			.values({
				bezug: 'anlass',
				anlassId: null,
				gesendetAm: SITZUNG_ZEIT,
				titel: 'Hinweis',
				text: 'Text',
				auswahl: 'alle',
				weg: 'push'
			})
			.then(
				() => null,
				(f: unknown) => f
			);
		const c = (fehler as { cause?: { constraint_name?: string; constraint?: string } } | null)
			?.cause;
		expect(c?.constraint_name ?? c?.constraint).toBe('mitteilung_anlass_check');
	});

	test('Mitteilung zum Turnier braucht turnier_id, Kategorie nur beim Turnier', async () => {
		const gemeinsam = {
			gesendetAm: SITZUNG_ZEIT,
			titel: 'Hinweis',
			text: 'Text',
			auswahl: 'alle',
			weg: 'push' as const
		};
		const constraint = (fehler: unknown) => {
			const c = (fehler as { cause?: { constraint_name?: string; constraint?: string } } | null)
				?.cause;
			return c?.constraint_name ?? c?.constraint;
		};
		const ohneTurnier = await db
			.insert(mitteilung)
			.values({ ...gemeinsam, bezug: 'turnier', turnierId: null })
			.then(
				() => null,
				(f: unknown) => f
			);
		expect(constraint(ohneTurnier)).toBe('mitteilung_turnier_check');
		const verein = await db
			.insert(mitteilung)
			.values({ ...gemeinsam, bezug: 'verein', kategorie: 'X' })
			.then(
				() => null,
				(f: unknown) => f
			);
		expect(constraint(verein)).toBe('mitteilung_kategorie_check');

		const [t] = await db
			.insert(turnier)
			.values({ jahr: naechstesJahr(), name: 'CM Test', anmeldeschluss: '2099-05-31' })
			.returning({ id: turnier.id });
		const [z] = await db
			.insert(mitteilung)
			.values({ ...gemeinsam, bezug: 'turnier', turnierId: t.id, kategorie: 'Damen R7–R9' })
			.returning({ id: mitteilung.id });
		await db.delete(turnier).where(eq(turnier.id, t.id));
		const rest = await db.select().from(mitteilung).where(eq(mitteilung.id, z.id));
		expect(rest).toEqual([]);
	});
});
