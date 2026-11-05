import { eq } from 'drizzle-orm';
import { pruefeAngaben, type Angaben, type Feld } from '../admin/angaben.ts';
import { angabenAusZeile } from '../admin/mitglieder.ts';
import { geaenderteFelder, schreibeVerlauf } from '../admin/verlauf.ts';
import type { Db, DbOderTx } from '../db/index.ts';
import { mitglied } from '../db/schema.ts';

// Annahme K-19.1: Telefon und Lizenznummer pflegt das Mitglied selbst.
// Annahme K-19.2: Die Adresse (Strasse, PLZ, Ort) pflegt das Mitglied selbst.
// Name, Jahrgang, Geschlecht, Mitgliedernummer und E-Mail bleiben beim Admin bzw. beim Wechsel-Ablauf.
export const EIGENE_FELDER = ['telefon', 'strasse', 'plz', 'ort', 'lizenznummer'] as const;
export type EigenesFeld = (typeof EIGENE_FELDER)[number];

// Annahme K-19.2: Diese Felder führt der Verein zusätzlich in Fairgate; ändert sich eines,
// steht das Mitglied auf der Liste «Für Fairgate». Die Lizenznummer gehört nicht dazu.
export const FAIRGATE_FELDER: readonly Feld[] = ['email', 'telefon', 'strasse', 'plz', 'ort'];

export type EigeneAngaben = Angaben;

export async function ladeEigeneAngaben(
	db: DbOderTx,
	mitgliedId: number
): Promise<EigeneAngaben | null> {
	const [zeile] = await db.select().from(mitglied).where(eq(mitglied.id, mitgliedId));
	return zeile ? angabenAusZeile(zeile) : null;
}

/**
 * Speichert die eigenen Angaben, wenn das Mitglied noch so aussieht wie `vorher` (der Stand,
 * den die Seite geladen hat). Sonst `veraltet`, z. B. wenn ein zweiter Tab inzwischen gespeichert
 * hat. Schlüssel ausserhalb von `EIGENE_FELDER` werden still ignoriert.
 */
export async function aendereEigeneAngaben(
	db: Db,
	mitgliedId: number,
	neu: Partial<Record<EigenesFeld, unknown>>,
	vorher: EigeneAngaben,
	jetzt: Date
): Promise<
	| { ergebnis: 'ok'; geaendert: Feld[] }
	| { ergebnis: 'eingabe'; fehler: Partial<Record<Feld, string>> }
	| { ergebnis: 'veraltet' }
	| { ergebnis: 'nicht-gefunden' }
> {
	return db.transaction(async (tx) => {
		const [alt] = await tx.select().from(mitglied).where(eq(mitglied.id, mitgliedId)).for('update');
		if (!alt) return { ergebnis: 'nicht-gefunden' as const };
		const gespeichert = angabenAusZeile(alt);
		if (geaenderteFelder(gespeichert, vorher).length > 0) return { ergebnis: 'veraltet' as const };

		const eigene: Partial<Record<EigenesFeld, unknown>> = {};
		for (const feld of EIGENE_FELDER) {
			if (feld in neu) eigene[feld] = neu[feld];
		}
		const pruefung = pruefeAngaben(
			{ ...gespeichert, ...eigene },
			{ nummerPflicht: false, jahr: jetzt.getFullYear() }
		);
		if (!pruefung.ok) return { ergebnis: 'eingabe' as const, fehler: pruefung.fehler };

		// Nur eigene Felder zählen: Normalisierung fremder Felder soll nichts verändern.
		const geaendert = geaenderteFelder(gespeichert, pruefung.angaben).filter((f) =>
			(EIGENE_FELDER as readonly Feld[]).includes(f)
		);
		if (geaendert.length === 0) return { ergebnis: 'ok' as const, geaendert };

		const werte = Object.fromEntries(EIGENE_FELDER.map((f) => [f, pruefung.angaben[f]]));
		const fuerFairgate = geaendert.some((f) => FAIRGATE_FELDER.includes(f));
		await tx
			.update(mitglied)
			.set(fuerFairgate ? { ...werte, fairgateOffenSeit: jetzt } : werte)
			.where(eq(mitglied.id, mitgliedId));
		await schreibeVerlauf(
			tx,
			mitgliedId,
			{ art: 'mitglied', mitgliedId },
			geaendert.map((feld) => ({ aktion: 'feld-geaendert' as const, detail: feld })),
			jetzt
		);
		return { ergebnis: 'ok' as const, geaendert };
	});
}
