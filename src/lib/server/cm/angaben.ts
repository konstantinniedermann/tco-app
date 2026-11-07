// Klassierung, Geschlecht und Jahrgang für die CM-Anmeldung nachtragen (FR-37).
import { eq } from 'drizzle-orm';
import { utcZuZuerich } from '../../anlass/zeit.ts';
import { istKlassierung, type Klassierung } from '../../turnier/klassierung.ts';
import { fehlendeAngaben, type CmAngabe, type Spieler } from '../../turnier/passung.ts';
import { schreibeVerlauf, type Urheber } from '../admin/verlauf.ts';
import type { Db } from '../db/index.ts';
import { mitglied } from '../db/schema.ts';

export type CmFeld = CmAngabe;

/** Kalenderjahr in Schweizer Zeit. */
export const jahrInZuerich = (jetzt: Date): number => Number(utcZuZuerich(jetzt).slice(0, 4));

/** Angaben eines Spielers aus der Mitgliederzeile; unbekannte Werte gelten als fehlend. */
export function spielerAus(z: {
	geschlecht: string | null;
	jahrgang: number | null;
	klassierung: string | null;
}): Spieler {
	return {
		geschlecht: z.geschlecht === 'w' || z.geschlecht === 'm' ? z.geschlecht : null,
		jahrgang: z.jahrgang,
		klassierung: istKlassierung(z.klassierung) ? z.klassierung : null
	};
}

const MELDUNG = {
	klassierung: 'Bitte deine Klassierung wählen.',
	geschlecht: 'Bitte wählen.',
	jahrgang: (jahr: number) => `Bitte ein Jahr zwischen 1900 und ${jahr} angeben.`
};

const leer = (w: unknown) => w === undefined || w === null || w === '';

function leseJahrgang(w: unknown, jahr: number): number | null {
	const text = typeof w === 'number' ? String(w) : typeof w === 'string' ? w.trim() : '';
	if (!/^\d{4}$/.test(text)) return null;
	const zahl = Number(text);
	return zahl >= 1900 && zahl <= jahr ? zahl : null;
}

/**
 * FR-37: Pflicht sind genau die Angaben, die heute fehlen; die Klassierung darf zusätzlich
 * kommen. Schon gesetzte Geschlecht und Jahrgang werden still ignoriert. Unbekannte Schlüssel
 * auch. `fairgateOffenSeit` bleibt: diese Angaben führt der Verein nicht in Fairgate nach.
 */
export async function trageCmAngabenNach(
	db: Db,
	mitgliedId: number,
	roh: Record<string, unknown>,
	jetzt: Date
): Promise<
	| { ergebnis: 'ok' }
	| { ergebnis: 'eingabe'; felder: Partial<Record<CmFeld, string>> }
	| { ergebnis: 'nicht-gefunden' }
> {
	return db.transaction(async (tx) => {
		const [z] = await tx
			.select({
				geschlecht: mitglied.geschlecht,
				jahrgang: mitglied.jahrgang,
				klassierung: mitglied.klassierung
			})
			.from(mitglied)
			.where(eq(mitglied.id, mitgliedId))
			.for('update');
		if (!z) return { ergebnis: 'nicht-gefunden' as const };
		const alt = spielerAus(z);
		const fehlt = fehlendeAngaben(alt);
		const jahr = jahrInZuerich(jetzt);
		const felder: Partial<Record<CmFeld, string>> = {};
		const neu: Partial<Spieler> = {};

		if (fehlt.includes('klassierung') || !leer(roh.klassierung)) {
			if (istKlassierung(roh.klassierung)) neu.klassierung = roh.klassierung as Klassierung;
			else felder.klassierung = MELDUNG.klassierung;
		}
		if (fehlt.includes('geschlecht')) {
			if (roh.geschlecht === 'w' || roh.geschlecht === 'm') neu.geschlecht = roh.geschlecht;
			else felder.geschlecht = MELDUNG.geschlecht;
		}
		if (fehlt.includes('jahrgang')) {
			const j = leseJahrgang(roh.jahrgang, jahr);
			if (j !== null) neu.jahrgang = j;
			else felder.jahrgang = MELDUNG.jahrgang(jahr);
		}
		if (Object.keys(felder).length > 0) return { ergebnis: 'eingabe' as const, felder };

		const geaendert = (Object.keys(neu) as CmFeld[]).filter((f) => neu[f] !== alt[f]);
		if (geaendert.length === 0) return { ergebnis: 'ok' as const };
		await tx
			.update(mitglied)
			.set(Object.fromEntries(geaendert.map((f) => [f, neu[f]])))
			.where(eq(mitglied.id, mitgliedId));
		await schreibeVerlauf(
			tx,
			mitgliedId,
			{ art: 'mitglied', mitgliedId },
			geaendert.map((detail) => ({ aktion: 'feld-geaendert' as const, detail })),
			jetzt
		);
		return { ergebnis: 'ok' as const };
	});
}

/** FR-37: Klassierung im Profil ändern; der gleiche Wert ist `ok` ohne Verlauf. */
export async function setzeKlassierung(
	db: Db,
	mitgliedId: number,
	wert: unknown,
	jetzt: Date
): Promise<'ok' | 'eingabe' | 'nicht-gefunden'> {
	if (!istKlassierung(wert)) return 'eingabe';
	return schreibeKlassierung(db, mitgliedId, wert, { art: 'mitglied', mitgliedId }, jetzt);
}

/**
 * Klassierung setzen und im Verlauf mit `urheber` festhalten (FR-26); der gleiche Wert ist `ok`
 * ohne Verlauf. Das Mitglied selbst und der CM-Admin ändern dasselbe Feld (Teil 2, Ziel 1).
 */
export async function schreibeKlassierung(
	db: Db,
	mitgliedId: number,
	wert: Klassierung,
	urheber: Urheber,
	jetzt: Date
): Promise<'ok' | 'nicht-gefunden'> {
	return db.transaction(async (tx) => {
		const [z] = await tx
			.select({ klassierung: mitglied.klassierung, status: mitglied.status })
			.from(mitglied)
			.where(eq(mitglied.id, mitgliedId))
			.for('update');
		// Von einem gelöschten Mitglied bleibt nur der Name (FR-04).
		if (!z || z.status === 'geloescht') return 'nicht-gefunden';
		if (z.klassierung === wert) return 'ok';
		await tx.update(mitglied).set({ klassierung: wert }).where(eq(mitglied.id, mitgliedId));
		await schreibeVerlauf(
			tx,
			mitgliedId,
			urheber,
			[{ aktion: 'feld-geaendert', detail: 'klassierung' }],
			jetzt
		);
		return 'ok';
	});
}
