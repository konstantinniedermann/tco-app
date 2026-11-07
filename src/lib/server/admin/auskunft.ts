import { and, asc, desc, eq } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import {
	aenderung,
	anlass,
	anlassAnmeldung,
	anmeldung,
	anmeldungSpieler,
	kategorie,
	konto,
	mitglied,
	mitteilung,
	passkey,
	pushAbo,
	sitzung,
	turnier,
	type Thema,
	type Antwort,
	type AnmeldungStatus
} from '../db/schema.ts';
import type { Angaben } from './angaben.ts';
import { ladeMitglied, type Detail, type MitgliedStatus } from './mitglieder.ts';
import type { Rolle } from './rollen.ts';
import { sitzungAbgelaufen } from '../login/sitzung.ts';
import type { Aktion } from './verlauf.ts';

/**
 * DS-07: alles, was MyTCO zu einer Person speichert, nach «Welche Daten» in `docs/datenschutz.md`.
 * Geheimnisse fehlen mit Absicht: Passkeys nur mit Datum, Push-Geräte nur als Anzahl, keine
 * Kennungen, Schlüssel, Adressen beim Push-Dienst oder Code-Hashes.
 */
export type Auskunft = {
	erstelltAm: Date;
	name: string;
	angaben: Angaben;
	klassierung: string | null;
	/** Markierung «für Fairgate offen seit» (Annahme K-19.2); `null`, wenn nichts offen ist. */
	fairgateOffenSeit: Date | null;
	status: MitgliedStatus;
	mitgliedschaft: Detail['mitgliedschaft'];
	rollen: Rolle[];
	/** Themen, zu denen das Mitglied Mitteilungen erhält (FR-41). */
	themen: Thema[];
	login: {
		/** Gültige Sitzungen, je angemeldetes Gerät. */
		geraete: { erstelltAm: Date; zuletztGenutzt: Date }[];
		passkeys: { geraet: string; eingerichtetAm: Date; zuletztBenutzt: Date | null }[];
		push: { eingerichtetAm: Date }[];
	};
	anlaesse: {
		titel: string;
		beginn: Date;
		antwort: Antwort;
		bemerkung: string | null;
		geaendertAm: Date;
	}[];
	/** Anlässe, die das Mitglied angelegt hat. */
	anlaesseErstellt: { titel: string; beginn: Date }[];
	cm: {
		turnier: string;
		kategorie: string;
		status: AnmeldungStatus;
		angemeldetAm: Date;
		kommentar: string | null;
	}[];
	/** Mitteilungen, die das Mitglied gesendet hat; ohne Empfänger (FR-45). */
	mitteilungen: { titel: string; gesendetAm: Date }[];
	verlauf: AuskunftVerlauf[];
};

/**
 * Eine Zeile des Änderungsverlaufs in der Auskunft. «Wer» nennt keine Dritten: Admins erscheinen
 * als «Mitgliederverwaltung», Automatisches als «MyTCO», eigene Schritte mit dem eigenen Namen.
 */
export type AuskunftVerlauf = {
	zeitpunkt: Date;
	urheber: string;
	aktion: Aktion;
	detail: string | null;
};

function wer(
	z: { urheberArt: string; urheberMitgliedId: number | null },
	id: number,
	name: string
): string {
	if (z.urheberArt === 'automatisch') return 'MyTCO';
	if (z.urheberMitgliedId === null) return 'gelöschtes Konto';
	if (z.urheberArt === 'mitglied' && z.urheberMitgliedId === id) return name;
	return 'Mitgliederverwaltung';
}

/** `null` für Unbekannte und Gelöschte: Von ihnen speichert MyTCO nur noch den Namen. */
export async function ladeAuskunft(db: Db, id: number, jetzt: Date): Promise<Auskunft | null> {
	const m = await ladeMitglied(db, id, jetzt);
	if (!m || m.status === 'geloescht') return null;
	const [
		[zusatz],
		sitzungen,
		passkeys,
		push,
		anlaesse,
		anlaesseErstellt,
		cm,
		mitteilungen,
		verlauf
	] = await Promise.all([
		db
			.select({
				klassierung: mitglied.klassierung,
				fairgateOffenSeit: mitglied.fairgateOffenSeit,
				themaAnlaesse: konto.themaAnlaesse,
				themaCm: konto.themaCm,
				themaVerein: konto.themaVerein
			})
			.from(mitglied)
			.innerJoin(konto, eq(konto.mitgliedId, mitglied.id))
			.where(eq(mitglied.id, id)),
		db
			.select({ erstelltAm: sitzung.erstelltAm, zuletztGenutzt: sitzung.zuletztGenutzt })
			.from(sitzung)
			.innerJoin(
				konto,
				and(eq(konto.id, sitzung.kontoId), eq(konto.sitzungsversion, sitzung.sitzungsversion))
			)
			.where(eq(sitzung.kontoId, m.kontoId))
			.orderBy(asc(sitzung.erstelltAm)),
		db
			.select({
				geraet: passkey.geraet,
				eingerichtetAm: passkey.eingerichtetAm,
				zuletztBenutzt: passkey.zuletztBenutzt
			})
			.from(passkey)
			.where(eq(passkey.kontoId, m.kontoId))
			.orderBy(asc(passkey.eingerichtetAm)),
		db
			.select({ eingerichtetAm: pushAbo.eingerichtetAm })
			.from(pushAbo)
			.where(eq(pushAbo.kontoId, m.kontoId))
			.orderBy(asc(pushAbo.eingerichtetAm)),
		db
			.select({
				titel: anlass.titel,
				beginn: anlass.beginn,
				antwort: anlassAnmeldung.antwort,
				bemerkung: anlassAnmeldung.bemerkung,
				geaendertAm: anlassAnmeldung.geaendertAm
			})
			.from(anlassAnmeldung)
			.innerJoin(anlass, eq(anlass.id, anlassAnmeldung.anlassId))
			.where(eq(anlassAnmeldung.mitgliedId, id))
			.orderBy(desc(anlass.beginn), asc(anlass.id)),
		db
			.select({ titel: anlass.titel, beginn: anlass.beginn })
			.from(anlass)
			.where(eq(anlass.erstelltVon, id))
			.orderBy(desc(anlass.beginn), asc(anlass.id)),
		db
			.select({
				turnier: turnier.name,
				kategorie: kategorie.name,
				status: anmeldung.status,
				angemeldetAm: anmeldung.angemeldetAm,
				kommentar: anmeldung.kommentar
			})
			.from(anmeldungSpieler)
			.innerJoin(anmeldung, eq(anmeldung.id, anmeldungSpieler.anmeldungId))
			.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
			.innerJoin(turnier, eq(turnier.id, kategorie.turnierId))
			.where(eq(anmeldungSpieler.mitgliedId, id))
			.orderBy(desc(turnier.jahr), asc(kategorie.name), asc(anmeldung.id)),
		// Nur Titel und Zeit; Text, Auswahl und Zahlen sind keine Daten dieser Person.
		db
			.select({ titel: mitteilung.titel, gesendetAm: mitteilung.gesendetAm })
			.from(mitteilung)
			.where(eq(mitteilung.absenderId, id))
			.orderBy(desc(mitteilung.gesendetAm), asc(mitteilung.id)),
		// Alles, was gespeichert ist (der Zeitgeber löscht nach 12 Monaten), ohne Grenze.
		db
			.select({
				zeitpunkt: aenderung.zeitpunkt,
				urheberArt: aenderung.urheberArt,
				urheberMitgliedId: aenderung.urheberMitgliedId,
				aktion: aenderung.aktion,
				detail: aenderung.detail
			})
			.from(aenderung)
			.where(eq(aenderung.mitgliedId, id))
			.orderBy(desc(aenderung.zeitpunkt), desc(aenderung.id))
	]);
	const name = `${m.angaben.nachname}, ${m.angaben.vorname}`;
	const themen: Thema[] = [];
	if (zusatz.themaAnlaesse) themen.push('anlaesse');
	if (zusatz.themaCm) themen.push('cm');
	if (zusatz.themaVerein) themen.push('verein');
	return {
		erstelltAm: jetzt,
		name,
		angaben: m.angaben,
		klassierung: zusatz.klassierung,
		fairgateOffenSeit: zusatz.fairgateOffenSeit,
		status: m.status,
		mitgliedschaft: m.mitgliedschaft,
		rollen: m.rollen,
		themen,
		login: {
			geraete: sitzungen.filter((z) => !sitzungAbgelaufen(z.zuletztGenutzt, jetzt)),
			passkeys,
			push
		},
		anlaesse,
		anlaesseErstellt,
		cm,
		mitteilungen,
		verlauf: verlauf.map((z) => ({
			zeitpunkt: z.zeitpunkt,
			urheber: wer(z, id, name),
			aktion: z.aktion as Aktion,
			detail: z.detail
		}))
	};
}
