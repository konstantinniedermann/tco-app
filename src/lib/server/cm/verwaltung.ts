// Anmeldungen verwalten durch den CM-Admin, nur Einzel (A-ANMELDUNG-06, FR-08, FR-46).
import { and, asc, eq } from 'drizzle-orm';
import type { Namensteile } from '../../name.ts';
import type { Klassierung } from '../../turnier/klassierung.ts';
import { warnungenEinzel, type Spieler } from '../../turnier/passung.ts';
import { wirksamerStatus } from '../../turnier/status.ts';
import { maskiere, type MitgliedStatus } from '../admin/mitglieder.ts';
import { schreibeVerlauf, type Eintrag } from '../admin/verlauf.ts';
import type { Db, DbOderTx } from '../db/index.ts';
import { anmeldung, anmeldungSpieler, kategorie, mitglied, turnier } from '../db/schema.ts';
import { namensSpalten, nameEnthaelt } from '../namen.ts';
import { schreibeKlassierung, spielerAus } from './angaben.ts';
import {
	eigeneAnmeldungen,
	GRENZE,
	istAktiv,
	regelAus,
	sperreKategorieUndTurnier,
	spielerSpalten
} from './anmeldungen.ts';

/** Gründe, warum eine Anmeldung von Hand nur nach Bestätigung gilt (FR-46). */
export type Warnung = 'angaben-fehlen' | 'passt-nicht' | 'voll' | 'geschlossen';

export type AnmeldungZeile = {
	anmeldungId: number;
	status: 'bestaetigt' | 'beantragt';
	kommentar: string | null;
	mitgliedId: number;
	/** Status des Mitglieds: Austritt und Löschung zeigt die Liste als Plakette (FR-04). */
	mitgliedStatus: MitgliedStatus;
	name: Namensteile;
	geschlecht: 'w' | 'm' | null;
	jahrgang: number | null;
	klassierung: Klassierung | null;
};

export type SpielerTreffer = {
	mitgliedId: number;
	name: Namensteile;
	geschlecht: 'w' | 'm' | null;
	jahrgang: number | null;
	klassierung: Klassierung | null;
};

type Betroffen = { mitgliedId: number; kategorie: string; turnierId: number };

/** Der handelnde CM-Admin; der Änderungsverlauf des Spielers nennt ihn (FR-26). */
export type CmUrheber = { art: 'admin'; mitgliedId: number };

/**
 * Verlaufseintrag jeder Änderung des CM-Admins an einer Anmeldung: neutral, ohne Kategorie,
 * Wildcard oder Entscheid, weil auch der Mitglieder-Admin den Verlauf sieht (Datenschutz).
 */
const GEAENDERT: Eintrag[] = [{ aktion: 'cm-anmeldung-geaendert' }];

/**
 * Hält die CM-Änderung im Verlauf des Spielers fest, außer er ist gelöscht: Von ihm bleibt nur der
 * Name, sein Verlauf ist weg und wächst nicht wieder (FR-04).
 */
export async function schreibeGeaendert(
	tx: DbOderTx,
	spieler: { id: number; status: string },
	urheber: CmUrheber,
	jetzt: Date
) {
	if (spieler.status === 'geloescht') return;
	await schreibeVerlauf(tx, spieler.id, urheber, GEAENDERT, jetzt);
}

/** Höchstens so viele Treffer zeigt die Suche. */
const TREFFER = 20;

/** Sortierung wie in der Verwaltung: Nachname, Vorname. */
const namensfolge = [asc(mitglied.nachname), asc(mitglied.vorname), asc(mitglied.id)];

const nameUndAngaben = (z: {
	rufname: string | null;
	vorname: string;
	nachname: string;
	geschlecht: string | null;
	jahrgang: number | null;
	klassierung: string | null;
}) => ({
	name: { rufname: z.rufname, vorname: z.vorname, nachname: z.nachname },
	...spielerAus(z)
});

/** A-ANMELDUNG-06: aktive Anmeldungen einer Einzel-Kategorie (bestätigt und beantragt). */
export async function ladeAnmeldungen(db: Db, kategorieId: number): Promise<AnmeldungZeile[]> {
	const zeilen = await db
		.select({
			anmeldungId: anmeldung.id,
			status: anmeldung.status,
			kommentar: anmeldung.kommentar,
			mitgliedId: mitglied.id,
			mitgliedStatus: mitglied.status,
			...namensSpalten,
			...spielerSpalten
		})
		.from(anmeldung)
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.innerJoin(mitglied, eq(mitglied.id, anmeldungSpieler.mitgliedId))
		.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
		.where(and(eq(anmeldung.kategorieId, kategorieId), eq(kategorie.art, 'einzel'), istAktiv))
		.orderBy(...namensfolge);
	return zeilen.map((z) => ({
		anmeldungId: z.anmeldungId,
		status: z.status as AnmeldungZeile['status'],
		kommentar: z.kommentar,
		mitgliedId: z.mitgliedId,
		mitgliedStatus: z.mitgliedStatus as MitgliedStatus,
		...nameUndAngaben(z)
	}));
}

/**
 * Aktive Mitglieder, deren Name `suche` enthält (ab zwei Zeichen): Rufname, Vor- oder Nachname allein,
 * «Vorname Nachname» oder «Nachname, Vorname», wie die Suche der Mitglieder-Verwaltung.
 */
export async function sucheSpieler(db: Db, suche: string): Promise<SpielerTreffer[]> {
	const text = suche.trim();
	if (text.length < 2) return [];
	const muster = `%${maskiere(text)}%`;
	const zeilen = await db
		.select({
			mitgliedId: mitglied.id,
			...namensSpalten,
			...spielerSpalten
		})
		.from(mitglied)
		.where(and(eq(mitglied.status, 'aktiv'), nameEnthaelt(muster)))
		.orderBy(...namensfolge)
		.limit(TREFFER);
	return zeilen.map((z) => ({ mitgliedId: z.mitgliedId, ...nameUndAngaben(z) }));
}

/**
 * Aktive Einzel-Kategorie mit Turnier, beide gesperrt `for share` wie in `meldeAn`
 * (`sperreKategorieUndTurnier`). Das Turnier wird erst nach der Sperre gelesen: ein gleichzeitiges
 * Schliessen (`setzeStatus`) wartet, und der gelesene Stand ist der aktuelle.
 */
async function sperreKategorie(tx: DbOderTx, kategorieId: number) {
	const z = await sperreKategorieUndTurnier(tx, kategorieId);
	if (!z || z.k.art !== 'einzel' || z.k.status !== 'aktiv') return null;
	return z;
}

/**
 * Sperrt den Spieler einer Einzel-Anmeldung `for update` und gibt seine Angaben zurück. Das
 * Mitglied ist erst nach dem Lesen bekannt; jede Änderung an seinen Anmeldungen sperrt es
 * zuerst, darum prüft `sperreAnmeldung` danach, ob die Anmeldung noch dieselbe ist.
 */
async function sperreSpielerDer(tx: DbOderTx, anmeldungId: number) {
	const [s] = await tx
		.select({ mitgliedId: anmeldungSpieler.mitgliedId })
		.from(anmeldungSpieler)
		.innerJoin(anmeldung, eq(anmeldung.id, anmeldungSpieler.anmeldungId))
		.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
		.where(and(eq(anmeldungSpieler.anmeldungId, anmeldungId), eq(kategorie.art, 'einzel')));
	if (!s) return null;
	const [m] = await tx
		.select({ id: mitglied.id, status: mitglied.status, ...spielerSpalten })
		.from(mitglied)
		.where(eq(mitglied.id, s.mitgliedId))
		.for('update');
	return m;
}

/** Einzel-Anmeldung des Mitglieds mit Kategorie und Turnier, gesperrt `for update`. */
async function sperreAnmeldung(tx: DbOderTx, anmeldungId: number, mitgliedId: number) {
	const [a] = await tx
		.select({
			status: anmeldung.status,
			kategorieId: kategorie.id,
			kategorie: kategorie.name,
			turnierId: turnier.id,
			turnierStatus: turnier.status
		})
		.from(anmeldung)
		.innerJoin(
			anmeldungSpieler,
			and(
				eq(anmeldungSpieler.anmeldungId, anmeldung.id),
				eq(anmeldungSpieler.mitgliedId, mitgliedId)
			)
		)
		.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
		.innerJoin(turnier, eq(turnier.id, kategorie.turnierId))
		.where(and(eq(anmeldung.id, anmeldungId), eq(kategorie.art, 'einzel')))
		.for('update', { of: anmeldung });
	return a ?? null;
}

const istAktivStatus = (s: string) => s === 'bestaetigt' || s === 'beantragt';

/** FR-46: Warnungen in fester Reihenfolge; `andere` = übrige aktive Anmeldungen im Turnier. */
function warnungen(
	ziel: NonNullable<Awaited<ReturnType<typeof sperreKategorie>>>,
	spieler: Spieler,
	andere: number,
	jetzt: Date
): Warnung[] {
	const w: Warnung[] = warnungenEinzel(regelAus(ziel.k), spieler);
	if (andere >= GRENZE) w.push('voll');
	if (wirksamerStatus(ziel.t.status, ziel.t.anmeldeschluss, jetzt) !== 'offen') {
		w.push('geschlossen');
	}
	return w;
}

/**
 * FR-46: ein aktives Mitglied von Hand anmelden, sofort bestätigt. Gegen FR-05 bis FR-07 und
 * fehlende Angaben nur mit `trotzdem`; doppelt in derselben Kategorie nie (FR-09). Sperren in der
 * Reihenfolge von `meldeAn`: Mitglied, dann Kategorie.
 */
export async function meldeVonHandAn(
	db: Db,
	urheber: CmUrheber,
	kategorieId: number,
	mitgliedId: number,
	jetzt: Date,
	trotzdem: boolean
): Promise<
	'ok' | { warnungen: Warnung[] } | 'schon-angemeldet' | 'vorbereitung' | 'nicht-gefunden'
> {
	return db.transaction(async (tx) => {
		const [m] = await tx
			.select({ status: mitglied.status, ...spielerSpalten })
			.from(mitglied)
			.where(eq(mitglied.id, mitgliedId))
			.for('update');
		if (!m || m.status !== 'aktiv') return 'nicht-gefunden';
		const ziel = await sperreKategorie(tx, kategorieId);
		if (!ziel) return 'nicht-gefunden';
		if (ziel.t.status === 'vorbereitung') return 'vorbereitung';
		const eigene = await eigeneAnmeldungen(tx, ziel.t.id, mitgliedId);
		if (eigene.some((e) => e.kategorieId === kategorieId)) return 'schon-angemeldet';
		if (!trotzdem) {
			const w = warnungen(ziel, spielerAus(m), eigene.length, jetzt);
			if (w.length > 0) return { warnungen: w };
		}
		const [neu] = await tx
			.insert(anmeldung)
			.values({ kategorieId, status: 'bestaetigt', angemeldetAm: jetzt, geaendertAm: jetzt })
			.returning({ id: anmeldung.id });
		await tx.insert(anmeldungSpieler).values({ anmeldungId: neu.id, mitgliedId });
		await schreibeVerlauf(tx, mitgliedId, urheber, GEAENDERT, jetzt);
		return 'ok';
	});
}

/**
 * FR-46: eine aktive Einzel-Anmeldung in eine andere Einzel-Kategorie desselben Turniers
 * verschieben; danach ist sie bestätigt, auch ein Antrag (der CM-Admin hat entschieden). Bei
 * «voll» zählt die verschobene nicht mit. Sperren: Mitglied, Zielkategorie, Anmeldung.
 */
export async function verschiebe(
	db: Db,
	urheber: CmUrheber,
	anmeldungId: number,
	zielKategorieId: number,
	jetzt: Date,
	trotzdem: boolean
): Promise<
	| { ergebnis: 'ok'; mitgliedId: number; von: string; nach: string; turnierId: number }
	| { warnungen: Warnung[] }
	| 'schon-angemeldet'
	| 'vorbereitung'
	| 'nicht-gefunden'
> {
	return db.transaction(async (tx) => {
		const m = await sperreSpielerDer(tx, anmeldungId);
		if (!m) return 'nicht-gefunden';
		const ziel = await sperreKategorie(tx, zielKategorieId);
		if (!ziel) return 'nicht-gefunden';
		const a = await sperreAnmeldung(tx, anmeldungId, m.id);
		if (!a || !istAktivStatus(a.status) || a.turnierId !== ziel.t.id) return 'nicht-gefunden';
		if (ziel.t.status === 'vorbereitung') return 'vorbereitung';
		const eigene = await eigeneAnmeldungen(tx, ziel.t.id, m.id);
		if (eigene.some((e) => e.kategorieId === zielKategorieId)) return 'schon-angemeldet';
		if (!trotzdem) {
			const andere = eigene.filter((e) => e.anmeldungId !== anmeldungId).length;
			const w = warnungen(ziel, spielerAus(m), andere, jetzt);
			if (w.length > 0) return { warnungen: w };
		}
		await tx
			.update(anmeldung)
			.set({ kategorieId: zielKategorieId, status: 'bestaetigt', geaendertAm: jetzt })
			.where(eq(anmeldung.id, anmeldungId));
		await schreibeGeaendert(tx, m, urheber, jetzt);
		return {
			ergebnis: 'ok' as const,
			mitgliedId: m.id,
			von: a.kategorie,
			nach: ziel.k.name,
			turnierId: ziel.t.id
		};
	});
}

/** FR-46: Löschen zieht die Anmeldung zurück, auch nach dem Anmeldeschluss (Teil 4, Ziel 4). */
export async function loescheAnmeldung(
	db: Db,
	urheber: CmUrheber,
	anmeldungId: number,
	jetzt: Date
): Promise<Betroffen | 'nicht-gefunden'> {
	return db.transaction(async (tx) => {
		const m = await sperreSpielerDer(tx, anmeldungId);
		if (!m) return 'nicht-gefunden';
		const a = await sperreAnmeldung(tx, anmeldungId, m.id);
		if (!a || !istAktivStatus(a.status) || a.turnierStatus === 'vorbereitung') {
			return 'nicht-gefunden';
		}
		await tx
			.update(anmeldung)
			.set({ status: 'zurueckgezogen', geaendertAm: jetzt })
			.where(eq(anmeldung.id, anmeldungId));
		await schreibeGeaendert(tx, m, urheber, jetzt);
		return { mitgliedId: m.id, kategorie: a.kategorie, turnierId: a.turnierId };
	});
}

/** FR-08: über einen Wildcard-Antrag entscheiden; nur solange er *beantragt* ist. */
export async function entscheide(
	db: Db,
	urheber: CmUrheber,
	anmeldungId: number,
	bestaetigt: boolean,
	jetzt: Date
): Promise<Betroffen | 'nicht-beantragt' | 'nicht-gefunden'> {
	return db.transaction(async (tx) => {
		const m = await sperreSpielerDer(tx, anmeldungId);
		if (!m) return 'nicht-gefunden';
		const a = await sperreAnmeldung(tx, anmeldungId, m.id);
		if (!a || a.turnierStatus === 'vorbereitung') return 'nicht-gefunden';
		if (a.status !== 'beantragt') return 'nicht-beantragt';
		await tx
			.update(anmeldung)
			.set({ status: bestaetigt ? 'bestaetigt' : 'abgelehnt', geaendertAm: jetzt })
			.where(eq(anmeldung.id, anmeldungId));
		await schreibeGeaendert(tx, m, urheber, jetzt);
		return { mitgliedId: m.id, kategorie: a.kategorie, turnierId: a.turnierId };
	});
}

/** Teil 4, Ziel 3: der CM-Admin korrigiert die Klassierung; der Verlauf nennt ihn (FR-26). */
export async function korrigiereKlassierung(
	db: Db,
	urheber: CmUrheber,
	mitgliedId: number,
	klassierung: Klassierung,
	jetzt: Date
): Promise<'ok' | 'nicht-gefunden'> {
	return schreibeKlassierung(db, mitgliedId, klassierung, urheber, jetzt);
}
