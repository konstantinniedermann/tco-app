import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbOderTx } from '../db/index.ts';
import { aenderung, mitglied } from '../db/schema.ts';
import { FELDER, type Angaben, type Feld } from './angaben.ts';

export type Urheber = { art: 'admin' | 'mitglied'; mitgliedId: number } | { art: 'automatisch' };

export type Aktion =
	| 'angelegt'
	| 'feld-geaendert'
	| 'rolle-vergeben'
	| 'rolle-entzogen'
	| 'sitzungen-beendet'
	| 'fairgate-uebertragen'
	| 'ausgetreten'
	| 'wiedereingetreten'
	| 'loeschung-vorgemerkt'
	| 'loeschung-zurueckgenommen'
	| 'auskunft-erstellt'
	// FR-46, FR-08: jede Änderung des CM-Admins an einer Anmeldung, neutral: ohne Kategorie,
	// Wildcard oder Entscheid, weil auch der Mitglieder-Admin den Verlauf sieht.
	| 'cm-anmeldung-geaendert';

// FR-26: `detail` enthält nur einen Feld- oder Rollennamen, nie einen Wert.
export type Eintrag = { aktion: Aktion; detail?: string };

export function geaenderteFelder(alt: Angaben, neu: Angaben): Feld[] {
	return FELDER.filter((feld) => alt[feld] !== neu[feld]);
}

export async function schreibeVerlauf(
	tx: DbOderTx,
	mitgliedId: number,
	urheber: Urheber,
	eintraege: Eintrag[],
	jetzt: Date
): Promise<void> {
	if (eintraege.length === 0) return;
	await tx.insert(aenderung).values(
		eintraege.map((e) => ({
			mitgliedId,
			zeitpunkt: jetzt,
			urheberArt: urheber.art,
			urheberMitgliedId: urheber.art === 'automatisch' ? null : urheber.mitgliedId,
			aktion: e.aktion,
			detail: e.detail ?? null
		}))
	);
}

export type VerlaufZeile = {
	zeitpunkt: Date;
	urheber: string;
	aktion: Aktion;
	detail: string | null;
	mitglied: { id: number; name: string };
};

export async function ladeVerlauf(
	db: DbOderTx,
	// Ohne `grenze` kommen alle Einträge.
	filter: { mitgliedId?: number; grenze?: number }
): Promise<VerlaufZeile[]> {
	const urheber = alias(mitglied, 'urheber');
	const abfrage = db
		.select({
			id: aenderung.id,
			zeitpunkt: aenderung.zeitpunkt,
			urheberArt: aenderung.urheberArt,
			aktion: aenderung.aktion,
			detail: aenderung.detail,
			mitgliedId: mitglied.id,
			nachname: mitglied.nachname,
			vorname: mitglied.vorname,
			urheberId: urheber.id,
			urheberVorname: urheber.vorname,
			urheberNachname: urheber.nachname
		})
		.from(aenderung)
		.innerJoin(mitglied, eq(mitglied.id, aenderung.mitgliedId))
		.leftJoin(urheber, eq(urheber.id, aenderung.urheberMitgliedId))
		.where(
			filter.mitgliedId === undefined ? undefined : eq(aenderung.mitgliedId, filter.mitgliedId)
		)
		.orderBy(desc(aenderung.zeitpunkt), desc(aenderung.id));
	const zeilen = await (filter.grenze === undefined ? abfrage : abfrage.limit(filter.grenze));
	return zeilen.map((z) => ({
		zeitpunkt: z.zeitpunkt,
		urheber:
			z.urheberArt === 'automatisch'
				? 'MyTCO'
				: z.urheberVorname === null
					? 'gelöschtes Konto'
					: z.urheberArt === 'mitglied' && z.urheberId === z.mitgliedId
						? `${z.urheberNachname}, ${z.urheberVorname} (selbst)`
						: `${z.urheberNachname}, ${z.urheberVorname}`,
		aktion: z.aktion as Aktion,
		detail: z.detail,
		mitglied: { id: z.mitgliedId, name: `${z.nachname}, ${z.vorname}` }
	}));
}
