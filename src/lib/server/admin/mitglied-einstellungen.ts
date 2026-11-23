import { and, asc, desc, eq } from 'drizzle-orm';
import type { DbOderTx } from '../db/index.ts';
import { konto, passkey, pushAbo, sitzung, type Thema } from '../db/schema.ts';
import { sitzungAbgelaufen } from '../login/sitzung.ts';

/**
 * Was das Mitglied selbst einstellt, damit der Mitglieder-Admin bei Problemen helfen kann
 * (`docs/datenschutz.md`, «Welche Daten»). Nur der aktuelle Stand, ohne Geheimnisse: keine
 * Push-Adresse, keine Schlüssel, keine Kennungen.
 */
export type MitgliedEinstellungen = {
	/** Themen, zu denen das Mitglied Mitteilungen erhält (FR-41). */
	themen: Thema[];
	/** Gültige Sitzungen, zuletzt genutzt zuerst; `pushSeit` null heisst: Push auf dem Gerät aus. */
	geraete: { angemeldetAm: Date; zuletztGenutzt: Date; pushSeit: Date | null }[];
	passkeys: { geraet: string; eingerichtetAm: Date; zuletztBenutzt: Date | null }[];
};

export async function ladeMitgliedEinstellungen(
	db: DbOderTx,
	kontoId: number,
	jetzt: Date
): Promise<MitgliedEinstellungen> {
	const [[k], sitzungen, passkeys] = await Promise.all([
		db
			.select({
				themaAnlaesse: konto.themaAnlaesse,
				themaCm: konto.themaCm,
				themaVerein: konto.themaVerein
			})
			.from(konto)
			.where(eq(konto.id, kontoId)),
		db
			.select({
				angemeldetAm: sitzung.erstelltAm,
				zuletztGenutzt: sitzung.zuletztGenutzt,
				pushSeit: pushAbo.eingerichtetAm
			})
			.from(sitzung)
			.innerJoin(
				konto,
				and(eq(konto.id, sitzung.kontoId), eq(konto.sitzungsversion, sitzung.sitzungsversion))
			)
			.leftJoin(pushAbo, eq(pushAbo.sitzungHash, sitzung.kennungHash))
			.where(eq(sitzung.kontoId, kontoId))
			.orderBy(desc(sitzung.zuletztGenutzt), desc(sitzung.erstelltAm)),
		db
			.select({
				geraet: passkey.geraet,
				eingerichtetAm: passkey.eingerichtetAm,
				zuletztBenutzt: passkey.zuletztBenutzt
			})
			.from(passkey)
			.where(eq(passkey.kontoId, kontoId))
			.orderBy(asc(passkey.eingerichtetAm))
	]);
	const themen: Thema[] = [];
	if (k?.themaAnlaesse) themen.push('anlaesse');
	if (k?.themaCm) themen.push('cm');
	if (k?.themaVerein) themen.push('verein');
	return {
		themen,
		geraete: sitzungen.filter((s) => !sitzungAbgelaufen(s.zuletztGenutzt, jetzt)),
		passkeys
	};
}
