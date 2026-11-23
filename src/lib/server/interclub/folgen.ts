// Interclub-Teams folgen: wer welchem Team folgt, und ob das Konto Push eingerichtet hat.
import { and, asc, eq, max } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { icFolgen, icTeam, pushAbo } from '../db/schema.ts';

export type FolgenStand = { folgt: boolean; push: boolean };
export type GefolgtesTeam = { teamId: number; liga: string };

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
	const [team] = await db
		.select({ teamId: icTeam.teamId })
		.from(icTeam)
		.where(eq(icTeam.teamId, teamId))
		.limit(1);
	if (!team) return 'nicht-gefunden';
	if (!folgen) {
		await db
			.delete(icFolgen)
			.where(and(eq(icFolgen.kontoId, kontoId), eq(icFolgen.teamId, teamId)));
		return 'ok';
	}
	if (!(await hatPush(db, kontoId))) return 'kein-push';
	await db.insert(icFolgen).values({ kontoId, teamId, seit: jetzt }).onConflictDoNothing();
	return 'ok';
}

/** Die Teams der neuesten Saison, denen das Konto folgt, in der Reihenfolge der Übersicht. */
export async function ladeGefolgteTeams(
	db: Db,
	kontoId: number
): Promise<{ teams: GefolgtesTeam[]; push: boolean }> {
	const [neueste] = await db.select({ saison: max(icTeam.saison) }).from(icTeam);
	const teams: GefolgtesTeam[] =
		neueste?.saison == null
			? []
			: await db
					.select({ teamId: icTeam.teamId, liga: icTeam.liga })
					.from(icFolgen)
					.innerJoin(
						icTeam,
						and(eq(icTeam.teamId, icFolgen.teamId), eq(icTeam.saison, neueste.saison))
					)
					.where(eq(icFolgen.kontoId, kontoId))
					.orderBy(asc(icTeam.reihenfolge), asc(icTeam.teamId));
	return { teams, push: await hatPush(db, kontoId) };
}
