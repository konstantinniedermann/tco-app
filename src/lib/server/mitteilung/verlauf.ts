// Verlauf der gesendeten Mitteilungen (FR-42, FR-45): nur Zahlen, nie die Namen der Empfänger.
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { anlass, mitglied, mitteilung, type Weg } from '../db/schema.ts';
import type { Zahlen } from './versand.ts';

/** Worauf sich eine Mitteilung bezieht: einen Anlass oder den ganzen Verein. */
export type Bezug = { art: 'anlass'; anlassId: number } | { art: 'verein' };

export type VerlaufEintrag = Zahlen & {
	gesendetAm: Date;
	/** `Nachname, Vorname` des Absenders; `null`, wenn es das Mitglied nicht mehr gibt. */
	absender: string | null;
	titel: string;
	text: string;
	auswahl: string;
	weg: Weg;
};

// FR-45: Ein Eintrag bleibt ein Jahr.
const AUFBEWAHRUNG_MS = 365 * 24 * 60 * 60 * 1000;

const nachBezug = (b: Bezug) =>
	b.art === 'anlass'
		? and(eq(mitteilung.bezug, 'anlass'), eq(mitteilung.anlassId, b.anlassId))
		: eq(mitteilung.bezug, 'verein');

/** Was die Mitteilungen zu einem Anlass brauchen (Vorlagen, Link); `null`, wenn es ihn nicht gibt. */
export async function ladeAnlassKopf(
	db: Db,
	id: number
): Promise<{ id: number; titel: string; beginn: Date; anmeldeschluss: Date } | null> {
	const [a] = await db
		.select({
			id: anlass.id,
			titel: anlass.titel,
			beginn: anlass.beginn,
			anmeldeschluss: anlass.anmeldeschluss
		})
		.from(anlass)
		.where(eq(anlass.id, id));
	return a ?? null;
}

/** Neueste zuerst. */
export async function ladeVerlauf(db: Db, b: Bezug): Promise<VerlaufEintrag[]> {
	return db
		.select({
			gesendetAm: mitteilung.gesendetAm,
			absender: sql<string | null>`${mitglied.nachname} || ', ' || ${mitglied.vorname}`,
			titel: mitteilung.titel,
			text: mitteilung.text,
			auswahl: mitteilung.auswahl,
			weg: mitteilung.weg,
			push: mitteilung.push,
			mails: mitteilung.mails,
			ersatzMails: mitteilung.ersatzMails,
			nichtErreichbar: mitteilung.nichtErreichbar
		})
		.from(mitteilung)
		.leftJoin(mitglied, eq(mitglied.id, mitteilung.absenderId))
		.where(nachBezug(b))
		.orderBy(desc(mitteilung.gesendetAm), desc(mitteilung.id));
}

/**
 * FR-45: Löscht zuerst alle Einträge (jeden Bezugs), die älter als ein Jahr sind, und schreibt
 * dann den neuen.
 */
export async function speichereMitteilung(
	db: Db,
	b: Bezug,
	e: Zahlen & { absenderId: number; titel: string; text: string; auswahl: string; weg: Weg },
	jetzt: Date
): Promise<void> {
	await db.transaction(async (tx) => {
		await tx
			.delete(mitteilung)
			.where(lt(mitteilung.gesendetAm, new Date(jetzt.getTime() - AUFBEWAHRUNG_MS)));
		await tx.insert(mitteilung).values({
			bezug: b.art,
			anlassId: b.art === 'anlass' ? b.anlassId : null,
			absenderId: e.absenderId,
			gesendetAm: jetzt,
			titel: e.titel,
			text: e.text,
			auswahl: e.auswahl,
			weg: e.weg,
			push: e.push,
			mails: e.mails,
			ersatzMails: e.ersatzMails,
			nichtErreichbar: e.nichtErreichbar
		});
	});
}
