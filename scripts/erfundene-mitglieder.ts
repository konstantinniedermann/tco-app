// Erfundene Mitglieder für die lokale Datenbank (seed-lokal.ts) und die Test-Umgebung
// (testdaten.ts). Keine echten Personendaten (DS-08); alle Adressen unter example.org.
import { eq } from 'drizzle-orm';
import type { Db } from '../src/lib/server/db/index.ts';
import { konto, mitglied } from '../src/lib/server/db/schema.ts';

export const ERFUNDENE_MITGLIEDER: readonly { vorname: string; nachname: string; email: string }[] =
	[
		{ vorname: 'Erika', nachname: 'Beispiel', email: 'erika.beispiel@example.org' },
		{ vorname: 'Kurt', nachname: 'Erfunden', email: 'kurt.erfunden@example.org' },
		{ vorname: 'Hanna', nachname: 'Muster', email: 'hanna.muster@example.org' }
	];

/** Legt die erfundenen Mitglieder samt Konto an und gibt die Konto-IDs in derselben Reihenfolge. */
export async function legeErfundeneMitgliederAn(db: Db): Promise<number[]> {
	const kontoIds: number[] = [];
	for (const m of ERFUNDENE_MITGLIEDER) {
		// Mehrfach ausführbar: vorhandene Mitglieder und Konten bleiben, wie sie sind.
		await db
			.insert(mitglied)
			.values({ ...m, strasse: 'Erfundenweg 1', plz: '4600', ort: 'Olten' })
			.onConflictDoNothing({ target: mitglied.email });
		const [{ id: mitgliedId }] = await db
			.select({ id: mitglied.id })
			.from(mitglied)
			.where(eq(mitglied.email, m.email));
		await db.insert(konto).values({ mitgliedId }).onConflictDoNothing({ target: konto.mitgliedId });
		const [{ id }] = await db
			.select({ id: konto.id })
			.from(konto)
			.where(eq(konto.mitgliedId, mitgliedId));
		kontoIds.push(id);
	}
	return kontoIds;
}
