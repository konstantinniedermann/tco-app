import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb } from '../db/index.ts';
import { aenderung, konto, mitglied } from '../db/schema.ts';
import { erstelleBremsen } from '../login/bremse.ts';
import { BRIEF_CODE_GUELTIG_MS, formatiereBriefCode } from '../login/codes.ts';
import { erstelleLoginDienst } from '../login/dienst.ts';
import { erstelleSitzung } from '../login/sitzung.ts';
import { listeBriefEmpfaenger, stelleBriefeAus, type AusgestellterBrief } from './briefe.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

// Sitzungen mit einer Zeit um 2026-11, sonst räumt ein Login fremde Sitzungen weg.
const jetzt = new Date('2026-11-08T09:00:00Z');
const SCHLUESSEL = 'b'.repeat(40);
const abh = {
	schluessel: SCHLUESSEL,
	adresse: 'https://mytco.example.org',
	kontakt: 'kontakt@example.org'
};

let urheber: { art: 'admin'; mitgliedId: number };

beforeAll(async () => {
	const admin = await legeMitgliedAn(db, { rollen: ['mitglieder'] });
	urheber = { art: 'admin', mitgliedId: admin.mitgliedId };
});

function loginDienst() {
	return erstelleLoginDienst({
		db,
		schluessel: SCHLUESSEL,
		kontakt: abh.kontakt,
		mailer: async () => {},
		bremsen: erstelleBremsen(),
		jetzt: () => jetzt
	});
}

function codeAus(brief: AusgestellterBrief): string {
	const treffer = /<p class="brief-code">([^<]+)<\/p>/.exec(brief.html);
	if (!treffer) throw new Error('Kein Code im Brief');
	return treffer[1];
}

async function stelleEinenAus(mitgliedId: number): Promise<AusgestellterBrief> {
	const r = await stelleBriefeAus(db, abh, urheber, [mitgliedId], jetzt);
	if (r.ergebnis !== 'ok') throw new Error('Ausstellen nicht möglich');
	expect(r.briefe).toHaveLength(1);
	return r.briefe[0];
}

const holeKonto = async (kontoId: number) =>
	(await db.select().from(konto).where(eq(konto.id, kontoId)))[0];

const eintraege = (mitgliedId: number) =>
	db.select().from(aenderung).where(eq(aenderung.mitgliedId, mitgliedId));

describe('listeBriefEmpfaenger', () => {
	test('A-LOGIN-01: Liste zeigt nur aktive, ungesperrte Mitglieder ohne Login', async () => {
		const ohneBrief = await legeMitgliedAn(db, { vorname: 'Ohne', nachname: 'Briefa' });
		const offen = await legeMitgliedAn(db, { vorname: 'Offen', nachname: 'Briefb' });
		const benutzt = await legeMitgliedAn(db);
		const eingeloggt = await legeMitgliedAn(db);
		const ausgetreten = await legeMitgliedAn(db, { status: 'ausgetreten' });
		const vorgemerkt = await legeMitgliedAn(db, { status: 'vorgemerkt' });
		const gesperrt = await legeMitgliedAn(db, { gesperrt: true });
		const ohneStrasse = await legeMitgliedAn(db);
		await stelleEinenAus(offen.mitgliedId);
		await stelleEinenAus(benutzt.mitgliedId);
		await db.update(konto).set({ briefCodeBenutztAm: jetzt }).where(eq(konto.id, benutzt.kontoId));
		await erstelleSitzung(db, eingeloggt.kontoId, jetzt);
		await db.update(mitglied).set({ strasse: '' }).where(eq(mitglied.id, ohneStrasse.mitgliedId));

		const liste = await listeBriefEmpfaenger(db, jetzt);
		const zeile = (id: number) => liste.find((z) => z.id === id);

		expect(zeile(ohneBrief.mitgliedId)).toEqual({
			id: ohneBrief.mitgliedId,
			name: 'Briefa, Ohne',
			mitgliedernummer: null,
			briefGueltigBis: null,
			adresseFehlt: false
		});
		expect(zeile(offen.mitgliedId)?.briefGueltigBis).toEqual(
			new Date(jetzt.getTime() + BRIEF_CODE_GUELTIG_MS)
		);
		expect(zeile(benutzt.mitgliedId)).toBeUndefined();
		expect(zeile(eingeloggt.mitgliedId)).toBeUndefined();
		expect(zeile(ausgetreten.mitgliedId)).toBeUndefined();
		expect(zeile(vorgemerkt.mitgliedId)).toBeUndefined();
		expect(zeile(gesperrt.mitgliedId)).toBeUndefined();
		expect(zeile(ohneStrasse.mitgliedId)?.adresseFehlt).toBe(true);
	});

	test('A-LOGIN-01: abgelaufener Code zählt nicht als offen, Liste nach Nachname, Vorname', async () => {
		const b = await legeMitgliedAn(db, { vorname: 'Bea', nachname: 'Zzlistea' });
		const a = await legeMitgliedAn(db, { vorname: 'Ada', nachname: 'Zzlistea' });
		const c = await legeMitgliedAn(db, { vorname: 'Cem', nachname: 'Aalisteb' });
		await stelleEinenAus(a.mitgliedId);
		await db
			.update(konto)
			.set({ briefCodeAblauf: new Date(jetzt.getTime() - 1000) })
			.where(eq(konto.id, a.kontoId));
		const liste = await listeBriefEmpfaenger(db, jetzt);
		const ids = liste.map((z) => z.id).filter((id) => [a, b, c].some((m) => m.mitgliedId === id));
		expect(ids).toEqual([c.mitgliedId, a.mitgliedId, b.mitgliedId]);
		expect(liste.find((z) => z.id === a.mitgliedId)?.briefGueltigBis).toBeNull();
	});
});

describe('stelleBriefeAus', () => {
	test('RR-04: Ausstellen speichert nur den Hash, der Code meldet an', async () => {
		const m = await legeMitgliedAn(db, { vorname: 'Rita', nachname: 'Hashmann' });
		const brief = await stelleEinenAus(m.mitgliedId);
		expect(brief.mitgliedId).toBe(m.mitgliedId);
		expect(brief.name).toBe('Rita Hashmann');
		const formatiert = codeAus(brief);
		const code = formatiert.replace('-', '');
		expect(formatiert).toBe(formatiereBriefCode(code));
		expect(brief.html).toContain('Hoi Rita');
		const k = await holeKonto(m.kontoId);
		expect(k.briefCodeHash).not.toBeNull();
		expect(k.briefCodeHash).not.toContain(code);
		expect(k.briefCodeAblauf).toEqual(new Date(jetzt.getTime() + BRIEF_CODE_GUELTIG_MS));
		const verlauf = await eintraege(m.mitgliedId);
		expect(JSON.stringify(verlauf)).not.toContain(code);
		expect((await loginDienst().loginMitBriefCode(formatiert, 'ip-rr04')).ergebnis).toBe('ok');
	});

	test('FR-24: neuer Code ersetzt den alten', async () => {
		const m = await legeMitgliedAn(db);
		const dienst = loginDienst();
		const alt = codeAus(await stelleEinenAus(m.mitgliedId));
		expect((await dienst.loginMitBriefCode(alt, 'ip-fr24')).ergebnis).toBe('ok');
		expect((await holeKonto(m.kontoId)).briefCodeBenutztAm).not.toBeNull();
		// Ein einzelner Brief geht auch an ein schon eingeloggtes Mitglied.
		const neu = codeAus(await stelleEinenAus(m.mitgliedId));
		expect((await holeKonto(m.kontoId)).briefCodeBenutztAm).toBeNull();
		expect((await dienst.loginMitBriefCode(alt, 'ip-fr24')).ergebnis).toBe('falsch');
		expect((await dienst.loginMitBriefCode(neu, 'ip-fr24')).ergebnis).toBe('ok');
	});

	test('FR-26: je Mitglied ein Eintrag «brief-code-ausgestellt» ohne detail', async () => {
		const a = await legeMitgliedAn(db);
		const b = await legeMitgliedAn(db);
		const r = await stelleBriefeAus(db, abh, urheber, [a.mitgliedId, b.mitgliedId], jetzt);
		expect(r.ergebnis).toBe('ok');
		for (const m of [a, b]) {
			const verlauf = await eintraege(m.mitgliedId);
			expect(verlauf).toHaveLength(1);
			expect(verlauf[0]).toMatchObject({
				aktion: 'brief-code-ausgestellt',
				detail: null,
				urheberArt: 'admin',
				urheberMitgliedId: urheber.mitgliedId,
				zeitpunkt: jetzt
			});
		}
	});

	test('A-LOGIN-01: Briefe in der Reihenfolge Nachname, Vorname', async () => {
		const b = await legeMitgliedAn(db, { vorname: 'Bea', nachname: 'Folge' });
		const c = await legeMitgliedAn(db, { vorname: 'Al', nachname: 'Zufolge' });
		const a = await legeMitgliedAn(db, { vorname: 'Ada', nachname: 'Folge' });
		const r = await stelleBriefeAus(
			db,
			abh,
			urheber,
			[c.mitgliedId, b.mitgliedId, a.mitgliedId],
			jetzt
		);
		if (r.ergebnis !== 'ok') throw new Error('Ausstellen nicht möglich');
		expect(r.briefe.map((x) => x.name)).toEqual(['Ada Folge', 'Bea Folge', 'Al Zufolge']);
		expect(new Set(r.briefe.map(codeAus)).size).toBe(3);
	});

	describe('A-LOGIN-01: alles oder nichts', () => {
		async function pruefeNichts(unmoeglich: () => Promise<number>) {
			const aktiv = await legeMitgliedAn(db);
			const id = await unmoeglich();
			const r = await stelleBriefeAus(db, abh, urheber, [aktiv.mitgliedId, id], jetzt);
			expect(r).toEqual({ ergebnis: 'nicht-moeglich', anzahl: 1 });
			expect((await holeKonto(aktiv.kontoId)).briefCodeHash).toBeNull();
			expect(await eintraege(aktiv.mitgliedId)).toHaveLength(0);
		}

		test('ausgetreten', () =>
			pruefeNichts(async () => (await legeMitgliedAn(db, { status: 'ausgetreten' })).mitgliedId));

		test('gesperrt', () =>
			pruefeNichts(async () => (await legeMitgliedAn(db, { gesperrt: true })).mitgliedId));

		test('Adresse fehlt', () =>
			pruefeNichts(async () => {
				const m = await legeMitgliedAn(db);
				await db.update(mitglied).set({ ort: ' ' }).where(eq(mitglied.id, m.mitgliedId));
				return m.mitgliedId;
			}));

		test('unbekannte ID', () => pruefeNichts(async () => 2_000_000_000));

		test('zählt alle unmöglichen IDs', async () => {
			const aktiv = await legeMitgliedAn(db);
			const gesperrt = await legeMitgliedAn(db, { gesperrt: true });
			const r = await stelleBriefeAus(
				db,
				abh,
				urheber,
				[aktiv.mitgliedId, gesperrt.mitgliedId, 2_000_000_001],
				jetzt
			);
			expect(r).toEqual({ ergebnis: 'nicht-moeglich', anzahl: 2 });
		});
	});
});
