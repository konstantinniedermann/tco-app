// Turniere und Kategorien speichern, Anmeldung öffnen und schliessen (FR-33 bis FR-35).
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { zaehleAktive, zaehleUnpassende } from '../cm/anmeldungen.ts';
import type { Db, DbOderTx } from '../db/index.ts';
import {
	kategorie,
	turnier,
	turniernummer,
	type KategorieStatus,
	type TurnierStatus
} from '../db/schema.ts';
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

export type TurnierDetail = TurnierWerte & {
	id: number;
	status: TurnierStatus;
	gespeicherterStatus: TurnierStatus;
	kategorien: KategorieZeile[];
};

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
		)
	};
}

export async function aendereTurnier(
	db: Db,
	id: number,
	w: TurnierWerte
): Promise<'ok' | 'vergeben' | 'nicht-gefunden'> {
	try {
		return await db.transaction(async (tx) => {
			const [t] = await tx
				.select({ id: turnier.id })
				.from(turnier)
				.where(eq(turnier.id, id))
				.for('update');
			if (!t) return 'nicht-gefunden' as const;
			await tx
				.update(turnier)
				.set({ jahr: w.jahr, name: w.name, anmeldeschluss: w.anmeldeschluss })
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

/**
 * FR-36: Passen aktive Anmeldungen nach den neuen Werten nicht mehr, speichert nur `trotzdem`.
 * Gesperrt wird allein die Kategorie (Reihenfolge wie `meldeAn`: Mitglied, dann Kategorie).
 */
export async function aendereKategorie(
	db: Db,
	id: number,
	w: KategorieWerte,
	trotzdem: boolean
): Promise<'ok' | 'vergeben' | 'abgesagt' | 'nicht-gefunden' | { unpassend: number }> {
	try {
		return await db.transaction(async (tx) => {
			const [k] = await tx.select().from(kategorie).where(eq(kategorie.id, id)).for('update');
			if (!k) return 'nicht-gefunden' as const;
			if (k.status === 'abgesagt') return 'abgesagt' as const;
			if (!trotzdem) {
				const unpassend = await zaehleUnpassende(tx, id, w);
				if (unpassend > 0) return { unpassend };
			}
			await tx.update(kategorie).set(kategorieSpalten(w)).where(eq(kategorie.id, id));
			return 'ok' as const;
		});
	} catch (f) {
		pruefeVergeben(f, 'kategorie_name_aktiv_unique');
		return 'vergeben';
	}
}

/** FR-35: Absagen geht nur ohne aktive Anmeldungen; Sperre wie bei `aendereKategorie`. */
export async function sageKategorieAb(
	db: Db,
	id: number
): Promise<'ok' | 'nicht-gefunden' | { aktiv: number }> {
	return db.transaction(async (tx) => {
		const [k] = await tx
			.select({ id: kategorie.id })
			.from(kategorie)
			.where(eq(kategorie.id, id))
			.for('update');
		if (!k) return 'nicht-gefunden' as const;
		const aktiv = await zaehleAktive(tx, id);
		if (aktiv > 0) return { aktiv };
		await tx.update(kategorie).set({ status: 'abgesagt' }).where(eq(kategorie.id, id));
		return 'ok' as const;
	});
}
