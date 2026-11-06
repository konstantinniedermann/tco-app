// Wer eine Mitteilung bekommt (FR-43). Grundmenge sind die aktiven Mitglieder; ein gesperrtes
// Konto bekommt nichts. Mitglieder ohne Konto (noch nie angemeldet) bekommen sie nur per Mail;
// für sie gelten die Themen wie für neue Konten als an (FR-41). Wer das Thema abgeschaltet hat,
// fällt weg, für Push und Mail.
import { and, asc, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { AnlassAuswahl } from '../../mitteilung/auswahl.ts';
import { istOffen, zuPruefen } from '../anlass/anlaesse.ts';
import type { Db } from '../db/index.ts';
import { anlass, anlassAnmeldung, konto, mitglied, pushAbo } from '../db/schema.ts';

export type Empfaenger = {
	mitgliedId: number;
	name: string;
	email: string | null;
	abos: { endpunkt: string; p256dh: string; auth: string }[];
};

const GRUNDFELDER = {
	mitgliedId: mitglied.id,
	name: sql<string>`${mitglied.nachname} || ', ' || ${mitglied.vorname}`,
	email: mitglied.email,
	kontoId: konto.id
};

/** Aktive Mitglieder, deren Konto nicht gesperrt ist und das Thema an hat, oder ohne Konto. */
const grundmenge = (themaAn: SQL) =>
	and(eq(mitglied.status, 'aktiv'), or(isNull(konto.id), and(eq(konto.gesperrt, false), themaAn)));

// Wie die Liste der Anmeldungen in der Verwaltung.
const REIHENFOLGE = [asc(mitglied.nachname), asc(mitglied.vorname), asc(mitglied.id)];

type Grundzeile = { mitgliedId: number; name: string; email: string; kontoId: number | null };

async function mitAbos(db: Db, zeilen: Grundzeile[]): Promise<Empfaenger[]> {
	const kontoIds = zeilen.flatMap((z) => (z.kontoId === null ? [] : [z.kontoId]));
	const abos =
		kontoIds.length === 0
			? []
			: await db
					.select({
						kontoId: pushAbo.kontoId,
						endpunkt: pushAbo.endpunkt,
						p256dh: pushAbo.p256dh,
						auth: pushAbo.auth
					})
					.from(pushAbo)
					.where(inArray(pushAbo.kontoId, kontoIds))
					.orderBy(asc(pushAbo.endpunkt));
	return zeilen.map(({ mitgliedId, name, email, kontoId }) => ({
		mitgliedId,
		name,
		email,
		abos: abos
			.filter((a) => a.kontoId === kontoId)
			.map(({ endpunkt, p256dh, auth }) => ({ endpunkt, p256dh, auth }))
	}));
}

/**
 * Empfänger zu einem Anlass nach genau einer Auswahl (FR-43); ein unbekannter Anlass hat keine.
 * *keine-antwort*: ohne Anmeldung zu diesem Anlass (wie «noch keine Antwort» in der Verwaltung).
 * *zu-pruefen*: nach `zuPruefen` aus `anlass/anlaesse.ts` (FR-32), darum in TypeScript gefiltert.
 */
export async function anlassEmpfaenger(
	db: Db,
	anlassId: number,
	auswahl: AnlassAuswahl,
	jetzt: Date
): Promise<Empfaenger[]> {
	const [a] = await db
		.select({ anmeldeschluss: anlass.anmeldeschluss, terminGeaendertAm: anlass.terminGeaendertAm })
		.from(anlass)
		.where(eq(anlass.id, anlassId));
	if (!a) return [];
	const zeilen = await db
		.select({
			...GRUNDFELDER,
			antwort: anlassAnmeldung.antwort,
			antwortGeaendertAm: anlassAnmeldung.geaendertAm
		})
		.from(mitglied)
		.leftJoin(konto, eq(konto.mitgliedId, mitglied.id))
		.leftJoin(
			anlassAnmeldung,
			and(eq(anlassAnmeldung.anlassId, anlassId), eq(anlassAnmeldung.mitgliedId, mitglied.id))
		)
		.where(grundmenge(eq(konto.themaAnlaesse, true)))
		.orderBy(...REIHENFOLGE);
	const offen = istOffen(a.anmeldeschluss, jetzt);
	const passt = (z: (typeof zeilen)[number]): boolean => {
		switch (auswahl) {
			case 'alle':
				return true;
			case 'keine-antwort':
				return z.antwort === null;
			case 'kommt':
			case 'kommt-nicht':
				return z.antwort === auswahl;
			case 'zu-pruefen':
				return zuPruefen(offen, z.antwortGeaendertAm, a.terminGeaendertAm);
		}
	};
	return mitAbos(db, zeilen.filter(passt));
}

/** Empfänger einer Mitteilung an den Verein: alle aktiven Mitglieder mit Thema Verein. */
export async function vereinEmpfaenger(db: Db): Promise<Empfaenger[]> {
	const zeilen = await db
		.select(GRUNDFELDER)
		.from(mitglied)
		.leftJoin(konto, eq(konto.mitgliedId, mitglied.id))
		.where(grundmenge(eq(konto.themaVerein, true)))
		.orderBy(...REIHENFOLGE);
	return mitAbos(db, zeilen);
}
