// Einzel-Anmeldungen der Mitglieder zur Clubmeisterschaft (A-ANMELDUNG-01, A-ANMELDUNG-10,
// FR-05 bis FR-10, FR-37).
import { and, asc, count, eq, gte, inArray, ne, sql } from 'drizzle-orm';
import type { Namensteile } from '../../name.ts';
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
	wildcardEinzel,
	type CmAngabe,
	type KategorieRegel,
	type Spieler
} from '../../turnier/passung.ts';
import { wirksamerStatus } from '../../turnier/status.ts';
import { jahrInZuerich } from '../datum.ts';
import { spielerAus } from './angaben.ts';

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
	namen: Namensteile[];
};

/** Aktiv sind bestätigte und (ab Teil 4) beantragte Anmeldungen. */
export type AktiverStatus = Extract<AnmeldungStatus, 'bestaetigt' | 'beantragt'>;

export type CmAnsicht = {
	turnier: CmStand & { jahr: number };
	fehlt: CmAngabe[];
	spieler: Spieler;
	kategorien: CmKategorie[];
	/** FR-08: Kategorien, für die ein Wildcard-Antrag geht oder schon läuft. */
	wildcard: CmKategorie[];
	eigene: { anmeldungId: number; kategorie: string; status: AktiverStatus }[];
	grenze: 3;
};

/** FR-06: höchstens drei aktive Anmeldungen je Turnier. */
export const GRENZE = 3;

const AKTIV: AktiverStatus[] = ['bestaetigt', 'beantragt'];
export const istAktiv = inArray(anmeldung.status, AKTIV);

const namenOrdnung = new Intl.Collator('de-CH');

export const spielerSpalten = {
	geschlecht: mitglied.geschlecht,
	jahrgang: mitglied.jahrgang,
	klassierung: mitglied.klassierung
};

export const regelAus = (k: typeof kategorie.$inferSelect): KategorieRegel => ({
	art: k.art,
	geschlecht: k.geschlecht,
	jahrgangVon: k.jahrgangVon,
	jahrgangBis: k.jahrgangBis,
	klassierungVon: k.klassierungVon,
	klassierungBis: k.klassierungBis
});

/** Aktive Anmeldungen des Mitglieds in einem Turnier, nach Kategoriename. */
export async function eigeneAnmeldungen(db: DbOderTx, turnierId: number, mitgliedId: number) {
	return db
		.select({
			anmeldungId: anmeldung.id,
			kategorieId: kategorie.id,
			kategorie: kategorie.name,
			// `istAktiv` lässt nur diese beiden Status durch.
			status: sql<AktiverStatus>`${anmeldung.status}`
		})
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
 * dann die passenden (FR-07) und die, in denen das Mitglied schon aktiv angemeldet ist. Unter
 * `wildcard` stehen die laufenden Anträge und die, für die ein Antrag geht (FR-08); jede
 * Kategorie steht nur in einer der beiden Listen.
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

	const kategorien: CmKategorie[] = [];
	const wildcard: CmKategorie[] = [];
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
		const angemeldet = new Map(eigene.map((e) => [e.kategorieId, e]));
		for (const k of zeilen) {
			const regel = regelAus(k);
			const eigen = angemeldet.get(k.id);
			const eintrag: CmKategorie = {
				...regel,
				id: k.id,
				name: k.name,
				passt: passtEinzel(regel, spieler),
				anmeldungId: eigen?.anmeldungId ?? null,
				namen: []
			};
			// Ein laufender Antrag bleibt ein Antrag, auch wenn sich die Klassierung geändert hat.
			if (eigen?.status === 'beantragt' || (!eigen && wildcardEinzel(regel, spieler))) {
				wildcard.push(eintrag);
			} else if (eintrag.passt || eigen) kategorien.push(eintrag);
		}
		await fuelleNamen(db, [...kategorien, ...wildcard]);
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
		wildcard,
		eigene: eigene.map((e) => ({
			anmeldungId: e.anmeldungId,
			kategorie: e.kategorie,
			status: e.status
		})),
		grenze: GRENZE
	};
}

/** Namensteile der bestätigten Anmeldungen, nach Nachname, dann Vorname. */
async function fuelleNamen(db: Db, kategorien: CmKategorie[]): Promise<void> {
	if (kategorien.length === 0) return;
	const zeilen = await db
		.select({
			kategorieId: anmeldung.kategorieId,
			rufname: mitglied.rufname,
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
	for (const z of zeilen) {
		nachId
			.get(z.kategorieId)
			?.namen.push({ rufname: z.rufname, vorname: z.vorname, nachname: z.nachname });
	}
}

type Gemeinsam = 'geschlossen' | 'voll' | 'schon-angemeldet' | 'angaben-fehlen' | 'nicht-gefunden';

/**
 * Gemeinsamer Weg von Anmeldung (FR-07) und Wildcard-Antrag (FR-08). Die Zeile des Mitglieds wird
 * zuerst gesperrt (`for update`), dann die Kategorie (`for share`): parallele Anmeldungen
 * desselben Mitglieds laufen nacheinander, so zählen Grenze und Doppelanmeldung richtig, und
 * die Verwaltung kann die Kategorie nicht gleichzeitig ändern oder absagen. `regel` prüft die
 * Passung und gibt sonst ihren eigenen Fehler zurück.
 */
async function trageEin<F extends string>(
	db: Db,
	kategorieId: number,
	mitgliedId: number,
	jetzt: Date,
	regel: (k: KategorieRegel, s: Spieler) => F | null,
	neu: { status: AktiverStatus; kommentar: string | null }
): Promise<'ok' | F | Gemeinsam> {
	return db.transaction(async (tx) => {
		const [m] = await tx
			.select({ ...spielerSpalten, status: mitglied.status })
			.from(mitglied)
			.where(eq(mitglied.id, mitgliedId))
			.for('update');
		// Gesperrt wird vor dem Prüfen: eine Anmeldung kann nicht nach einem Austritt landen.
		if (!m || m.status !== 'aktiv') return 'nicht-gefunden';
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
		const fehler = regel(regelAus(z.k), spieler);
		if (fehler !== null) return fehler;
		const eigene = await eigeneAnmeldungen(tx, z.t.id, mitgliedId);
		if (eigene.some((e) => e.kategorieId === kategorieId)) return 'schon-angemeldet';
		if (eigene.length >= GRENZE) return 'voll';

		const [zeile] = await tx
			.insert(anmeldung)
			.values({ kategorieId, ...neu, angemeldetAm: jetzt, geaendertAm: jetzt })
			.returning({ id: anmeldung.id });
		await tx.insert(anmeldungSpieler).values({ anmeldungId: zeile.id, mitgliedId });
		return 'ok';
	});
}

/** A-ANMELDUNG-01, FR-05 bis FR-09: anmelden, sofort bestätigt. */
export function meldeAn(
	db: Db,
	kategorieId: number,
	mitgliedId: number,
	jetzt: Date
): Promise<'ok' | 'passt-nicht' | Gemeinsam> {
	return trageEin(
		db,
		kategorieId,
		mitgliedId,
		jetzt,
		(k, s) => (passtEinzel(k, s) ? null : 'passt-nicht'),
		{ status: 'bestaetigt', kommentar: null }
	);
}

/**
 * A-ANMELDUNG-10, FR-08: Wildcard-Antrag für eine stärkere Einzel-Kategorie, die allein wegen
 * der Klassierung nicht passt. Die Anmeldung ist *beantragt* und zählt bei der Grenze (FR-06);
 * eine abgelehnte zählt nicht, danach geht ein neuer Antrag. `kommentar` prüft die Schnittstelle.
 */
export function beantrageWildcard(
	db: Db,
	kategorieId: number,
	mitgliedId: number,
	kommentar: string,
	jetzt: Date
): Promise<'ok' | 'keine-wildcard' | Gemeinsam> {
	return trageEin(
		db,
		kategorieId,
		mitgliedId,
		jetzt,
		(k, s) => (wildcardEinzel(k, s) ? null : 'keine-wildcard'),
		{ status: 'beantragt', kommentar }
	);
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

/**
 * Namen der Kategorien, in denen das Mitglied aktiv angemeldet ist (für die Mail), nach Name;
 * ein laufender Wildcard-Antrag mit « (beantragt)».
 */
export async function eigeneKategorien(
	db: DbOderTx,
	turnierId: number,
	mitgliedId: number
): Promise<string[]> {
	return (await eigeneAnmeldungen(db, turnierId, mitgliedId)).map((e) =>
		e.status === 'beantragt' ? `${e.kategorie} (beantragt)` : e.kategorie
	);
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
