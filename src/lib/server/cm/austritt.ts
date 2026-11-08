// Austritt und Vormerken: kommende CM-Anmeldungen zurückziehen, offene Anfragen löschen (FR-04).
import { and, asc, eq, inArray, ne, or } from 'drizzle-orm';
import type { DbOderTx } from '../db/index.ts';
import { anmeldung, anmeldungSpieler, kategorie, partnerAnfrage, turnier } from '../db/schema.ts';
import { vorSchluss } from '../../turnier/status.ts';
import { istAktiv } from './anmeldungen.ts';

/** Was nach dem Commit gemeldet wird: Partner zurückgezogener Paare und die anderen offener Anfragen. */
export type Rueckzug = {
	partner: { mitgliedId: number; kategorie: string; turnierId: number }[];
	hinfaellig: { anderer: number; kategorie: string; turnierId: number }[];
};

/**
 * Die Partner des Mitglieds in seinen aktiven Doppel-Anmeldungen, aufsteigend und ohne Doppel.
 * Der Austritt sperrt sie zusammen mit dem Mitglied (`sperreMitglieder`), bevor er zurückzieht.
 */
export async function doppelPartner(tx: DbOderTx, mitgliedId: number): Promise<number[]> {
	const eigene = tx
		.select({ id: anmeldungSpieler.anmeldungId })
		.from(anmeldungSpieler)
		.innerJoin(anmeldung, eq(anmeldung.id, anmeldungSpieler.anmeldungId))
		.where(and(eq(anmeldungSpieler.mitgliedId, mitgliedId), istAktiv));
	const zeilen = await tx
		.selectDistinct({ id: anmeldungSpieler.mitgliedId })
		.from(anmeldungSpieler)
		.where(
			and(
				inArray(anmeldungSpieler.anmeldungId, eigene),
				ne(anmeldungSpieler.mitgliedId, mitgliedId)
			)
		)
		.orderBy(asc(anmeldungSpieler.mitgliedId));
	return zeilen.map((z) => z.id);
}

/**
 * FR-04: Zieht die aktiven Anmeldungen des Mitglieds zurück, Einzel und Doppel, solange `jetzt`
 * vor dem Ende des Anmeldeschluss-Tages (24 Uhr Zürich) liegt, unabhängig vom gespeicherten oder
 * von Hand gesetzten Status (Entscheid Projektleiter). Ein Paar ist ganz zurückgezogen, wie beim
 * Abmelden; der Suchtext ist weg (FR-49). Danach bleibt die Anmeldung stehen, der CM-Admin
 * entscheidet. Alle offenen Anfragen von und an das Mitglied sind gelöscht, auch nach dem
 * Anmeldeschluss. Erwartet das Mitglied und seine Partner (`doppelPartner`) gesperrt; die
 * Anfragen löscht es zuletzt, danach wartet es auf keine CM-Sperre mehr.
 */
export async function zieheOffeneZurueck(
	tx: DbOderTx,
	mitgliedId: number,
	jetzt: Date
): Promise<Rueckzug> {
	const zeilen = await tx
		.select({
			id: anmeldung.id,
			kategorie: kategorie.name,
			turnierId: turnier.id,
			anmeldeschluss: turnier.anmeldeschluss
		})
		.from(anmeldung)
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
		.innerJoin(turnier, eq(turnier.id, kategorie.turnierId))
		.where(and(eq(anmeldungSpieler.mitgliedId, mitgliedId), istAktiv));
	const offen = zeilen.filter((z) => vorSchluss(z.anmeldeschluss, jetzt));

	const partner: Rueckzug['partner'] = [];
	if (offen.length > 0) {
		const zurueck = await tx
			.update(anmeldung)
			.set({ status: 'zurueckgezogen', suchtext: null, geaendertAm: jetzt })
			.where(
				and(
					inArray(
						anmeldung.id,
						offen.map((z) => z.id)
					),
					istAktiv
				)
			)
			.returning({ id: anmeldung.id });
		const ids = zurueck.map((z) => z.id);
		const andere =
			ids.length === 0
				? []
				: await tx
						.select({
							anmeldungId: anmeldungSpieler.anmeldungId,
							mitgliedId: anmeldungSpieler.mitgliedId
						})
						.from(anmeldungSpieler)
						.where(
							and(
								inArray(anmeldungSpieler.anmeldungId, ids),
								ne(anmeldungSpieler.mitgliedId, mitgliedId)
							)
						)
						.orderBy(asc(anmeldungSpieler.mitgliedId), asc(anmeldungSpieler.anmeldungId));
		const nachId = new Map(offen.map((z) => [z.id, z]));
		for (const a of andere) {
			const z = nachId.get(a.anmeldungId)!;
			partner.push({ mitgliedId: a.mitgliedId, kategorie: z.kategorie, turnierId: z.turnierId });
		}
	}

	const weg = await tx
		.delete(partnerAnfrage)
		.where(or(eq(partnerAnfrage.vonId, mitgliedId), eq(partnerAnfrage.anId, mitgliedId)))
		.returning({
			vonId: partnerAnfrage.vonId,
			anId: partnerAnfrage.anId,
			kategorieId: partnerAnfrage.kategorieId
		});
	const kategorien =
		weg.length === 0
			? new Map<number, { name: string; turnierId: number }>()
			: new Map(
					(
						await tx
							.select({ id: kategorie.id, name: kategorie.name, turnierId: kategorie.turnierId })
							.from(kategorie)
							.where(
								inArray(
									kategorie.id,
									weg.map((a) => a.kategorieId)
								)
							)
					).map((k) => [k.id, k])
				);
	const hinfaellig = weg
		.map((a) => {
			const k = kategorien.get(a.kategorieId)!;
			return {
				anderer: a.vonId === mitgliedId ? a.anId : a.vonId,
				kategorie: k.name,
				turnierId: k.turnierId
			};
		})
		.sort(
			(x, y) =>
				x.anderer - y.anderer ||
				x.turnierId - y.turnierId ||
				x.kategorie.localeCompare(y.kategorie, 'de-CH')
		);
	return { partner, hinfaellig };
}
