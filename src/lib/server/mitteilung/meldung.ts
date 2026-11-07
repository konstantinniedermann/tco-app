// Persönliche Meldung an einzelne Mitglieder oder die CM-Admins (FR-47, DS-05): Push, sonst
// E-Mail. Die Themen gelten nicht, es gibt keinen Abschalt-Fuss. Pro Empfänger eine eigene Mail.
// Die Meldung wirft nie und loggt nichts (SI-05).
import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { konto, kontoRolle, mitglied, pushAbo } from '../db/schema.ts';
import type { Mailer } from '../login/dienst.ts';
import { sendeMail, sendePush, type PushSender } from './versand.ts';

export type Melder = { db: Db; push: PushSender | null; mailer: Mailer; adresse: string };

/** Mitglied-IDs aller nicht gesperrten Konten mit Rolle `cm`. */
export async function cmAdmins(db: Db): Promise<number[]> {
	const zeilen = await db
		.select({ mitgliedId: konto.mitgliedId })
		.from(kontoRolle)
		.innerJoin(konto, eq(konto.id, kontoRolle.kontoId))
		.where(and(eq(kontoRolle.rolle, 'cm'), eq(konto.gesperrt, false)))
		.orderBy(asc(konto.mitgliedId));
	return zeilen.map((z) => z.mitgliedId);
}

/** Je Mitglied (aktiv, Konto nicht gesperrt oder ohne Konto): Push an alle Abos, sonst eine Mail. */
export async function meldeMitgliedern(
	d: Melder,
	mitgliedIds: number[],
	m: { titel: string; text: string; pfad: string }
): Promise<void> {
	try {
		const ids = [...new Set(mitgliedIds)];
		if (ids.length === 0) return;
		const zeilen = await d.db
			.select({ id: mitglied.id, email: mitglied.email, kontoId: konto.id })
			.from(mitglied)
			.leftJoin(konto, eq(konto.mitgliedId, mitglied.id))
			.where(
				and(
					inArray(mitglied.id, ids),
					eq(mitglied.status, 'aktiv'),
					or(isNull(konto.id), eq(konto.gesperrt, false))
				)
			);
		const kontoIds = zeilen.flatMap((z) => (z.kontoId === null ? [] : [z.kontoId]));
		const abos =
			kontoIds.length === 0 || d.push === null
				? []
				: await d.db
						.select({
							kontoId: pushAbo.kontoId,
							endpunkt: pushAbo.endpunkt,
							p256dh: pushAbo.p256dh,
							auth: pushAbo.auth
						})
						.from(pushAbo)
						.where(inArray(pushAbo.kontoId, kontoIds))
						.orderBy(asc(pushAbo.endpunkt));
		const link = d.adresse.replace(/\/+$/, '') + m.pfad;
		const nutzlast = JSON.stringify({ titel: m.titel, text: m.text, link });
		const mailText = `${m.text}\n\n${link}`;
		const push = d.push;
		for (const z of zeilen) {
			let gelungen = false;
			if (push !== null) {
				const meine = abos.filter((a) => a.kontoId === z.kontoId);
				const r = await Promise.all(
					meine.map((a) =>
						sendePush(
							d.db,
							push,
							{ endpunkt: a.endpunkt, p256dh: a.p256dh, auth: a.auth },
							nutzlast
						)
					)
				);
				gelungen = r.includes(true);
			}
			if (!gelungen && z.email) await sendeMail(d.mailer, z.email, m.titel, mailText);
		}
	} catch {
		// Eine Meldung darf den Vorgang, der sie auslöst, nie scheitern lassen.
	}
}
