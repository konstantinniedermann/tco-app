// Turniere und Kategorien speichern, Anmeldung öffnen und schliessen (FR-33 bis FR-35).
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { nameFuerText, zaehleAktive, zaehleUnpassende } from '../cm/anmeldungen.ts';
import type { Db, DbOderTx } from '../db/index.ts';
import {
	kategorie,
	konto,
	kontoRolle,
	mitglied,
	partnerAnfrage,
	turnier,
	turniernummer,
	type KategorieStatus,
	type TurnierStatus
} from '../db/schema.ts';
import { namensSpalten } from '../namen.ts';
import { gueltigerCmAdmin, kontaktGueltig } from './kontakt.ts';
import type { Namensteile } from '../../name.ts';
import { istStufe } from '../../turnier/klassierung.ts';
import { vorSchluss, wirksamerStatus } from '../../turnier/status.ts';
import type { KategorieWerte, TurnierWerte } from './angaben.ts';

export type TurnierZeile = {
	id: number;
	jahr: number;
	name: string;
	anmeldeschluss: string;
	status: TurnierStatus;
	kategorien: number;
};

export type KategorieZeile = KategorieWerte & {
	id: number;
	status: KategorieStatus;
	/** Aktive Anmeldungen (FR-35, FR-36). */
	anmeldungen: number;
};

export type TurnierDetail = Omit<TurnierWerte, 'kontakt'> & {
	id: number;
	status: TurnierStatus;
	gespeicherterStatus: TurnierStatus;
	kategorien: KategorieZeile[];
	/** Gewählte Kontaktperson; `gueltig: false`, wenn sie nicht mehr gültig CM-Admin ist. */
	kontakt: { mitgliedId: number; name: Namensteile; gueltig: boolean } | null;
	/** Wer als Kontaktperson gewählt werden kann: alle gültigen CM-Admins. */
	kontaktWahl: { mitgliedId: number; name: Namensteile }[];
};

const namenOrdnung = new Intl.Collator('de-CH');

async function kontaktWahl(db: DbOderTx): Promise<TurnierDetail['kontaktWahl']> {
	const zeilen = await db
		.select({ mitgliedId: mitglied.id, ...namensSpalten })
		.from(mitglied)
		.innerJoin(konto, eq(konto.mitgliedId, mitglied.id))
		.innerJoin(kontoRolle, eq(kontoRolle.kontoId, konto.id))
		.where(gueltigerCmAdmin);
	return zeilen
		.map((z) => ({
			mitgliedId: z.mitgliedId,
			name: { rufname: z.rufname, vorname: z.vorname, nachname: z.nachname }
		}))
		.sort(
			(a, b) =>
				namenOrdnung.compare(a.name.nachname, b.name.nachname) ||
				namenOrdnung.compare(a.name.vorname, b.name.vorname)
		);
}

async function ladeKontakt(
	db: DbOderTx,
	mitgliedId: number | null
): Promise<TurnierDetail['kontakt']> {
	if (mitgliedId === null) return null;
	const [m] = await db.select(namensSpalten).from(mitglied).where(eq(mitglied.id, mitgliedId));
	if (!m) return null;
	return { mitgliedId, name: m, gueltig: await kontaktGueltig(db, mitgliedId) };
}

const UNIQUE_VERLETZT = '23505';

/** Name der verletzten Unique-Bedingung, sonst `null` (drizzle packt den Postgres-Fehler in `cause`). */
function uniqueVerletzung(fehler: unknown): string | null {
	const kandidaten = [fehler, (fehler as { cause?: unknown } | null)?.cause];
	for (const k of kandidaten) {
		const e = k as { code?: string; constraint_name?: string; constraint?: string } | null;
		if (e?.code === UNIQUE_VERLETZT) return e.constraint_name ?? e.constraint ?? '';
	}
	return null;
}

/** Gibt nur Fehler an die Aufrufer zurück, die die Unique-Bedingung `name` verletzen; alle anderen werden weitergeworfen. */
function pruefeVergeben(fehler: unknown, name: string): void {
	if (uniqueVerletzung(fehler) !== name) throw fehler;
}

function kategorieZeile(z: typeof kategorie.$inferSelect, anmeldungen: number): KategorieZeile {
	const stufe = (s: string | null) => (s !== null && istStufe(s) ? s : null);
	return {
		id: z.id,
		status: z.status,
		anmeldungen,
		name: z.name,
		geschlecht: z.geschlecht,
		art: z.art,
		jahrgangVon: z.jahrgangVon,
		jahrgangBis: z.jahrgangBis,
		klassierungVon: stufe(z.klassierungVon),
		klassierungBis: stufe(z.klassierungBis),
		mindestsumme: z.mindestsumme
	};
}

const kategorieSpalten = (w: KategorieWerte) => ({
	name: w.name,
	geschlecht: w.geschlecht,
	art: w.art,
	jahrgangVon: w.jahrgangVon,
	jahrgangBis: w.jahrgangBis,
	klassierungVon: w.klassierungVon,
	klassierungBis: w.klassierungBis,
	mindestsumme: w.mindestsumme
});

async function ersetzeNummern(tx: DbOderTx, turnierId: number, nummern: TurnierWerte['nummern']) {
	await tx.delete(turniernummer).where(eq(turniernummer.turnierId, turnierId));
	if (nummern.length === 0) return;
	await tx.insert(turniernummer).values(
		nummern.map((n, i) => ({
			turnierId,
			bezeichnung: n.bezeichnung,
			nummer: n.nummer,
			reihenfolge: i
		}))
	);
}

export async function listeTurniere(db: Db, jetzt: Date): Promise<TurnierZeile[]> {
	const zeilen = await db
		.select({
			id: turnier.id,
			jahr: turnier.jahr,
			name: turnier.name,
			anmeldeschluss: turnier.anmeldeschluss,
			status: turnier.status,
			kategorien: sql<number>`count(${kategorie.id})::int`
		})
		.from(turnier)
		.leftJoin(kategorie, and(eq(kategorie.turnierId, turnier.id), eq(kategorie.status, 'aktiv')))
		.groupBy(turnier.id)
		.orderBy(desc(turnier.jahr));
	return zeilen.map((z) => ({
		...z,
		status: wirksamerStatus(z.status, z.anmeldeschluss, jetzt)
	}));
}

export async function legeTurnierAn(
	db: Db,
	w: TurnierWerte
): Promise<{ ergebnis: 'ok'; id: number } | { ergebnis: 'vergeben' }> {
	try {
		const id = await db.transaction(async (tx) => {
			const [t] = await tx
				.insert(turnier)
				.values({ jahr: w.jahr, name: w.name, anmeldeschluss: w.anmeldeschluss })
				.returning({ id: turnier.id });
			await ersetzeNummern(tx, t.id, w.nummern);
			return t.id;
		});
		return { ergebnis: 'ok', id };
	} catch (f) {
		pruefeVergeben(f, 'turnier_jahr_unique');
		return { ergebnis: 'vergeben' };
	}
}

export async function ladeTurnier(db: Db, id: number, jetzt: Date): Promise<TurnierDetail | null> {
	const [t] = await db.select().from(turnier).where(eq(turnier.id, id));
	if (!t) return null;
	const nummern = await db
		.select()
		.from(turniernummer)
		.where(eq(turniernummer.turnierId, id))
		.orderBy(asc(turniernummer.reihenfolge));
	const kategorien = await db
		.select()
		.from(kategorie)
		.where(eq(kategorie.turnierId, id))
		.orderBy(asc(kategorie.id));
	return {
		id: t.id,
		jahr: t.jahr,
		name: t.name,
		anmeldeschluss: t.anmeldeschluss,
		nummern: nummern.map((n) => ({ bezeichnung: n.bezeichnung, nummer: n.nummer })),
		status: wirksamerStatus(t.status, t.anmeldeschluss, jetzt),
		gespeicherterStatus: t.status,
		kategorien: await Promise.all(
			kategorien.map(async (k) => kategorieZeile(k, await zaehleAktive(db, k.id)))
		),
		kontakt: await ladeKontakt(db, t.kontaktMitgliedId),
		kontaktWahl: await kontaktWahl(db)
	};
}

export async function aendereTurnier(
	db: Db,
	id: number,
	w: TurnierWerte
): Promise<'ok' | 'vergeben' | 'nicht-gefunden' | 'kontakt-ungueltig'> {
	try {
		return await db.transaction(async (tx) => {
			const [t] = await tx
				.select({ id: turnier.id, kontakt: turnier.kontaktMitgliedId })
				.from(turnier)
				.where(eq(turnier.id, id))
				.for('update');
			if (!t) return 'nicht-gefunden' as const;
			// Eine neue Wahl muss jetzt CM-Admin sein; die gespeicherte bleibt stehen, auch wenn sie
			// es nicht mehr ist, damit Name oder Anmeldeschluss änderbar bleiben (Mitglieder sehen sie nicht).
			const neu = w.kontakt !== undefined && w.kontakt !== null && w.kontakt !== t.kontakt;
			if (neu && !(await kontaktGueltig(tx, w.kontakt!))) return 'kontakt-ungueltig' as const;
			await tx
				.update(turnier)
				.set({
					jahr: w.jahr,
					name: w.name,
					anmeldeschluss: w.anmeldeschluss,
					...(w.kontakt === undefined ? {} : { kontaktMitgliedId: w.kontakt })
				})
				.where(eq(turnier.id, id));
			await ersetzeNummern(tx, id, w.nummern);
			return 'ok' as const;
		});
	} catch (f) {
		pruefeVergeben(f, 'turnier_jahr_unique');
		return 'vergeben';
	}
}

export async function setzeStatus(
	db: Db,
	id: number,
	ziel: 'offen' | 'geschlossen',
	jetzt: Date
): Promise<'ok' | 'schluss-vorbei' | 'keine-kategorie' | 'unzulaessig' | 'nicht-gefunden'> {
	return db.transaction(async (tx) => {
		const [t] = await tx.select().from(turnier).where(eq(turnier.id, id)).for('update');
		if (!t) return 'nicht-gefunden';
		const wirksam = wirksamerStatus(t.status, t.anmeldeschluss, jetzt);
		if (ziel === 'geschlossen') {
			if (wirksam !== 'offen') return 'unzulaessig';
		} else {
			if (wirksam === 'offen') return 'unzulaessig';
			const [{ n }] = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(kategorie)
				.where(and(eq(kategorie.turnierId, id), eq(kategorie.status, 'aktiv')));
			if (n === 0) return 'keine-kategorie';
			if (!vorSchluss(t.anmeldeschluss, jetzt)) return 'schluss-vorbei';
		}
		await tx.update(turnier).set({ status: ziel }).where(eq(turnier.id, id));
		return 'ok';
	});
}

export async function legeKategorieAn(
	db: Db,
	turnierId: number,
	w: KategorieWerte
): Promise<{ ergebnis: 'ok'; id: number } | { ergebnis: 'vergeben' | 'nicht-gefunden' }> {
	try {
		return await db.transaction(async (tx) => {
			const [t] = await tx
				.select({ id: turnier.id })
				.from(turnier)
				.where(eq(turnier.id, turnierId))
				.for('update');
			if (!t) return { ergebnis: 'nicht-gefunden' as const };
			const [k] = await tx
				.insert(kategorie)
				.values({ turnierId, ...kategorieSpalten(w) })
				.returning({ id: kategorie.id });
			return { ergebnis: 'ok' as const, id: k.id };
		});
	} catch (f) {
		pruefeVergeben(f, 'kategorie_name_aktiv_unique');
		return { ergebnis: 'vergeben' };
	}
}

export async function ladeKategorie(
	db: Db,
	id: number
): Promise<
	(KategorieZeile & { turnierId: number; turnierjahr: number; turniername: string }) | null
> {
	const [z] = await db
		.select({ k: kategorie, jahr: turnier.jahr, turniername: turnier.name })
		.from(kategorie)
		.innerJoin(turnier, eq(turnier.id, kategorie.turnierId))
		.where(eq(kategorie.id, id));
	if (!z) return null;
	return {
		...kategorieZeile(z.k, await zaehleAktive(db, id)),
		turnierId: z.k.turnierId,
		turnierjahr: z.jahr,
		turniername: z.turniername
	};
}

/** Eine gelöschte Partner-Anfrage: Wer sie gestellt hat, an wen, in welcher Kategorie. */
export type HinfaelligeAnfrage = {
	vonId: number;
	an: string;
	kategorie: string;
	turnierId: number;
};

/**
 * FR-48: löscht alle offenen Partner-Anfragen der Kategorie und gibt zurück, wer sie an wen
 * gestellt hatte, damit die Schnittstelle die Anfragenden benachrichtigen kann (FR-46).
 */
async function loescheAnfragenDerKategorie(
	tx: DbOderTx,
	kategorieId: number,
	kategorieName: string,
	turnierId: number
): Promise<HinfaelligeAnfrage[]> {
	const zeilen = await tx
		.delete(partnerAnfrage)
		.where(eq(partnerAnfrage.kategorieId, kategorieId))
		.returning({ vonId: partnerAnfrage.vonId, anId: partnerAnfrage.anId });
	if (zeilen.length === 0) return [];
	const namen = await tx
		.select({ id: mitglied.id, ...namensSpalten })
		.from(mitglied)
		.where(
			inArray(
				mitglied.id,
				zeilen.map((z) => z.anId)
			)
		);
	const nameVon = new Map(namen.map((n) => [n.id, nameFuerText(n)]));
	return zeilen.map((z) => ({
		vonId: z.vonId,
		an: nameVon.get(z.anId) ?? '',
		kategorie: kategorieName,
		turnierId
	}));
}

/**
 * FR-36: Passen aktive Anmeldungen nach den neuen Werten nicht mehr, speichert nur `trotzdem`.
 * Einzel oder Doppel wechseln geht nur ohne aktive Anmeldungen, auch mit `trotzdem` nicht
 * (`art-gesperrt`): Sonst würde aus einer Einzel-Anmeldung ungefragt ein *sucht Partner*. Nach
 * einem Wechsel sind die offenen Partner-Anfragen der Kategorie gelöscht (FR-48).
 * Gesperrt wird allein die Kategorie, nie eine Mitgliedszeile: So bleibt die Reihenfolge von
 * `meldeAn` (Mitglied, dann Kategorie) ohne Zyklus.
 */
export async function aendereKategorie(
	db: Db,
	id: number,
	w: KategorieWerte,
	trotzdem: boolean
): Promise<
	| { ergebnis: 'ok'; hinfaellig: HinfaelligeAnfrage[] }
	| 'vergeben'
	| 'abgesagt'
	| 'art-gesperrt'
	| 'nicht-gefunden'
	| { unpassend: number }
> {
	try {
		return await db.transaction(async (tx) => {
			const [k] = await tx.select().from(kategorie).where(eq(kategorie.id, id)).for('update');
			if (!k) return 'nicht-gefunden' as const;
			if (k.status === 'abgesagt') return 'abgesagt' as const;
			if (w.art !== k.art && (await zaehleAktive(tx, id)) > 0) return 'art-gesperrt' as const;
			if (!trotzdem) {
				const unpassend = await zaehleUnpassende(tx, id, w);
				if (unpassend > 0) return { unpassend };
			}
			await tx.update(kategorie).set(kategorieSpalten(w)).where(eq(kategorie.id, id));
			// FR-48: Wie beim Absagen: Nach dem Wechsel der Art ist keine offene Anfrage mehr gültig.
			// Die Meldung nennt den bisherigen Namen der Kategorie.
			const hinfaellig =
				w.art !== k.art ? await loescheAnfragenDerKategorie(tx, id, k.name, k.turnierId) : [];
			return { ergebnis: 'ok' as const, hinfaellig };
		});
	} catch (f) {
		pruefeVergeben(f, 'kategorie_name_aktiv_unique');
		return 'vergeben';
	}
}

/**
 * FR-35: Absagen geht nur ohne aktive Anmeldungen; Sperre wie bei `aendereKategorie`. Offene
 * Partner-Anfragen der Kategorie sind danach gelöscht (FR-48, Datensparsamkeit).
 */
export async function sageKategorieAb(
	db: Db,
	id: number
): Promise<
	{ ergebnis: 'ok'; hinfaellig: HinfaelligeAnfrage[] } | 'nicht-gefunden' | { aktiv: number }
> {
	return db.transaction(async (tx) => {
		const [k] = await tx
			.select({ id: kategorie.id, name: kategorie.name, turnierId: kategorie.turnierId })
			.from(kategorie)
			.where(eq(kategorie.id, id))
			.for('update');
		if (!k) return 'nicht-gefunden' as const;
		const aktiv = await zaehleAktive(tx, id);
		if (aktiv > 0) return { aktiv };
		await tx.update(kategorie).set({ status: 'abgesagt' }).where(eq(kategorie.id, id));
		const hinfaellig = await loescheAnfragenDerKategorie(tx, id, k.name, k.turnierId);
		return { ergebnis: 'ok' as const, hinfaellig };
	});
}
