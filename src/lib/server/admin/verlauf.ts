import { and, desc, eq, gte, ilike, inArray, lt, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbOderTx } from '../db/index.ts';
import { aenderung, mitglied } from '../db/schema.ts';
import { FELDER, type Angaben, type Feld } from './angaben.ts';

export type Urheber = { art: 'admin' | 'mitglied'; mitgliedId: number } | { art: 'automatisch' };

export type Aktion =
	// `detail: 'einlesen'`, wenn das Mitglied aus einer Datei kam (Weg, kein Wert).
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
	// RR-04: ohne `detail`; der Code selbst steht nie im Verlauf.
	| 'brief-code-ausgestellt'
	// FR-46, FR-08: jede Änderung des CM-Admins an einer Anmeldung, neutral: ohne Kategorie,
	// Wildcard oder Entscheid, weil auch der Mitglieder-Admin den Verlauf sieht.
	| 'cm-anmeldung-geaendert';

// Record statt Liste: Kommt eine Aktion dazu, meldet der Compiler die Lücke hier (Filter «Was», #92).
export const AKTIONEN: Record<Aktion, true> = {
	angelegt: true,
	'feld-geaendert': true,
	'rolle-vergeben': true,
	'rolle-entzogen': true,
	'sitzungen-beendet': true,
	'fairgate-uebertragen': true,
	ausgetreten: true,
	wiedereingetreten: true,
	'loeschung-vorgemerkt': true,
	'loeschung-zurueckgenommen': true,
	'auskunft-erstellt': true,
	'brief-code-ausgestellt': true,
	'cm-anmeldung-geaendert': true
};
export const istAktion = (s: string): s is Aktion => Object.hasOwn(AKTIONEN, s);

/** Filter des Verlaufs (#92); alle zusammen (und). */
export type VerlaufFilter = {
	mitgliedId?: number;
	grenze?: number;
	/** Zeitraum [von, bisVor), Grenzen am Beginn eines Zürcher Tages. */
	von?: Date;
	bisVor?: Date;
	/** Enthält, ohne Gross/Klein: «Nachname, Vorname» des Urhebers; «MyTCO» trifft die automatischen. */
	wer?: string;
	/** Enthält, ohne Gross/Klein: «Nachname, Vorname» des Mitglieds. */
	name?: string;
	was?: readonly Aktion[];
};

/** Text für ILIKE «enthält»: Platzhalter und der Rückstrich gelten wörtlich. */
const enthaelt = (text: string) => `%${text.replace(/[\\%_]/g, (z) => `\\${z}`)}%`;

// FR-26: `detail` enthält nur einen Feld- oder Rollennamen, nie einen Wert.
export type Eintrag = { aktion: Aktion; detail?: string };

export function geaenderteFelder(alt: Angaben, neu: Angaben): Feld[] {
	return FELDER.filter((feld) => alt[feld] !== neu[feld]);
}

function zeileVon(mitgliedId: number, urheber: Urheber, e: Eintrag, jetzt: Date) {
	return {
		mitgliedId,
		zeitpunkt: jetzt,
		urheberArt: urheber.art,
		urheberMitgliedId: urheber.art === 'automatisch' ? null : urheber.mitgliedId,
		aktion: e.aktion,
		detail: e.detail ?? null
	};
}

export async function schreibeVerlauf(
	tx: DbOderTx,
	mitgliedId: number,
	urheber: Urheber,
	eintraege: Eintrag[],
	jetzt: Date
): Promise<void> {
	if (eintraege.length === 0) return;
	await tx.insert(aenderung).values(eintraege.map((e) => zeileVon(mitgliedId, urheber, e, jetzt)));
}

/** Derselbe Eintrag für viele Mitglieder in einer Anfrage (Einlesen). */
export async function schreibeVerlaufFuer(
	tx: DbOderTx,
	mitgliedIds: readonly number[],
	urheber: Urheber,
	eintrag: Eintrag,
	jetzt: Date
): Promise<void> {
	if (mitgliedIds.length === 0) return;
	await tx.insert(aenderung).values(mitgliedIds.map((id) => zeileVon(id, urheber, eintrag, jetzt)));
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
	filter: VerlaufFilter
): Promise<VerlaufZeile[]> {
	const urheber = alias(mitglied, 'urheber');
	const bedingungen: (SQL | undefined)[] = [];
	if (filter.mitgliedId !== undefined)
		bedingungen.push(eq(aenderung.mitgliedId, filter.mitgliedId));
	if (filter.von) bedingungen.push(gte(aenderung.zeitpunkt, filter.von));
	if (filter.bisVor) bedingungen.push(lt(aenderung.zeitpunkt, filter.bisVor));
	if (filter.was && filter.was.length > 0)
		bedingungen.push(inArray(aenderung.aktion, [...filter.was]));
	if (filter.name)
		bedingungen.push(
			ilike(sql`${mitglied.nachname} || ', ' || ${mitglied.vorname}`, enthaelt(filter.name))
		);
	if (filter.wer) {
		const name = ilike(
			sql`${urheber.nachname} || ', ' || ${urheber.vorname}`,
			enthaelt(filter.wer)
		);
		bedingungen.push(
			'mytco'.includes(filter.wer.toLowerCase())
				? or(name, eq(aenderung.urheberArt, 'automatisch'))
				: name
		);
	}
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
		.where(and(...bedingungen))
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
