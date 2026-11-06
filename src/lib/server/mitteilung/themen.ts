// Themen, zu denen ein Konto Mitteilungen will (FR-41), und ob dieses Gerät Push eingerichtet hat.
import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { konto, type Thema } from '../db/schema.ts';
import { hatAbo } from './abo.ts';

export const THEMEN: readonly Thema[] = ['anlaesse', 'cm', 'verein'];

/** Alle drei Themen als Wahrheitswerte, sonst `null`. */
export function pruefeThemen(roh: unknown): Record<Thema, boolean> | null {
	if (typeof roh !== 'object' || roh === null || Array.isArray(roh)) return null;
	const r = roh as Record<string, unknown>;
	if (THEMEN.some((t) => typeof r[t] !== 'boolean')) return null;
	return { anlaesse: r.anlaesse, cm: r.cm, verein: r.verein } as Record<Thema, boolean>;
}

export async function ladeEinstellungen(
	db: Db,
	kontoId: number,
	sitzungHash: string
): Promise<{ themen: Record<Thema, boolean>; pushHier: boolean }> {
	const [z] = await db
		.select({
			anlaesse: konto.themaAnlaesse,
			cm: konto.themaCm,
			verein: konto.themaVerein
		})
		.from(konto)
		.where(eq(konto.id, kontoId));
	return { themen: z, pushHier: await hatAbo(db, sitzungHash) };
}

export async function setzeThemen(
	db: Db,
	kontoId: number,
	themen: Record<Thema, boolean>
): Promise<void> {
	await db
		.update(konto)
		.set({
			themaAnlaesse: themen.anlaesse,
			themaCm: themen.cm,
			themaVerein: themen.verein
		})
		.where(eq(konto.id, kontoId));
}
