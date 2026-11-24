// Interclub-Teams folgen: wer welchem Team folgt, und ob das Konto Push eingerichtet hat.
import { and, asc, desc, eq, inArray, max, or } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { icFolgen, icTeam, pushAbo } from '../db/schema.ts';

export type FolgenStand = { folgt: boolean; push: boolean };
export type GefolgtesTeam = { teamId: number; liga: string };
/** Für die Auskunft (DS-07): dazu, seit wann das Konto dem Team folgt. */
export type GefolgtesTeamSeit = GefolgtesTeam & { seit: Date };

async function hatPush(db: Db, kontoId: number): Promise<boolean> {
	const [z] = await db
		.select({ endpunkt: pushAbo.endpunkt })
		.from(pushAbo)
		.where(eq(pushAbo.kontoId, kontoId))
		.limit(1);
	return z !== undefined;
}

export async function ladeFolgenStand(
	db: Db,
	kontoId: number,
	teamId: number
): Promise<FolgenStand> {
	const [z] = await db
		.select({ teamId: icFolgen.teamId })
		.from(icFolgen)
		.where(and(eq(icFolgen.kontoId, kontoId), eq(icFolgen.teamId, teamId)));
	return { folgt: z !== undefined, push: await hatPush(db, kontoId) };
}

export async function setzeFolgen(
	db: Db,
	kontoId: number,
	teamId: number,
	folgen: boolean,
	jetzt: Date
): Promise<'ok' | 'nicht-gefunden' | 'kein-push'> {
	// Entfolgen geht immer, auch wenn das Team in `ic_team` nicht mehr steht.
	if (!folgen) {
		await db
			.delete(icFolgen)
			.where(and(eq(icFolgen.kontoId, kontoId), eq(icFolgen.teamId, teamId)));
		return 'ok';
	}
	const [team] = await db
		.select({ teamId: icTeam.teamId })
		.from(icTeam)
		.where(eq(icTeam.teamId, teamId))
		.limit(1);
	if (!team) return 'nicht-gefunden';
	if (!(await hatPush(db, kontoId))) return 'kein-push';
	await db.insert(icFolgen).values({ kontoId, teamId, seit: jetzt }).onConflictDoNothing();
	return 'ok';
}

/**
 * Die Teams der neuesten Saison je Wettbewerb (IC und JIC getrennt), denen das Konto folgt, in der
 * Reihenfolge der Übersicht: erst IC, dann JIC. So bleibt ein IC-Team in der Liste, auch wenn JIC
 * der neuen Saison schon da ist und IC noch nicht.
 */
export async function ladeGefolgteTeams(
	db: Db,
	kontoId: number
): Promise<{ teams: GefolgtesTeam[]; push: boolean }> {
	const neueste = await db
		.select({ wettbewerb: icTeam.wettbewerb, saison: max(icTeam.saison) })
		.from(icTeam)
		.groupBy(icTeam.wettbewerb);
	const saisons = neueste.flatMap((n) =>
		n.saison === null ? [] : [and(eq(icTeam.wettbewerb, n.wettbewerb), eq(icTeam.saison, n.saison))]
	);
	const teams: GefolgtesTeam[] =
		saisons.length === 0
			? []
			: await db
					.select({ teamId: icTeam.teamId, liga: icTeam.liga })
					.from(icFolgen)
					.innerJoin(icTeam, and(eq(icTeam.teamId, icFolgen.teamId), or(...saisons)))
					.where(eq(icFolgen.kontoId, kontoId))
					.orderBy(asc(icTeam.wettbewerb), asc(icTeam.reihenfolge), asc(icTeam.teamId));
	return { teams, push: await hatPush(db, kontoId) };
}

/**
 * Alle Teams, denen das Konto folgt (für die Auskunft), je mit der Liga der neuesten Saison, in der
 * es das Team gibt. Reihenfolge: neueste Saison zuerst, dann wie die Übersicht. Ein Team ohne Zeile
 * in `ic_team` erscheint als «Team <Nr>», damit nichts Gespeichertes fehlt.
 */
export async function ladeAlleGefolgtenTeams(
	db: Db,
	kontoId: number
): Promise<GefolgtesTeamSeit[]> {
	const gefolgt = await db
		.select({ teamId: icFolgen.teamId, seit: icFolgen.seit })
		.from(icFolgen)
		.where(eq(icFolgen.kontoId, kontoId));
	if (gefolgt.length === 0) return [];
	const zeilen = await db
		.select({ teamId: icTeam.teamId, liga: icTeam.liga })
		.from(icTeam)
		.where(
			inArray(
				icTeam.teamId,
				gefolgt.map((z) => z.teamId)
			)
		)
		.orderBy(desc(icTeam.saison), asc(icTeam.reihenfolge), asc(icTeam.teamId));
	const seit = new Map(gefolgt.map((z) => [z.teamId, z.seit]));
	const ligen = new Map<number, string>();
	const ergebnis: GefolgtesTeamSeit[] = [];
	for (const z of zeilen) {
		if (ligen.has(z.teamId)) continue;
		ligen.set(z.teamId, z.liga);
		ergebnis.push({ teamId: z.teamId, liga: z.liga, seit: seit.get(z.teamId)! });
	}
	const unbekannt = gefolgt
		.map((z) => z.teamId)
		.filter((id) => !ligen.has(id))
		.sort((a, b) => a - b);
	return [
		...ergebnis,
		...unbekannt.map((teamId) => ({ teamId, liga: `Team ${teamId}`, seit: seit.get(teamId)! }))
	];
}
