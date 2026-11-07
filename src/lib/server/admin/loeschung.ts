// Löschfristen (FR-04, docs/datenschutz.md «Löschen»): Konten nach Frist oder Bedenkzeit,
// Änderungsverlauf nach 12 Monaten, Antworten zu Anlässen ein Jahr nach dem Anlass.
import { and, getTableColumns, inArray, lt, sql } from 'drizzle-orm';
import type { Db, DbOderTx } from '../db/index.ts';
import { aenderung, anlass, anlassAnmeldung, konto, mitglied, mitteilung } from '../db/schema.ts';
import type { MitgliedStatus } from './mitglieder.ts';
import { loeschtAm } from './mitgliedschaft.ts';

// Ein Lauf zur Zeit (Neustart, zwei Prozesse); 4301 ist die Rollen-Sperre.
const SPERRE_LOESCHLAUF = 4302;

// Änderungsverlauf: 12 Monate (docs/datenschutz.md).
const VERLAUF_MONATE = 12;
// Vorschlag K-50: Antworten zu Anlässen bleiben ein Jahr nach dem Anlass.
const ANTWORTEN_MONATE = 12;

// Von einem gelöschten Mitglied bleiben nur diese Spalten; jede andere wird leer, auch künftige.
const BLEIBT = new Set(['id', 'vorname', 'nachname', 'status']);
const LEER = Object.fromEntries(
	Object.keys(getTableColumns(mitglied))
		.filter((spalte) => !BLEIBT.has(spalte))
		.map((spalte) => [spalte, null])
);

export type Loeschlauf = {
	/** `false`: ein anderer Lauf hält die Sperre; dieser hat nichts getan. */
	lief: boolean;
	/** Mitglied-IDs der gelöschten Konten. */
	konten: number[];
	/** Gelöschte Einträge im Änderungsverlauf: abgelaufene und die der gelöschten Konten. */
	verlauf: number;
	/** Gelöschte Antworten zu Anlässen: abgelaufene und die der gelöschten Konten. */
	antworten: number;
};

// Gleiche Uhrzeit (UTC), `monate` Kalendermonate früher. Gibt es den Tag nicht (29. Februar),
// rückt die Grenze auf den Folgetag: nie zu früh gelöscht.
function vorMonaten(jetzt: Date, monate: number): Date {
	const r = new Date(jetzt);
	r.setUTCMonth(r.getUTCMonth() - monate);
	return r;
}

const faellig = (
	m: { status: string; austrittAm: Date | null; vorgemerktAm: Date | null },
	jetzt: Date
) => {
	const ende = loeschtAm({ ...m, status: m.status as MitgliedStatus });
	return ende !== null && jetzt.getTime() >= ende.getTime();
};

const kandidaten = (tx: DbOderTx, nur?: number[]) =>
	tx
		.select({
			id: mitglied.id,
			status: mitglied.status,
			austrittAm: mitglied.austrittAm,
			vorgemerktAm: mitglied.vorgemerktAm
		})
		.from(mitglied)
		.where(
			and(
				inArray(mitglied.status, ['ausgetreten', 'vorgemerkt']),
				nur === undefined ? undefined : inArray(mitglied.id, nur)
			)
		)
		.orderBy(mitglied.id);

/**
 * Löscht die Mitglieder, deren Frist abgelaufen ist, unter der Zeilensperre. Die Übergänge
 * (Wiedereintritt, Rücknahme) sperren dieselbe Zeile: wer zuerst kommt, gewinnt, und der
 * Status wird nach dem Sperren nochmals geprüft.
 */
async function loescheKonten(tx: DbOderTx, jetzt: Date) {
	const vorab = (await kandidaten(tx)).filter((m) => faellig(m, jetzt)).map((m) => m.id);
	if (vorab.length === 0) return { ids: [], verlauf: 0, antworten: 0 };
	const gesperrt = await kandidaten(tx, vorab).for('update');
	const ids = gesperrt.filter((m) => faellig(m, jetzt)).map((m) => m.id);
	if (ids.length === 0) return { ids: [], verlauf: 0, antworten: 0 };

	// 1. Verweise leeren: der Name erscheint nirgends mehr als Handelnde (→ «gelöschtes Konto»).
	await tx
		.update(aenderung)
		.set({ urheberMitgliedId: null })
		.where(inArray(aenderung.urheberMitgliedId, ids));
	await tx.update(anlass).set({ erstelltVon: null }).where(inArray(anlass.erstelltVon, ids));
	await tx.update(mitteilung).set({ absenderId: null }).where(inArray(mitteilung.absenderId, ids));
	// 2. Konto (mit Sitzungen, Passkeys, Rollen, Push-Abos), Antworten und eigener Verlauf.
	await tx.delete(konto).where(inArray(konto.mitgliedId, ids));
	const antworten = await tx
		.delete(anlassAnmeldung)
		.where(inArray(anlassAnmeldung.mitgliedId, ids))
		.returning({ id: anlassAnmeldung.anlassId });
	const verlauf = await tx
		.delete(aenderung)
		.where(inArray(aenderung.mitgliedId, ids))
		.returning({ id: aenderung.id });
	// 3. Mitglied leeren; CM-Anmeldungen (`anmeldung_spieler`) bleiben mit dem Namen.
	await tx
		.update(mitglied)
		.set({ ...LEER, status: 'geloescht' })
		.where(inArray(mitglied.id, ids));
	return { ids, verlauf: verlauf.length, antworten: antworten.length };
}

/**
 * Ein Löschlauf in einer Transaktion: Konten, deren Frist nach Austritt oder Bedenkzeit
 * abgelaufen ist (`jetzt >= loeschtAm`), Verlauf älter als 12 Monate, Antworten zu Anlässen,
 * die mehr als ein Jahr zurückliegen. Wiederholbar; hält ein anderer Lauf die Sperre, tut er
 * nichts. Log nur mit Anzahl und Mitglied-ID (SI-05).
 */
export async function raeumeAuf(db: Db, jetzt: Date): Promise<Loeschlauf> {
	const ergebnis = await db.transaction(async (tx): Promise<Loeschlauf> => {
		const sperre = await tx.execute<{ frei: boolean }>(
			sql`select pg_try_advisory_xact_lock(${SPERRE_LOESCHLAUF}) as frei`
		);
		if (!sperre.rows[0]?.frei) return { lief: false, konten: [], verlauf: 0, antworten: 0 };

		const konten = await loescheKonten(tx, jetzt);
		const verlauf = await tx
			.delete(aenderung)
			.where(lt(aenderung.zeitpunkt, vorMonaten(jetzt, VERLAUF_MONATE)))
			.returning({ id: aenderung.id });
		const antworten = await tx
			.delete(anlassAnmeldung)
			.where(
				inArray(
					anlassAnmeldung.anlassId,
					tx
						.select({ id: anlass.id })
						.from(anlass)
						.where(lt(anlass.beginn, vorMonaten(jetzt, ANTWORTEN_MONATE)))
				)
			)
			.returning({ id: anlassAnmeldung.anlassId });
		return {
			lief: true,
			konten: konten.ids,
			verlauf: konten.verlauf + verlauf.length,
			antworten: konten.antworten + antworten.length
		};
	});
	// Erst nach dem Commit: das Log nennt nur, was wirklich gelöscht ist.
	if (ergebnis.lief) {
		const { konten, verlauf, antworten } = ergebnis;
		console.info('Löschlauf', { konten, verlauf, antworten });
	}
	return ergebnis;
}
