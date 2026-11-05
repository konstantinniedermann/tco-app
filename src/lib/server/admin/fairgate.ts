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
	angaben: Pick<Angaben, 'email' | 'telefon' | 'strasse' | 'plz' | 'ort'>;
};

export async function listeFuerFairgate(db: DbOderTx): Promise<FairgateZeile[]> {
	const offene = await db
		.select()
		.from(mitglied)
		.where(isNotNull(mitglied.fairgateOffenSeit))
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
			angaben: {
				email: m.email,
				telefon: m.telefon,
				strasse: m.strasse,
				plz: m.plz,
				ort: m.ort
			}
		};
	});
}

export async function markiereUebertragen(
	db: Db,
	urheber: Urheber,
	mitgliedId: number,
	jetzt: Date
): Promise<'ok' | 'nicht-offen'> {
	return db.transaction(async (tx) => {
		// Bedingtes Update: ein zweites, gleichzeitiges Abhaken findet nichts mehr.
		const zeilen = await tx
			.update(mitglied)
			.set({ fairgateOffenSeit: null })
			.where(and(eq(mitglied.id, mitgliedId), isNotNull(mitglied.fairgateOffenSeit)))
			.returning({ id: mitglied.id });
		if (zeilen.length === 0) return 'nicht-offen' as const;
		await schreibeVerlauf(tx, mitgliedId, urheber, [{ aktion: 'fairgate-uebertragen' }], jetzt);
		return 'ok' as const;
	});
}
