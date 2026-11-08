import { and, asc, eq, inArray, ne, or, sql, type SQL } from 'drizzle-orm';
import type { Db, DbOderTx } from '../db/index.ts';
import { konto, kontoRolle, mitglied, sitzung } from '../db/schema.ts';
import { nameEnthaelt } from '../namen.ts';
import { beendeAlleSitzungen, sitzungAbgelaufen } from '../login/sitzung.ts';
import type { Angaben, Feld } from './angaben.ts';
import { loeschtAm } from './mitgliedschaft.ts';
import { ladeRollen, type Rolle } from './rollen.ts';
import {
	geaenderteFelder,
	ladeVerlauf,
	schreibeVerlauf,
	type Urheber,
	type VerlaufZeile
} from './verlauf.ts';

export type MitgliedStatus = 'aktiv' | 'ausgetreten' | 'vorgemerkt' | 'geloescht';
export type LoginStand = 'ohne-brief' | 'brief-offen' | 'eingeloggt' | 'gesperrt';

export type Listenzeile = {
	id: number;
	mitgliedernummer: string | null;
	name: string;
	email: string;
	jahrgang: number | null;
	rollen: Rolle[];
	status: MitgliedStatus;
	login: LoginStand;
};

export type Detail = {
	id: number;
	kontoId: number;
	status: MitgliedStatus;
	/** Nur zur Anzeige; die Angaben bleiben amtlich und das Formular kennt den Rufname nicht. */
	rufname: string | null;
	angaben: Angaben;
	rollen: Rolle[];
	login: {
		stand: LoginStand;
		briefGueltigBis: Date | null;
		geraete: number;
		zuletztGenutzt: Date | null;
	};
	/** Daten zu Austritt und Löschung; `loeschtAm` nur bei `ausgetreten` und `vorgemerkt`. */
	mitgliedschaft: { austrittAm: Date | null; vorgemerktAm: Date | null; loeschtAm: Date | null };
	verlauf: VerlaufZeile[];
	/** Es gibt mehr Einträge als `verlauf` zeigt (nur die letzten `VERLAUF_GRENZE`). */
	verlaufGekuerzt: boolean;
};

type Vergeben = { ergebnis: 'vergeben'; feld: 'email' | 'mitgliedernummer' };

const VERLAUF_GRENZE = 50;

// Datenbankname des Index → Feld, das der Admin korrigieren muss.
const INDEX_FELD: Record<string, Vergeben['feld']> = {
	mitglied_email_unique: 'email',
	mitglied_email_klein_unique: 'email',
	mitglied_mitgliedernummer_klein_unique: 'mitgliedernummer'
};

// Gibt das betroffene Feld zurück, wenn `fehler` (auch in `cause` verpackt) eine bekannte
// Eindeutigkeitsverletzung ist, sonst `null`.
function vergebenesFeld(fehler: unknown): Vergeben['feld'] | null {
	let aktuell: unknown = fehler;
	for (let i = 0; i < 3 && aktuell instanceof Error; i++) {
		const e = aktuell as { code?: unknown; constraint?: unknown };
		if (e.code === '23505' && typeof e.constraint === 'string') {
			return INDEX_FELD[e.constraint] ?? null;
		}
		aktuell = aktuell.cause;
	}
	return null;
}

/** Platzhalter für `ilike` als gewöhnliche Zeichen. */
export function maskiere(text: string): string {
	return text.replace(/[\\%_]/g, (z) => `\\${z}`);
}

type LoginZeile = {
	gesperrt: boolean;
	briefCodeHash: string | null;
	briefCodeAblauf: Date | null;
	briefCodeBenutztAm: Date | null;
};

function briefOffen(k: LoginZeile, jetzt: Date): boolean {
	return (
		k.briefCodeHash !== null &&
		k.briefCodeAblauf !== null &&
		k.briefCodeAblauf > jetzt &&
		k.briefCodeBenutztAm === null
	);
}

function loginStand(k: LoginZeile, gueltigeSitzungen: number, jetzt: Date): LoginStand {
	if (k.gesperrt) return 'gesperrt';
	if (gueltigeSitzungen > 0) return 'eingeloggt';
	return briefOffen(k, jetzt) ? 'brief-offen' : 'ohne-brief';
}

// Gültige Sitzungen je Konto: nicht abgelaufen und mit der Sitzungsversion des Kontos.
async function gueltigeSitzungen(
	db: DbOderTx,
	kontoIds: number[],
	jetzt: Date
): Promise<Map<number, Date[]>> {
	const karte = new Map<number, Date[]>();
	if (kontoIds.length === 0) return karte;
	const zeilen = await db
		.select({ kontoId: sitzung.kontoId, zuletztGenutzt: sitzung.zuletztGenutzt })
		.from(sitzung)
		.innerJoin(konto, eq(konto.id, sitzung.kontoId))
		.where(
			and(inArray(sitzung.kontoId, kontoIds), eq(sitzung.sitzungsversion, konto.sitzungsversion))
		);
	for (const z of zeilen) {
		if (sitzungAbgelaufen(z.zuletztGenutzt, jetzt)) continue;
		karte.set(z.kontoId, [...(karte.get(z.kontoId) ?? []), z.zuletztGenutzt]);
	}
	return karte;
}

async function rollenVon(db: DbOderTx, kontoIds: number[]): Promise<Map<number, Rolle[]>> {
	const karte = new Map<number, Rolle[]>();
	if (kontoIds.length === 0) return karte;
	const zeilen = await db
		.select({ kontoId: kontoRolle.kontoId, rolle: kontoRolle.rolle })
		.from(kontoRolle)
		.where(inArray(kontoRolle.kontoId, kontoIds));
	for (const z of zeilen) {
		karte.set(z.kontoId, [...(karte.get(z.kontoId) ?? []), z.rolle as Rolle]);
	}
	return karte;
}

export async function listeMitglieder(
	db: Db,
	filter: { suche?: string; status?: MitgliedStatus },
	jetzt: Date
): Promise<Listenzeile[]> {
	const bedingungen: (SQL | undefined)[] = [
		filter.status === undefined
			? ne(mitglied.status, 'geloescht')
			: eq(mitglied.status, filter.status)
	];
	const suche = filter.suche?.trim();
	if (suche) {
		const muster = `%${maskiere(suche)}%`;
		bedingungen.push(
			or(
				nameEnthaelt(muster),
				sql`${mitglied.email} ilike ${muster}`,
				sql`${mitglied.mitgliedernummer} ilike ${muster}`
			)
		);
	}
	const zeilen = await db
		.select({
			id: mitglied.id,
			mitgliedernummer: mitglied.mitgliedernummer,
			vorname: mitglied.vorname,
			nachname: mitglied.nachname,
			email: mitglied.email,
			jahrgang: mitglied.jahrgang,
			status: mitglied.status,
			kontoId: konto.id,
			gesperrt: konto.gesperrt,
			briefCodeHash: konto.briefCodeHash,
			briefCodeAblauf: konto.briefCodeAblauf,
			briefCodeBenutztAm: konto.briefCodeBenutztAm
		})
		.from(mitglied)
		.innerJoin(konto, eq(konto.mitgliedId, mitglied.id))
		.where(and(...bedingungen))
		.orderBy(asc(mitglied.nachname), asc(mitglied.vorname), asc(mitglied.id));
	const kontoIds = zeilen.map((z) => z.kontoId);
	const [rollen, sitzungen] = await Promise.all([
		rollenVon(db, kontoIds),
		gueltigeSitzungen(db, kontoIds, jetzt)
	]);
	return zeilen.map((z) => ({
		id: z.id,
		mitgliedernummer: z.mitgliedernummer,
		name: `${z.nachname}, ${z.vorname}`,
		email: z.email ?? '',
		jahrgang: z.jahrgang,
		rollen: rollen.get(z.kontoId) ?? [],
		status: z.status as MitgliedStatus,
		login: loginStand(z, sitzungen.get(z.kontoId)?.length ?? 0, jetzt)
	}));
}

export function angabenAusZeile(z: typeof mitglied.$inferSelect): Angaben {
	return {
		mitgliedernummer: z.mitgliedernummer,
		vorname: z.vorname,
		nachname: z.nachname,
		strasse: z.strasse ?? '',
		plz: z.plz ?? '',
		ort: z.ort ?? '',
		email: z.email ?? '',
		telefon: z.telefon,
		geschlecht: z.geschlecht as Angaben['geschlecht'],
		jahrgang: z.jahrgang,
		lizenznummer: z.lizenznummer
	};
}

export async function ladeMitglied(db: Db, id: number, jetzt: Date): Promise<Detail | null> {
	const [zeile] = await db
		.select({ m: mitglied, k: konto })
		.from(mitglied)
		.innerJoin(konto, eq(konto.mitgliedId, mitglied.id))
		.where(eq(mitglied.id, id));
	if (!zeile) return null;
	const [rollen, sitzungen, verlauf] = await Promise.all([
		ladeRollen(db, zeile.k.id),
		gueltigeSitzungen(db, [zeile.k.id], jetzt),
		// Ein Eintrag mehr zeigt, ob gekürzt wurde.
		ladeVerlauf(db, { mitgliedId: id, grenze: VERLAUF_GRENZE + 1 })
	]);
	const zeiten = sitzungen.get(zeile.k.id) ?? [];
	const zuletzt = zeiten.reduce<Date | null>((a, b) => (a === null || b > a ? b : a), null);
	const status = zeile.m.status as MitgliedStatus;
	const { austrittAm, vorgemerktAm } = zeile.m;
	return {
		id: zeile.m.id,
		kontoId: zeile.k.id,
		status,
		rufname: zeile.m.rufname,
		angaben: angabenAusZeile(zeile.m),
		rollen,
		login: {
			stand: loginStand(zeile.k, zeiten.length, jetzt),
			briefGueltigBis: briefOffen(zeile.k, jetzt) ? zeile.k.briefCodeAblauf : null,
			geraete: zeiten.length,
			zuletztGenutzt: zuletzt
		},
		mitgliedschaft: {
			austrittAm,
			vorgemerktAm,
			loeschtAm: loeschtAm({ status, austrittAm, vorgemerktAm })
		},
		verlauf: verlauf.slice(0, VERLAUF_GRENZE),
		verlaufGekuerzt: verlauf.length > VERLAUF_GRENZE
	};
}

// FR-01: Mitglied und Konto entstehen gemeinsam; einen Brief-Code gibt es erst auf Anforderung.
export async function legeMitgliedAn(
	db: Db,
	urheber: Urheber,
	angaben: Angaben,
	jetzt: Date
): Promise<{ ergebnis: 'ok'; id: number } | Vergeben> {
	try {
		return await db.transaction(async (tx) => {
			const [m] = await tx.insert(mitglied).values(angaben).returning({ id: mitglied.id });
			await tx.insert(konto).values({ mitgliedId: m.id });
			await schreibeVerlauf(tx, m.id, urheber, [{ aktion: 'angelegt' }], jetzt);
			return { ergebnis: 'ok' as const, id: m.id };
		});
	} catch (fehler) {
		const feld = vergebenesFeld(fehler);
		if (feld === null) throw fehler;
		return { ergebnis: 'vergeben', feld };
	}
}

/**
 * Speichert die Angaben, wenn das Mitglied noch so aussieht wie `vorher` (der Stand, den die
 * Seite geladen hat). Sonst `veraltet`: Ein anderer hat inzwischen gespeichert, und die Seite
 * würde seine Änderung mit dem alten Stand überschreiben.
 */
export async function aendereAngaben(
	db: Db,
	urheber: Urheber,
	id: number,
	angaben: Angaben,
	vorher: Angaben,
	jetzt: Date
): Promise<
	| { ergebnis: 'ok'; geaendert: Feld[]; alteEmail: string | null }
	| Vergeben
	| { ergebnis: 'nicht-gefunden' }
	| { ergebnis: 'veraltet' }
> {
	try {
		return await db.transaction(async (tx) => {
			const [alt] = await tx.select().from(mitglied).where(eq(mitglied.id, id)).for('update');
			// Gelöschte behalten nur den Namen; nichts darf zurückgeschrieben werden.
			if (!alt || alt.status === 'geloescht') return { ergebnis: 'nicht-gefunden' as const };
			const gespeichert = angabenAusZeile(alt);
			if (geaenderteFelder(gespeichert, vorher).length > 0)
				return { ergebnis: 'veraltet' as const };
			const geaendert = geaenderteFelder(gespeichert, angaben);
			if (geaendert.length === 0) return { ergebnis: 'ok' as const, geaendert, alteEmail: null };
			await tx.update(mitglied).set(angaben).where(eq(mitglied.id, id));
			await schreibeVerlauf(
				tx,
				id,
				urheber,
				geaendert.map((feld) => ({ aktion: 'feld-geaendert' as const, detail: feld })),
				jetzt
			);
			// SI-09: Nur eine geänderte E-Mail braucht den Hinweis an die alte Adresse.
			const alteEmail = geaendert.includes('email') ? alt.email : null;
			return { ergebnis: 'ok' as const, geaendert, alteEmail };
		});
	} catch (fehler) {
		const feld = vergebenesFeld(fehler);
		if (feld === null) throw fehler;
		return { ergebnis: 'vergeben', feld };
	}
}

// SI-07, FR-24: beendet alle Sitzungen des Kontos und vermerkt es im Verlauf.
export async function beendeSitzungenVon(
	db: Db,
	urheber: Urheber,
	id: number,
	jetzt: Date
): Promise<'ok' | 'nicht-gefunden'> {
	return db.transaction(async (tx) => {
		const [k] = await tx
			.select({ id: konto.id })
			.from(konto)
			.innerJoin(mitglied, eq(mitglied.id, konto.mitgliedId))
			.where(and(eq(konto.mitgliedId, id), ne(mitglied.status, 'geloescht')));
		if (!k) return 'nicht-gefunden' as const;
		await beendeAlleSitzungen(tx, k.id);
		await schreibeVerlauf(tx, id, urheber, [{ aktion: 'sitzungen-beendet' }], jetzt);
		return 'ok' as const;
	});
}
