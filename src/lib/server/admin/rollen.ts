import { and, asc, count, eq, inArray, ne, sql } from 'drizzle-orm';
import type { Db, DbOderTx } from '../db/index.ts';
import { konto, kontoRolle, mitglied, sitzung } from '../db/schema.ts';
import { ANSICHT_ROLLEN, type AnsichtRolle } from '../login/sitzung.ts';
import { schreibeVerlauf, type Eintrag, type Urheber } from './verlauf.ts';

export const ROLLEN = ['mytco', 'mitglieder', 'cm', 'lizenz'] as const;
export type Rolle = (typeof ROLLEN)[number];

// Schlüssel der Advisory-Sperre, die gleichzeitige Rollenänderungen hintereinander ordnet.
const SPERRE_ROLLEN = 4301;

export async function ladeRollen(db: DbOderTx, kontoId: number): Promise<Rolle[]> {
	const zeilen = await db
		.select({ rolle: kontoRolle.rolle })
		.from(kontoRolle)
		.where(eq(kontoRolle.kontoId, kontoId));
	return zeilen.map((z) => z.rolle as Rolle);
}

// RR-08: Als MyTCO-Admin zählt nur ein Konto mit Rolle `mytco`, nicht gesperrt, Mitglied aktiv.
function zaehlendeMytcoAdmins(db: DbOderTx, ausser?: number, nur?: number) {
	return db
		.select({ n: count() })
		.from(kontoRolle)
		.innerJoin(konto, eq(konto.id, kontoRolle.kontoId))
		.innerJoin(mitglied, eq(mitglied.id, konto.mitgliedId))
		.where(
			and(
				eq(kontoRolle.rolle, 'mytco'),
				eq(konto.gesperrt, false),
				eq(mitglied.status, 'aktiv'),
				ausser === undefined ? undefined : ne(kontoRolle.kontoId, ausser),
				nur === undefined ? undefined : eq(kontoRolle.kontoId, nur)
			)
		);
}

export async function istMytcoAdmin(db: DbOderTx, kontoId: number): Promise<boolean> {
	const [zeile] = await zaehlendeMytcoAdmins(db, undefined, kontoId);
	return zeile.n > 0;
}

/**
 * RR-03: Ordnet alle Schritte, die die Zahl der MyTCO-Admins senken können, hintereinander.
 * Immer als erste Sperre der Transaktion nehmen, vor jeder Zeilensperre (keine Verklemmung).
 */
export async function sperreRollen(tx: DbOderTx): Promise<void> {
	await tx.execute(sql`select pg_advisory_xact_lock(${SPERRE_ROLLEN})`);
}

/** RR-03: Das Konto ist ein zählender MyTCO-Admin, und es gibt keinen anderen. Unter `sperreRollen`. */
export async function waereLetzterMytco(tx: DbOderTx, kontoId: number): Promise<boolean> {
	if (!(await istMytcoAdmin(tx, kontoId))) return false;
	const [andere] = await zaehlendeMytcoAdmins(tx, kontoId);
	return andere.n === 0;
}

export const VERWALTUNGSROLLEN = ['mytco', 'mitglieder', 'cm'] as const satisfies readonly Rolle[];
export type VerwaltungsRolle = (typeof VERWALTUNGSROLLEN)[number];

// RR-07, RR-08: Rollen, die die Verwaltung öffnen, für ein Konto, das nicht gesperrt ist und
// dessen Mitglied aktiv ist; sonst leer. Reihenfolge wie VERWALTUNGSROLLEN.
export async function verwaltungsrollen(
	db: DbOderTx,
	kontoId: number
): Promise<VerwaltungsRolle[]> {
	const zeilen = await db
		.select({ rolle: kontoRolle.rolle })
		.from(kontoRolle)
		.innerJoin(konto, eq(konto.id, kontoRolle.kontoId))
		.innerJoin(mitglied, eq(mitglied.id, konto.mitgliedId))
		.where(
			and(
				eq(kontoRolle.kontoId, kontoId),
				inArray(kontoRolle.rolle, [...VERWALTUNGSROLLEN]),
				eq(konto.gesperrt, false),
				eq(mitglied.status, 'aktiv')
			)
		);
	const vorhanden = new Set(zeilen.map((z) => z.rolle));
	return VERWALTUNGSROLLEN.filter((r) => vorhanden.has(r));
}

// «Ansicht als …»: Liste und Typ stehen bei der Sitzung (`login/sitzung.ts`), die sie trägt; hier
// weitergereicht, damit Verwaltung und Oberfläche sie weiter von hier holen.
export { ANSICHT_ROLLEN, type AnsichtRolle };

export const istAnsichtRolle = (r: unknown): r is AnsichtRolle =>
	(ANSICHT_ROLLEN as readonly unknown[]).includes(r);

/** Die Rollen, mit denen eine Sitzung rechnet: in der Ansicht nur deren Verwaltungsrolle. */
export function effektiveRollen(
	echte: VerwaltungsRolle[],
	ansicht: AnsichtRolle | null
): VerwaltungsRolle[] {
	if (ansicht === null) return echte;
	// `lizenz` öffnet die Verwaltung noch nicht; `mitglied` hat keine Verwaltungsrolle.
	if (ansicht === 'mitglied' || ansicht === 'lizenz') return [];
	return [ansicht];
}

export type RollenListe = { rolle: Rolle; mitglieder: { id: number; name: string }[] }[];

// Regel 2: Wer welche Rolle hat, für die Rollenvergabe. RR-08: nur Konten, die nicht gesperrt sind
// und deren Mitglied aktiv ist. Nur Nummer und Name; jede Rolle steht da, auch ohne Mitglieder.
export async function listeRollen(db: DbOderTx): Promise<RollenListe> {
	const zeilen = await db
		.select({
			rolle: kontoRolle.rolle,
			id: mitglied.id,
			vorname: mitglied.vorname,
			nachname: mitglied.nachname
		})
		.from(kontoRolle)
		.innerJoin(konto, eq(konto.id, kontoRolle.kontoId))
		.innerJoin(mitglied, eq(mitglied.id, konto.mitgliedId))
		.where(and(eq(konto.gesperrt, false), eq(mitglied.status, 'aktiv')))
		.orderBy(asc(mitglied.nachname), asc(mitglied.vorname), asc(mitglied.id));
	return ROLLEN.map((rolle) => ({
		rolle,
		mitglieder: zeilen
			.filter((z) => z.rolle === rolle)
			.map((z) => ({ id: z.id, name: `${z.nachname}, ${z.vorname}` }))
	}));
}

const gleicheMenge = (a: readonly Rolle[], b: readonly Rolle[]) =>
	new Set(a).size === new Set(b).size && a.every((r) => b.includes(r));

/**
 * Setzt die Rollen eines Kontos. `vorher`: die Rollen, wie die Seite sie geladen hat; weichen sie
 * vom gespeicherten Stand ab, ändert sich nichts (`veraltet`).
 */
export async function setzeRollen(
	db: Db,
	urheber: Urheber,
	kontoId: number,
	rollen: Rolle[],
	vorher: Rolle[],
	jetzt: Date
): Promise<'ok' | 'letzter-mytco' | 'veraltet' | 'nicht-gefunden'> {
	return db.transaction(async (tx) => {
		// RR-03: Vergleichen, Zählen und Schreiben müssen gegenüber anderen Änderungen atomar sein.
		await sperreRollen(tx);

		const [ziel] = await tx
			.select({ mitgliedId: konto.mitgliedId })
			.from(konto)
			.where(eq(konto.id, kontoId));
		if (!ziel) return 'nicht-gefunden';

		const alt = await ladeRollen(tx, kontoId);
		if (!gleicheMenge(alt, vorher)) return 'veraltet';
		const neu = [...new Set(rollen)];
		const vergeben = neu.filter((r) => !alt.includes(r));
		const entzogen = alt.filter((r) => !neu.includes(r));

		// RR-03: Mindestens ein MyTCO-Admin bleibt; für die übrigen Rollen gilt keine Untergrenze.
		if (entzogen.includes('mytco') && (await waereLetzterMytco(tx, kontoId))) {
			return 'letzter-mytco';
		}

		if (entzogen.length > 0) {
			await tx
				.delete(kontoRolle)
				.where(and(eq(kontoRolle.kontoId, kontoId), inArray(kontoRolle.rolle, entzogen)));
		}
		// Ohne `mytco` endet jede «Ansicht als …» des Kontos; bei neuer Vergabe lebt sie nicht wieder auf.
		if (entzogen.includes('mytco')) {
			await tx.update(sitzung).set({ ansichtRolle: null }).where(eq(sitzung.kontoId, kontoId));
		}
		if (vergeben.length > 0) {
			await tx.insert(kontoRolle).values(vergeben.map((rolle) => ({ kontoId, rolle })));
		}
		const eintraege: Eintrag[] = [
			...vergeben.map((r): Eintrag => ({ aktion: 'rolle-vergeben', detail: r })),
			...entzogen.map((r): Eintrag => ({ aktion: 'rolle-entzogen', detail: r }))
		];
		await schreibeVerlauf(tx, ziel.mitgliedId, urheber, eintraege, jetzt);
		return 'ok';
	});
}
