import { createHash, randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import type { PoolClient } from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import {
	legeEigeneDatenbankAn,
	type EigeneDatenbank
} from '../../../../tests/hilfen/eigene-datenbank.ts';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { ladeAnlassAdmin } from '../anlass/anlaesse.ts';
import { ladeCmAnsicht } from '../cm/anmeldungen.ts';
import { ladeGespraech } from '../gespraech/gespraech.ts';
import type { Db } from '../db/index.ts';
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
	gespraech,
	mitteilung,
	nachricht,
	partnerAnfrage,
	passkey,
	pushAbo,
	sitzung,
	turnier
} from '../db/schema.ts';
import { erstelleSitzung } from '../login/sitzung.ts';
import { ladeVerlauf as ladeMitteilungsverlauf } from '../mitteilung/verlauf.ts';
import { raeumeAuf, type Loeschlauf } from './loeschung.ts';
import { utcZuZuerich } from '../../anlass/zeit.ts';
import type { MitgliedStatus } from './mitglieder.ts';
import { loeschtAm } from './mitgliedschaft.ts';
import { ladeVerlauf, schreibeVerlauf } from './verlauf.ts';

// Der Löschlauf wirkt auf die ganze Datenbank: darum eine eigene statt der gemeinsamen.
let eigene: EigeneDatenbank | undefined;
let db: Db;

beforeAll(async () => {
	eigene = await legeEigeneDatenbankAn('loeschung');
	db = eigene.db;
});

afterAll(async () => {
	await eigene?.abbauen();
});

beforeEach(async () => {
	await db.execute(
		sql`truncate ${mitglied}, ${anlass}, ${mitteilung}, ${turnier} restart identity cascade`
	);
	vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

const TAG = 24 * 60 * 60 * 1000;
const hash = (kennung: string) => createHash('sha256').update(kennung).digest('hex');
const NACHNAME = 'Loeschkandidat';
const UEBERSPRUNGEN = { lief: false, konten: [], verlauf: 0, antworten: 0, gespraeche: 0 };

/** Ausgetretenes Mitglied mit allen Angaben, Login, Rollen, Passkey und Push-Abo. */
async function ausgetreten(austrittAm: Date) {
	const m = await legeMitgliedAn(db, { nachname: NACHNAME, vorname: 'Erika', rollen: ['cm'] });
	await db
		.update(mitglied)
		.set({
			status: 'ausgetreten',
			austrittAm,
			mitgliedernummer: `T-${m.mitgliedId}`,
			rufname: 'Hannes',
			telefon: '079 000 00 00',
			geschlecht: 'w',
			jahrgang: 1980,
			klassierung: 'R5',
			lizenznummer: '000000',
			fairgateOffenSeit: austrittAm
		})
		.where(eq(mitglied.id, m.mitgliedId));
	const kennung = await erstelleSitzung(db, m.kontoId, austrittAm);
	await db.insert(pushAbo).values({
		endpunkt: `https://push.example.org/${randomUUID()}`,
		sitzungHash: hash(kennung),
		kontoId: m.kontoId,
		p256dh: 'p',
		auth: 'a',
		eingerichtetAm: austrittAm
	});
	await db.insert(passkey).values({
		kennung: randomUUID(),
		kontoId: m.kontoId,
		oeffentlicherSchluessel: 'schluessel',
		rpId: 'mytco.example.org',
		geraet: 'iPhone',
		eingerichtetAm: austrittAm
	});
	return m;
}

/** Zum Löschen vorgemerktes Mitglied; vorher ausgetreten, damit auch `austrittAm` gesetzt ist. */
async function vorgemerkt(vorgemerktAm: Date) {
	const m = await ausgetreten(new Date(vorgemerktAm.getTime() - 30 * TAG));
	await db
		.update(mitglied)
		.set({ status: 'vorgemerkt', vorgemerktAm, statusVorher: 'ausgetreten' })
		.where(eq(mitglied.id, m.mitgliedId));
	return m;
}

const zeile = async (id: number) =>
	(await db.select().from(mitglied).where(eq(mitglied.id, id)))[0];

const frist = async (id: number) => {
	const z = await zeile(id);
	const ende = loeschtAm({
		status: z.status as MitgliedStatus,
		austrittAm: z.austrittAm,
		vorgemerktAm: z.vorgemerktAm
	});
	if (ende === null) throw new Error('keine Frist');
	return ende;
};

const kontoDa = async (kontoId: number) =>
	(await db.select().from(konto).where(eq(konto.id, kontoId))).length === 1;

async function anlassAm(beginn: Date, erstelltVon: number | null = null) {
	const [a] = await db
		.insert(anlass)
		.values({
			titel: 'Saisonstart',
			beginn,
			ort: 'Clubhaus',
			anmeldeschluss: beginn,
			kalenderKennung: randomUUID(),
			erstelltVon
		})
		.returning({ id: anlass.id });
	return a.id;
}

const antworte = (anlassId: number, mitgliedId: number, jetzt: Date) =>
	db.insert(anlassAnmeldung).values({ anlassId, mitgliedId, antwort: 'kommt', geaendertAm: jetzt });

/** Erwartung an die Zeile eines gelöschten Mitglieds: jede Spalte ausser den vier ist leer. */
function nurName(z: Record<string, unknown>, id: number) {
	const erwartet: Record<string, unknown> = {};
	for (const spalte of Object.keys(z)) erwartet[spalte] = null;
	return { ...erwartet, id, vorname: 'Erika', nachname: NACHNAME, status: 'geloescht' };
}

describe('Konto löschen', () => {
	test('fällige Frist: nur Name und Status bleiben, Konto mit allem weg, CM-Anmeldung bleibt', async () => {
		const austritt = new Date('2026-11-07T08:00:00Z');
		const m = await ausgetreten(austritt);
		const partner = await legeMitgliedAn(db);
		// Eigener Verlauf und Antwort zu einem kürzlich vergangenen Anlass.
		await schreibeVerlauf(
			db,
			m.mitgliedId,
			{ art: 'automatisch' },
			[{ aktion: 'angelegt' }],
			austritt
		);
		const vergangen = await anlassAm(new Date(austritt.getTime() - 10 * TAG));
		await antworte(vergangen, m.mitgliedId, austritt);
		// CM-Anmeldungen mit Wildcard-Begründung: Einzel allein, Doppel mit Partner.
		const [t] = await db
			.insert(turnier)
			.values({
				jahr: 2026,
				name: 'Clubmeisterschaft',
				anmeldeschluss: '2026-06-30',
				status: 'geschlossen'
			})
			.returning({ id: turnier.id });
		const [einzel] = await db
			.insert(kategorie)
			.values({
				turnierId: t.id,
				name: 'Damen A',
				geschlecht: 'damen',
				art: 'einzel',
				klassierungVon: 'R1',
				klassierungBis: 'R9'
			})
			.returning({ id: kategorie.id });
		const [doppel] = await db
			.insert(kategorie)
			.values({
				turnierId: t.id,
				name: 'Mixed',
				geschlecht: 'mixed',
				art: 'doppel',
				mindestsumme: 10
			})
			.returning({ id: kategorie.id });
		const melde = async (kategorieId: number, spieler: number[]) => {
			const [x] = await db
				.insert(anmeldung)
				.values({
					kategorieId,
					status: 'beantragt',
					kommentar: 'Wildcard wegen Verletzung',
					angemeldetAm: austritt,
					geaendertAm: austritt
				})
				.returning({ id: anmeldung.id });
			await db
				.insert(anmeldungSpieler)
				.values(spieler.map((mitgliedId) => ({ anmeldungId: x.id, mitgliedId })));
			return x.id;
		};
		const a = await melde(einzel.id, [m.mitgliedId]);
		const d = await melde(doppel.id, [m.mitgliedId, partner.mitgliedId]);
		const jetzt = await frist(m.mitgliedId);

		const ergebnis = await raeumeAuf(db, jetzt);

		expect(ergebnis).toEqual({
			lief: true,
			konten: [m.mitgliedId],
			verlauf: 1,
			antworten: 1,
			gespraeche: 0
		});
		const z = await zeile(m.mitgliedId);
		expect(z).toEqual(nurName(z, m.mitgliedId));
		expect(await kontoDa(m.kontoId)).toBe(false);
		expect(await db.select().from(sitzung).where(eq(sitzung.kontoId, m.kontoId))).toHaveLength(0);
		expect(await db.select().from(passkey).where(eq(passkey.kontoId, m.kontoId))).toHaveLength(0);
		expect(
			await db.select().from(kontoRolle).where(eq(kontoRolle.kontoId, m.kontoId))
		).toHaveLength(0);
		expect(await db.select().from(pushAbo).where(eq(pushAbo.kontoId, m.kontoId))).toHaveLength(0);
		expect(
			await db.select().from(anlassAnmeldung).where(eq(anlassAnmeldung.mitgliedId, m.mitgliedId))
		).toHaveLength(0);
		expect(
			await db.select().from(aenderung).where(eq(aenderung.mitgliedId, m.mitgliedId))
		).toHaveLength(0);
		expect(await db.select().from(anlass).where(eq(anlass.id, vergangen))).toHaveLength(1);
		// Von den Anmeldungen bleibt nur der Name: Kommentare sind weg, auch beim Paar.
		const [einzelBleibt] = await db.select().from(anmeldung).where(eq(anmeldung.id, a));
		expect(einzelBleibt).toMatchObject({ status: 'beantragt', kommentar: null });
		const [doppelBleibt] = await db.select().from(anmeldung).where(eq(anmeldung.id, d));
		expect(doppelBleibt).toMatchObject({ status: 'beantragt', kommentar: null });
		expect(
			await db.select().from(anmeldungSpieler).where(eq(anmeldungSpieler.anmeldungId, a))
		).toHaveLength(1);
		expect(
			await db.select().from(anmeldungSpieler).where(eq(anmeldungSpieler.anmeldungId, d))
		).toHaveLength(2);
		// Der Partner bleibt unberührt.
		expect((await zeile(partner.mitgliedId)).status).toBe('aktiv');
		expect(await kontoDa(partner.kontoId)).toBe(true);
	});

	test('FR-04, FR-49: Suchtext und Anfragen der Gelöschten weg, die CM-Seite nennt sie nicht mehr', async () => {
		const austritt = new Date('2026-11-07T08:00:00Z');
		const m = await ausgetreten(austritt);
		const dritter = await legeMitgliedAn(db);
		await db
			.update(mitglied)
			.set({ geschlecht: 'w', jahrgang: 1985, klassierung: 'R6' })
			.where(eq(mitglied.id, dritter.mitgliedId));
		// Nach dem Anmeldeschluss bleibt die Anmeldung beim Austritt stehen (der CM-Admin entscheidet).
		const [t] = await db
			.insert(turnier)
			.values({
				jahr: 2026,
				name: 'Clubmeisterschaft',
				anmeldeschluss: '2026-06-30',
				status: 'geschlossen'
			})
			.returning({ id: turnier.id });
		const [doppel] = await db
			.insert(kategorie)
			.values({
				turnierId: t.id,
				name: 'Damen Doppel',
				geschlecht: 'damen',
				art: 'doppel',
				mindestsumme: 9
			})
			.returning({ id: kategorie.id });
		const [sucht] = await db
			.insert(anmeldung)
			.values({
				kategorieId: doppel.id,
				status: 'bestaetigt',
				suchtext: 'Suche jemanden für abends',
				angemeldetAm: austritt,
				geaendertAm: austritt
			})
			.returning({ id: anmeldung.id });
		await db.insert(anmeldungSpieler).values({ anmeldungId: sucht.id, mitgliedId: m.mitgliedId });
		// Offene Anfragen in beide Richtungen: Sie dürfen die Löschung nicht aufhalten.
		await db.insert(partnerAnfrage).values([
			{
				kategorieId: doppel.id,
				vonId: m.mitgliedId,
				anId: dritter.mitgliedId,
				gestelltAm: austritt
			},
			{
				kategorieId: doppel.id,
				vonId: dritter.mitgliedId,
				anId: m.mitgliedId,
				gestelltAm: austritt
			}
		]);

		const ergebnis = await raeumeAuf(db, await frist(m.mitgliedId));

		expect(ergebnis.konten).toEqual([m.mitgliedId]);
		const [bleibt] = await db.select().from(anmeldung).where(eq(anmeldung.id, sucht.id));
		expect(bleibt).toMatchObject({ status: 'bestaetigt', suchtext: null, kommentar: null });
		expect(await db.select().from(partnerAnfrage)).toEqual([]);
		const a = (await ladeCmAnsicht(db, t.id, dritter.mitgliedId, austritt))!;
		const d = a.kategorien.find((k) => k.id === doppel.id)!;
		expect(a.anfragen).toEqual([]);
		expect(d.meineAnfragen).toEqual([]);
		// Der Name bleibt wie bei jeder Anmeldung eines vergangenen Turniers, ohne Kommentar.
		expect(d.suchende).toEqual([
			{ name: { rufname: null, vorname: 'Erika', nachname: NACHNAME }, kommentar: null }
		]);
	});

	test('Review-Fokus 4: Urheber, Ersteller und Absender geleert, Ladeseiten laden weiter', async () => {
		const austritt = new Date('2026-11-07T08:00:00Z');
		const m = await ausgetreten(austritt);
		const anderer = await legeMitgliedAn(db, { nachname: 'Bleibt', vorname: 'Beat' });
		const jetzt = await frist(m.mitgliedId);
		await schreibeVerlauf(
			db,
			anderer.mitgliedId,
			{ art: 'admin', mitgliedId: m.mitgliedId },
			[{ aktion: 'feld-geaendert', detail: 'telefon' }],
			new Date(jetzt.getTime() - TAG)
		);
		const anlassId = await anlassAm(new Date(jetzt.getTime() + 10 * TAG), m.mitgliedId);
		await antworte(anlassId, anderer.mitgliedId, jetzt);
		const gesendet = new Date(jetzt.getTime() - TAG);
		await db.insert(mitteilung).values({
			bezug: 'anlass',
			anlassId,
			absenderId: m.mitgliedId,
			gesendetAm: gesendet,
			titel: 'Erinnerung',
			text: 'Bis bald',
			auswahl: 'alle',
			weg: 'push'
		});

		expect((await raeumeAuf(db, jetzt)).konten).toEqual([m.mitgliedId]);

		const verlaufAnderer = await db
			.select({ urheber: aenderung.urheberMitgliedId })
			.from(aenderung)
			.where(eq(aenderung.mitgliedId, anderer.mitgliedId));
		expect(verlaufAnderer).toEqual([{ urheber: null }]);
		const verlauf = await ladeVerlauf(db, { mitgliedId: anderer.mitgliedId, grenze: 10 });
		expect(verlauf.map((v) => v.urheber)).toEqual(['gelöschtes Konto']);
		expect(
			(await db.select().from(anlass).where(eq(anlass.id, anlassId)))[0].erstelltVon
		).toBeNull();
		expect((await db.select().from(mitteilung))[0].absenderId).toBeNull();

		const anlassSeite = await ladeAnlassAdmin(db, anlassId);
		expect(anlassSeite).not.toBeNull();
		expect(anlassSeite?.anmeldungen.map((a) => a.name)).toEqual([
			{ rufname: null, vorname: 'Beat', nachname: 'Bleibt' }
		]);
		expect(JSON.stringify(anlassSeite)).not.toContain(NACHNAME);
		const mitteilungen = await ladeMitteilungsverlauf(db, { art: 'anlass', anlassId }, jetzt);
		expect(mitteilungen).toHaveLength(1);
		expect(mitteilungen[0].absender).toBeNull();
		expect(JSON.stringify(mitteilungen)).not.toContain(NACHNAME);
		expect(JSON.stringify(verlauf)).not.toContain(NACHNAME);
	});

	test('aktive, gelöschte und nicht fällige Mitglieder bleiben unberührt', async () => {
		const jetzt = new Date('2027-11-07T08:00:00Z');
		const aktiv = await legeMitgliedAn(db);
		const nichtFaellig = await ausgetreten(new Date('2027-01-01T00:00:00Z'));
		const vorher = {
			aktiv: await zeile(aktiv.mitgliedId),
			nf: await zeile(nichtFaellig.mitgliedId)
		};

		expect(await raeumeAuf(db, jetzt)).toEqual({
			lief: true,
			konten: [],
			verlauf: 0,
			antworten: 0,
			gespraeche: 0
		});

		expect(await zeile(aktiv.mitgliedId)).toEqual(vorher.aktiv);
		expect(await zeile(nichtFaellig.mitgliedId)).toEqual(vorher.nf);
		expect(await kontoDa(nichtFaellig.kontoId)).toBe(true);
	});
});

describe('Review-Fokus 3: Grenze der Frist', () => {
	const grenze = async (m: { mitgliedId: number; kontoId: number }) => {
		const ende = await frist(m.mitgliedId);

		expect((await raeumeAuf(db, new Date(ende.getTime() - 1))).konten).toEqual([]);
		expect((await zeile(m.mitgliedId)).status).not.toBe('geloescht');
		expect(await kontoDa(m.kontoId)).toBe(true);

		expect((await raeumeAuf(db, ende)).konten).toEqual([m.mitgliedId]);
		expect((await zeile(m.mitgliedId)).status).toBe('geloescht');
		expect(await kontoDa(m.kontoId)).toBe(false);
		return ende;
	};

	test('Austritt: loeschtAm − 1 ms nichts, loeschtAm gelöscht', async () => {
		const ende = await grenze(await ausgetreten(new Date('2026-11-07T08:00:00Z')));
		expect(ende).toEqual(new Date('2027-11-07T08:00:00Z'));
	});

	test('Austritt 29.3.2026 00:30 (Winterzeit): Jahrestag 29.3.2027 00:30 Sommerzeit', async () => {
		const ende = await grenze(await ausgetreten(new Date('2026-03-28T23:30:00Z')));
		expect(ende).toEqual(new Date('2027-03-28T22:30:00Z'));
		expect(utcZuZuerich(ende)).toBe('2027-03-29T00:30');
	});

	test('Austritt 31.10.2027 00:30 (Sommerzeit): Jahrestag 31.10.2028 00:30 Winterzeit', async () => {
		const ende = await grenze(await ausgetreten(new Date('2027-10-30T22:30:00Z')));
		expect(ende).toEqual(new Date('2028-10-30T23:30:00Z'));
		expect(utcZuZuerich(ende)).toBe('2028-10-31T00:30');
	});

	test('Bedenkzeit: loeschtAm − 1 ms nichts, loeschtAm gelöscht, auch über die Sommerzeit', async () => {
		const ende = await grenze(await vorgemerkt(new Date('2026-03-25T23:30:00Z')));
		expect(ende).toEqual(new Date('2026-04-01T22:30:00Z'));
		expect(utcZuZuerich(ende)).toBe('2026-04-02T00:30');
	});

	test('vorgemerkt: nach 6 Tagen nicht, nach 7 Tagen gelöscht', async () => {
		const vorgemerktAm = new Date('2026-11-07T08:00:00Z');
		const m = await vorgemerkt(vorgemerktAm);

		expect((await raeumeAuf(db, new Date(vorgemerktAm.getTime() + 6 * TAG))).konten).toEqual([]);
		expect((await zeile(m.mitgliedId)).status).toBe('vorgemerkt');

		expect((await raeumeAuf(db, new Date(vorgemerktAm.getTime() + 7 * TAG))).konten).toEqual([
			m.mitgliedId
		]);
		const z = await zeile(m.mitgliedId);
		expect(z).toEqual(nurName(z, m.mitgliedId));
	});
});

describe('Fristen für Verlauf und Anlass-Antworten', () => {
	const jetzt = new Date('2027-11-07T08:00:00Z');
	const vorEinemJahr = new Date('2026-11-07T08:00:00Z');

	test('Verlauf: älter als 12 Monate weg, genau 12 Monate und gestern bleiben', async () => {
		const m = await legeMitgliedAn(db);
		const eintrag = (zeitpunkt: Date, detail: string) =>
			schreibeVerlauf(
				db,
				m.mitgliedId,
				{ art: 'automatisch' },
				[{ aktion: 'feld-geaendert', detail }],
				zeitpunkt
			);
		await eintrag(new Date(vorEinemJahr.getTime() - 1), 'alt');
		await eintrag(vorEinemJahr, 'grenze');
		await eintrag(new Date(jetzt.getTime() - TAG), 'gestern');

		expect(await raeumeAuf(db, jetzt)).toEqual({
			lief: true,
			konten: [],
			verlauf: 1,
			antworten: 0,
			gespraeche: 0
		});

		const bleibt = await db
			.select({ detail: aenderung.detail })
			.from(aenderung)
			.orderBy(aenderung.zeitpunkt);
		expect(bleibt).toEqual([{ detail: 'grenze' }, { detail: 'gestern' }]);
	});

	test('Verlauf am 29.2.2028: Grenze 28.2.2027, nie vor dem Jahrestag gelöscht', async () => {
		const m = await legeMitgliedAn(db);
		const eintrag = (zeitpunkt: string, detail: string) =>
			schreibeVerlauf(
				db,
				m.mitgliedId,
				{ art: 'automatisch' },
				[{ aktion: 'feld-geaendert', detail }],
				new Date(zeitpunkt)
			);
		await eintrag('2027-02-28T07:59:59.999Z', 'alt');
		await eintrag('2027-02-28T08:00:00Z', 'grenze');
		// Jahrestag erst am 1.3.2028: bleibt.
		await eintrag('2027-03-01T07:00:00Z', 'maerz');

		expect((await raeumeAuf(db, new Date('2028-02-29T08:00:00Z'))).verlauf).toBe(1);

		const bleibt = await db
			.select({ detail: aenderung.detail })
			.from(aenderung)
			.orderBy(aenderung.zeitpunkt);
		expect(bleibt).toEqual([{ detail: 'grenze' }, { detail: 'maerz' }]);
	});

	test('Antworten: Anlass vor mehr als einem Jahr → Antworten weg, Anlass bleibt; jünger bleibt', async () => {
		const m = await legeMitgliedAn(db);
		const alt = await anlassAm(new Date(vorEinemJahr.getTime() - 1));
		const genau = await anlassAm(vorEinemJahr);
		const juenger = await anlassAm(new Date(jetzt.getTime() - 30 * TAG));
		for (const id of [alt, genau, juenger]) await antworte(id, m.mitgliedId, vorEinemJahr);

		expect(await raeumeAuf(db, jetzt)).toEqual({
			lief: true,
			konten: [],
			verlauf: 0,
			antworten: 1,
			gespraeche: 0
		});

		const bleibt = await db
			.select({ anlassId: anlassAnmeldung.anlassId })
			.from(anlassAnmeldung)
			.orderBy(anlassAnmeldung.anlassId);
		expect(bleibt).toEqual([{ anlassId: genau }, { anlassId: juenger }]);
		expect(await db.select().from(anlass)).toHaveLength(3);
	});
});

type Halter = PoolClient;

/** Eigene Verbindung mit offener Transaktion; am Ende zurückgerollt und verworfen (keine Sperre bleibt). */
async function mitHalter(fn: (h: Halter) => Promise<void>): Promise<void> {
	const h = await db.$client.connect();
	try {
		await h.query('begin');
		await fn(h);
	} finally {
		await h.query('rollback').catch(() => {});
		h.release(true);
	}
}

/** Wartet, bis eine andere Verbindung auf eine Sperre des Halters wartet. */
async function wartetAuf(h: Halter): Promise<void> {
	const [{ pid }] = (await h.query<{ pid: number }>('select pg_backend_pid() as pid')).rows;
	for (let i = 0; ; i++) {
		const r = await db.execute<{ n: number }>(
			sql`select count(*)::int as n from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid() and ${pid}::int = any(pg_blocking_pids(pid))`
		);
		if (r.rows[0].n > 0) return;
		if (i > 200) throw new Error('niemand wartet auf die Sperre');
		await new Promise((weiter) => setTimeout(weiter, 10));
	}
}

describe('Review-Fokus 2: zwei Läufe', () => {
	test('hält ein anderer Lauf die Sperre: lief false, nichts geändert, kein Log', async () => {
		const m = await ausgetreten(new Date('2026-11-07T08:00:00Z'));
		const jetzt = await frist(m.mitgliedId);
		const vorher = await zeile(m.mitgliedId);
		await mitHalter(async (h) => {
			await h.query('select pg_advisory_xact_lock(4302)');

			expect(await raeumeAuf(db, jetzt)).toEqual(UEBERSPRUNGEN);
		});
		expect(await zeile(m.mitgliedId)).toEqual(vorher);
		expect(console.info).not.toHaveBeenCalled();
	});

	test('gleichzeitig: genau einer mit lief true, der zweite überspringt; danach findet ein Lauf nichts', async () => {
		const a = await ausgetreten(new Date('2026-11-07T08:00:00Z'));
		const b = await vorgemerkt(new Date('2027-10-01T08:00:00Z'));
		const jetzt = new Date('2027-11-07T08:00:00Z');
		let erster: Promise<Loeschlauf> | undefined;

		// Lauf 1 hält die Sperre 4302 und hängt an der Zeile von a; Lauf 2 kommt in dieser Zeit.
		await mitHalter(async (h) => {
			await h.query('select id from mitglied where id = $1 for update', [a.mitgliedId]);
			erster = raeumeAuf(db, jetzt);
			await wartetAuf(h);

			expect(await raeumeAuf(db, jetzt)).toEqual(UEBERSPRUNGEN);
		});

		expect(await erster).toEqual({
			lief: true,
			konten: [a.mitgliedId, b.mitgliedId],
			verlauf: 0,
			antworten: 0,
			gespraeche: 0
		});
		for (const m of [a, b]) {
			const z = await zeile(m.mitgliedId);
			expect(z).toEqual(nurName(z, m.mitgliedId));
		}
		expect(await raeumeAuf(db, jetzt)).toEqual({
			lief: true,
			konten: [],
			verlauf: 0,
			antworten: 0,
			gespraeche: 0
		});
	});

	test('Rücknahme während des Laufs: nach dem Sperren der Zeile neu geprüft, nichts gelöscht', async () => {
		// Vorgemerkt aus «ausgetreten» mit jungem Austritt: nach der Rücknahme ist nichts fällig.
		const vorgemerktAm = new Date('2027-11-01T08:00:00Z');
		const m = await vorgemerkt(vorgemerktAm);
		const jetzt = await frist(m.mitgliedId);
		await mitHalter(async (h) => {
			await h.query('select id from mitglied where id = $1 for update', [m.mitgliedId]);
			const lauf = raeumeAuf(db, jetzt);
			await wartetAuf(h);
			await h.query(
				`update mitglied set status = 'ausgetreten', vorgemerkt_am = null, status_vorher = null where id = $1`,
				[m.mitgliedId]
			);
			await h.query('commit');

			expect(await lauf).toEqual({
				lief: true,
				konten: [],
				verlauf: 0,
				antworten: 0,
				gespraeche: 0
			});
		});
		const z = await zeile(m.mitgliedId);
		expect(z.status).toBe('ausgetreten');
		expect(await kontoDa(m.kontoId)).toBe(true);
	});
});

describe('Log (SI-05)', () => {
	test('genau ein Eintrag mit Anzahl und Mitglied-ID, ohne Namen und Adressen', async () => {
		const m = await ausgetreten(new Date('2026-11-07T08:00:00Z'));
		await schreibeVerlauf(
			db,
			m.mitgliedId,
			{ art: 'automatisch' },
			[{ aktion: 'angelegt' }],
			new Date('2026-11-07T08:00:00Z')
		);
		const jetzt = await frist(m.mitgliedId);

		await raeumeAuf(db, jetzt);

		expect(console.info).toHaveBeenCalledTimes(1);
		expect(console.info).toHaveBeenCalledWith('Löschlauf', {
			konten: [m.mitgliedId],
			verlauf: 1,
			antworten: 0,
			gespraeche: 0
		});
		const text = JSON.stringify(vi.mocked(console.info).mock.calls);
		expect(text).not.toContain(NACHNAME);
		expect(text).not.toContain(m.email);
	});
});

describe('Gespräche löschen (FR-54)', () => {
	async function gespraechIn(jahr: number, mitgliedId: number, adminId: number | null = null) {
		const [t] = await db
			.insert(turnier)
			.values({
				jahr,
				name: `Turnier ${jahr}`,
				anmeldeschluss: `${jahr}-06-30`,
				status: 'geschlossen'
			})
			.returning({ id: turnier.id });
		const gesendetAm = new Date(`${jahr}-05-01T10:00:00Z`);
		const [g] = await db
			.insert(gespraech)
			.values({ turnierId: t.id, mitgliedId, letzteAm: gesendetAm })
			.returning({ id: gespraech.id });
		await db.insert(nachricht).values([
			{ gespraechId: g.id, von: 'mitglied', text: 'Frage', gesendetAm },
			{ gespraechId: g.id, von: 'leitung', adminMitgliedId: adminId, text: 'Antwort', gesendetAm }
		]);
		return g.id;
	}
	const anzahl = async (id: number) => ({
		g: (await db.select().from(gespraech).where(eq(gespraech.id, id))).length,
		n: (await db.select().from(nachricht).where(eq(nachricht.gespraechId, id))).length
	});

	test('FR-54: nach dem Turnierjahr (Zürich) weg, davor nicht', async () => {
		const m = await legeMitgliedAn(db, { nachname: 'Fragerin', vorname: 'Vera' });
		const id = await gespraechIn(2027, m.mitgliedId);

		const vorher = await raeumeAuf(db, new Date('2027-12-31T22:30:00Z'));
		expect(vorher.gespraeche).toBe(0);
		expect(await anzahl(id)).toEqual({ g: 1, n: 2 });

		const nachher = await raeumeAuf(db, new Date('2027-12-31T23:30:00Z'));
		expect(nachher.gespraeche).toBe(1);
		expect(await anzahl(id)).toEqual({ g: 0, n: 0 });
		expect(console.info).toHaveBeenLastCalledWith('Löschlauf', {
			konten: [],
			verlauf: 0,
			antworten: 0,
			gespraeche: 1
		});
	});

	test('FR-54: endgültige Löschung entfernt das Gespräch des Mitglieds, Vormerken nicht', async () => {
		const m = await vorgemerkt(new Date('2027-03-01T08:00:00Z'));
		const id = await gespraechIn(2027, m.mitgliedId);

		const davor = await raeumeAuf(db, new Date('2027-03-02T08:00:00Z'));
		expect(davor.gespraeche).toBe(0);
		expect(await anzahl(id)).toEqual({ g: 1, n: 2 });

		const lauf = await raeumeAuf(db, await frist(m.mitgliedId));
		expect(lauf.konten).toEqual([m.mitgliedId]);
		expect(lauf.gespraeche).toBe(1);
		expect(await anzahl(id)).toEqual({ g: 0, n: 0 });
	});

	test('FR-54: Löschung eines antwortenden Admins leert den Verweis, Antwort bleibt', async () => {
		const admin = await ausgetreten(new Date('2027-01-01T08:00:00Z'));
		const fragerin = await legeMitgliedAn(db, { nachname: 'Fragerin', vorname: 'Vera' });
		const id = await gespraechIn(2040, fragerin.mitgliedId, admin.mitgliedId);

		await raeumeAuf(db, await frist(admin.mitgliedId));

		const antwort = (await db.select().from(nachricht).where(eq(nachricht.gespraechId, id))).find(
			(n) => n.von === 'leitung'
		);
		expect(antwort?.adminMitgliedId).toBeNull();
		const geladen = await ladeGespraech(db, id, new Date('2040-06-01T00:00:00Z'));
		expect(geladen?.nachrichten.find((n) => n.von === 'leitung')?.admin).toBeNull();
	});
});
