// Namensspalten und Namenssuche für alle Abfragen, die einen Namen im Stil der App zeigen.
import { or, sql, type SQL } from 'drizzle-orm';
import { mitglied } from './db/schema.ts';

/** Die Spalten, aus denen `Namensteile` entsteht (`src/lib/name.ts`). */
export const namensSpalten = {
	rufname: mitglied.rufname,
	vorname: mitglied.vorname,
	nachname: mitglied.nachname
};

/**
 * Trifft, wenn der Name das Muster enthält: Rufname, Vor- oder Nachname allein, «Vorname Nachname»
 * oder «Nachname, Vorname». `muster` ist ein fertiges LIKE-Muster mit maskierten Platzhaltern.
 */
export function nameEnthaelt(muster: string): SQL {
	return or(
		sql`${mitglied.vorname} || ' ' || ${mitglied.nachname} ilike ${muster}`,
		sql`${mitglied.nachname} || ' ' || ${mitglied.vorname} ilike ${muster}`,
		sql`${mitglied.nachname} || ', ' || ${mitglied.vorname} ilike ${muster}`,
		sql`${mitglied.rufname} ilike ${muster}`
	)!;
}
