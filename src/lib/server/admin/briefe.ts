import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { konto, mitglied } from '../db/schema.ts';
import { baueBriefInhalt } from '../brief/brief.ts';
import { stelleBriefCodeAusIn } from '../login/dienst.ts';
import { briefOffen, gueltigeSitzungen } from './mitglieder.ts';
import { schreibeVerlauf, type Urheber } from './verlauf.ts';

/** Höchstzahl Briefe pro Serie. */
export const MAX_BRIEFE = 1000;

export type BriefZeile = {
	id: number;
	/** «Nachname, Vorname» wie in der Mitgliederliste. */
	name: string;
	mitgliedernummer: string | null;
	briefGueltigBis: Date | null;
	/** Ein Code ist ausgestellt, nie benutzt und abgelaufen (Spalte Brief: «Code abgelaufen»). */
	briefAbgelaufen: boolean;
	adresseFehlt: boolean;
};

export type BriefAbh = { schluessel: string; adresse: string; kontakt: string };

/** `html` enthält den Brief-Code im Klartext (RR-04: nur für die Druckansicht). */
export type AusgestellterBrief = { mitgliedId: number; name: string; html: string };

const leer = (wert: string | null) => (wert ?? '').trim() === '';

function adresseFehlt(m: { strasse: string | null; plz: string | null; ort: string | null }) {
	return leer(m.strasse) || leer(m.plz) || leer(m.ort);
}

/**
 * A-LOGIN-01: Empfänger der Brief-Serie: aktiv, nicht gesperrt, noch nie per Code eingeloggt
 * (`briefCodeBenutztAm` leer) und ohne gültige Sitzung. Sortiert nach Nachname, Vorname.
 */
export async function listeBriefEmpfaenger(db: Db, jetzt: Date): Promise<BriefZeile[]> {
	const zeilen = await db
		.select({
			id: mitglied.id,
			vorname: mitglied.vorname,
			nachname: mitglied.nachname,
			mitgliedernummer: mitglied.mitgliedernummer,
			strasse: mitglied.strasse,
			plz: mitglied.plz,
			ort: mitglied.ort,
			kontoId: konto.id,
			gesperrt: konto.gesperrt,
			briefCodeHash: konto.briefCodeHash,
			briefCodeAblauf: konto.briefCodeAblauf,
			briefCodeBenutztAm: konto.briefCodeBenutztAm
		})
		.from(mitglied)
		.innerJoin(konto, eq(konto.mitgliedId, mitglied.id))
		.where(
			and(eq(mitglied.status, 'aktiv'), eq(konto.gesperrt, false), isNull(konto.briefCodeBenutztAm))
		)
		.orderBy(asc(mitglied.nachname), asc(mitglied.vorname), asc(mitglied.id));
	const sitzungen = await gueltigeSitzungen(
		db,
		zeilen.map((z) => z.kontoId),
		jetzt
	);
	return zeilen
		.filter((z) => !sitzungen.has(z.kontoId))
		.map((z) => ({
			id: z.id,
			name: `${z.nachname}, ${z.vorname}`,
			mitgliedernummer: z.mitgliedernummer,
			briefGueltigBis: briefOffen(z, jetzt) ? z.briefCodeAblauf : null,
			briefAbgelaufen:
				z.briefCodeHash !== null && z.briefCodeAblauf !== null && z.briefCodeAblauf <= jetzt,
			adresseFehlt: adresseFehlt(z)
		}));
}

/**
 * Stellt für jedes Mitglied in `ids` einen neuen Brief-Code aus (FR-24: ersetzt den alten) und
 * vermerkt es im Verlauf (FR-26, ohne Wert). Alles oder nichts: Ist ein Mitglied nicht aktiv,
 * gesperrt, ohne vollständige Adresse oder unbekannt, wird kein Code ausgestellt. `ids` ist
 * ohne Doppel; die Briefe kommen nach Nachname, Vorname.
 */
export async function stelleBriefeAus(
	db: Db,
	abh: BriefAbh,
	urheber: Urheber,
	ids: readonly number[],
	jetzt: Date
): Promise<
	{ ergebnis: 'ok'; briefe: AusgestellterBrief[] } | { ergebnis: 'nicht-moeglich'; anzahl: number }
> {
	return db.transaction(async (tx) => {
		const zeilen =
			ids.length === 0
				? []
				: await tx
						.select({
							id: mitglied.id,
							vorname: mitglied.vorname,
							nachname: mitglied.nachname,
							strasse: mitglied.strasse,
							plz: mitglied.plz,
							ort: mitglied.ort,
							kontoId: konto.id
						})
						.from(mitglied)
						.innerJoin(konto, eq(konto.mitgliedId, mitglied.id))
						.where(
							and(
								inArray(mitglied.id, [...ids]),
								eq(mitglied.status, 'aktiv'),
								eq(konto.gesperrt, false)
							)
						)
						.orderBy(asc(mitglied.nachname), asc(mitglied.vorname), asc(mitglied.id))
						// Status und Sperre bleiben bis zum Ende der Transaktion so, wie geprüft.
						.for('update');
		const moeglich = zeilen.filter((z) => !adresseFehlt(z));
		if (moeglich.length < ids.length) {
			return { ergebnis: 'nicht-moeglich' as const, anzahl: ids.length - moeglich.length };
		}
		const briefe: AusgestellterBrief[] = [];
		for (const z of moeglich) {
			const { code, gueltigBis } = await stelleBriefCodeAusIn(tx, abh.schluessel, z.kontoId, jetzt);
			await schreibeVerlauf(tx, z.id, urheber, [{ aktion: 'brief-code-ausgestellt' }], jetzt);
			briefe.push({
				mitgliedId: z.id,
				name: `${z.vorname} ${z.nachname}`,
				html: baueBriefInhalt({
					vorname: z.vorname,
					nachname: z.nachname,
					strasse: z.strasse ?? '',
					plz: z.plz ?? '',
					ort: z.ort ?? '',
					code,
					gueltigBis,
					adresse: abh.adresse,
					kontakt: abh.kontakt
				})
			});
		}
		return { ergebnis: 'ok' as const, briefe };
	});
}
