import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { konto, mitglied } from '../db/schema.ts';
import { pruefeAngaben, type Feld } from './angaben.ts';
import { legeMitgliedAn } from './mitglieder.ts';
import { ladeRollen, setzeRollen } from './rollen.ts';

export type AdminFestgelegt =
	| { ergebnis: 'angelegt' | 'rolle-vergeben' | 'schon-admin' }
	| { ergebnis: 'fehler'; fehler: Partial<Record<Feld, string>> };

/** Gibt dem Konto die Rolle admin und behält die übrigen Rollen. Urheber: automatisch. */
export async function machAdmin(db: Db, kontoId: number, jetzt: Date): Promise<void> {
	const rollen = await ladeRollen(db, kontoId);
	if (rollen.includes('admin')) return;
	await setzeRollen(db, { art: 'automatisch' }, kontoId, [...rollen, 'admin'], jetzt);
}

// Bestehendes Mitglied: gleiche Mitgliedernummer oder gleiche E-Mail (ohne Gross-/Kleinschreibung).
async function findeKonto(db: Db, nummer: string | null, email: string): Promise<number | null> {
	const suche = async (bedingung: ReturnType<typeof eq> | ReturnType<typeof sql>) => {
		const [m] = await db.select({ id: mitglied.id }).from(mitglied).where(bedingung);
		if (!m) return null;
		await db.insert(konto).values({ mitgliedId: m.id }).onConflictDoNothing();
		const [k] = await db.select({ id: konto.id }).from(konto).where(eq(konto.mitgliedId, m.id));
		return k.id;
	};
	if (nummer) {
		const ueberNummer = await suche(eq(mitglied.mitgliedernummer, nummer));
		if (ueberNummer !== null) return ueberNummer;
	}
	return suche(sql`lower(${mitglied.email}) = lower(${email})`);
}

/**
 * Serverbefehl für den ersten Admin: legt das Mitglied an und gibt ihm die Rolle admin. Gibt es
 * das Mitglied schon (Nummer oder E-Mail), bekommt es nur die Rolle. Prüfung wie beim Anlegen
 * durch einen Admin, die Mitgliedernummer ist Pflicht.
 */
export async function legeAdminFest(
	db: Db,
	roh: Record<string, string | undefined>,
	jetzt: Date
): Promise<AdminFestgelegt> {
	const pruefung = pruefeAngaben(roh, { nummerPflicht: true, jahr: jetzt.getFullYear() });
	if (!pruefung.ok) return { ergebnis: 'fehler', fehler: pruefung.fehler };
	const { angaben } = pruefung;

	const vorhanden = await findeKonto(db, angaben.mitgliedernummer, angaben.email);
	if (vorhanden !== null) {
		if ((await ladeRollen(db, vorhanden)).includes('admin')) return { ergebnis: 'schon-admin' };
		await machAdmin(db, vorhanden, jetzt);
		return { ergebnis: 'rolle-vergeben' };
	}

	const neu = await legeMitgliedAn(db, { art: 'automatisch' }, angaben, jetzt);
	if (neu.ergebnis === 'vergeben') {
		return { ergebnis: 'fehler', fehler: { [neu.feld]: 'schon vergeben' } };
	}
	const [k] = await db.select({ id: konto.id }).from(konto).where(eq(konto.mitgliedId, neu.id));
	await machAdmin(db, k.id, jetzt);
	return { ergebnis: 'angelegt' };
}
