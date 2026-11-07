// Übergänge der Mitgliedschaft: Austritt, Wiedereintritt, Löschung vormerken und rückgängig (FR-04).
import { eq } from 'drizzle-orm';
import { utcZuZuerich } from '../../anlass/zeit.ts';
import { loescheKommendeAntworten } from '../anlass/anlaesse.ts';
import { zieheOffeneEinzelZurueck } from '../cm/austritt.ts';
import type { Db, DbOderTx } from '../db/index.ts';
import { konto, mitglied, pushAbo } from '../db/schema.ts';
import { beendeAlleSitzungen } from '../login/sitzung.ts';
import type { MitgliedStatus } from './mitglieder.ts';
import { sperreRollen, waereLetzterMytco } from './rollen.ts';
import { schreibeVerlauf, type Aktion, type Urheber } from './verlauf.ts';

// Annahme K-38: Die Daten bleiben nach dem Austritt ein Kalenderjahr, falls das Mitglied zurückkommt.
export const FRIST_AUSTRITT = { jahre: 1 } as const;
// Bedenkzeit nach «Mitglied löschen»: so lange lässt sich die Löschung rückgängig machen.
export const BEDENKZEIT = { tage: 7 } as const;

const MINUTE_MS = 60 * 1000;
const STUNDE_MS = 60 * MINUTE_MS;

// Wanduhr in Zürich als «UTC»-Millisekunden, mit Sekunden und Millisekunden. Der Versatz zu
// UTC ist immer eine ganze Stunde; `utcZuZuerich` liefert die Wanduhr auf die Minute.
function zuerichMs(d: Date): number {
	const [datum, zeit] = utcZuZuerich(d).split('T');
	const [j, mo, t] = datum.split('-').map(Number);
	const [h, mi] = zeit.split(':').map(Number);
	const rest = ((d.getTime() % MINUTE_MS) + MINUTE_MS) % MINUTE_MS;
	return Date.UTC(j, mo - 1, t, h, mi) + rest;
}

/**
 * Gleiche Uhrzeit in Zürich, `jahre` Kalenderjahre und `tage` Kalendertage später, als Zeitpunkt.
 * Ein 29. Februar wird zum 1. März. Gibt es die Uhrzeit nicht (Umstellung auf Sommerzeit) oder
 * zweimal (auf Winterzeit), gilt der spätere Zeitpunkt: nie früher.
 */
function spaeterInZuerich(d: Date, um: { jahre?: number; tage?: number }): Date {
	const ziel = new Date(zuerichMs(d));
	ziel.setUTCFullYear(ziel.getUTCFullYear() + (um.jahre ?? 0));
	ziel.setUTCDate(ziel.getUTCDate() + (um.tage ?? 0));
	// Zürich ist UTC+1 (Winter) oder UTC+2 (Sommer); der spätere Kandidat ist UTC+1.
	const kandidaten = [1, 2].map((h) => new Date(ziel.getTime() - h * STUNDE_MS));
	return kandidaten.find((k) => zuerichMs(k) === ziel.getTime()) ?? kandidaten[0];
}

/**
 * Zeitpunkt, ab dem der Zeitgeber das Mitglied löscht (fällig bei `jetzt >= loeschtAm`): nach dem
 * Schweizer Kalender, damit das angezeigte Datum stimmt.
 */
export function loeschtAm(m: {
	status: MitgliedStatus;
	austrittAm: Date | null;
	vorgemerktAm: Date | null;
}): Date | null {
	if (m.status === 'ausgetreten' && m.austrittAm !== null) {
		return spaeterInZuerich(m.austrittAm, { jahre: FRIST_AUSTRITT.jahre });
	}
	if (m.status === 'vorgemerkt' && m.vorgemerktAm !== null) {
		return spaeterInZuerich(m.vorgemerktAm, { tage: BEDENKZEIT.tage });
	}
	return null;
}

type Zeile = typeof mitglied.$inferSelect & { status: MitgliedStatus };

/**
 * Ein Übergang in einer Transaktion: erst die Rollen-Sperre (gleiche Reihenfolge wie
 * `setzeRollen`, keine Verklemmung), dann die Mitglied-Zeile `for update`. Passt ihr Status
 * nicht zu `von`, hat inzwischen ein anderer geändert: `veraltet`, nichts geändert.
 */
async function uebergang<E extends string>(
	db: Db,
	id: number,
	von: readonly MitgliedStatus[],
	schritt: (tx: DbOderTx, m: Zeile, kontoId: number) => Promise<'ok' | E>
): Promise<'ok' | 'nicht-gefunden' | 'veraltet' | E> {
	return db.transaction(async (tx) => {
		await sperreRollen(tx);
		const [m] = await tx.select().from(mitglied).where(eq(mitglied.id, id)).for('update');
		if (!m) return 'nicht-gefunden' as const;
		const zeile = m as Zeile;
		if (!von.includes(zeile.status)) return 'veraltet' as const;
		const [k] = await tx.select({ id: konto.id }).from(konto).where(eq(konto.mitgliedId, id));
		if (!k) return 'nicht-gefunden' as const;
		return schritt(tx, zeile, k.id);
	});
}

// Login sofort weg: Push-Abos und Sitzungen. Passkeys bleiben bis zur Löschung.
async function sperreLogin(tx: DbOderTx, kontoId: number): Promise<void> {
	await tx.delete(pushAbo).where(eq(pushAbo.kontoId, kontoId));
	await beendeAlleSitzungen(tx, kontoId);
}

// Kommende Anmeldungen zurückziehen; Vergangenes bleibt. Keine Mitteilung.
async function zieheKommendesZurueck(tx: DbOderTx, mitgliedId: number, jetzt: Date) {
	await zieheOffeneEinzelZurueck(tx, mitgliedId, jetzt);
	await loescheKommendeAntworten(tx, mitgliedId, jetzt);
}

const vermerke = (tx: DbOderTx, id: number, urheber: Urheber, aktion: Aktion, jetzt: Date) =>
	schreibeVerlauf(tx, id, urheber, [{ aktion }], jetzt);

/** FR-04: Austritt ab sofort, nur aus `aktiv`. RR-03: nicht für den letzten MyTCO-Admin. */
export function erfasseAustritt(
	db: Db,
	urheber: Urheber,
	id: number,
	jetzt: Date
): Promise<'ok' | 'nicht-gefunden' | 'veraltet' | 'letzter-mytco'> {
	return uebergang(db, id, ['aktiv'], async (tx, _m, kontoId) => {
		if (await waereLetzterMytco(tx, kontoId)) return 'letzter-mytco' as const;
		await tx
			.update(mitglied)
			// «Für Fairgate» zeigt nur aktive Mitglieder: die Markierung ist mit dem Austritt erledigt.
			.set({ status: 'ausgetreten', austrittAm: jetzt, fairgateOffenSeit: null })
			.where(eq(mitglied.id, id));
		await sperreLogin(tx, kontoId);
		await zieheKommendesZurueck(tx, id, jetzt);
		await vermerke(tx, id, urheber, 'ausgetreten', jetzt);
		return 'ok' as const;
	});
}

/** FR-04: Wiedereintritt innert Frist, nur aus `ausgetreten`; Rollen wirken sofort wieder. */
export function erfasseWiedereintritt(
	db: Db,
	urheber: Urheber,
	id: number,
	jetzt: Date
): Promise<'ok' | 'nicht-gefunden' | 'veraltet' | 'frist-abgelaufen'> {
	return uebergang(db, id, ['ausgetreten'], async (tx, m) => {
		const ende = loeschtAm(m);
		if (ende !== null && jetzt.getTime() >= ende.getTime()) return 'frist-abgelaufen' as const;
		await tx
			.update(mitglied)
			.set({ status: 'aktiv', austrittAm: null, vorgemerktAm: null, statusVorher: null })
			.where(eq(mitglied.id, id));
		await vermerke(tx, id, urheber, 'wiedereingetreten', jetzt);
		return 'ok' as const;
	});
}

/** «Mitglied löschen»: aus `aktiv` oder `ausgetreten` zum Löschen vormerken (Bedenkzeit). */
export function merkeZumLoeschenVor(
	db: Db,
	urheber: Urheber,
	id: number,
	jetzt: Date
): Promise<'ok' | 'nicht-gefunden' | 'veraltet' | 'letzter-mytco'> {
	return uebergang(db, id, ['aktiv', 'ausgetreten'], async (tx, m, kontoId) => {
		if (await waereLetzterMytco(tx, kontoId)) return 'letzter-mytco' as const;
		// `austrittAm` bleibt: Rückgängig stellt «ausgetreten» mit dem alten Datum wieder her.
		await tx
			.update(mitglied)
			.set({ status: 'vorgemerkt', vorgemerktAm: jetzt, statusVorher: m.status })
			.where(eq(mitglied.id, id));
		await sperreLogin(tx, kontoId);
		await zieheKommendesZurueck(tx, id, jetzt);
		await vermerke(tx, id, urheber, 'loeschung-vorgemerkt', jetzt);
		return 'ok' as const;
	});
}

/** Löschung rückgängig: zurück in den Zustand davor, `austrittAm` unverändert. */
export function nimmLoeschungZurueck(
	db: Db,
	urheber: Urheber,
	id: number,
	jetzt: Date
): Promise<'ok' | 'nicht-gefunden' | 'veraltet'> {
	return uebergang(db, id, ['vorgemerkt'], async (tx, m) => {
		if (m.statusVorher === null) return 'veraltet' as const;
		await tx
			.update(mitglied)
			.set({ status: m.statusVorher, vorgemerktAm: null, statusVorher: null })
			.where(eq(mitglied.id, id));
		await vermerke(tx, id, urheber, 'loeschung-zurueckgenommen', jetzt);
		return 'ok' as const;
	});
}
