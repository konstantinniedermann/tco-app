// Anmeldungen der Mitglieder zur Clubmeisterschaft (A-ANMELDUNG-01, A-ANMELDUNG-04,
// A-ANMELDUNG-10, FR-05 bis FR-10, FR-37); Anfragen und Suche im Doppel in `doppel.ts`.
import { and, asc, count, eq, gte, inArray, ne, sql } from 'drizzle-orm';
import type { Db, DbOderTx } from '../db/index.ts';
import {
	anmeldung,
	anmeldungSpieler,
	kategorie,
	mitglied,
	turnier,
	type AnmeldungStatus,
	type Art,
	type TurnierStatus
} from '../db/schema.ts';
import {
	fehlendeAngaben,
	passtDoppelAllein,
	passtEinzel,
	wildcardEinzel,
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
	klassierungBis: k.klassierungBis,
	mindestsumme: k.mindestsumme
});

/** Kommentar *sucht Partner* (FR-49): ohne Leerraum am Rand, leer wird `null`. */
export function suchtextAus(roh: string | null | undefined): string | null {
	const text = roh?.trim() ?? '';
	return text.length > 0 ? text : null;
}

export const nameVon = (m: { vorname: string; nachname: string }) => `${m.vorname} ${m.nachname}`;

/** Aktive Anmeldungen des Mitglieds in einem Turnier, nach Kategoriename. */
export async function eigeneAnmeldungen(db: DbOderTx, turnierId: number, mitgliedId: number) {
	return db
		.select({
			anmeldungId: anmeldung.id,
			kategorieId: kategorie.id,
			kategorie: kategorie.name,
			art: kategorie.art,
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

type Gemeinsam = 'geschlossen' | 'voll' | 'schon-angemeldet' | 'angaben-fehlen' | 'nicht-gefunden';

/**
 * Sperrt die Mitglieder `for update` nach aufsteigender ID, je mit eigener Anfrage: Wer zwei
 * Mitglieder braucht (Paar, Anfrage), sperrt sie immer in derselben Reihenfolge, so verklemmen
 * sich zwei Transaktionen nie. Fehlt ein Mitglied, fehlt es in der Antwort.
 */
export async function sperreMitglieder(tx: DbOderTx, ids: number[]) {
	const gesperrt = [];
	for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
		const [m] = await tx
			.select({
				id: mitglied.id,
				vorname: mitglied.vorname,
				nachname: mitglied.nachname,
				status: mitglied.status,
				...spielerSpalten
			})
			.from(mitglied)
			.where(eq(mitglied.id, id))
			.for('update');
		if (m) gesperrt.push(m);
	}
	return new Map(gesperrt.map((m) => [m.id, m]));
}

/**
 * Sperrt nach den Mitgliedern die Kategorie und danach ihr Turnier `for share`: Die Verwaltung
 * kann die Kategorie nicht gleichzeitig ändern oder absagen, und ein gleichzeitiges Schliessen
 * (`setzeStatus` sperrt das Turnier) fällt nicht zwischen Prüfung und Eintrag.
 */
export async function sperreKategorieUndTurnier(tx: DbOderTx, kategorieId: number) {
	const [k] = await tx.select().from(kategorie).where(eq(kategorie.id, kategorieId)).for('share');
	if (!k) return null;
	const [t] = await tx.select().from(turnier).where(eq(turnier.id, k.turnierId)).for('share');
	return { k, t };
}

/** Spieler einer Anmeldung (gleich welcher Status), aufsteigend. */
export async function spielerDer(tx: DbOderTx, anmeldungId: number): Promise<number[]> {
	const zeilen = await tx
		.select({ id: anmeldungSpieler.mitgliedId })
		.from(anmeldungSpieler)
		.where(eq(anmeldungSpieler.anmeldungId, anmeldungId))
		.orderBy(asc(anmeldungSpieler.mitgliedId));
	return zeilen.map((z) => z.id);
}

/**
 * Gemeinsamer Weg von Anmeldung (FR-07, im Doppel allein) und Wildcard-Antrag (FR-08). Gesperrt
 * wird das Mitglied (`for update`), dann Kategorie und Turnier (`sperreKategorieUndTurnier`):
 * parallele Anmeldungen desselben Mitglieds laufen nacheinander, so zählen Grenze und
 * Doppelanmeldung richtig. `regel` prüft die Passung und gibt sonst ihren eigenen Fehler zurück;
 * `arten` sind die Kategorien, die der Weg kennt.
 */
async function trageEin<F extends string>(
	db: Db,
	kategorieId: number,
	mitgliedId: number,
	jetzt: Date,
	arten: readonly Art[],
	regel: (k: KategorieRegel, s: Spieler) => F | null,
	neu: { status: AktiverStatus; kommentar: string | null; suchtext: string | null }
): Promise<'ok' | F | Gemeinsam> {
	return db.transaction(async (tx) => {
		const m = (await sperreMitglieder(tx, [mitgliedId])).get(mitgliedId);
		// Gesperrt wird vor dem Prüfen: eine Anmeldung kann nicht nach einem Austritt landen.
		if (!m || m.status !== 'aktiv') return 'nicht-gefunden';
		const z = await sperreKategorieUndTurnier(tx, kategorieId);
		if (!z || !arten.includes(z.k.art) || z.k.status !== 'aktiv' || z.t.status === 'vorbereitung') {
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
			.values({
				kategorieId,
				...neu,
				suchtext: z.k.art === 'doppel' ? suchtextAus(neu.suchtext) : null,
				angemeldetAm: jetzt,
				geaendertAm: jetzt
			})
			.returning({ id: anmeldung.id });
		await tx.insert(anmeldungSpieler).values({ anmeldungId: zeile.id, mitgliedId });
		return 'ok';
	});
}

/**
 * A-ANMELDUNG-01, FR-05 bis FR-09: anmelden, sofort bestätigt. Im Doppel allein: der Spieler
 * *sucht Partner*, mit freiwilligem `suchtext` (A-ANMELDUNG-04, FR-49; die Länge prüft die
 * Schnittstelle). Im Einzel gibt es keinen Suchtext.
 */
export function meldeAn(
	db: Db,
	kategorieId: number,
	mitgliedId: number,
	jetzt: Date,
	suchtext: string | null = null
): Promise<'ok' | 'passt-nicht' | Gemeinsam> {
	return trageEin(
		db,
		kategorieId,
		mitgliedId,
		jetzt,
		['einzel', 'doppel'],
		(k, s) =>
			(k.art === 'doppel' ? passtDoppelAllein(k, s) : passtEinzel(k, s)) ? null : 'passt-nicht',
		{ status: 'bestaetigt', kommentar: null, suchtext }
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
		['einzel'],
		(k, s) => (wildcardEinzel(k, s) ? null : 'keine-wildcard'),
		{ status: 'beantragt', kommentar, suchtext: null }
	);
}

/** Ergebnis einer Abmeldung; `partnerId` ist der andere Spieler eines Paars. */
export type Abgemeldet = { ergebnis: 'ok'; partnerId: number | null };

const NOCHMALS = Symbol('nochmals');

/**
 * FR-10: eine eigene aktive Anmeldung zurückziehen, nur solange das Turnier offen ist. Im Doppel
 * ist die ganze Anmeldung *zurückgezogen*, auch für den Partner, und der Suchtext ist weg (FR-49).
 * Gesperrt werden zuerst alle Spieler der Anmeldung (`sperreMitglieder`), dann Kategorie,
 * Turnier und Anmeldung.
 */
export async function meldeAb(
	db: Db,
	anmeldungId: number,
	mitgliedId: number,
	jetzt: Date
): Promise<Abgemeldet | 'geschlossen' | 'nicht-gefunden'> {
	for (;;) {
		const r = await db.transaction(async (tx) => {
			const vorher = await spielerDer(tx, anmeldungId);
			if (!vorher.includes(mitgliedId)) return 'nicht-gefunden' as const;
			if (!(await sperreMitglieder(tx, vorher)).has(mitgliedId)) return 'nicht-gefunden' as const;
			const spieler = await spielerDer(tx, anmeldungId);
			// Kam vor dem Sperren ein Partner dazu, ist er nicht gesperrt: von vorn, in Reihenfolge.
			if (spieler.join() !== vorher.join()) return NOCHMALS;
			const [{ kategorieId }] = await tx
				.select({ kategorieId: anmeldung.kategorieId })
				.from(anmeldung)
				.where(eq(anmeldung.id, anmeldungId));
			const z = await sperreKategorieUndTurnier(tx, kategorieId);
			const [aktiv] = await tx
				.select({ id: anmeldung.id })
				.from(anmeldung)
				.where(and(eq(anmeldung.id, anmeldungId), istAktiv))
				.for('update');
			if (!z || !aktiv) return 'nicht-gefunden' as const;
			if (wirksamerStatus(z.t.status, z.t.anmeldeschluss, jetzt) !== 'offen') {
				return 'geschlossen' as const;
			}
			await tx
				.update(anmeldung)
				.set({ status: 'zurueckgezogen', suchtext: null, geaendertAm: jetzt })
				.where(eq(anmeldung.id, anmeldungId));
			return {
				ergebnis: 'ok' as const,
				partnerId: spieler.find((id) => id !== mitgliedId) ?? null
			};
		});
		if (r !== NOCHMALS) return r;
	}
}

/**
 * Namen der Kategorien, in denen das Mitglied aktiv angemeldet ist (für die Mail), nach Name;
 * ein laufender Wildcard-Antrag mit « (beantragt)», ein Doppel mit « (mit <Partner>)» oder
 * « (sucht Partner)».
 */
export async function eigeneKategorien(
	db: DbOderTx,
	turnierId: number,
	mitgliedId: number
): Promise<string[]> {
	const eigene = await eigeneAnmeldungen(db, turnierId, mitgliedId);
	const doppel = eigene.filter((e) => e.art === 'doppel').map((e) => e.anmeldungId);
	const partner = new Map<number, string>();
	if (doppel.length > 0) {
		const zeilen = await db
			.select({
				anmeldungId: anmeldungSpieler.anmeldungId,
				vorname: mitglied.vorname,
				nachname: mitglied.nachname
			})
			.from(anmeldungSpieler)
			.innerJoin(mitglied, eq(mitglied.id, anmeldungSpieler.mitgliedId))
			.where(
				and(
					inArray(anmeldungSpieler.anmeldungId, doppel),
					ne(anmeldungSpieler.mitgliedId, mitgliedId)
				)
			);
		for (const z of zeilen) partner.set(z.anmeldungId, nameVon(z));
	}
	return eigene.map((e) => {
		if (e.art === 'doppel') {
			const p = partner.get(e.anmeldungId);
			return p ? `${e.kategorie} (mit ${p})` : `${e.kategorie} (sucht Partner)`;
		}
		return e.status === 'beantragt' ? `${e.kategorie} (beantragt)` : e.kategorie;
	});
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
