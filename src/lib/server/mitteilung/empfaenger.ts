// Wer eine Mitteilung bekommt (FR-43). Grundmenge sind die aktiven Mitglieder; ein gesperrtes
// Konto bekommt nichts. Mitglieder ohne Konto (noch nie angemeldet) bekommen sie nur per Mail;
// für sie gelten die Themen wie für neue Konten als an (FR-41). Wer das Thema abgeschaltet hat,
// fällt weg, für Push und Mail.
import { and, asc, eq, inArray, isNull, or, type SQL } from 'drizzle-orm';
import type { Namensteile } from '../../name.ts';
import {
	rolleAus,
	type AnlassAuswahl,
	type TurnierAuswahl,
	type VereinAuswahl
} from '../../mitteilung/auswahl.ts';
import {
	fehlendeAngaben,
	passtDoppelAllein,
	passtEinzel,
	type Spieler
} from '../../turnier/passung.ts';
import { istOffen, zuPruefen } from '../anlass/anlaesse.ts';
import { spielerAus } from '../cm/angaben.ts';
import { GRENZE, istAktiv, regelAus, spielerSpalten } from '../cm/anmeldungen.ts';
import type { Db } from '../db/index.ts';
import { namensSpalten } from '../namen.ts';
import {
	anlass,
	anlassAnmeldung,
	anmeldung,
	anmeldungSpieler,
	kategorie,
	konto,
	kontoRolle,
	mitglied,
	pushAbo,
	turnier,
	type AnmeldungStatus
} from '../db/schema.ts';

export type Empfaenger = {
	mitgliedId: number;
	name: Namensteile;
	email: string | null;
	abos: { endpunkt: string; p256dh: string; auth: string }[];
};

const GRUNDFELDER = {
	mitgliedId: mitglied.id,
	name: namensSpalten,
	email: mitglied.email,
	kontoId: konto.id
};

/** Aktive Mitglieder, deren Konto nicht gesperrt ist und das Thema an hat, oder ohne Konto. */
const grundmenge = (themaAn: SQL) =>
	and(eq(mitglied.status, 'aktiv'), or(isNull(konto.id), and(eq(konto.gesperrt, false), themaAn)));

// Wie die Liste der Anmeldungen in der Verwaltung.
const REIHENFOLGE = [asc(mitglied.nachname), asc(mitglied.vorname), asc(mitglied.id)];

type Grundzeile = {
	mitgliedId: number;
	name: Namensteile;
	email: string | null;
	kontoId: number | null;
};

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

/**
 * Empfänger einer Mitteilung an den Verein: alle aktiven Mitglieder mit Thema Verein, oder nur die
 * mit der Rolle der Auswahl. Eine Rolle hat nur ein Konto: Mitglieder ohne Konto fallen dort weg.
 */
export async function vereinEmpfaenger(db: Db, auswahl: VereinAuswahl): Promise<Empfaenger[]> {
	const rolle = rolleAus(auswahl);
	const grund = grundmenge(eq(konto.themaVerein, true));
	const mitRolle = (r: string) =>
		inArray(
			konto.id,
			db.select({ id: kontoRolle.kontoId }).from(kontoRolle).where(eq(kontoRolle.rolle, r))
		);
	const zeilen = await db
		.select(GRUNDFELDER)
		.from(mitglied)
		.leftJoin(konto, eq(konto.mitgliedId, mitglied.id))
		.where(rolle === null ? grund : and(grund, mitRolle(rolle)))
		.orderBy(...REIHENFOLGE);
	return mitAbos(db, zeilen);
}

type AktiveAnmeldung = { kategorieId: number; status: AnmeldungStatus; spieler: number[] };

/**
 * Aktive Anmeldungen (FR-06) in allen Kategorien des Turniers, je Mitglied. `spieler` sind alle
 * Spieler der Anmeldung, auch die ausserhalb der Grundmenge: Ein Paar bleibt ein Paar, wenn der
 * Partner das Thema aus hat.
 */
async function anmeldungenJeMitglied(
	db: Db,
	turnierId: number
): Promise<Map<number, AktiveAnmeldung[]>> {
	const zeilen = await db
		.select({
			anmeldungId: anmeldung.id,
			kategorieId: anmeldung.kategorieId,
			status: anmeldung.status,
			mitgliedId: anmeldungSpieler.mitgliedId
		})
		.from(anmeldung)
		.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.where(and(eq(kategorie.turnierId, turnierId), istAktiv));
	const jeAnmeldung = new Map<number, AktiveAnmeldung>();
	for (const z of zeilen) {
		const a = jeAnmeldung.get(z.anmeldungId) ?? {
			kategorieId: z.kategorieId,
			status: z.status,
			spieler: []
		};
		a.spieler.push(z.mitgliedId);
		jeAnmeldung.set(z.anmeldungId, a);
	}
	const jeMitglied = new Map<number, AktiveAnmeldung[]>();
	for (const a of jeAnmeldung.values()) {
		for (const id of a.spieler) jeMitglied.set(id, [...(jeMitglied.get(id) ?? []), a]);
	}
	return jeMitglied;
}

/**
 * Empfänger zu einem Turnier nach genau einer Auswahl, wahlweise in einer Kategorie (Spec A6).
 * Grundmenge: aktive Mitglieder mit Thema CM. Abgesagte Kategorien zählen nirgends; ein unbekanntes
 * Turnier und eine Kategorie, die nicht aktiv zu diesem Turnier gehört, haben keine Empfänger. Bei
 * *alle* zählt eine gültige Kategorie nicht (die Schnittstelle lässt sie dort nicht zu).
 * - *angemeldet*: Spieler einer aktiven Anmeldung (bestätigt oder beantragt), allein oder als Paar.
 * - *berechtigt*: passt nach der Regel der Anmeldung (Einzel `passtEinzel`, ohne Wildcard; Doppel
 *   `passtDoppelAllein`), ist dort nicht angemeldet und hat weniger als `GRENZE` aktive Anmeldungen
 *   im Turnier. Ohne Kategorie: in keiner angemeldet, und wem Angaben fehlen, der zählt mit; mit
 *   Kategorie zählt nur, wem keine Angabe fehlt.
 * - *sucht-partner*: allein in einer Doppel-Kategorie, bestätigt.
 */
export async function turnierEmpfaenger(
	db: Db,
	turnierId: number,
	auswahl: TurnierAuswahl,
	kategorieId: number | null
): Promise<Empfaenger[]> {
	const [t] = await db.select({ id: turnier.id }).from(turnier).where(eq(turnier.id, turnierId));
	if (!t) return [];
	const aktive = await db
		.select()
		.from(kategorie)
		.where(and(eq(kategorie.turnierId, turnierId), eq(kategorie.status, 'aktiv')));
	const gewaehlt = aktive.filter((k) => kategorieId === null || k.id === kategorieId);
	if (gewaehlt.length === 0 && kategorieId !== null) return [];
	const zeilen = await db
		.select({ ...GRUNDFELDER, ...spielerSpalten })
		.from(mitglied)
		.leftJoin(konto, eq(konto.mitgliedId, mitglied.id))
		.where(grundmenge(eq(konto.themaCm, true)))
		.orderBy(...REIHENFOLGE);
	if (auswahl === 'alle') return mitAbos(db, zeilen);

	const jeMitglied = await anmeldungenJeMitglied(db, turnierId);
	const aktivIds = new Set(aktive.map((k) => k.id));
	const gewaehltIds = new Set(gewaehlt.map((k) => k.id));
	const doppelIds = new Set(gewaehlt.filter((k) => k.art === 'doppel').map((k) => k.id));
	const passt = (k: (typeof aktive)[number], s: Spieler): boolean =>
		k.art === 'doppel' ? passtDoppelAllein(regelAus(k), s) : passtEinzel(regelAus(k), s);

	const gehoert = (z: (typeof zeilen)[number]): boolean => {
		const eigene = jeMitglied.get(z.mitgliedId) ?? [];
		switch (auswahl) {
			case 'angemeldet':
				return eigene.some((a) => gewaehltIds.has(a.kategorieId));
			case 'sucht-partner':
				return eigene.some(
					(a) => doppelIds.has(a.kategorieId) && a.spieler.length === 1 && a.status === 'bestaetigt'
				);
			case 'berechtigt': {
				if (eigene.length >= GRENZE) return false;
				const s = spielerAus(z);
				const fehlt = fehlendeAngaben(s).length > 0;
				if (kategorieId === null) {
					if (eigene.some((a) => aktivIds.has(a.kategorieId))) return false;
					// Ohne aktive Kategorie kann niemand mehr mitspielen, auch nicht mit nachgetragenen Angaben.
					return aktive.length > 0 && (fehlt || aktive.some((k) => passt(k, s)));
				}
				if (fehlt || eigene.some((a) => a.kategorieId === kategorieId)) return false;
				return gewaehlt.some((k) => passt(k, s));
			}
		}
	};
	return mitAbos(db, zeilen.filter(gehoert));
}
