import { and, asc, eq, sql } from 'drizzle-orm';
import { afterAll, describe, expect, test } from 'vitest';
import { legeMitgliedAn } from '../../../../tests/hilfen/mitglieder.ts';
import { erstelleDb, type DbOderTx } from '../db/index.ts';
import {
	anmeldung,
	anmeldungSpieler,
	kategorie,
	konto,
	mitglied,
	partnerAnfrage
} from '../db/schema.ts';
import type { KategorieWerte } from '../turnier/angaben.ts';
import { legeKategorieAn, legeTurnierAn, setzeStatus } from '../turnier/turniere.ts';
import { eigeneAnmeldungen, eigeneKategorien, meldeAb, meldeAn } from './anmeldungen.ts';
import {
	lehneAnfrageAb,
	nimmAnfrageAn,
	setzeSuchtext,
	stelleAnfrage,
	sucheDoppelPartner,
	zieheAnfrageZurueck
} from './doppel.ts';

const db = erstelleDb(process.env.DATABASE_URL!);

afterAll(async () => {
	await db.$client.end();
});

// Die gemeinsame Test-Datenbank hat Turniere anderer Tests: jedes Turnier bekommt ein eigenes Jahr.
const zufallsJahr = () => 3000 + Math.floor(Math.random() * 6000);

async function doppelKategorie() {
	for (;;) {
		const jahr = zufallsJahr();
		const t = await legeTurnierAn(db, {
			jahr,
			name: `Clubmeisterschaft ${jahr}`,
			anmeldeschluss: `${jahr}-05-31`,
			nummern: []
		});
		if (t.ergebnis !== 'ok') continue;
		const k = await legeKategorieAn(db, t.id, {
			name: 'Herren Doppel',
			geschlecht: 'herren',
			art: 'doppel',
			jahrgangVon: null,
			jahrgangBis: null,
			klassierungVon: null,
			klassierungBis: null,
			mindestsumme: 10
		});
		if (k.ergebnis !== 'ok') throw new Error(`Kategorie: ${k.ergebnis}`);
		return k.id;
	}
}

describe('Schema Partner-Anfrage und Suchtext', () => {
	test('FR-48: offene Anfrage je Paar nur einmal', async () => {
		const kategorieId = await doppelKategorie();
		const von = (await legeMitgliedAn(db)).mitgliedId;
		const an = (await legeMitgliedAn(db)).mitgliedId;
		const zeile = { kategorieId, vonId: von, anId: an, gestelltAm: new Date() };

		await db.insert(partnerAnfrage).values(zeile);
		await expect(db.insert(partnerAnfrage).values(zeile)).rejects.toThrow();
		// Die Gegenrichtung ist ein anderes Paar.
		await db.insert(partnerAnfrage).values({ ...zeile, vonId: an, anId: von });
	});

	test('FR-48: eine Anfrage an sich selbst ist nicht möglich', async () => {
		const kategorieId = await doppelKategorie();
		const m = (await legeMitgliedAn(db)).mitgliedId;
		await expect(
			db.insert(partnerAnfrage).values({ kategorieId, vonId: m, anId: m, gestelltAm: new Date() })
		).rejects.toThrow();
	});

	test('FR-47: Suchtext höchstens 120 Zeichen', async () => {
		const kategorieId = await doppelKategorie();
		const jetzt = new Date();
		const neu = (suchtext: string) =>
			db
				.insert(anmeldung)
				.values({ kategorieId, suchtext, angemeldetAm: jetzt, geaendertAm: jetzt })
				.returning({ id: anmeldung.id });

		const [ok] = await neu('a'.repeat(120));
		expect(ok.id).toBeGreaterThan(0);
		await expect(neu('a'.repeat(121))).rejects.toThrow();
		const [zeile] = await db.select().from(anmeldung).where(eq(anmeldung.id, ok.id));
		expect(zeile.suchtext).toHaveLength(120);
	});
});

// Anfang Mai, vor dem Anmeldeschluss am 31. Mai; `spaet` danach.
const jetztIn = (jahr: number) => new Date(`${jahr}-05-01T10:00:00Z`);
const spaetIn = (jahr: number) => new Date(`${jahr}-06-01T10:00:00Z`);

/** Offenes Turnier mit Doppel (Mindestsumme 9) und je drei Einzel für Damen und Herren. */
async function offenesDoppel() {
	for (;;) {
		const jahr = zufallsJahr();
		const t = await legeTurnierAn(db, {
			jahr,
			name: `Clubmeisterschaft ${jahr}`,
			anmeldeschluss: `${jahr}-05-31`,
			nummern: []
		});
		if (t.ergebnis !== 'ok') continue;
		const lege = async (name: string, teil: Partial<KategorieWerte>) => {
			const k = await legeKategorieAn(db, t.id, {
				name,
				geschlecht: 'offen',
				art: 'doppel',
				jahrgangVon: null,
				jahrgangBis: null,
				klassierungVon: null,
				klassierungBis: null,
				mindestsumme: 9,
				...teil
			});
			if (k.ergebnis !== 'ok') throw new Error(`Kategorie ${name}: ${k.ergebnis}`);
			return k.id;
		};
		const einzel: Partial<KategorieWerte> = {
			art: 'einzel',
			klassierungVon: 'N1',
			klassierungBis: 'R9',
			mindestsumme: null
		};
		const mixed = await lege('Mixed Doppel', { geschlecht: 'mixed' });
		const herren = await lege('Herren Doppel', { geschlecht: 'herren' });
		const damen = await lege('Damen Doppel', { geschlecht: 'damen' });
		const damenEinzel = [];
		const herrenEinzel = [];
		for (const n of ['A', 'B', 'C']) {
			damenEinzel.push(await lege(`Damen ${n}`, { ...einzel, geschlecht: 'damen' }));
			herrenEinzel.push(await lege(`Herren ${n}`, { ...einzel, geschlecht: 'herren' }));
		}
		expect(await setzeStatus(db, t.id, 'offen', jetztIn(jahr))).toBe('ok');
		return {
			id: t.id,
			jahr,
			jetzt: jetztIn(jahr),
			spaet: spaetIn(jahr),
			mixed,
			herren,
			damen,
			damenEinzel,
			herrenEinzel
		};
	}
}

type Angaben = Partial<{
	rufname: string | null;
	geschlecht: 'w' | 'm' | null;
	jahrgang: number | null;
	klassierung: string | null;
	login: boolean;
	gesperrt: boolean;
}>;

/** Erfundener Spieler mit Login; ohne Angaben ein Herr, Jahrgang 1990, R5. */
async function spieler(vorname: string, nachname: string, teil: Angaben = {}) {
	const { login = true, gesperrt = false, ...angaben } = teil;
	const m = await legeMitgliedAn(db, { vorname, nachname, gesperrt });
	await db
		.update(mitglied)
		.set({ geschlecht: 'm', jahrgang: 1990, klassierung: 'R5', ...angaben })
		.where(eq(mitglied.id, m.mitgliedId));
	if (login) {
		await db
			.update(konto)
			.set({ briefCodeBenutztAm: new Date('2026-01-05T10:00:00Z') })
			.where(eq(konto.mitgliedId, m.mitgliedId));
	}
	return m.mitgliedId;
}

const lea = (teil: Angaben = {}) =>
	spieler('Lea', 'Marbach', { geschlecht: 'w', klassierung: 'R6', ...teil });
const marco = (teil: Angaben = {}) => spieler('Marco', 'Beispiel', teil);

/** Aktive Anmeldung direkt in der Datenbank, z. B. ein Paar aus der Verwaltung. */
async function anmeldungMit(
	kategorieId: number,
	spielerIds: number[],
	jetzt: Date,
	suchtext: string | null = null
) {
	const [a] = await db
		.insert(anmeldung)
		.values({ kategorieId, suchtext, angemeldetAm: jetzt, geaendertAm: jetzt })
		.returning({ id: anmeldung.id });
	await db
		.insert(anmeldungSpieler)
		.values(spielerIds.map((mitgliedId) => ({ anmeldungId: a.id, mitgliedId })));
	return a.id;
}

/** Anmeldungen einer Kategorie mit Status, Suchtext und Spielern (aufsteigend). */
async function anmeldungenIn(kategorieId: number) {
	const zeilen = await db
		.select({
			id: anmeldung.id,
			status: anmeldung.status,
			suchtext: anmeldung.suchtext,
			mitgliedId: anmeldungSpieler.mitgliedId
		})
		.from(anmeldung)
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.where(eq(anmeldung.kategorieId, kategorieId))
		.orderBy(asc(anmeldung.id), asc(anmeldungSpieler.mitgliedId));
	const nachId = new Map<
		number,
		{ id: number; status: string; suchtext: string | null; spieler: number[] }
	>();
	for (const z of zeilen) {
		const a = nachId.get(z.id) ?? { id: z.id, status: z.status, suchtext: z.suchtext, spieler: [] };
		a.spieler.push(z.mitgliedId);
		nachId.set(z.id, a);
	}
	return [...nachId.values()];
}

const aktiveIn = async (kategorieId: number) =>
	(await anmeldungenIn(kategorieId)).filter((a) => a.status === 'bestaetigt');

async function anfragenIn(kategorieId: number) {
	return db
		.select({ id: partnerAnfrage.id, vonId: partnerAnfrage.vonId, anId: partnerAnfrage.anId })
		.from(partnerAnfrage)
		.where(eq(partnerAnfrage.kategorieId, kategorieId))
		.orderBy(asc(partnerAnfrage.id));
}

async function anfrage(kategorieId: number, vonId: number, anId: number, jetzt: Date) {
	expect(await stelleAnfrage(db, kategorieId, vonId, anId, jetzt)).toBe('ok');
	const [a] = await db
		.select({ id: partnerAnfrage.id })
		.from(partnerAnfrage)
		.where(
			and(
				eq(partnerAnfrage.kategorieId, kategorieId),
				eq(partnerAnfrage.vonId, vonId),
				eq(partnerAnfrage.anId, anId)
			)
		);
	return a.id;
}

/** Wartet (höchstens 3 s), bis `n` Verbindungen dieser Datenbank auf eine Sperre warten. */
async function bisWartend(n: number) {
	const ende = Date.now() + 3000;
	while (Date.now() < ende) {
		const { rows } = await db.execute<{ n: number }>(
			sql`select count(*)::int as n from pg_stat_activity
				where datname = current_database() and wait_event_type = 'Lock'`
		);
		if (rows[0].n >= n) return;
		await new Promise((r) => setTimeout(r, 20));
	}
	throw new Error(`nach 3 s warten nicht ${n} Anfragen auf eine Sperre`);
}

/**
 * Startet `beide`, während eine dritte Transaktion mit `halte` Zeilen gesperrt hält, und gibt sie
 * frei, sobald beide auf eine Sperre warten: so überschneiden sich die beiden Anfragen sicher.
 */
async function gleichzeitig<A, B>(
	halte: (tx: DbOderTx) => Promise<unknown>,
	beide: () => [Promise<A>, Promise<B>]
) {
	const laufend = await db.transaction(async (tx) => {
		await halte(tx);
		const alle = Promise.all(beide());
		await bisWartend(2);
		return { alle };
	});
	return laufend.alle;
}

const halteMitglied = (id: number) => (tx: DbOderTx) =>
	tx.select({ id: mitglied.id }).from(mitglied).where(eq(mitglied.id, id)).for('update');

describe('A-ANMELDUNG-04, FR-48, FR-49: Doppel', () => {
	test('FR-49: allein anmelden sucht Partner mit Suchtext; passt-nicht, schon-angemeldet, voll, geschlossen', async () => {
		const t = await offenesDoppel();
		const ich = await lea();
		expect(await meldeAn(db, t.mixed, ich, t.jetzt, 'Suche R5–R7, eher abends')).toBe('ok');
		expect(await anmeldungenIn(t.mixed)).toEqual([
			{
				id: expect.any(Number),
				status: 'bestaetigt',
				suchtext: 'Suche R5–R7, eher abends',
				spieler: [ich]
			}
		]);
		expect(await eigeneKategorien(db, t.id, ich)).toEqual(['Mixed Doppel (sucht Partner)']);

		// Frau im Herren Doppel.
		expect(await meldeAn(db, t.herren, ich, t.jetzt)).toBe('passt-nicht');
		expect(await meldeAn(db, t.mixed, ich, t.jetzt)).toBe('schon-angemeldet');
		expect(await meldeAn(db, t.damenEinzel[0], ich, t.jetzt)).toBe('ok');
		expect(await meldeAn(db, t.damenEinzel[1], ich, t.jetzt)).toBe('ok');
		expect(await meldeAn(db, t.damen, ich, t.jetzt)).toBe('voll');

		// Ohne Suchtext und leer bleibt er leer; nach dem Anmeldeschluss geschlossen.
		const nina = await spieler('Nina', 'Graf', { geschlecht: 'w' });
		expect(await meldeAn(db, t.damen, nina, t.jetzt, '   ')).toBe('ok');
		expect(await anmeldungenIn(t.damen)).toEqual([
			expect.objectContaining({ suchtext: null, spieler: [nina] })
		]);
		const sara = await spieler('Sara', 'Keller', { geschlecht: 'w' });
		expect(await meldeAn(db, t.damen, sara, t.spaet)).toBe('geschlossen');

		// FR-37 gilt für die eigene Anmeldung weiter: ohne Jahrgang keine Anmeldung.
		const ohne = await spieler('Ohne', 'Jahrgang', { jahrgang: null });
		expect(await meldeAn(db, t.herren, ohne, t.jetzt)).toBe('angaben-fehlen');
		// Einzel nimmt keinen Suchtext.
		const paul = await spieler('Paul', 'Sommer');
		expect(await meldeAn(db, t.herrenEinzel[0], paul, t.jetzt, 'Hallo')).toBe('ok');
		expect(await anmeldungenIn(t.herrenEinzel[0])).toEqual([
			expect.objectContaining({ suchtext: null, spieler: [paul] })
		]);
	});

	test('FR-49: Suchtext ändern nur bei der eigenen Anmeldung allein, solange offen', async () => {
		const t = await offenesDoppel();
		const ich = await lea();
		expect(await meldeAn(db, t.mixed, ich, t.jetzt)).toBe('ok');
		const [{ id }] = await anmeldungenIn(t.mixed);
		expect(await setzeSuchtext(db, id, ich, 'Eher am Wochenende', t.jetzt)).toBe('ok');
		expect((await anmeldungenIn(t.mixed))[0].suchtext).toBe('Eher am Wochenende');
		expect(await setzeSuchtext(db, id, ich, '  ', t.jetzt)).toBe('ok');
		expect((await anmeldungenIn(t.mixed))[0].suchtext).toBeNull();

		const fremd = await marco();
		expect(await setzeSuchtext(db, id, fremd, 'Fremd', t.jetzt)).toBe('nicht-gefunden');
		expect(await setzeSuchtext(db, -1, ich, 'Weg', t.jetzt)).toBe('nicht-gefunden');
		expect(await setzeSuchtext(db, id, ich, 'Zu spät', t.spaet)).toBe('geschlossen');

		// Zu zweit gibt es keinen Suchtext mehr.
		const paar = await anmeldungMit(t.herren, [fremd, await spieler('Paul', 'Sommer')], t.jetzt);
		expect(await setzeSuchtext(db, paar, fremd, 'Paar', t.jetzt)).toBe('nicht-gefunden');
	});

	test('A-ANMELDUNG-04: Anmelden und Schliessen gleichzeitig: nie eine Anmeldung nach dem Schliessen', async () => {
		const t = await offenesDoppel();
		const nina = await spieler('Nina', 'Graf', { geschlecht: 'w' });
		// Eine dritte Transaktion hält die Kategorie: die Anmeldung wartet nach dem Mitglied, und
		// erst dann schliesst die Verwaltung (sie braucht nur das Turnier). Die Anmeldung muss danach
		// das geschlossene Turnier sehen, nicht den Stand vom Beginn ihrer Abfrage.
		const laufend = await db.transaction(async (tx) => {
			await tx
				.select({ id: kategorie.id })
				.from(kategorie)
				.where(eq(kategorie.id, t.damen))
				.for('update');
			const an = meldeAn(db, t.damen, nina, t.jetzt);
			await bisWartend(1);
			const zu = setzeStatus(db, t.id, 'geschlossen', t.jetzt);
			const beide = Promise.all([an, zu]);
			await zu;
			return { beide };
		});
		expect(await laufend.beide).toEqual(['geschlossen', 'ok']);
		expect(await anmeldungenIn(t.damen)).toEqual([]);
	});

	test('A-ANMELDUNG-04: Suche zeigt nur passende Partner mit Login, nach Nachname', async () => {
		const t = await offenesDoppel();
		const ich = await lea();
		const marcoId = await marco();
		const mia = await spieler('Mia', 'Mattmann', { geschlecht: 'w' });
		const moritz = await spieler('Moritz', 'Marti', { klassierung: 'R2' });
		const ohneLogin = await spieler('Mathis', 'Ohnelogin', { login: false });
		const gesperrt = await spieler('Matteo', 'Gesperrt', { gesperrt: true });
		const ausgetreten = await spieler('Mats', 'Austritt');
		await db
			.update(mitglied)
			.set({ status: 'ausgetreten', austrittAm: t.jetzt })
			.where(eq(mitglied.id, ausgetreten));
		const gepaart = await spieler('Malik', 'Paar');
		await anmeldungMit(
			t.mixed,
			[gepaart, await spieler('Nora', 'Paar', { geschlecht: 'w' })],
			t.jetzt
		);
		const voll = await spieler('Malte', 'Voll');
		for (const k of t.herrenEinzel) await anmeldungMit(k, [voll], t.jetzt);
		const manuel = await spieler('Manuel', 'Arnold', { klassierung: null });
		const mario = await spieler('Mario', 'Dörig', { geschlecht: null });
		// Sucht schon im Mixed: seine Anmeldung dort zählt bei der Grenze schon mit.
		const max = await spieler('Max', 'Cadonau', { klassierung: 'R7' });
		await anmeldungMit(t.mixed, [max], t.jetzt, 'Eher abends');
		await anmeldungMit(t.herrenEinzel[0], [max], t.jetzt);
		await anmeldungMit(t.herrenEinzel[1], [max], t.jetzt);
		// Nur der Rufname enthält «ma»: die Suche findet ihn trotzdem.
		const reto = await spieler('Reto', 'Huber', { rufname: 'Mattu' });
		const meine = [
			ich,
			marcoId,
			mia,
			moritz,
			ohneLogin,
			gesperrt,
			ausgetreten,
			gepaart,
			voll,
			manuel,
			mario,
			max,
			reto
		];

		const treffer = (await sucheDoppelPartner(db, t.mixed, ich, ' ma ', t.jetzt)).filter((z) =>
			meine.includes(z.mitgliedId)
		);
		const leer = { vermerk: null, suchtPartner: false, kommentar: null, anfrageId: null };
		const name = (vorname: string, nachname: string, rufname: string | null = null) => ({
			rufname,
			vorname,
			nachname
		});
		const marcoName = name('Marco', 'Beispiel');
		expect(treffer).toEqual([
			{
				...leer,
				mitgliedId: manuel,
				name: name('Manuel', 'Arnold'),
				klassierung: null,
				vermerk: 'klassierung-fehlt'
			},
			{ ...leer, mitgliedId: marcoId, name: marcoName, klassierung: 'R5' },
			{
				...leer,
				mitgliedId: max,
				name: name('Max', 'Cadonau'),
				klassierung: 'R7',
				suchtPartner: true,
				kommentar: 'Eher abends'
			},
			{
				...leer,
				mitgliedId: mario,
				name: name('Mario', 'Dörig'),
				klassierung: 'R5',
				vermerk: 'angaben-fehlen'
			},
			// Sortiert wie alle nach Nachname; der Rufname ändert die Reihenfolge nicht.
			{ ...leer, mitgliedId: reto, name: name('Reto', 'Huber', 'Mattu'), klassierung: 'R5' }
		]);
		// «Rufname Nachname» findet ihn auch.
		const rufer = await sucheDoppelPartner(db, t.mixed, ich, 'mattu huber', t.jetzt);
		expect(rufer.map((z) => z.mitgliedId)).toContain(reto);
		expect(await sucheDoppelPartner(db, t.mixed, ich, ' m ', t.jetzt)).toEqual([]);
		// Eine Einzel-Kategorie und eine unbekannte haben keine Partner.
		expect(await sucheDoppelPartner(db, t.damenEinzel[0], ich, 'Marco', t.jetzt)).toEqual([]);
		expect(await sucheDoppelPartner(db, -1, ich, 'Marco', t.jetzt)).toEqual([]);
		// Im Herren Doppel passt Lea selbst nicht.
		expect(await sucheDoppelPartner(db, t.herren, ich, 'Marco', t.jetzt)).toEqual([]);

		// Eine eigene offene Anfrage steht beim Treffer.
		const id = await anfrage(t.mixed, ich, marcoId, t.jetzt);
		// Andere Tests legen auch einen Marco Beispiel an.
		const nachher = await sucheDoppelPartner(db, t.mixed, ich, 'Marco Beispiel', t.jetzt);
		expect(nachher.filter((z) => z.mitgliedId === marcoId)).toEqual([
			{ ...leer, mitgliedId: marcoId, name: marcoName, klassierung: 'R5', anfrageId: id }
		]);
	});

	test('FR-48: nach dem Anmeldeschluss findet die Suche niemanden mehr', async () => {
		const t = await offenesDoppel();
		const ich = await lea();
		const marcoId = await marco();
		const vorher = await sucheDoppelPartner(db, t.mixed, ich, 'Marco Beispiel', t.jetzt);
		expect(vorher.map((z) => z.mitgliedId)).toContain(marcoId);
		// Keine Wahl mehr möglich: keine Namen, Klassierungen oder Kommentare.
		expect(await sucheDoppelPartner(db, t.mixed, ich, 'Marco Beispiel', t.spaet)).toEqual([]);
		// Von Hand früher geschlossen wirkt gleich.
		expect(await setzeStatus(db, t.id, 'geschlossen', t.jetzt)).toBe('ok');
		expect(await sucheDoppelPartner(db, t.mixed, ich, 'Marco Beispiel', t.jetzt)).toEqual([]);
	});

	test('A-ANMELDUNG-04: Suche zeigt höchstens 20 Treffer', async () => {
		const t = await offenesDoppel();
		const ich = await lea();
		const zeichen = 'abcdefghijklmnopqrstuvwxyz';
		const marke = Array.from({ length: 8 }, () => zeichen[Math.floor(Math.random() * 26)]).join('');
		for (let i = 0; i < 21; i++) {
			await spieler('Partner', `Q${marke}${String(i).padStart(2, '0')}`);
		}
		const treffer = await sucheDoppelPartner(db, t.mixed, ich, marke, t.jetzt);
		expect(treffer.map((z) => `${z.name.vorname} ${z.name.nachname}`)).toEqual(
			Array.from({ length: 20 }, (_, i) => `Partner Q${marke}${String(i).padStart(2, '0')}`)
		);
	});

	test('FR-48: Anfrage stellen; nochmals schon-angefragt; unpassend, ohne Login oder Einzel abgewiesen', async () => {
		const t = await offenesDoppel();
		const ich = await lea();
		const marcoId = await marco();
		expect(await stelleAnfrage(db, t.mixed, ich, marcoId, t.jetzt)).toBe('ok');
		expect(await stelleAnfrage(db, t.mixed, ich, marcoId, t.jetzt)).toBe('schon-angefragt');

		const mia = await spieler('Mia', 'Mattmann', { geschlecht: 'w' });
		const moritz = await spieler('Moritz', 'Marti', { klassierung: 'R2' });
		const ohneLogin = await spieler('Mathis', 'Ohnelogin', { login: false });
		const gesperrt = await spieler('Matteo', 'Gesperrt', { gesperrt: true });
		expect(await stelleAnfrage(db, t.mixed, ich, ich, t.jetzt)).toBe('passt-nicht');
		expect(await stelleAnfrage(db, t.mixed, ich, mia, t.jetzt)).toBe('passt-nicht');
		expect(await stelleAnfrage(db, t.mixed, ich, moritz, t.jetzt)).toBe('passt-nicht');
		expect(await stelleAnfrage(db, t.mixed, ich, ohneLogin, t.jetzt)).toBe('nicht-gefunden');
		expect(await stelleAnfrage(db, t.mixed, ich, gesperrt, t.jetzt)).toBe('nicht-gefunden');
		expect(await stelleAnfrage(db, t.mixed, ich, -1, t.jetzt)).toBe('nicht-gefunden');
		expect(await stelleAnfrage(db, t.mixed, -1, marcoId, t.jetzt)).toBe('nicht-gefunden');
		expect(await stelleAnfrage(db, t.damenEinzel[0], ich, mia, t.jetzt)).toBe('nicht-gefunden');
		expect(await stelleAnfrage(db, -1, ich, marcoId, t.jetzt)).toBe('nicht-gefunden');
		await db.update(kategorie).set({ status: 'abgesagt' }).where(eq(kategorie.id, t.damen));
		expect(await stelleAnfrage(db, t.damen, ich, mia, t.jetzt)).toBe('nicht-gefunden');
		expect(await stelleAnfrage(db, t.herren, marcoId, moritz, t.spaet)).toBe('geschlossen');
		const ohne = await spieler('Ohne', 'Jahrgang', { jahrgang: null });
		expect(await stelleAnfrage(db, t.herren, ohne, marcoId, t.jetzt)).toBe('angaben-fehlen');

		// Wer schon zu zweit ist oder die Grenze erreicht hat, ist kein Partner.
		const gepaart = await spieler('Malik', 'Paar');
		await anmeldungMit(
			t.mixed,
			[gepaart, await spieler('Nora', 'Paar', { geschlecht: 'w' })],
			t.jetzt
		);
		expect(await stelleAnfrage(db, t.mixed, ich, gepaart, t.jetzt)).toBe('passt-nicht');
		expect(await stelleAnfrage(db, t.mixed, gepaart, mia, t.jetzt)).toBe('schon-angemeldet');
		const voll = await spieler('Malte', 'Voll');
		for (const k of t.herrenEinzel) await anmeldungMit(k, [voll], t.jetzt);
		expect(await stelleAnfrage(db, t.mixed, ich, voll, t.jetzt)).toBe('passt-nicht');
		expect(await stelleAnfrage(db, t.mixed, voll, mia, t.jetzt)).toBe('voll');

		// Abgewiesen heisst: nichts gespeichert.
		expect(await anfragenIn(t.mixed)).toEqual([
			{ id: expect.any(Number), vonId: ich, anId: marcoId }
		]);
		expect(await anfragenIn(t.damen)).toEqual([]);
		expect(await anfragenIn(t.herren)).toEqual([]);
	});

	test('FR-48: mehrere Anfragen gleichzeitig zählen nicht bei der Grenze', async () => {
		const t = await offenesDoppel();
		const ich = await lea();
		await anmeldungMit(t.damenEinzel[0], [ich], t.jetzt);
		await anmeldungMit(t.damenEinzel[1], [ich], t.jetzt);
		for (const [v, n] of [
			['Marco', 'Beispiel'],
			['Max', 'Cadonau'],
			['Paul', 'Sommer']
		]) {
			expect(await stelleAnfrage(db, t.mixed, ich, await spieler(v, n), t.jetzt)).toBe('ok');
		}
		expect(await eigeneAnmeldungen(db, t.id, ich)).toHaveLength(2);
		expect(await anfragenIn(t.mixed)).toHaveLength(3);

		// Mit drei Anmeldungen geht keine Anfrage mehr, ausser man sucht dort schon allein.
		await anmeldungMit(t.damenEinzel[2], [ich], t.jetzt);
		const nina = await spieler('Nina', 'Graf', { geschlecht: 'w' });
		expect(await stelleAnfrage(db, t.damen, ich, nina, t.jetzt)).toBe('voll');
		const sara = await spieler('Sara', 'Keller', { geschlecht: 'w' });
		const kurt = await spieler('Kurt', 'Weber');
		await anmeldungMit(t.herrenEinzel[0], [kurt], t.jetzt);
		await anmeldungMit(t.herrenEinzel[1], [kurt], t.jetzt);
		await anmeldungMit(t.mixed, [kurt], t.jetzt);
		expect(await stelleAnfrage(db, t.mixed, kurt, sara, t.jetzt)).toBe('ok');
	});

	test('FR-48, FR-49: Annehmen ohne Anmeldungen ergibt eine neue Anmeldung mit beiden', async () => {
		const t = await offenesDoppel();
		const ich = await lea();
		const marcoId = await marco({ rufname: 'Mäc' });
		const id = await anfrage(t.mixed, ich, marcoId, t.jetzt);
		expect(await nimmAnfrageAn(db, id, marcoId, t.jetzt)).toEqual({
			ergebnis: 'ok',
			vonId: ich,
			kategorie: 'Mixed Doppel',
			turnierId: t.id,
			hinfaellig: []
		});
		expect(await anmeldungenIn(t.mixed)).toEqual([
			{ id: expect.any(Number), status: 'bestaetigt', suchtext: null, spieler: [ich, marcoId] }
		]);
		expect(await anfragenIn(t.mixed)).toEqual([]);
		// Die Bestätigungsmail nennt den Partner in der kurzen Textform mit Rufname.
		expect(await eigeneKategorien(db, t.id, ich)).toEqual([
			'Mixed Doppel (mit Mäc (Marco Beispiel))'
		]);
		expect(await eigeneKategorien(db, t.id, marcoId)).toEqual(['Mixed Doppel (mit Lea Marbach)']);
	});

	test('FR-48, FR-49: Annehmen: wer schon sucht, nimmt den anderen in seine Anmeldung; suchen beide, wird die der Anfragenden zurückgezogen', async () => {
		// Marco sucht: Lea kommt in seine Anmeldung, sein Suchtext ist weg.
		const t = await offenesDoppel();
		const ich = await lea();
		const marcoId = await marco();
		const seine = await anmeldungMit(t.mixed, [marcoId], t.jetzt, 'Eher abends');
		expect(
			await nimmAnfrageAn(db, await anfrage(t.mixed, ich, marcoId, t.jetzt), marcoId, t.jetzt)
		).toMatchObject({
			ergebnis: 'ok'
		});
		expect(await anmeldungenIn(t.mixed)).toEqual([
			{
				id: seine,
				status: 'bestaetigt',
				suchtext: null,
				spieler: [ich, marcoId].sort((a, b) => a - b)
			}
		]);

		// Nur Lea sucht: Marco kommt in ihre.
		const u = await offenesDoppel();
		const ihre = await anmeldungMit(u.mixed, [ich], u.jetzt, 'Suche R5');
		expect(
			await nimmAnfrageAn(db, await anfrage(u.mixed, ich, marcoId, u.jetzt), marcoId, u.jetzt)
		).toMatchObject({
			ergebnis: 'ok'
		});
		expect(await anmeldungenIn(u.mixed)).toEqual([
			{
				id: ihre,
				status: 'bestaetigt',
				suchtext: null,
				spieler: [ich, marcoId].sort((a, b) => a - b)
			}
		]);

		// Beide suchen: Leas eigene ist zurückgezogen, ohne Suchtext.
		const v = await offenesDoppel();
		const leas = await anmeldungMit(v.mixed, [ich], v.jetzt, 'Suche R5');
		const marcos = await anmeldungMit(v.mixed, [marcoId], v.jetzt, 'Eher abends');
		expect(
			await nimmAnfrageAn(db, await anfrage(v.mixed, ich, marcoId, v.jetzt), marcoId, v.jetzt)
		).toMatchObject({
			ergebnis: 'ok'
		});
		expect(await anmeldungenIn(v.mixed)).toEqual([
			{ id: leas, status: 'zurueckgezogen', suchtext: null, spieler: [ich] },
			{
				id: marcos,
				status: 'bestaetigt',
				suchtext: null,
				spieler: [ich, marcoId].sort((a, b) => a - b)
			}
		]);
		expect(await eigeneAnmeldungen(db, v.id, ich)).toHaveLength(1);
	});

	test('FR-48: Annehmen lässt die übrigen Anfragen beider in der Kategorie verfallen', async () => {
		const t = await offenesDoppel();
		const ich = await lea({ rufname: 'Lele' });
		const marcoId = await marco();
		const max = await spieler('Max', 'Cadonau');
		const paul = await spieler('Paul', 'Sommer');
		const nina = await spieler('Nina', 'Graf', { geschlecht: 'w' });
		const id = await anfrage(t.mixed, ich, marcoId, t.jetzt);
		await anfrage(t.mixed, ich, max, t.jetzt);
		await anfrage(t.mixed, paul, ich, t.jetzt);
		await anfrage(t.mixed, marcoId, nina, t.jetzt);
		// Die gekreuzte Anfrage fällt ohne Meldung weg: beide sind jetzt ein Paar.
		await anfrage(t.mixed, marcoId, ich, t.jetzt);
		// Andere Kategorie und Dritte untereinander bleiben.
		const damen = await anfrage(t.damen, ich, nina, t.jetzt);
		const dritte = await anfrage(t.mixed, paul, nina, t.jetzt);

		expect(await nimmAnfrageAn(db, id, marcoId, t.jetzt)).toEqual({
			ergebnis: 'ok',
			vonId: ich,
			kategorie: 'Mixed Doppel',
			turnierId: t.id,
			hinfaellig: [
				// Die Meldung nennt den Namen in der kurzen Textform mit Rufname.
				{ anIds: [max, paul], mitName: 'Lele (Lea Marbach)' },
				{ anIds: [nina], mitName: 'Marco Beispiel' }
			]
		});
		expect(await anfragenIn(t.mixed)).toEqual([{ id: dritte, vonId: paul, anId: nina }]);
		expect(await anfragenIn(t.damen)).toEqual([{ id: damen, vonId: ich, anId: nina }]);
	});

	test('FR-48: Annehmen prüft neu: voll und geschlossen lassen die Anfrage stehen, schon gepaart löscht sie', async () => {
		const t = await offenesDoppel();
		const ich = await lea();
		const marcoId = await marco();

		// Lea hat inzwischen drei Anmeldungen.
		const id = await anfrage(t.mixed, ich, marcoId, t.jetzt);
		for (const k of t.damenEinzel) await anmeldungMit(k, [ich], t.jetzt);
		expect(await nimmAnfrageAn(db, id, marcoId, t.jetzt)).toBe('voll');
		expect(await anfragenIn(t.mixed)).toHaveLength(1);
		expect(await aktiveIn(t.mixed)).toEqual([]);

		// Nach dem Anmeldeschluss nehmen Mitglieder nicht mehr an; die Anfrage bleibt.
		const u = await offenesDoppel();
		const spaet = await anfrage(u.mixed, ich, marcoId, u.jetzt);
		expect(await nimmAnfrageAn(db, spaet, marcoId, u.spaet)).toBe('geschlossen');
		expect(await anfragenIn(u.mixed)).toHaveLength(1);

		// Lea ist inzwischen mit jemand anderem gepaart: die Anfrage ist weg.
		const v = await offenesDoppel();
		const gepaart = await anfrage(v.mixed, ich, marcoId, v.jetzt);
		await anmeldungMit(v.mixed, [ich, await spieler('Max', 'Cadonau')], v.jetzt);
		expect(await nimmAnfrageAn(db, gepaart, marcoId, v.jetzt)).toBe('schon-angemeldet');
		expect(await anfragenIn(v.mixed)).toEqual([]);

		// Marco hat keine Klassierung: erst die Angaben (FR-37), die Anfrage bleibt.
		const w = await offenesDoppel();
		const ohne = await spieler('Manuel', 'Arnold', { klassierung: null });
		const fehlt = await anfrage(w.mixed, ich, ohne, w.jetzt);
		expect(await nimmAnfrageAn(db, fehlt, ohne, w.jetzt)).toBe('angaben-fehlen');
		// Mit R2 ist das Paar zu stark (6 + 2 < 9).
		await db.update(mitglied).set({ klassierung: 'R2' }).where(eq(mitglied.id, ohne));
		expect(await nimmAnfrageAn(db, fehlt, ohne, w.jetzt)).toBe('passt-nicht');
		expect(await anfragenIn(w.mixed)).toHaveLength(1);

		// Marco hat die Grenze selbst erreicht.
		const x = await offenesDoppel();
		const marcoVoll = await anfrage(x.mixed, ich, marcoId, x.jetzt);
		for (const k of x.herrenEinzel) await anmeldungMit(k, [marcoId], x.jetzt);
		expect(await nimmAnfrageAn(db, marcoVoll, marcoId, x.jetzt)).toBe('voll');
	});

	test('FR-48: nur der Angefragte mit Login nimmt an; fremde Anfrage ergibt nicht-gefunden', async () => {
		const t = await offenesDoppel();
		const ich = await lea();
		const marcoId = await marco();
		const id = await anfrage(t.mixed, ich, marcoId, t.jetzt);
		expect(await nimmAnfrageAn(db, id, ich, t.jetzt)).toBe('nicht-gefunden');
		expect(await nimmAnfrageAn(db, -1, marcoId, t.jetzt)).toBe('nicht-gefunden');
		await db.update(konto).set({ gesperrt: true }).where(eq(konto.mitgliedId, marcoId));
		expect(await nimmAnfrageAn(db, id, marcoId, t.jetzt)).toBe('nicht-gefunden');
		expect(await anfragenIn(t.mixed)).toHaveLength(1);
	});

	test('FR-48: Ablehnen und Zurückziehen löschen die Anfrage; fremde ergibt nicht-gefunden', async () => {
		const t = await offenesDoppel();
		const ich = await lea();
		const marcoId = await marco();
		const id = await anfrage(t.mixed, ich, marcoId, t.jetzt);
		expect(await lehneAnfrageAb(db, id, ich)).toBe('nicht-gefunden');
		expect(await lehneAnfrageAb(db, id, marcoId)).toEqual({
			vonId: ich,
			kategorie: 'Mixed Doppel',
			turnierId: t.id
		});
		expect(await anfragenIn(t.mixed)).toEqual([]);
		expect(await lehneAnfrageAb(db, id, marcoId)).toBe('nicht-gefunden');

		// Erneut anfragen geht; zurückziehen kann nur, wer gefragt hat.
		const neu = await anfrage(t.mixed, ich, marcoId, t.jetzt);
		expect(await zieheAnfrageZurueck(db, neu, marcoId)).toBe('nicht-gefunden');
		expect(await zieheAnfrageZurueck(db, neu, ich)).toBe('ok');
		expect(await anfragenIn(t.mixed)).toEqual([]);
		expect(await zieheAnfrageZurueck(db, neu, ich)).toBe('nicht-gefunden');
	});

	test('FR-10: Abmelden aus dem Paar zieht die ganze Anmeldung zurück und nennt den Partner; als Suchender ist der Suchtext weg', async () => {
		const t = await offenesDoppel();
		const ich = await lea();
		const marcoId = await marco();
		expect(
			await nimmAnfrageAn(db, await anfrage(t.mixed, ich, marcoId, t.jetzt), marcoId, t.jetzt)
		).toMatchObject({
			ergebnis: 'ok'
		});
		const [paar] = await aktiveIn(t.mixed);
		expect(await meldeAb(db, paar.id, marcoId, t.jetzt)).toEqual({
			ergebnis: 'ok',
			partnerId: ich
		});
		expect(await anmeldungenIn(t.mixed)).toEqual([{ ...paar, status: 'zurueckgezogen' }]);
		expect(await eigeneAnmeldungen(db, t.id, ich)).toEqual([]);

		expect(await meldeAn(db, t.damen, ich, t.jetzt, 'Suche R5')).toBe('ok');
		const [allein] = await aktiveIn(t.damen);
		expect(await meldeAb(db, allein.id, ich, t.jetzt)).toEqual({ ergebnis: 'ok', partnerId: null });
		expect(await anmeldungenIn(t.damen)).toEqual([
			{ id: allein.id, status: 'zurueckgezogen', suchtext: null, spieler: [ich] }
		]);
	});

	test('FR-10: kommt beim Abmelden gerade ein Partner dazu, ist das ganze Paar zurückgezogen', async () => {
		const t = await offenesDoppel();
		const ich = await lea();
		const marcoId = await marco();
		const id = await anmeldungMit(t.mixed, [ich], t.jetzt, 'Suche R5');
		// Eine dritte Transaktion hält Lea und nimmt Marco in ihre Anmeldung, während die Abmeldung
		// auf Lea wartet: Sie hat Marco noch nicht gesperrt und beginnt darum von vorn.
		const ab = await db.transaction(async (tx) => {
			await halteMitglied(ich)(tx);
			const laufend = meldeAb(db, id, ich, t.jetzt);
			await bisWartend(1);
			await tx.insert(anmeldungSpieler).values({ anmeldungId: id, mitgliedId: marcoId });
			return { laufend };
		});
		expect(await ab.laufend).toEqual({ ergebnis: 'ok', partnerId: marcoId });
		expect(await anmeldungenIn(t.mixed)).toEqual([
			{
				id,
				status: 'zurueckgezogen',
				suchtext: null,
				spieler: [ich, marcoId].sort((a, b) => a - b)
			}
		]);
	});

	test('Review Focus 1: gekreuzte Anfragen gleichzeitig angenommen ergeben genau eine Anmeldung', async () => {
		const t = await offenesDoppel();
		const ich = await lea();
		const marcoId = await marco();
		const anMarco = await anfrage(t.mixed, ich, marcoId, t.jetzt);
		const anLea = await anfrage(t.mixed, marcoId, ich, t.jetzt);

		const ergebnisse = await gleichzeitig(halteMitglied(Math.min(ich, marcoId)), () => [
			nimmAnfrageAn(db, anMarco, marcoId, t.jetzt),
			nimmAnfrageAn(db, anLea, ich, t.jetzt)
		]);
		const angenommen = (vonId: number) => ({
			ergebnis: 'ok',
			vonId,
			kategorie: 'Mixed Doppel',
			turnierId: t.id,
			hinfaellig: []
		});
		expect([
			[angenommen(ich), 'nicht-gefunden'],
			['nicht-gefunden', angenommen(marcoId)]
		]).toContainEqual(ergebnisse);
		expect(await aktiveIn(t.mixed)).toEqual([
			expect.objectContaining({ spieler: [ich, marcoId].sort((a, b) => a - b) })
		]);
		expect(await anfragenIn(t.mixed)).toEqual([]);
	});

	test('Review Focus 4: beide Partner melden gleichzeitig ab: einmal ok mit Partner, einmal nicht-gefunden', async () => {
		const t = await offenesDoppel();
		const ich = await lea();
		const marcoId = await marco();
		const id = await anmeldungMit(t.mixed, [ich, marcoId], t.jetzt);

		const ergebnisse = await gleichzeitig(halteMitglied(Math.min(ich, marcoId)), () => [
			meldeAb(db, id, ich, t.jetzt),
			meldeAb(db, id, marcoId, t.jetzt)
		]);
		expect([
			[{ ergebnis: 'ok', partnerId: marcoId }, 'nicht-gefunden'],
			['nicht-gefunden', { ergebnis: 'ok', partnerId: ich }]
		]).toContainEqual(ergebnisse);
		expect(await anmeldungenIn(t.mixed)).toEqual([
			{
				id,
				status: 'zurueckgezogen',
				suchtext: null,
				spieler: [ich, marcoId].sort((a, b) => a - b)
			}
		]);
	});
});
