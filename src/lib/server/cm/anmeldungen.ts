// Einzel-Anmeldungen der Mitglieder zur Clubmeisterschaft (A-ANMELDUNG-01, FR-05 bis FR-10, FR-37).
import { and, asc, count, eq, gte, inArray, ne } from 'drizzle-orm';
import type { Db, DbOderTx } from '../db/index.ts';
import {
	anmeldung,
	anmeldungSpieler,
	kategorie,
	mitglied,
	turnier,
	type AnmeldungStatus,
	type TurnierStatus
} from '../db/schema.ts';
import {
	fehlendeAngaben,
	passtEinzel,
	type CmAngabe,
	type KategorieRegel,
	type Spieler
} from '../../turnier/passung.ts';
import { wirksamerStatus } from '../../turnier/status.ts';
import { jahrInZuerich, spielerAus } from './angaben.ts';

export type CmStand = {
	id: number;
	name: string;
	anmeldeschluss: string;
	status: TurnierStatus;
	anzahl: number;
};

export type CmKategorie = KategorieRegel & {
	id: number;
	name: string;
	passt: boolean;
	anmeldungId: number | null;
	namen: string[];
};

export type CmAnsicht = {
	turnier: CmStand & { jahr: number };
	fehlt: CmAngabe[];
	spieler: Spieler;
	kategorien: CmKategorie[];
	eigene: { anmeldungId: number; kategorie: string }[];
	grenze: 3;
};

/** FR-06: höchstens drei aktive Anmeldungen je Turnier. */
const GRENZE = 3;

/** Aktiv sind bestätigte und (ab Teil 4) beantragte Anmeldungen. */
const AKTIV: AnmeldungStatus[] = ['bestaetigt', 'beantragt'];
const istAktiv = inArray(anmeldung.status, AKTIV);

const namenOrdnung = new Intl.Collator('de-CH');

const spielerSpalten = {
	geschlecht: mitglied.geschlecht,
	jahrgang: mitglied.jahrgang,
	klassierung: mitglied.klassierung
};

const regelAus = (k: typeof kategorie.$inferSelect): KategorieRegel => ({
	art: k.art,
	geschlecht: k.geschlecht,
	jahrgangVon: k.jahrgangVon,
	jahrgangBis: k.jahrgangBis,
	klassierungVon: k.klassierungVon,
	klassierungBis: k.klassierungBis
});

/** Aktive Anmeldungen des Mitglieds in einem Turnier, nach Kategoriename. */
async function eigeneAnmeldungen(db: DbOderTx, turnierId: number, mitgliedId: number) {
	return db
		.select({ anmeldungId: anmeldung.id, kategorieId: kategorie.id, kategorie: kategorie.name })
		.from(anmeldung)
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
		.where(
			and(eq(kategorie.turnierId, turnierId), eq(anmeldungSpieler.mitgliedId, mitgliedId), istAktiv)
		)
		.orderBy(asc(kategorie.name), asc(kategorie.id));
}

/** FR-33: laufende Turniere (nicht in Vorbereitung, ab diesem Jahr), mit den eigenen aktiven. */
export async function laufendeTurniere(
	db: Db,
	mitgliedId: number,
	jetzt: Date
): Promise<CmStand[]> {
	const zeilen = await db
		.select({
			id: turnier.id,
			name: turnier.name,
			anmeldeschluss: turnier.anmeldeschluss,
			status: turnier.status,
			anzahl: count(anmeldungSpieler.anmeldungId)
		})
		.from(turnier)
		.leftJoin(kategorie, eq(kategorie.turnierId, turnier.id))
		.leftJoin(anmeldung, and(eq(anmeldung.kategorieId, kategorie.id), istAktiv))
		.leftJoin(
			anmeldungSpieler,
			and(
				eq(anmeldungSpieler.anmeldungId, anmeldung.id),
				eq(anmeldungSpieler.mitgliedId, mitgliedId)
			)
		)
		.where(and(ne(turnier.status, 'vorbereitung'), gte(turnier.jahr, jahrInZuerich(jetzt))))
		.groupBy(turnier.id)
		.orderBy(asc(turnier.jahr));
	return zeilen.map((z) => ({ ...z, status: wirksamerStatus(z.status, z.anmeldeschluss, jetzt) }));
}

/**
 * Die CM-Seite eines Mitglieds; `null`, wenn das Turnier unbekannt oder in Vorbereitung ist.
 * Doppel bleiben ausgeblendet. Kategorien gibt es erst, wenn keine Angabe mehr fehlt (FR-37);
 * dann die passenden (FR-07) und die, in denen das Mitglied schon aktiv angemeldet ist.
 */
export async function ladeCmAnsicht(
	db: Db,
	turnierId: number,
	mitgliedId: number,
	jetzt: Date
): Promise<CmAnsicht | null> {
	const [t] = await db.select().from(turnier).where(eq(turnier.id, turnierId));
	if (!t || t.status === 'vorbereitung') return null;
	const [m] = await db.select(spielerSpalten).from(mitglied).where(eq(mitglied.id, mitgliedId));
	if (!m) return null;
	const spieler = spielerAus(m);
	const fehlt = fehlendeAngaben(spieler);
	const eigene = await eigeneAnmeldungen(db, turnierId, mitgliedId);

	let kategorien: CmKategorie[] = [];
	if (fehlt.length === 0) {
		const zeilen = await db
			.select()
			.from(kategorie)
			.where(
				and(
					eq(kategorie.turnierId, turnierId),
					eq(kategorie.art, 'einzel'),
					eq(kategorie.status, 'aktiv')
				)
			)
			.orderBy(asc(kategorie.id));
		const angemeldet = new Map(eigene.map((e) => [e.kategorieId, e.anmeldungId]));
		kategorien = zeilen
			.map((k) => ({
				...regelAus(k),
				id: k.id,
				name: k.name,
				passt: passtEinzel(regelAus(k), spieler),
				anmeldungId: angemeldet.get(k.id) ?? null,
				namen: [] as string[]
			}))
			.filter((k) => k.passt || k.anmeldungId !== null);
		await fuelleNamen(db, kategorien);
	}

	return {
		turnier: {
			id: t.id,
			jahr: t.jahr,
			name: t.name,
			anmeldeschluss: t.anmeldeschluss,
			status: wirksamerStatus(t.status, t.anmeldeschluss, jetzt),
			anzahl: eigene.length
		},
		fehlt,
		spieler,
		kategorien,
		eigene: eigene.map((e) => ({ anmeldungId: e.anmeldungId, kategorie: e.kategorie })),
		grenze: GRENZE
	};
}

/** «Vorname Nachname» der bestätigten Anmeldungen, nach Nachname, dann Vorname. */
async function fuelleNamen(db: Db, kategorien: CmKategorie[]): Promise<void> {
	if (kategorien.length === 0) return;
	const zeilen = await db
		.select({
			kategorieId: anmeldung.kategorieId,
			vorname: mitglied.vorname,
			nachname: mitglied.nachname
		})
		.from(anmeldung)
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.innerJoin(mitglied, eq(mitglied.id, anmeldungSpieler.mitgliedId))
		.where(
			and(
				inArray(
					anmeldung.kategorieId,
					kategorien.map((k) => k.id)
				),
				eq(anmeldung.status, 'bestaetigt')
			)
		);
	zeilen.sort(
		(a, b) =>
			namenOrdnung.compare(a.nachname, b.nachname) || namenOrdnung.compare(a.vorname, b.vorname)
	);
	const nachId = new Map(kategorien.map((k) => [k.id, k]));
	for (const z of zeilen) nachId.get(z.kategorieId)?.namen.push(`${z.vorname} ${z.nachname}`);
}

/**
 * A-ANMELDUNG-01, FR-05 bis FR-09: anmelden, sofort bestätigt. Die Zeile des Mitglieds wird
 * zuerst gesperrt (`for update`), dann die Kategorie (`for share`): parallele Anmeldungen
 * desselben Mitglieds laufen nacheinander, so zählen Grenze und Doppelanmeldung richtig, und
 * die Verwaltung kann die Kategorie nicht gleichzeitig ändern oder absagen.
 */
export async function meldeAn(
	db: Db,
	kategorieId: number,
	mitgliedId: number,
	jetzt: Date
): Promise<
	| 'ok'
	| 'geschlossen'
	| 'voll'
	| 'passt-nicht'
	| 'schon-angemeldet'
	| 'angaben-fehlen'
	| 'nicht-gefunden'
> {
	return db.transaction(async (tx) => {
		const [m] = await tx
			.select(spielerSpalten)
			.from(mitglied)
			.where(eq(mitglied.id, mitgliedId))
			.for('update');
		if (!m) return 'nicht-gefunden';
		const [z] = await tx
			.select({ k: kategorie, t: turnier })
			.from(kategorie)
			.innerJoin(turnier, eq(turnier.id, kategorie.turnierId))
			.where(eq(kategorie.id, kategorieId))
			.for('share', { of: kategorie });
		if (!z || z.k.art !== 'einzel' || z.k.status !== 'aktiv' || z.t.status === 'vorbereitung') {
			return 'nicht-gefunden';
		}
		if (wirksamerStatus(z.t.status, z.t.anmeldeschluss, jetzt) !== 'offen') return 'geschlossen';
		const spieler = spielerAus(m);
		if (fehlendeAngaben(spieler).length > 0) return 'angaben-fehlen';
		if (!passtEinzel(regelAus(z.k), spieler)) return 'passt-nicht';
		const eigene = await eigeneAnmeldungen(tx, z.t.id, mitgliedId);
		if (eigene.some((e) => e.kategorieId === kategorieId)) return 'schon-angemeldet';
		if (eigene.length >= GRENZE) return 'voll';

		const [neu] = await tx
			.insert(anmeldung)
			.values({ kategorieId, status: 'bestaetigt', angemeldetAm: jetzt, geaendertAm: jetzt })
			.returning({ id: anmeldung.id });
		await tx.insert(anmeldungSpieler).values({ anmeldungId: neu.id, mitgliedId });
		return 'ok';
	});
}

/** FR-10: eine eigene aktive Anmeldung zurückziehen, nur solange das Turnier offen ist. */
export async function meldeAb(
	db: Db,
	anmeldungId: number,
	mitgliedId: number,
	jetzt: Date
): Promise<'ok' | 'geschlossen' | 'nicht-gefunden'> {
	return db.transaction(async (tx) => {
		// Gleiche Reihenfolge wie meldeAn: zuerst das Mitglied, dann die Anmeldung.
		const [m] = await tx
			.select({ id: mitglied.id })
			.from(mitglied)
			.where(eq(mitglied.id, mitgliedId))
			.for('update');
		if (!m) return 'nicht-gefunden';
		const [z] = await tx
			.select({ status: turnier.status, anmeldeschluss: turnier.anmeldeschluss })
			.from(anmeldung)
			.innerJoin(
				anmeldungSpieler,
				and(
					eq(anmeldungSpieler.anmeldungId, anmeldung.id),
					eq(anmeldungSpieler.mitgliedId, mitgliedId)
				)
			)
			.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
			.innerJoin(turnier, eq(turnier.id, kategorie.turnierId))
			.where(and(eq(anmeldung.id, anmeldungId), istAktiv))
			.for('update', { of: anmeldung });
		if (!z) return 'nicht-gefunden';
		if (wirksamerStatus(z.status, z.anmeldeschluss, jetzt) !== 'offen') return 'geschlossen';
		await tx
			.update(anmeldung)
			.set({ status: 'zurueckgezogen', geaendertAm: jetzt })
			.where(eq(anmeldung.id, anmeldungId));
		return 'ok';
	});
}

/** Namen der Kategorien, in denen das Mitglied aktiv angemeldet ist (für die Mail), nach Name. */
export async function eigeneKategorien(
	db: DbOderTx,
	turnierId: number,
	mitgliedId: number
): Promise<string[]> {
	return (await eigeneAnmeldungen(db, turnierId, mitgliedId)).map((e) => e.kategorie);
}

/** Aktive Anmeldungen einer Kategorie (FR-35). */
export async function zaehleAktive(db: DbOderTx, kategorieId: number): Promise<number> {
	const [{ n }] = await db
		.select({ n: count() })
		.from(anmeldung)
		.where(and(eq(anmeldung.kategorieId, kategorieId), istAktiv));
	return n;
}

/**
 * FR-36: aktive Anmeldungen, deren Spieler nach den Werten `neu` nicht mehr passen, gemessen
 * an den heutigen Angaben der Spieler. Eine Anmeldung zählt einmal, auch mit zwei Spielern.
 */
export async function zaehleUnpassende(
	db: DbOderTx,
	kategorieId: number,
	neu: KategorieRegel
): Promise<number> {
	const zeilen = await db
		.select({ anmeldungId: anmeldung.id, ...spielerSpalten })
		.from(anmeldung)
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.innerJoin(mitglied, eq(mitglied.id, anmeldungSpieler.mitgliedId))
		.where(and(eq(anmeldung.kategorieId, kategorieId), istAktiv));
	const unpassend = new Set(
		zeilen.filter((z) => !passtEinzel(neu, spielerAus(z))).map((z) => z.anmeldungId)
	);
	return unpassend.size;
}
