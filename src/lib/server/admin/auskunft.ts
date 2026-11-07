import { asc, count, desc, eq } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import {
	anlass,
	anlassAnmeldung,
	anmeldung,
	anmeldungSpieler,
	kategorie,
	passkey,
	pushAbo,
	turnier,
	type Antwort,
	type AnmeldungStatus
} from '../db/schema.ts';
import type { Angaben } from './angaben.ts';
import { ladeMitglied, type Detail, type MitgliedStatus } from './mitglieder.ts';
import type { Rolle } from './rollen.ts';
import { ladeVerlauf, type VerlaufZeile } from './verlauf.ts';

/**
 * DS-07: alles, was MyTCO zu einer Person speichert, nach «Welche Daten» in `docs/datenschutz.md`.
 * Geheimnisse fehlen mit Absicht: Passkeys nur mit Datum, Push-Geräte nur als Anzahl, keine
 * Kennungen, Schlüssel, Adressen beim Push-Dienst oder Code-Hashes.
 */
export type Auskunft = {
	erstelltAm: Date;
	name: string;
	angaben: Angaben;
	status: MitgliedStatus;
	mitgliedschaft: Detail['mitgliedschaft'];
	rollen: Rolle[];
	login: {
		geraete: number;
		zuletztGenutzt: Date | null;
		passkeys: { eingerichtetAm: Date }[];
		pushGeraete: number;
	};
	anlaesse: { titel: string; beginn: Date; antwort: Antwort; bemerkung: string | null }[];
	cm: { turnier: string; kategorie: string; status: AnmeldungStatus }[];
	verlauf: VerlaufZeile[];
};

/** `null` für Unbekannte und Gelöschte: Von ihnen speichert MyTCO nur noch den Namen. */
export async function ladeAuskunft(db: Db, id: number, jetzt: Date): Promise<Auskunft | null> {
	const m = await ladeMitglied(db, id, jetzt);
	if (!m || m.status === 'geloescht') return null;
	const [passkeys, [push], anlaesse, cm, verlauf] = await Promise.all([
		db
			.select({ eingerichtetAm: passkey.eingerichtetAm })
			.from(passkey)
			.where(eq(passkey.kontoId, m.kontoId))
			.orderBy(asc(passkey.eingerichtetAm)),
		db.select({ n: count() }).from(pushAbo).where(eq(pushAbo.kontoId, m.kontoId)),
		db
			.select({
				titel: anlass.titel,
				beginn: anlass.beginn,
				antwort: anlassAnmeldung.antwort,
				bemerkung: anlassAnmeldung.bemerkung
			})
			.from(anlassAnmeldung)
			.innerJoin(anlass, eq(anlass.id, anlassAnmeldung.anlassId))
			.where(eq(anlassAnmeldung.mitgliedId, id))
			.orderBy(desc(anlass.beginn), asc(anlass.id)),
		db
			.select({ turnier: turnier.name, kategorie: kategorie.name, status: anmeldung.status })
			.from(anmeldungSpieler)
			.innerJoin(anmeldung, eq(anmeldung.id, anmeldungSpieler.anmeldungId))
			.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
			.innerJoin(turnier, eq(turnier.id, kategorie.turnierId))
			.where(eq(anmeldungSpieler.mitgliedId, id))
			.orderBy(desc(turnier.jahr), asc(kategorie.name), asc(anmeldung.id)),
		// Alles, was gespeichert ist (der Zeitgeber löscht nach 12 Monaten), ohne Grenze.
		ladeVerlauf(db, { mitgliedId: id })
	]);
	return {
		erstelltAm: jetzt,
		name: `${m.angaben.nachname}, ${m.angaben.vorname}`,
		angaben: m.angaben,
		status: m.status,
		mitgliedschaft: m.mitgliedschaft,
		rollen: m.rollen,
		login: {
			geraete: m.login.geraete,
			zuletztGenutzt: m.login.zuletztGenutzt,
			passkeys,
			pushGeraete: push.n
		},
		anlaesse,
		cm,
		verlauf
	};
}
