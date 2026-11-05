// Anlässe anlegen, ändern, löschen und An- oder Abmelden (A-ANLASS-01, FR-27 bis FR-32).
import { randomBytes } from 'node:crypto';
import { and, asc, desc, eq, gt, sql } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { anlass, anlassAnmeldung, mitglied, type Antwort } from '../db/schema.ts';
import type { AnlassWerte } from './angaben.ts';
import type { KalenderAnlass } from './kalender.ts';

export type AnlassMitglied = {
	id: number;
	titel: string;
	beginn: Date;
	ort: string;
	einladung: string;
	anmeldeschluss: Date;
	offen: boolean;
	antwort: Antwort | null;
	bemerkung: string | null;
	zuPruefen: boolean;
	kalenderKennung: string;
};

export type AnlassListe = {
	id: number;
	titel: string;
	beginn: Date;
	anmeldeschluss: Date;
	kommen: number;
	kommenNicht: number;
};

export type AnlassAdmin = AnlassWerte & {
	id: number;
	zahlen: { kommen: number; kommenNicht: number; keineAntwort: number };
	anmeldungen: { name: string; antwort: Antwort; bemerkung: string | null; geaendertAm: Date }[];
};

const neueKennung = () => randomBytes(32).toString('base64url');
const MINUTE_MS = 60 * 1000;

/** FR-28: Der Anmeldeschluss ist minutengenau; seine Minute zählt ganz dazu. */
export const istOffen = (anmeldeschluss: Date, jetzt: Date) =>
	jetzt.getTime() < anmeldeschluss.getTime() + MINUTE_MS;

export async function legeAnlassAn(db: Db, erstelltVon: number, w: AnlassWerte): Promise<number> {
	const [a] = await db
		.insert(anlass)
		.values({ ...w, erstelltVon, kalenderKennung: neueKennung() })
		.returning({ id: anlass.id });
	return a.id;
}

export async function aendereAnlass(
	db: Db,
	id: number,
	w: AnlassWerte,
	jetzt: Date
): Promise<'ok' | 'nicht-gefunden'> {
	return db.transaction(async (tx) => {
		const [alt] = await tx
			.select({ beginn: anlass.beginn, ort: anlass.ort })
			.from(anlass)
			.where(eq(anlass.id, id))
			.for('update');
		if (!alt) return 'nicht-gefunden';
		const terminGeaendert = alt.beginn.getTime() !== w.beginn.getTime() || alt.ort !== w.ort;
		await tx
			.update(anlass)
			.set({ ...w, ...(terminGeaendert ? { terminGeaendertAm: jetzt } : {}) })
			.where(eq(anlass.id, id));
		return 'ok';
	});
}

export async function loescheAnlass(db: Db, id: number): Promise<'ok' | 'nicht-gefunden'> {
	const weg = await db.delete(anlass).where(eq(anlass.id, id)).returning({ id: anlass.id });
	return weg.length > 0 ? 'ok' : 'nicht-gefunden';
}

function fuerMitglied(db: Db, mitgliedId: number) {
	return db
		.select({
			id: anlass.id,
			titel: anlass.titel,
			beginn: anlass.beginn,
			ort: anlass.ort,
			einladung: anlass.einladung,
			anmeldeschluss: anlass.anmeldeschluss,
			kalenderKennung: anlass.kalenderKennung,
			terminGeaendertAm: anlass.terminGeaendertAm,
			antwort: anlassAnmeldung.antwort,
			bemerkung: anlassAnmeldung.bemerkung,
			geaendertAm: anlassAnmeldung.geaendertAm
		})
		.from(anlass)
		.leftJoin(
			anlassAnmeldung,
			and(eq(anlassAnmeldung.anlassId, anlass.id), eq(anlassAnmeldung.mitgliedId, mitgliedId))
		);
}

type Zeile = Awaited<ReturnType<typeof fuerMitglied>>[number];

function alsAnsicht(z: Zeile, jetzt: Date): AnlassMitglied {
	const { terminGeaendertAm, geaendertAm, ...rest } = z;
	const offen = istOffen(z.anmeldeschluss, jetzt);
	return {
		...rest,
		offen,
		// Nach dem Anmeldeschluss lässt sich nichts mehr ändern, also auch nichts mehr prüfen.
		zuPruefen:
			offen &&
			geaendertAm !== null &&
			terminGeaendertAm !== null &&
			geaendertAm.getTime() < terminGeaendertAm.getTime()
	};
}

/** FR-27: alle Anlässe, deren Beginn noch kommt, der nächste zuerst. */
export async function kommendeAnlaesse(
	db: Db,
	mitgliedId: number,
	jetzt: Date
): Promise<AnlassMitglied[]> {
	const zeilen = await fuerMitglied(db, mitgliedId)
		.where(gt(anlass.beginn, jetzt))
		.orderBy(asc(anlass.beginn), asc(anlass.id));
	return zeilen.map((z) => alsAnsicht(z, jetzt));
}

export async function ladeAnlassFuerMitglied(
	db: Db,
	id: number,
	mitgliedId: number,
	jetzt: Date
): Promise<AnlassMitglied | null> {
	const [z] = await fuerMitglied(db, mitgliedId).where(eq(anlass.id, id));
	return z ? alsAnsicht(z, jetzt) : null;
}

/** FR-28 bis FR-30: Antwort setzen oder ersetzen, nur bis und mit Anmeldeschluss. */
export async function melde(
	db: Db,
	anlassId: number,
	mitgliedId: number,
	a: { antwort: Antwort; bemerkung: string | null },
	jetzt: Date
): Promise<'ok' | 'geschlossen' | 'nicht-gefunden'> {
	return db.transaction(async (tx) => {
		const [z] = await tx
			.select({ anmeldeschluss: anlass.anmeldeschluss })
			.from(anlass)
			.where(eq(anlass.id, anlassId))
			.for('share');
		if (!z) return 'nicht-gefunden';
		if (!istOffen(z.anmeldeschluss, jetzt)) return 'geschlossen';
		const werte = {
			antwort: a.antwort,
			bemerkung: a.antwort === 'kommt' ? null : a.bemerkung,
			geaendertAm: jetzt
		};
		await tx
			.insert(anlassAnmeldung)
			.values({ anlassId, mitgliedId, ...werte })
			.onConflictDoUpdate({
				target: [anlassAnmeldung.anlassId, anlassAnmeldung.mitgliedId],
				set: werte
			});
		return 'ok';
	});
}

const zaehle = (antwort: Antwort) =>
	sql<number>`count(${anlassAnmeldung.mitgliedId}) filter (where ${anlassAnmeldung.antwort} = ${antwort})`.mapWith(
		Number
	);

export async function listeAnlaesse(db: Db): Promise<AnlassListe[]> {
	return db
		.select({
			id: anlass.id,
			titel: anlass.titel,
			beginn: anlass.beginn,
			anmeldeschluss: anlass.anmeldeschluss,
			kommen: zaehle('kommt'),
			kommenNicht: zaehle('kommt-nicht')
		})
		.from(anlass)
		.leftJoin(anlassAnmeldung, eq(anlassAnmeldung.anlassId, anlass.id))
		.groupBy(anlass.id)
		.orderBy(desc(anlass.beginn), desc(anlass.id));
}

export async function ladeAnlassAdmin(db: Db, id: number): Promise<AnlassAdmin | null> {
	const [a] = await db
		.select({
			id: anlass.id,
			titel: anlass.titel,
			beginn: anlass.beginn,
			ort: anlass.ort,
			einladung: anlass.einladung,
			anmeldeschluss: anlass.anmeldeschluss
		})
		.from(anlass)
		.where(eq(anlass.id, id));
	if (!a) return null;
	const anmeldungen = await db
		.select({
			name: sql<string>`${mitglied.vorname} || ' ' || ${mitglied.nachname}`,
			antwort: anlassAnmeldung.antwort,
			bemerkung: anlassAnmeldung.bemerkung,
			geaendertAm: anlassAnmeldung.geaendertAm
		})
		.from(anlassAnmeldung)
		.innerJoin(mitglied, eq(mitglied.id, anlassAnmeldung.mitgliedId))
		.where(eq(anlassAnmeldung.anlassId, id))
		.orderBy(asc(mitglied.nachname), asc(mitglied.vorname), asc(mitglied.id));
	// Noch keine Antwort: aktive Mitglieder ohne Anmeldung, auch solche ohne Login.
	const [{ keineAntwort }] = await db
		.select({ keineAntwort: sql<number>`count(*)`.mapWith(Number) })
		.from(mitglied)
		.where(
			and(
				eq(mitglied.status, 'aktiv'),
				sql`not exists (select 1 from ${anlassAnmeldung} where ${anlassAnmeldung.anlassId} = ${id} and ${anlassAnmeldung.mitgliedId} = ${mitglied.id})`
			)
		);
	const zahl = (antwort: Antwort) => anmeldungen.filter((z) => z.antwort === antwort).length;
	return {
		...a,
		zahlen: { kommen: zahl('kommt'), kommenNicht: zahl('kommt-nicht'), keineAntwort },
		anmeldungen
	};
}

export async function ladeKalenderAnlass(db: Db, kennung: string): Promise<KalenderAnlass | null> {
	const [a] = await db
		.select({
			kennung: anlass.kalenderKennung,
			titel: anlass.titel,
			beginn: anlass.beginn,
			ort: anlass.ort,
			einladung: anlass.einladung
		})
		.from(anlass)
		.where(eq(anlass.kalenderKennung, kennung));
	return a ?? null;
}
