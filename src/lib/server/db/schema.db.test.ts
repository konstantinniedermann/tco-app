import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from './index.ts';
import {
	aenderung,
	anlass,
	anlassAnmeldung,
	anmeldung,
	anmeldungSpieler,
	kategorie,
	konto,
	kontoRolle,
	mitglied,
	turnier
} from './schema.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

describe('Schema Mitglied und Konto', () => {
	test('FR-25: E-Mail-Adresse gehört zu höchstens einem Mitglied', async () => {
		const { email } = await legeMitgliedAn(db);
		await expect(
			db.insert(mitglied).values({
				vorname: 'Test',
				nachname: 'Muster',
				strasse: 'Erfundenweg 1',
				plz: '4600',
				ort: 'Olten',
				email
			})
		).rejects.toThrow();
	});

	test('FR-25: dieselbe Adresse in anderer Gross-/Kleinschreibung gehört nicht zu einem zweiten Mitglied', async () => {
		const teil = `a-${randomUUID()}`;
		const neu = (email: string) =>
			db.insert(mitglied).values({
				vorname: 'Test',
				nachname: 'Muster',
				strasse: 'Erfundenweg 1',
				plz: '4600',
				ort: 'Olten',
				email
			});
		await neu(`${teil.toUpperCase()}@example.org`);
		const fehler = await neu(`${teil}@example.org`).then(
			() => null,
			(f: unknown) => f
		);
		expect(fehler).toBeInstanceOf(Error);
		expect((fehler as Error & { cause?: { code?: string } }).cause?.code).toBe('23505');
	});

	test('Konto wird mit dem Mitglied gelöscht', async () => {
		const { mitgliedId, kontoId } = await legeMitgliedAn(db);
		await db.delete(mitglied).where(eq(mitglied.id, mitgliedId));
		const rest = await db.select().from(konto).where(eq(konto.id, kontoId));
		expect(rest).toHaveLength(0);
	});

	test('Status ausserhalb von aktiv, ausgetreten, geloescht wird abgelehnt', async () => {
		await expect(legeMitgliedAn(db, { status: 'unbekannt' })).rejects.toThrow();
	});

	test('Standardwerte: Status aktiv, Sitzungsversion 1, nicht gesperrt', async () => {
		const { mitgliedId, kontoId } = await legeMitgliedAn(db);
		const [m] = await db.select().from(mitglied).where(eq(mitglied.id, mitgliedId));
		const [k] = await db.select().from(konto).where(eq(konto.id, kontoId));
		expect(m.status).toBe('aktiv');
		expect(k).toMatchObject({ sitzungsversion: 1, gesperrt: false, mailCodeFehlversuche: 0 });
	});
});

function code(f: unknown) {
	return (f as { cause?: { code?: string } }).cause?.code;
}

describe('Schema Rollen und Änderungsverlauf', () => {
	test('Mitgliedernummer ist eindeutig, leer mehrfach erlaubt', async () => {
		const a = await legeMitgliedAn(db);
		const b = await legeMitgliedAn(db);
		const c = await legeMitgliedAn(db);
		await expect(
			db.update(mitglied).set({ mitgliedernummer: null }).where(eq(mitglied.id, a.mitgliedId))
		).resolves.toBeDefined();
		await db.update(mitglied).set({ mitgliedernummer: null }).where(eq(mitglied.id, b.mitgliedId));
		const nr = String(10000 + Math.floor(Math.random() * 80000));
		await db.update(mitglied).set({ mitgliedernummer: nr }).where(eq(mitglied.id, b.mitgliedId));
		const fehler = await db
			.update(mitglied)
			.set({ mitgliedernummer: nr })
			.where(eq(mitglied.id, c.mitgliedId))
			.then(
				() => null,
				(f: unknown) => f
			);
		expect(code(fehler)).toBe('23505');
	});

	test('konto_rolle: unbekannte Rolle wird abgewiesen', async () => {
		const { kontoId } = await legeMitgliedAn(db);
		const fehler = await db
			.insert(kontoRolle)
			.values({ kontoId, rolle: 'chef' })
			.then(
				() => null,
				(f: unknown) => f
			);
		expect(code(fehler)).toBe('23514');
	});

	test('aenderung: Urheber wird leer, wenn sein Mitglied verschwindet; der Eintrag bleibt', async () => {
		const ziel = await legeMitgliedAn(db);
		const urheber = await legeMitgliedAn(db);
		const [e] = await db
			.insert(aenderung)
			.values({
				mitgliedId: ziel.mitgliedId,
				urheberArt: 'admin',
				urheberMitgliedId: urheber.mitgliedId,
				aktion: 'feld'
			})
			.returning({ id: aenderung.id });
		await db.delete(mitglied).where(eq(mitglied.id, urheber.mitgliedId));
		const [rest] = await db.select().from(aenderung).where(eq(aenderung.id, e.id));
		expect(rest.urheberMitgliedId).toBeNull();
		expect(rest.mitgliedId).toBe(ziel.mitgliedId);
	});
});

describe('Schema Anlass und Anmeldung', () => {
	const fehlerCode = (f: unknown) => (f as Error & { cause?: { code?: string } }).cause?.code;
	const fang = (p: Promise<unknown>) =>
		p.then(
			() => null,
			(f: unknown) => f
		);
	async function neuerAnlass(werte: Partial<typeof anlass.$inferInsert> = {}) {
		const [a] = await db
			.insert(anlass)
			.values({
				titel: 'Testanlass',
				beginn: new Date('2027-03-19T18:30:00Z'),
				ort: 'Clubhaus',
				anmeldeschluss: new Date('2027-03-16T22:59:00Z'),
				kalenderKennung: randomUUID(),
				...werte
			})
			.returning({ id: anlass.id });
		return a.id;
	}

	test('FR-29: je Mitglied und Anlass höchstens eine Anmeldung', async () => {
		const anlassId = await neuerAnlass();
		const { mitgliedId } = await legeMitgliedAn(db);
		const zeile = { anlassId, mitgliedId, antwort: 'kommt' as const, geaendertAm: new Date() };
		await db.insert(anlassAnmeldung).values(zeile);
		expect(fehlerCode(await fang(db.insert(anlassAnmeldung).values(zeile)))).toBe('23505');
	});

	test('FR-30: Bemerkung nur bei kommt-nicht', async () => {
		const anlassId = await neuerAnlass();
		const { mitgliedId } = await legeMitgliedAn(db);
		const f = await fang(
			db.insert(anlassAnmeldung).values({
				anlassId,
				mitgliedId,
				antwort: 'kommt',
				bemerkung: 'Hallo',
				geaendertAm: new Date()
			})
		);
		expect(fehlerCode(f)).toBe('23514');
	});

	test('FR-28: Anmeldeschluss nach Beginn wird abgewiesen', async () => {
		const f = await fang(neuerAnlass({ anmeldeschluss: new Date('2027-03-20T00:00:00Z') }));
		expect(fehlerCode(f)).toBe('23514');
	});

	test('FR-31: Löschen des Anlasses löscht seine Anmeldungen', async () => {
		const anlassId = await neuerAnlass();
		const { mitgliedId } = await legeMitgliedAn(db);
		await db
			.insert(anlassAnmeldung)
			.values({ anlassId, mitgliedId, antwort: 'kommt-nicht', geaendertAm: new Date() });
		await db.delete(anlass).where(eq(anlass.id, anlassId));
		const rest = await db
			.select()
			.from(anlassAnmeldung)
			.where(eq(anlassAnmeldung.anlassId, anlassId));
		expect(rest).toHaveLength(0);
	});
});

describe('Schema Turnier und Kategorie', () => {
	const fang = (p: Promise<unknown>) =>
		p.then(
			() => null,
			(f: unknown) => f
		);
	const constraint = (f: unknown) => {
		const c = (f as { cause?: { constraint_name?: string; constraint?: string } } | null)?.cause;
		return c?.constraint_name ?? c?.constraint;
	};
	async function neuesTurnier(jahr = 3000 + Math.floor(Math.random() * 90000)) {
		const [t] = await db
			.insert(turnier)
			.values({ jahr, name: `Testturnier ${jahr}`, anmeldeschluss: `${jahr}-05-31` })
			.returning();
		return t;
	}
	const einzel = {
		name: 'Herren R1-R6',
		geschlecht: 'herren',
		art: 'einzel',
		klassierungVon: 'R1',
		klassierungBis: 'R6'
	} as const;

	test('FR-33: pro Jahr ein Turnier', async () => {
		const t = await neuesTurnier();
		const f = await fang(
			db
				.insert(turnier)
				.values({ jahr: t.jahr, name: 'Zweites', anmeldeschluss: `${t.jahr}-05-31` })
		);
		expect(constraint(f)).toBe('turnier_jahr_unique');
	});

	test('FR-33: Status ausserhalb von vorbereitung, offen, geschlossen wird abgewiesen', async () => {
		const jahr = 3000 + Math.floor(Math.random() * 90000);
		const f = await fang(
			db.insert(turnier).values({
				jahr,
				name: 'X',
				anmeldeschluss: `${jahr}-05-31`,
				status: 'unbekannt' as 'offen'
			})
		);
		expect(constraint(f)).toBe('turnier_status_check');
	});

	test('FR-34: Einzel mit Mixed oder ohne Klassierung verletzt kategorie_art_check', async () => {
		const t = await neuesTurnier();
		const mixed = await fang(
			db.insert(kategorie).values({ ...einzel, turnierId: t.id, geschlecht: 'mixed' })
		);
		expect(constraint(mixed)).toBe('kategorie_art_check');
		const ohne = await fang(
			db.insert(kategorie).values({ ...einzel, turnierId: t.id, klassierungBis: null })
		);
		expect(constraint(ohne)).toBe('kategorie_art_check');
		const mitSumme = await fang(
			db.insert(kategorie).values({ ...einzel, turnierId: t.id, mindestsumme: 9 })
		);
		expect(constraint(mitSumme)).toBe('kategorie_art_check');
	});

	test('FR-34: Doppel mit Klassierung oder ohne Mindestsumme verletzt kategorie_art_check', async () => {
		const t = await neuesTurnier();
		const doppel = { name: 'Doppel', geschlecht: 'mixed', art: 'doppel', turnierId: t.id } as const;
		const mitKlass = await fang(
			db.insert(kategorie).values({ ...doppel, mindestsumme: 9, klassierungVon: 'R1' })
		);
		expect(constraint(mitKlass)).toBe('kategorie_art_check');
		const ohneSumme = await fang(db.insert(kategorie).values(doppel));
		expect(constraint(ohneSumme)).toBe('kategorie_art_check');
		await db.insert(kategorie).values({ ...doppel, mindestsumme: 9 });
	});

	test('FR-34: Geschlecht und Status ausserhalb der Werte werden abgewiesen', async () => {
		const t = await neuesTurnier();
		const g = await fang(
			db.insert(kategorie).values({ ...einzel, turnierId: t.id, geschlecht: 'x' as 'offen' })
		);
		expect(constraint(g)).toBe('kategorie_geschlecht_check');
		const s = await fang(
			db.insert(kategorie).values({ ...einzel, turnierId: t.id, status: 'x' as 'aktiv' })
		);
		expect(constraint(s)).toBe('kategorie_status_check');
	});

	test('FR-34: Name unter aktiven Kategorien eindeutig ohne Gross-/Kleinschreibung', async () => {
		const t = await neuesTurnier();
		const [erste] = await db
			.insert(kategorie)
			.values({ ...einzel, turnierId: t.id, name: 'Herren Offen' })
			.returning();
		const f = await fang(
			db.insert(kategorie).values({ ...einzel, turnierId: t.id, name: 'HERREN offen' })
		);
		expect(constraint(f)).toBe('kategorie_name_aktiv_unique');
		await db.update(kategorie).set({ status: 'abgesagt' }).where(eq(kategorie.id, erste.id));
		await db.insert(kategorie).values({ ...einzel, turnierId: t.id, name: 'HERREN offen' });
	});

	test('FR-33: Löschen des Turniers löscht seine Kategorien', async () => {
		const t = await neuesTurnier();
		await db.insert(kategorie).values({ ...einzel, turnierId: t.id });
		await db.delete(turnier).where(eq(turnier.id, t.id));
		const rest = await db.select().from(kategorie).where(eq(kategorie.turnierId, t.id));
		expect(rest).toHaveLength(0);
	});

	test('FR-37: Klassierung nur aus der Skala', async () => {
		const { mitgliedId } = await legeMitgliedAn(db);
		const f = await fang(
			db.update(mitglied).set({ klassierung: 'R10' }).where(eq(mitglied.id, mitgliedId))
		);
		expect(constraint(f)).toBe('mitglied_klassierung_check');
		await db.update(mitglied).set({ klassierung: 'keine' }).where(eq(mitglied.id, mitgliedId));
		await db.update(mitglied).set({ klassierung: 'R9' }).where(eq(mitglied.id, mitgliedId));
	});

	test('FR-06: Anmeldestatus nur aus der Liste', async () => {
		const t = await neuesTurnier();
		const [k] = await db
			.insert(kategorie)
			.values({ ...einzel, turnierId: t.id })
			.returning();
		const jetzt = new Date();
		const f = await fang(
			db.insert(anmeldung).values({
				kategorieId: k.id,
				status: 'offen' as 'bestaetigt',
				angemeldetAm: jetzt,
				geaendertAm: jetzt
			})
		);
		expect(constraint(f)).toBe('anmeldung_status_check');
	});

	test('FR-04: Turnier löschen räumt Anmeldungen mit, Mitglied bleibt', async () => {
		const { mitgliedId } = await legeMitgliedAn(db);
		const t = await neuesTurnier();
		const [k] = await db
			.insert(kategorie)
			.values({ ...einzel, turnierId: t.id })
			.returning();
		const jetzt = new Date();
		const [a] = await db
			.insert(anmeldung)
			.values({ kategorieId: k.id, angemeldetAm: jetzt, geaendertAm: jetzt })
			.returning();
		expect(a.status).toBe('bestaetigt');
		await db.insert(anmeldungSpieler).values({ anmeldungId: a.id, mitgliedId });
		await db.delete(turnier).where(eq(turnier.id, t.id));
		expect(await db.select().from(anmeldung).where(eq(anmeldung.id, a.id))).toHaveLength(0);
		expect(
			await db.select().from(anmeldungSpieler).where(eq(anmeldungSpieler.anmeldungId, a.id))
		).toHaveLength(0);
		expect(await db.select().from(mitglied).where(eq(mitglied.id, mitgliedId))).toHaveLength(1);
	});
});

describe('Austritt und Löschen (#43)', () => {
	const basis = () => ({
		vorname: 'Test',
		nachname: 'Muster',
		strasse: 'Erfundenweg 1',
		plz: '4600',
		ort: 'Olten',
		email: `test-${randomUUID()}@example.org`
	});
	const constraint = async (p: Promise<unknown>) => {
		const f = await p.then(
			() => null,
			(e: unknown) => e
		);
		expect(f).toBeInstanceOf(Error);
		return (f as Error & { cause?: { constraint?: string } }).cause?.constraint;
	};
	const jetzt = new Date();

	test('vorgemerkt wird mit vorgemerkt_am und status_vorher angenommen', async () => {
		const [m] = await db
			.insert(mitglied)
			.values({ ...basis(), status: 'vorgemerkt', vorgemerktAm: jetzt, statusVorher: 'aktiv' })
			.returning();
		expect(m.status).toBe('vorgemerkt');
		expect(m.austrittAm).toBeNull();
	});

	test('mitglied_geloescht_check: aktives Mitglied ohne E-Mail wird abgelehnt', async () => {
		expect(await constraint(db.insert(mitglied).values({ ...basis(), email: null }))).toBe(
			'mitglied_geloescht_check'
		);
	});

	test('mitglied_geloescht_check: gelöschtes Mitglied nur mit Vor- und Nachname wird angenommen', async () => {
		const [m] = await db
			.insert(mitglied)
			.values({
				vorname: 'Test',
				nachname: 'Muster',
				status: 'geloescht',
				strasse: null,
				plz: null,
				ort: null,
				email: null
			})
			.returning();
		expect(m.email).toBeNull();
	});

	test('mitglied_status_vorher_check: nur aktiv oder ausgetreten', async () => {
		expect(await constraint(db.insert(mitglied).values({ ...basis(), statusVorher: 'xx' }))).toBe(
			'mitglied_status_vorher_check'
		);
	});

	test('mitglied_vorgemerkt_check: verlangt vorgemerkt_am und status_vorher', async () => {
		expect(
			await constraint(
				db.insert(mitglied).values({ ...basis(), status: 'vorgemerkt', statusVorher: 'aktiv' })
			)
		).toBe('mitglied_vorgemerkt_check');
		expect(
			await constraint(
				db.insert(mitglied).values({ ...basis(), status: 'vorgemerkt', vorgemerktAm: jetzt })
			)
		).toBe('mitglied_vorgemerkt_check');
	});

	test('mitglied_ausgetreten_check: verlangt austritt_am', async () => {
		expect(
			await constraint(db.insert(mitglied).values({ ...basis(), status: 'ausgetreten' }))
		).toBe('mitglied_ausgetreten_check');
		const [m] = await db
			.insert(mitglied)
			.values({ ...basis(), status: 'ausgetreten', austrittAm: jetzt })
			.returning();
		expect(m.austrittAm).toEqual(jetzt);
	});
});
