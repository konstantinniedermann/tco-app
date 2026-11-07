import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';
import type { Db, DbOderTx } from '../db/index.ts';
import { aenderung, mitglied } from '../db/schema.ts';
import { FAIRGATE_FELDER } from '../profil/angaben.ts';
import type { Angaben, Feld } from './angaben.ts';
import { schreibeVerlauf, type Urheber } from './verlauf.ts';

// Annahme K-19.2: Der Verein führt E-Mail, Telefon und Adresse zusätzlich in Fairgate. Ändert das
// Mitglied eine dieser Angaben selbst, steht es auf der Liste «Für Fairgate», bis ein Admin sie
// dort nachgeführt und abgehakt hat. Änderungen durch Admins erzeugen keinen Eintrag.
export type FairgateZeile = {
	id: number;
	name: string;
	mitgliedernummer: string | null;
	seit: Date;
	felder: Feld[];
	/** Offene Markierung, aber kein Verlaufseintrag des Mitglieds mehr dazu (Verlauf nach 12 Monaten gelöscht). */
	verlaufGeloescht: boolean;
	angaben: Pick<Angaben, 'email' | 'telefon' | 'strasse' | 'plz' | 'ort'>;
};

export async function listeFuerFairgate(db: DbOderTx): Promise<FairgateZeile[]> {
	const offene = await db
		.select()
		.from(mitglied)
		.where(and(isNotNull(mitglied.fairgateOffenSeit), eq(mitglied.status, 'aktiv')))
		.orderBy(asc(mitglied.fairgateOffenSeit), asc(mitglied.id));
	if (offene.length === 0) return [];
	const eintraege = await db
		.select()
		.from(aenderung)
		.where(
			and(
				inArray(
					aenderung.mitgliedId,
					offene.map((m) => m.id)
				),
				inArray(aenderung.aktion, ['feld-geaendert', 'fairgate-uebertragen'])
			)
		);
	return offene.map((m) => {
		const meine = eintraege.filter((e) => e.mitgliedId === m.id);
		const letzteUebertragung = Math.max(
			-Infinity,
			...meine.filter((e) => e.aktion === 'fairgate-uebertragen').map((e) => e.zeitpunkt.getTime())
		);
		const felder = FAIRGATE_FELDER.filter((f) =>
			meine.some(
				(e) =>
					e.aktion === 'feld-geaendert' &&
					e.detail === f &&
					e.urheberArt === 'mitglied' &&
					e.urheberMitgliedId === m.id &&
					e.zeitpunkt.getTime() > letzteUebertragung
			)
		);
		return {
			id: m.id,
			name: `${m.nachname}, ${m.vorname}`,
			mitgliedernummer: m.mitgliedernummer,
			seit: m.fairgateOffenSeit!,
			felder,
			verlaufGeloescht: felder.length === 0,
			angaben: {
				email: m.email ?? '',
				telefon: m.telefon,
				strasse: m.strasse ?? '',
				plz: m.plz ?? '',
				ort: m.ort ?? ''
			}
		};
	});
}

/** `gesehenSeit`: der Stand, den der Admin in der Liste sah; hat das Mitglied danach etwas geändert, gilt das Abhaken nicht. */
export async function markiereUebertragen(
	db: Db,
	urheber: Urheber,
	mitgliedId: number,
	gesehenSeit: Date,
	jetzt: Date
): Promise<'ok' | 'nicht-offen' | 'veraltet'> {
	return db.transaction(async (tx) => {
		// Bedingtes Update: ein zweites, gleichzeitiges Abhaken findet nichts mehr, und ein Abhaken
		// nach einer neueren Änderung des Mitglieds ebenso.
		const zeilen = await tx
			.update(mitglied)
			.set({ fairgateOffenSeit: null })
			.where(and(eq(mitglied.id, mitgliedId), eq(mitglied.fairgateOffenSeit, gesehenSeit)))
			.returning({ id: mitglied.id });
		if (zeilen.length === 0) {
			const [offen] = await tx
				.select({ seit: mitglied.fairgateOffenSeit })
				.from(mitglied)
				.where(and(eq(mitglied.id, mitgliedId), isNotNull(mitglied.fairgateOffenSeit)));
			return offen ? ('veraltet' as const) : ('nicht-offen' as const);
		}
		await schreibeVerlauf(tx, mitgliedId, urheber, [{ aktion: 'fairgate-uebertragen' }], jetzt);
		return 'ok' as const;
	});
}
