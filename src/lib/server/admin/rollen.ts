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

const VERWALTUNGSROLLEN = ['mytco', 'mitglieder', 'cm'] as const satisfies readonly Rolle[];
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

/**
 * Stand eines Rolleninhabers auf der Seite «Rollen»: Nur `aktiv` zählt als Rolle (RR-08); die
 * übrigen stehen da, damit man ihnen die Rolle vor einem Wiedereintritt entziehen kann (#96).
 */
export type RollenStand = 'aktiv' | 'gesperrt' | 'ausgetreten' | 'vorgemerkt';

export type RollenListe = {
	rolle: Rolle;
	mitglieder: { id: number; name: string; stand: RollenStand }[];
}[];

// Regel 2: Wer welche Rolle hat, für die Rollenvergabe; jede Rolle steht da, auch ohne Mitglieder.
// Nur Nummer, Name und Stand. Gelöschte fehlen: Von ihnen bleibt nur der Name in alten Resultaten.
export async function listeRollen(db: DbOderTx): Promise<RollenListe> {
	const zeilen = await db
		.select({
			rolle: kontoRolle.rolle,
			id: mitglied.id,
			vorname: mitglied.vorname,
			nachname: mitglied.nachname,
			status: mitglied.status,
			gesperrt: konto.gesperrt
		})
		.from(kontoRolle)
		.innerJoin(konto, eq(konto.id, kontoRolle.kontoId))
		.innerJoin(mitglied, eq(mitglied.id, konto.mitgliedId))
		.where(ne(mitglied.status, 'geloescht'))
		.orderBy(asc(mitglied.nachname), asc(mitglied.vorname), asc(mitglied.id));
	const standVon = (z: (typeof zeilen)[number]): RollenStand =>
		z.status === 'ausgetreten' || z.status === 'vorgemerkt'
			? z.status
			: z.gesperrt
				? 'gesperrt'
				: 'aktiv';
	return ROLLEN.map((rolle) => ({
		rolle,
		mitglieder: zeilen
			.filter((z) => z.rolle === rolle)
			.map((z) => ({ id: z.id, name: `${z.nachname}, ${z.vorname}`, stand: standVon(z) }))
	}));
}

/** Konto eines Mitglieds, unter `sperreRollen`; ohne Mitglied `null`. */
async function kontoVon(tx: DbOderTx, mitgliedId: number): Promise<number | null> {
	const [z] = await tx.select({ id: konto.id }).from(konto).where(eq(konto.mitgliedId, mitgliedId));
	return z?.id ?? null;
}

/**
 * A-ROLLE-01: Gibt einem Mitglied eine Rolle. Hat es sie schon, ist der gewünschte Stand erreicht:
 * `ok` ohne Verlaufseintrag.
 */
export async function vergibRolle(
	db: Db,
	urheber: Urheber,
	mitgliedId: number,
	rolle: Rolle,
	jetzt: Date
): Promise<'ok' | 'nicht-gefunden'> {
	return db.transaction(async (tx) => {
		await sperreRollen(tx);
		const kontoId = await kontoVon(tx, mitgliedId);
		if (kontoId === null) return 'nicht-gefunden';
		if ((await ladeRollen(tx, kontoId)).includes(rolle)) return 'ok';
		await tx.insert(kontoRolle).values({ kontoId, rolle });
		await schreibeVerlauf(
			tx,
			mitgliedId,
			urheber,
			[{ aktion: 'rolle-vergeben', detail: rolle }],
			jetzt
		);
		return 'ok';
	});
}

/**
 * A-ROLLE-01, RR-03: Nimmt einem Mitglied eine Rolle; der letzte MyTCO-Admin behält `mytco`. Hat es
 * die Rolle nicht mehr, ist der gewünschte Stand erreicht: `ok` ohne Verlaufseintrag.
 */
export async function entziehRolle(
	db: Db,
	urheber: Urheber,
	mitgliedId: number,
	rolle: Rolle,
	jetzt: Date
): Promise<'ok' | 'letzter-mytco' | 'nicht-gefunden'> {
	return db.transaction(async (tx) => {
		// RR-03: Zählen und Schreiben müssen gegenüber anderen Änderungen atomar sein.
		await sperreRollen(tx);
		const kontoId = await kontoVon(tx, mitgliedId);
		if (kontoId === null) return 'nicht-gefunden';
		if (!(await ladeRollen(tx, kontoId)).includes(rolle)) return 'ok';
		if (rolle === 'mytco' && (await waereLetzterMytco(tx, kontoId))) return 'letzter-mytco';
		await tx
			.delete(kontoRolle)
			.where(and(eq(kontoRolle.kontoId, kontoId), eq(kontoRolle.rolle, rolle)));
		// Ohne `mytco` endet jede «Ansicht als …» des Kontos; bei neuer Vergabe lebt sie nicht wieder auf.
		if (rolle === 'mytco') {
			await tx.update(sitzung).set({ ansichtRolle: null }).where(eq(sitzung.kontoId, kontoId));
		}
		await schreibeVerlauf(
			tx,
			mitgliedId,
			urheber,
			[{ aktion: 'rolle-entzogen', detail: rolle }],
			jetzt
		);
		return 'ok';
	});
}

const gleicheMenge = (a: readonly Rolle[], b: readonly Rolle[]) =>
	new Set(a).size === new Set(b).size && a.every((r) => b.includes(r));

/**
 * Setzt alle Rollen eines Kontos auf einmal; nur für Skript und Test-Hilfen (`machAdmin`). Die
 * Verwaltung vergibt und entzieht einzeln (`vergibRolle`, `entziehRolle`). `vorher`: die Rollen, wie
 * der Aufrufer sie gelesen hat; weichen sie vom gespeicherten Stand ab, ändert sich nichts
 * (`veraltet`).
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
