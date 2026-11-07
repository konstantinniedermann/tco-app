// Austritt und Vormerken: kommende CM-Anmeldungen zurückziehen (Etappe 3 von #43).
import { and, eq, inArray } from 'drizzle-orm';
import type { DbOderTx } from '../db/index.ts';
import { anmeldung, anmeldungSpieler, kategorie, turnier } from '../db/schema.ts';
import { wirksamerStatus } from '../../turnier/status.ts';
import { istAktiv } from './anmeldungen.ts';

/**
 * Zieht die aktiven Einzel-Anmeldungen des Mitglieds zurück, solange die Anmeldung des Turniers
 * offen ist. Danach bleiben sie stehen; Doppel regelt #59. Keine Mitteilung. Gibt die Anzahl zurück.
 */
export async function zieheOffeneEinzelZurueck(
	tx: DbOderTx,
	mitgliedId: number,
	jetzt: Date
): Promise<number> {
	const zeilen = await tx
		.select({
			id: anmeldung.id,
			status: turnier.status,
			anmeldeschluss: turnier.anmeldeschluss
		})
		.from(anmeldung)
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
		.innerJoin(turnier, eq(turnier.id, kategorie.turnierId))
		.where(and(eq(anmeldungSpieler.mitgliedId, mitgliedId), eq(kategorie.art, 'einzel'), istAktiv));
	const ids = zeilen
		.filter((z) => wirksamerStatus(z.status, z.anmeldeschluss, jetzt) === 'offen')
		.map((z) => z.id);
	if (ids.length === 0) return 0;
	// Nur, was noch aktiv ist: Eine Abmeldung dazwischen bleibt, wie sie ist.
	const zurueck = await tx
		.update(anmeldung)
		.set({ status: 'zurueckgezogen', geaendertAm: jetzt })
		.where(and(inArray(anmeldung.id, ids), istAktiv))
		.returning({ id: anmeldung.id });
	return zurueck.length;
}
