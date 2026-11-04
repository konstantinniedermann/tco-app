import { createHash, randomBytes } from 'node:crypto';
import { eq, lt, sql } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { konto, mitglied, sitzung } from '../db/schema.ts';

export const SITZUNG_COOKIE = 'mytco_sitzung';
export const SITZUNG_GUELTIG_MS = 365 * 24 * 60 * 60 * 1000;
export const VERLAENGERN_NACH_MS = 24 * 60 * 60 * 1000;

export type AngemeldetesKonto = { kontoId: number; vorname: string; passkeyHinweis: boolean };

export function sitzungAbgelaufen(zuletztGenutzt: Date, jetzt: Date): boolean {
	return jetzt.getTime() - zuletztGenutzt.getTime() > SITZUNG_GUELTIG_MS;
}

export function mussVerlaengern(zuletztGenutzt: Date, jetzt: Date): boolean {
	return jetzt.getTime() - zuletztGenutzt.getTime() > VERLAENGERN_NACH_MS;
}

// SHA-256 genügt ohne Schlüssel: Die Kennung hat 256 Bit Zufall (SI-06).
function hashe(kennung: string): string {
	return createHash('sha256').update(kennung).digest('hex');
}

// Legt eine Sitzung an und räumt in derselben Transaktion auf: abgelaufene Zeilen aller
// Konten und die Sitzung des alten Cookies. Gibt die Klartext-Kennung für das Cookie zurück.
export async function erstelleSitzung(
	db: Db,
	kontoId: number,
	jetzt: Date,
	alteKennung?: string,
	optionen?: { passkeyHinweis?: boolean }
): Promise<string> {
	const kennung = randomBytes(32).toString('base64url');
	await db.transaction(async (tx) => {
		await tx
			.delete(sitzung)
			.where(lt(sitzung.zuletztGenutzt, new Date(jetzt.getTime() - SITZUNG_GUELTIG_MS)));
		if (alteKennung !== undefined) {
			await tx.delete(sitzung).where(eq(sitzung.kennungHash, hashe(alteKennung)));
		}
		const [k] = await tx
			.select({ sitzungsversion: konto.sitzungsversion })
			.from(konto)
			.where(eq(konto.id, kontoId));
		await tx.insert(sitzung).values({
			kennungHash: hashe(kennung),
			kontoId,
			sitzungsversion: k.sitzungsversion,
			erstelltAm: jetzt,
			zuletztGenutzt: jetzt,
			passkeyHinweis: optionen?.passkeyHinweis ?? false
		});
	});
	return kennung;
}

export async function pruefeSitzung(
	db: Db,
	kennung: string,
	jetzt: Date
): Promise<{ konto: AngemeldetesKonto; verlaengert: boolean } | null> {
	const kennungHash = hashe(kennung);
	const [zeile] = await db
		.select({
			kontoId: konto.id,
			vorname: mitglied.vorname,
			zuletztGenutzt: sitzung.zuletztGenutzt,
			passkeyHinweis: sitzung.passkeyHinweis,
			sitzungsversion: sitzung.sitzungsversion,
			kontoVersion: konto.sitzungsversion,
			gesperrt: konto.gesperrt,
			status: mitglied.status
		})
		.from(sitzung)
		.innerJoin(konto, eq(konto.id, sitzung.kontoId))
		.innerJoin(mitglied, eq(mitglied.id, konto.mitgliedId))
		.where(eq(sitzung.kennungHash, kennungHash));
	if (
		!zeile ||
		sitzungAbgelaufen(zeile.zuletztGenutzt, jetzt) ||
		zeile.sitzungsversion !== zeile.kontoVersion ||
		zeile.gesperrt ||
		zeile.status !== 'aktiv'
	) {
		return null;
	}
	const verlaengert = mussVerlaengern(zeile.zuletztGenutzt, jetzt);
	if (verlaengert) {
		await db
			.update(sitzung)
			.set({ zuletztGenutzt: jetzt })
			.where(eq(sitzung.kennungHash, kennungHash));
	}
	return {
		konto: {
			kontoId: zeile.kontoId,
			vorname: zeile.vorname,
			passkeyHinweis: zeile.passkeyHinweis
		},
		verlaengert
	};
}

// Nimmt den Passkey-Hinweis von der Sitzung weg (nach Einrichten oder "Nein, danke").
export async function beendePasskeyHinweis(db: Db, kennung: string): Promise<void> {
	await db
		.update(sitzung)
		.set({ passkeyHinweis: false })
		.where(eq(sitzung.kennungHash, hashe(kennung)));
}

export async function beendeSitzung(db: Db, kennung: string): Promise<void> {
	await db.delete(sitzung).where(eq(sitzung.kennungHash, hashe(kennung)));
}

// SI-07: Erhöht die Sitzungsversion und löscht die Zeilen; beides in einer Transaktion.
export async function beendeAlleSitzungen(db: Db, kontoId: number): Promise<void> {
	await db.transaction(async (tx) => {
		await tx
			.update(konto)
			.set({ sitzungsversion: sql`${konto.sitzungsversion} + 1` })
			.where(eq(konto.id, kontoId));
		await tx.delete(sitzung).where(eq(sitzung.kontoId, kontoId));
	});
}
