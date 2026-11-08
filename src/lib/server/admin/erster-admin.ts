import { eq, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { konto, mitglied } from '../db/schema.ts';
import { jahrInZuerich } from '../datum.ts';
import { pruefeAngaben, type Feld } from './angaben.ts';
import { legeMitgliedAn } from './mitglieder.ts';
import { ladeRollen, setzeRollen, type Rolle } from './rollen.ts';

export type AdminFestgelegt =
	| { ergebnis: 'angelegt' | 'rolle-vergeben' | 'schon-admin' }
	| { ergebnis: 'fehler'; fehler: Partial<Record<Feld, string>> };

// Annahme K-18.4: Der erste Admin ist MyTCO-Admin und Mitglieder-Admin, bis der Verein die
// Rollen verteilt; danach nimmt der MyTCO-Admin sie von Hand auseinander.
const ERSTER_ADMIN: readonly Rolle[] = ['mytco', 'mitglieder'];

/** Gibt dem Konto die Rollen des ersten Admins und behält die übrigen. Urheber: automatisch. */
export async function machAdmin(db: Db, kontoId: number, jetzt: Date): Promise<void> {
	const rollen = await ladeRollen(db, kontoId);
	const fehlend = ERSTER_ADMIN.filter((r) => !rollen.includes(r));
	if (fehlend.length === 0) return;
	const r = await setzeRollen(
		db,
		{ art: 'automatisch' },
		kontoId,
		[...rollen, ...fehlend],
		rollen,
		jetzt
	);
	// Das Skript bricht ab statt still weiterzulaufen. `letzter-mytco` kann nicht kommen: nichts wird entzogen.
	if (r === 'nicht-gefunden') {
		throw new Error(`machAdmin: Konto ${kontoId} nicht gefunden, keine Rolle vergeben`);
	}
	if (r !== 'ok') {
		throw new Error(
			`machAdmin: Rollen von Konto ${kontoId} inzwischen geändert, keine Rolle vergeben`
		);
	}
}

type Treffer = { id: number; email: string | null; mitgliedernummer: string | null };

// Liest nur: Mitglied mit dieser Mitgliedernummer bzw. dieser E-Mail (beide ohne Gross-/Kleinschreibung).
async function findeMitglied(db: Db, bedingung: SQL): Promise<Treffer | null> {
	const [m] = await db
		.select({ id: mitglied.id, email: mitglied.email, mitgliedernummer: mitglied.mitgliedernummer })
		.from(mitglied)
		.where(bedingung);
	return m ?? null;
}

/**
 * Welches bestehende Mitglied ist gemeint? `null`: keines. `'widerspruch'`: Nummer und E-Mail
 * gehören zu verschiedenen Mitgliedern oder das andere Feld weicht ab; dann darf niemand die
 * Rolle bekommen. Nur ein genauer Treffer gilt (das andere Feld gleich oder in der Datenbank leer).
 */
async function findeBestehendes(
	db: Db,
	nummer: string | null,
	email: string
): Promise<number | null | 'widerspruch'> {
	const ueberNummer = nummer
		? await findeMitglied(db, sql`lower(${mitglied.mitgliedernummer}) = lower(${nummer})`)
		: null;
	const ueberEmail = await findeMitglied(db, sql`lower(${mitglied.email}) = lower(${email})`);
	if (ueberNummer && ueberEmail)
		return ueberNummer.id === ueberEmail.id ? ueberNummer.id : 'widerspruch';
	if (ueberNummer) {
		return ueberNummer.email?.toLowerCase() === email.toLowerCase()
			? ueberNummer.id
			: 'widerspruch';
	}
	if (ueberEmail) {
		const dbNummer = ueberEmail.mitgliedernummer;
		return dbNummer === null || dbNummer.toLowerCase() === nummer?.toLowerCase()
			? ueberEmail.id
			: 'widerspruch';
	}
	return null;
}

async function kontoVon(db: Db, mitgliedId: number): Promise<number> {
	await db.insert(konto).values({ mitgliedId }).onConflictDoNothing();
	const [k] = await db.select({ id: konto.id }).from(konto).where(eq(konto.mitgliedId, mitgliedId));
	return k.id;
}

/**
 * Serverbefehl für den ersten Admin: legt das Mitglied an und gibt ihm die Rollen MyTCO-Admin und
 * Mitglieder-Admin. Gibt es das Mitglied schon (Nummer oder E-Mail), bekommt es nur die Rollen;
 * ist es schon MyTCO-Admin, ändert sich nichts. Prüfung wie beim Anlegen durch einen Admin, die
 * Mitgliedernummer ist Pflicht.
 */
export async function legeAdminFest(
	db: Db,
	roh: Record<string, string | undefined>,
	jetzt: Date
): Promise<AdminFestgelegt> {
	const pruefung = pruefeAngaben(roh, { nummerPflicht: true, jahr: jahrInZuerich(jetzt) });
	if (!pruefung.ok) return { ergebnis: 'fehler', fehler: pruefung.fehler };
	const { angaben } = pruefung;

	const vorhanden = await findeBestehendes(db, angaben.mitgliedernummer, angaben.email);
	if (vorhanden === 'widerspruch') {
		return {
			ergebnis: 'fehler',
			fehler: {
				mitgliedernummer: 'passt nicht zur E-Mail',
				email: 'passt nicht zur Mitgliedernummer'
			}
		};
	}
	if (vorhanden !== null) {
		const kontoId = await kontoVon(db, vorhanden);
		if ((await ladeRollen(db, kontoId)).includes('mytco')) return { ergebnis: 'schon-admin' };
		await machAdmin(db, kontoId, jetzt);
		return { ergebnis: 'rolle-vergeben' };
	}

	const neu = await legeMitgliedAn(db, { art: 'automatisch' }, angaben, jetzt);
	if (neu.ergebnis === 'vergeben') {
		return { ergebnis: 'fehler', fehler: { [neu.feld]: 'schon vergeben' } };
	}
	await machAdmin(db, await kontoVon(db, neu.id), jetzt);
	return { ergebnis: 'angelegt' };
}
