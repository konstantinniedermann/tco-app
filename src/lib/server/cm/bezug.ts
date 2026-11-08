import { and, eq, inArray, or } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { anmeldung, anmeldungSpieler, kategorie, mitglied, partnerAnfrage } from '../db/schema.ts';
import { namensSpalten } from '../namen.ts';
import { nameFuerText } from './anmeldungen.ts';

export type Bezug = { turnierId: number; kategorie: string };

/** Turnier und Name der Kategorie, für die Bestätigungsmail nach dem Anmelden. */
export async function bezugDerKategorie(db: Db, kategorieId: number): Promise<Bezug | null> {
	const [z] = await db
		.select({ turnierId: kategorie.turnierId, kategorie: kategorie.name })
		.from(kategorie)
		.where(eq(kategorie.id, kategorieId));
	return z ?? null;
}

/** Wie `bezugDerKategorie`, aber über die eigene aktive Anmeldung; vor dem Abmelden zu lesen. */
export async function bezugDerAnmeldung(
	db: Db,
	anmeldungId: number,
	mitgliedId: number
): Promise<Bezug | null> {
	const [z] = await db
		.select({ turnierId: kategorie.turnierId, kategorie: kategorie.name })
		.from(anmeldung)
		.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.where(
			and(
				eq(anmeldung.id, anmeldungId),
				eq(anmeldungSpieler.mitgliedId, mitgliedId),
				inArray(anmeldung.status, ['bestaetigt', 'beantragt'])
			)
		);
	return z ?? null;
}

export async function mitgliedEmail(db: Db, mitgliedId: number): Promise<string | null> {
	const [z] = await db
		.select({ email: mitglied.email })
		.from(mitglied)
		.where(eq(mitglied.id, mitgliedId));
	return z?.email ?? null;
}

/** Kurze Textform «Hannes (Johannes Muster)» für die Meldungen an den jeweils anderen; nie Kontaktdaten. */
export async function mitgliedName(db: Db, mitgliedId: number): Promise<string | null> {
	const [z] = await db.select(namensSpalten).from(mitglied).where(eq(mitglied.id, mitgliedId));
	return z ? nameFuerText(z) : null;
}

/** Wie `bezugDerKategorie`, über eine Anfrage, an der man als Anfragender oder Angefragter beteiligt ist. */
export async function bezugDerAnfrage(
	db: Db,
	anfrageId: number,
	mitgliedId: number
): Promise<Bezug | null> {
	const [z] = await db
		.select({ turnierId: kategorie.turnierId, kategorie: kategorie.name })
		.from(partnerAnfrage)
		.innerJoin(kategorie, eq(kategorie.id, partnerAnfrage.kategorieId))
		.where(
			and(
				eq(partnerAnfrage.id, anfrageId),
				or(eq(partnerAnfrage.vonId, mitgliedId), eq(partnerAnfrage.anId, mitgliedId))
			)
		);
	return z ?? null;
}
