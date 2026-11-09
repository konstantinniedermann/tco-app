// Kontaktperson eines Turniers: ein Mitglied, das gültig CM-Admin ist (aktiv, Konto nicht
// gesperrt, Rolle `cm`). Eigene Datei, weil Verwaltung (turniere.ts) und Mitglieder-Ansicht
// (cm/anmeldungen.ts) sie brauchen und sich sonst gegenseitig importieren würden.
import { and, eq } from 'drizzle-orm';
import type { DbOderTx } from '../db/index.ts';
import { konto, kontoRolle, mitglied } from '../db/schema.ts';

/** Gültig CM-Admin: Mitglied aktiv, Konto nicht gesperrt, Rolle `cm`. */
export const gueltigerCmAdmin = and(
	eq(mitglied.status, 'aktiv'),
	eq(konto.gesperrt, false),
	eq(kontoRolle.rolle, 'cm')
);

/** Kann dieses Mitglied jetzt Kontaktperson sein (bzw. es bleiben, für die Mitglieder)? */
export async function kontaktGueltig(db: DbOderTx, mitgliedId: number): Promise<boolean> {
	const [z] = await db
		.select({ id: mitglied.id })
		.from(mitglied)
		.innerJoin(konto, eq(konto.mitgliedId, mitglied.id))
		.innerJoin(kontoRolle, eq(kontoRolle.kontoId, konto.id))
		.where(and(eq(mitglied.id, mitgliedId), gueltigerCmAdmin));
	return z !== undefined;
}
