// Gespräch zwischen einem Mitglied und der Turnierleitung (FR-50 bis FR-52). Ein Gespräch je
// Turnier und Mitglied; die Leitung antwortet als Kontaktperson oder als anderer CM-Admin.
import { and, asc, eq, gt, gte, inArray, ne, sql } from 'drizzle-orm';
import type { Namensteile } from '../../name.ts';
import { jahrInZuerich } from '../datum.ts';
import type { DbOderTx } from '../db/index.ts';
import { gespraech, mitglied, nachricht, turnier } from '../db/schema.ts';
import { namensSpalten } from '../namen.ts';
import { kontaktGueltig } from '../turnier/kontakt.ts';

export type EigeneNachricht = {
	id: number;
	von: 'du' | 'leitung';
	text: string;
	gesendetAm: Date;
	neu: boolean;
};
export type EigenesGespraech = {
	turnier: { id: number; name: string };
	kontakt: Namensteile | null;
	schreiben: boolean;
	nachrichten: EigeneNachricht[];
};
export type GespraechZeile = {
	id: number;
	mitglied: Namensteile;
	letzte: { von: 'mitglied' | 'leitung'; text: string; gesendetAm: Date };
	zustand: 'offen' | 'erledigt';
};
export type AdminNachricht = {
	id: number;
	von: 'mitglied' | 'leitung';
	admin: Namensteile | null;
	text: string;
	gesendetAm: Date;
};

type Zustand = 'offen' | 'erledigt';

/** Das Turnier, wenn es für Mitglieder sichtbar ist (nicht in Vorbereitung). */
async function sichtbaresTurnier(db: DbOderTx, turnierId: number) {
	const [t] = await db.select().from(turnier).where(eq(turnier.id, turnierId));
	return t && t.status !== 'vorbereitung' ? t : null;
}

/** Die gültige Kontaktperson (Id und Name) des Turniers, sonst null. */
async function gueltigerKontakt(db: DbOderTx, kontaktMitgliedId: number | null) {
	if (kontaktMitgliedId === null || !(await kontaktGueltig(db, kontaktMitgliedId))) return null;
	const [m] = await db
		.select(namensSpalten)
		.from(mitglied)
		.where(eq(mitglied.id, kontaktMitgliedId));
	return m ? { id: kontaktMitgliedId, name: m as Namensteile } : null;
}

/** FR-51: Darf dieses Mitglied hier schreiben? */
async function darfSchreiben(
	db: DbOderTx,
	t: { jahr: number; kontaktMitgliedId: number | null },
	mitgliedId: number,
	jetzt: Date
): Promise<boolean> {
	if (t.jahr < jahrInZuerich(jetzt)) return false;
	if (t.kontaktMitgliedId === null || t.kontaktMitgliedId === mitgliedId) return false;
	if (!(await kontaktGueltig(db, t.kontaktMitgliedId))) return false;
	const [m] = await db
		.select({ status: mitglied.status })
		.from(mitglied)
		.where(eq(mitglied.id, mitgliedId));
	return m?.status === 'aktiv';
}

export async function ladeEigenesGespraech(
	db: DbOderTx,
	turnierId: number,
	mitgliedId: number,
	jetzt: Date
): Promise<EigenesGespraech | null> {
	const t = await sichtbaresTurnier(db, turnierId);
	if (!t) return null;
	const kontakt = await gueltigerKontakt(db, t.kontaktMitgliedId);
	const schreiben = await darfSchreiben(db, t, mitgliedId, jetzt);
	const [g] = await db
		.select()
		.from(gespraech)
		.where(and(eq(gespraech.turnierId, turnierId), eq(gespraech.mitgliedId, mitgliedId)));
	const zeilen = g
		? await db
				.select({
					id: nachricht.id,
					von: nachricht.von,
					text: nachricht.text,
					gesendetAm: nachricht.gesendetAm
				})
				.from(nachricht)
				.where(eq(nachricht.gespraechId, g.id))
				.orderBy(asc(nachricht.id))
		: [];
	return {
		turnier: { id: t.id, name: t.name },
		kontakt: kontakt?.name ?? null,
		schreiben,
		// Bewusst ohne Admin-Id und Admin-Name: das Mitglied sieht nur «Turnierleitung».
		nachrichten: zeilen.map((z) => ({
			id: z.id,
			von: z.von === 'mitglied' ? ('du' as const) : ('leitung' as const),
			text: z.text,
			gesendetAm: z.gesendetAm,
			neu: z.von === 'leitung' && (g.gelesenAm === null || z.gesendetAm > g.gelesenAm)
		}))
	};
}

export async function gespraechStand(
	db: DbOderTx,
	turnierId: number,
	mitgliedId: number,
	jetzt: Date
): Promise<{ vorhanden: boolean; neueAntwort: boolean; schreiben: boolean }> {
	const t = await sichtbaresTurnier(db, turnierId);
	if (!t) return { vorhanden: false, neueAntwort: false, schreiben: false };
	const schreiben = await darfSchreiben(db, t, mitgliedId, jetzt);
	const [g] = await db
		.select()
		.from(gespraech)
		.where(and(eq(gespraech.turnierId, turnierId), eq(gespraech.mitgliedId, mitgliedId)));
	if (!g) return { vorhanden: false, neueAntwort: false, schreiben };
	const [neu] = await db
		.select({ id: nachricht.id })
		.from(nachricht)
		.where(
			and(
				eq(nachricht.gespraechId, g.id),
				eq(nachricht.von, 'leitung'),
				g.gelesenAm === null ? undefined : gt(nachricht.gesendetAm, g.gelesenAm)
			)
		)
		.limit(1);
	return { vorhanden: true, neueAntwort: neu !== undefined, schreiben };
}

export async function schreibeAlsMitglied(
	db: DbOderTx,
	turnierId: number,
	mitgliedId: number,
	text: string,
	jetzt: Date
): Promise<
	{ ergebnis: 'ok'; gespraechId: number; kontaktId: number } | 'nicht-gefunden' | 'nur-lesen'
> {
	const t = await sichtbaresTurnier(db, turnierId);
	if (!t) return 'nicht-gefunden';
	if (!(await darfSchreiben(db, t, mitgliedId, jetzt))) return 'nur-lesen';
	const gespraechId = await db.transaction(async (tx) => {
		// FR-50/FR-52: eines je Turnier und Mitglied; eine neue Nachricht öffnet ein erledigtes wieder.
		const [g] = await tx
			.insert(gespraech)
			.values({ turnierId, mitgliedId, zustand: 'offen', letzteAm: jetzt })
			.onConflictDoUpdate({
				target: [gespraech.turnierId, gespraech.mitgliedId],
				set: { zustand: 'offen', letzteAm: jetzt }
			})
			.returning({ id: gespraech.id });
		await tx
			.insert(nachricht)
			.values({ gespraechId: g.id, von: 'mitglied', text, gesendetAm: jetzt });
		return g.id;
	});
	return { ergebnis: 'ok', gespraechId, kontaktId: t.kontaktMitgliedId! };
}

export async function markiereGelesen(
	db: DbOderTx,
	turnierId: number,
	mitgliedId: number,
	jetzt: Date
): Promise<void> {
	await db
		.update(gespraech)
		.set({ gelesenAm: jetzt })
		.where(and(eq(gespraech.turnierId, turnierId), eq(gespraech.mitgliedId, mitgliedId)));
}

export async function listeGespraeche(
	db: DbOderTx,
	turnierId: number
): Promise<{
	turnier: { id: number; name: string; jahr: number };
	kontakt: Namensteile | null;
	zeilen: GespraechZeile[];
} | null> {
	const [t] = await db.select().from(turnier).where(eq(turnier.id, turnierId));
	if (!t) return null;
	const kontakt = await gueltigerKontakt(db, t.kontaktMitgliedId);
	const gs = await db
		.select({ id: gespraech.id, zustand: gespraech.zustand, ...namensSpalten })
		.from(gespraech)
		.innerJoin(mitglied, eq(mitglied.id, gespraech.mitgliedId))
		.where(eq(gespraech.turnierId, turnierId));
	const ids = gs.map((g) => g.id);
	const ns = ids.length
		? await db
				.select()
				.from(nachricht)
				.where(inArray(nachricht.gespraechId, ids))
				.orderBy(asc(nachricht.id))
		: [];
	const letzte = new Map<number, (typeof ns)[number]>();
	const letzteMitglied = new Map<number, number>();
	for (const n of ns) {
		letzte.set(n.gespraechId, n);
		if (n.von === 'mitglied') letzteMitglied.set(n.gespraechId, n.gesendetAm.getTime());
	}
	const zeilen = gs
		.map((g) => {
			const l = letzte.get(g.id)!;
			return {
				zeile: {
					id: g.id,
					mitglied: { rufname: g.rufname, vorname: g.vorname, nachname: g.nachname },
					letzte: { von: l.von, text: l.text, gesendetAm: l.gesendetAm },
					zustand: g.zustand
				} satisfies GespraechZeile,
				mitglied: letzteMitglied.get(g.id) ?? 0
			};
		})
		// Offene zuerst, darin die neueste Nachricht eines Mitglieds oben.
		.sort(
			(a, b) =>
				Number(b.zeile.zustand === 'offen') - Number(a.zeile.zustand === 'offen') ||
				b.mitglied - a.mitglied ||
				b.zeile.id - a.zeile.id
		)
		.map((x) => x.zeile);
	return {
		turnier: { id: t.id, name: t.name, jahr: t.jahr },
		kontakt: kontakt?.name ?? null,
		zeilen
	};
}

export async function ladeGespraech(
	db: DbOderTx,
	gespraechId: number,
	jetzt: Date
): Promise<{
	id: number;
	turnier: { id: number; name: string };
	mitglied: Namensteile;
	zustand: Zustand;
	antworten: boolean;
	nachrichten: AdminNachricht[];
} | null> {
	const [g] = await db
		.select({
			id: gespraech.id,
			zustand: gespraech.zustand,
			turnierId: turnier.id,
			turnierName: turnier.name,
			jahr: turnier.jahr,
			...namensSpalten
		})
		.from(gespraech)
		.innerJoin(turnier, eq(turnier.id, gespraech.turnierId))
		.innerJoin(mitglied, eq(mitglied.id, gespraech.mitgliedId))
		.where(eq(gespraech.id, gespraechId));
	if (!g) return null;
	const ns = await db
		.select({
			id: nachricht.id,
			von: nachricht.von,
			text: nachricht.text,
			gesendetAm: nachricht.gesendetAm,
			adminId: nachricht.adminMitgliedId
		})
		.from(nachricht)
		.where(eq(nachricht.gespraechId, gespraechId))
		.orderBy(asc(nachricht.id));
	const adminIds = [...new Set(ns.flatMap((n) => (n.adminId === null ? [] : [n.adminId])))];
	const admins = adminIds.length
		? await db
				.select({ id: mitglied.id, ...namensSpalten })
				.from(mitglied)
				.where(inArray(mitglied.id, adminIds))
		: [];
	const adminNamen = new Map(
		admins.map((a) => [a.id, { rufname: a.rufname, vorname: a.vorname, nachname: a.nachname }])
	);
	return {
		id: g.id,
		turnier: { id: g.turnierId, name: g.turnierName },
		mitglied: { rufname: g.rufname, vorname: g.vorname, nachname: g.nachname },
		zustand: g.zustand,
		antworten: g.jahr >= jahrInZuerich(jetzt),
		nachrichten: ns.map((n) => ({
			id: n.id,
			von: n.von,
			admin: n.adminId === null ? null : (adminNamen.get(n.adminId) ?? null),
			text: n.text,
			gesendetAm: n.gesendetAm
		}))
	};
}

export async function antworte(
	db: DbOderTx,
	gespraechId: number,
	adminId: number,
	text: string,
	nachLetzter: number,
	trotzdem: boolean,
	jetzt: Date
): Promise<
	| { ergebnis: 'ok'; mitgliedId: number; turnierId: number }
	| { ergebnis: 'inzwischen' }
	| 'nicht-gefunden'
	| 'nur-lesen'
> {
	return db.transaction(async (tx) => {
		const [g] = await tx
			.select({
				mitgliedId: gespraech.mitgliedId,
				turnierId: gespraech.turnierId,
				jahr: turnier.jahr
			})
			.from(gespraech)
			.innerJoin(turnier, eq(turnier.id, gespraech.turnierId))
			.where(eq(gespraech.id, gespraechId))
			.for('update', { of: gespraech });
		if (!g) return 'nicht-gefunden' as const;
		if (g.jahr < jahrInZuerich(jetzt)) return 'nur-lesen' as const;
		if (!trotzdem) {
			const [neuer] = await tx
				.select({ id: nachricht.id })
				.from(nachricht)
				.where(
					and(
						eq(nachricht.gespraechId, gespraechId),
						eq(nachricht.von, 'leitung'),
						gt(nachricht.id, nachLetzter)
					)
				)
				.limit(1);
			if (neuer) return { ergebnis: 'inzwischen' as const };
		}
		await tx.insert(nachricht).values({
			gespraechId,
			von: 'leitung',
			adminMitgliedId: adminId,
			text,
			gesendetAm: jetzt
		});
		// FR-52: Eine Antwort ändert den Zustand nicht.
		await tx.update(gespraech).set({ letzteAm: jetzt }).where(eq(gespraech.id, gespraechId));
		return { ergebnis: 'ok' as const, mitgliedId: g.mitgliedId, turnierId: g.turnierId };
	});
}

export async function setzeZustand(
	db: DbOderTx,
	gespraechId: number,
	zustand: Zustand
): Promise<'ok' | 'nicht-gefunden'> {
	const r = await db
		.update(gespraech)
		.set({ zustand })
		.where(eq(gespraech.id, gespraechId))
		.returning({ id: gespraech.id });
	return r.length ? 'ok' : 'nicht-gefunden';
}

export async function offeneZahlen(
	db: DbOderTx,
	turnierIds: number[]
): Promise<Map<number, { offen: number; erledigt: number }>> {
	const karte = new Map<number, { offen: number; erledigt: number }>();
	if (turnierIds.length === 0) return karte;
	const zeilen = await db
		.select({
			turnierId: gespraech.turnierId,
			zustand: gespraech.zustand,
			n: sql<number>`count(*)::int`
		})
		.from(gespraech)
		.where(inArray(gespraech.turnierId, turnierIds))
		.groupBy(gespraech.turnierId, gespraech.zustand);
	for (const id of turnierIds) karte.set(id, { offen: 0, erledigt: 0 });
	for (const z of zeilen) karte.get(z.turnierId)![z.zustand] = z.n;
	return karte;
}

export async function offeneGespraecheGesamt(db: DbOderTx, jetzt: Date): Promise<number> {
	const [r] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(gespraech)
		.innerJoin(turnier, eq(turnier.id, gespraech.turnierId))
		.where(
			and(
				eq(gespraech.zustand, 'offen'),
				ne(turnier.status, 'vorbereitung'),
				gte(turnier.jahr, jahrInZuerich(jetzt))
			)
		);
	return r.n;
}
