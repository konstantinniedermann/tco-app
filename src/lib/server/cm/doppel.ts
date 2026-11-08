// Doppel der Mitglieder zur Clubmeisterschaft: Partnersuche, Anfragen und Suchtext
// (A-ANMELDUNG-04, FR-48, FR-49). Allein anmelden und abmelden laufen über `anmeldungen.ts`.
import { and, asc, count, eq, inArray, ne, or } from 'drizzle-orm';
import type { Namensteile } from '../../name.ts';
import type { Klassierung } from '../../turnier/klassierung.ts';
import { fehlendeAngaben, passtAlsPaar, vermerk, type Vermerk } from '../../turnier/passung.ts';
import { wirksamerStatus } from '../../turnier/status.ts';
import { maskiere } from '../admin/mitglieder.ts';
import type { Db, DbOderTx } from '../db/index.ts';
import {
	anmeldung,
	anmeldungSpieler,
	kategorie,
	konto,
	mitglied,
	partnerAnfrage,
	turnier
} from '../db/schema.ts';
import { namensSpalten, nameEnthaelt } from '../namen.ts';
import { spielerAus } from './angaben.ts';
import {
	eigeneAnmeldungen,
	GRENZE,
	hatLogin,
	istAktiv,
	nameFuerText,
	namensteile,
	regelAus,
	sperreKategorieUndTurnier,
	sperreMitglieder,
	spielerDer,
	spielerSpalten,
	suchtextAus
} from './anmeldungen.ts';

/**
 * Verfallene Anfragen eines Spielers: an wen die Meldung «… hat inzwischen einen Partner» geht;
 * `mitName` in der kurzen Textform.
 */
export type Hinfaellig = { anIds: number[]; mitName: string };

export type PartnerTreffer = {
	mitgliedId: number;
	name: Namensteile;
	klassierung: Klassierung | null;
	vermerk: Vermerk | null;
	suchtPartner: boolean;
	kommentar: string | null;
	/** Die eigene offene Anfrage an ihn in dieser Kategorie. */
	anfrageId: number | null;
};

/** Höchstens so viele Treffer zeigt die Partnersuche. */
const TREFFER = 20;

async function hatKontoMitLogin(tx: DbOderTx, mitgliedId: number): Promise<boolean> {
	const [k] = await tx
		.select({ id: konto.id })
		.from(konto)
		.where(and(eq(konto.mitgliedId, mitgliedId), hatLogin));
	return k !== undefined;
}

const istDoppelOffenZurWahl = (z: {
	k: typeof kategorie.$inferSelect;
	t: typeof turnier.$inferSelect;
}) => z.k.art === 'doppel' && z.k.status === 'aktiv' && z.t.status !== 'vorbereitung';

/** Kategorie und Turnier gesperrt; `null`, wenn es kein aktives Doppel eines laufenden Turniers ist. */
async function sperreDoppel(tx: DbOderTx, kategorieId: number) {
	const z = await sperreKategorieUndTurnier(tx, kategorieId);
	return z && istDoppelOffenZurWahl(z) ? z : null;
}

/** Stand eines Spielers im Turnier: Zahl der aktiven Anmeldungen und die in dieser Kategorie. */
async function standIm(tx: DbOderTx, turnierId: number, kategorieId: number, mitgliedId: number) {
	const eigene = await eigeneAnmeldungen(tx, turnierId, mitgliedId);
	const e = eigene.find((x) => x.kategorieId === kategorieId);
	const hier = e
		? { anmeldungId: e.anmeldungId, allein: (await spielerDer(tx, e.anmeldungId)).length === 1 }
		: null;
	return { anzahl: eigene.length, hier };
}
type Stand = Awaited<ReturnType<typeof standIm>>;

const zuZweit = (s: Stand) => s.hier !== null && !s.hier.allein;
/** FR-06: Platz für ein Paar: unter der Grenze, oder er sucht hier schon allein (zählt schon mit). */
const hatPlatz = (s: Stand) => s.hier !== null || s.anzahl < GRENZE;

/**
 * FR-48: Partner für ein Doppel suchen, ab zwei Zeichen, höchstens 20, nach Nachname; die Suche
 * findet auch den Rufnamen (`nameEnthaelt`). Treffer sind aktive Mitglieder mit Login ausser
 * einem selbst, die mit einem selbst passen (`passtAlsPaar`,
 * fehlende Angaben des anderen mit Vermerk), dort nicht schon zu zweit sind und die Grenze nicht
 * erreicht haben; wer hier allein sucht, zählt schon mit. Nach dem wirksamen Anmeldeschluss ist
 * keine Wahl mehr möglich: Die Liste ist leer.
 */
export async function sucheDoppelPartner(
	db: Db,
	kategorieId: number,
	mitgliedId: number,
	suche: string,
	jetzt: Date
): Promise<PartnerTreffer[]> {
	const text = suche.trim();
	if (text.length < 2) return [];
	const [z] = await db
		.select({ k: kategorie, t: turnier })
		.from(kategorie)
		.innerJoin(turnier, eq(turnier.id, kategorie.turnierId))
		.where(eq(kategorie.id, kategorieId));
	const [m] = await db.select(spielerSpalten).from(mitglied).where(eq(mitglied.id, mitgliedId));
	if (!z || !m || !istDoppelOffenZurWahl(z)) return [];
	if (wirksamerStatus(z.t.status, z.t.anmeldeschluss, jetzt) !== 'offen') return [];
	const regel = regelAus(z.k);
	const ich = spielerAus(m);

	const muster = `%${maskiere(text)}%`;
	const kandidaten = (
		await db
			.select({
				mitgliedId: mitglied.id,
				...namensSpalten,
				...spielerSpalten
			})
			.from(mitglied)
			.innerJoin(konto, eq(konto.mitgliedId, mitglied.id))
			.where(
				and(
					eq(mitglied.status, 'aktiv'),
					ne(mitglied.id, mitgliedId),
					hatLogin,
					nameEnthaelt(muster)
				)
			)
			.orderBy(asc(mitglied.nachname), asc(mitglied.vorname), asc(mitglied.id))
	).filter((k) => passtAlsPaar(regel, ich, spielerAus(k), false));
	if (kandidaten.length === 0) return [];
	const ids = kandidaten.map((k) => k.mitgliedId);

	const aktive = await db
		.select({
			mitgliedId: anmeldungSpieler.mitgliedId,
			anmeldungId: anmeldung.id,
			kategorieId: anmeldung.kategorieId,
			suchtext: anmeldung.suchtext
		})
		.from(anmeldung)
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.innerJoin(kategorie, eq(kategorie.id, anmeldung.kategorieId))
		.where(
			and(eq(kategorie.turnierId, z.t.id), inArray(anmeldungSpieler.mitgliedId, ids), istAktiv)
		);
	const hier = aktive.filter((a) => a.kategorieId === kategorieId).map((a) => a.anmeldungId);
	const spielerzahl = new Map(
		hier.length === 0
			? []
			: (
					await db
						.select({ anmeldungId: anmeldungSpieler.anmeldungId, n: count() })
						.from(anmeldungSpieler)
						.where(inArray(anmeldungSpieler.anmeldungId, hier))
						.groupBy(anmeldungSpieler.anmeldungId)
				).map((z) => [z.anmeldungId, z.n])
	);
	const anfragen = new Map(
		(
			await db
				.select({ anId: partnerAnfrage.anId, id: partnerAnfrage.id })
				.from(partnerAnfrage)
				.where(
					and(
						eq(partnerAnfrage.kategorieId, kategorieId),
						eq(partnerAnfrage.vonId, mitgliedId),
						inArray(partnerAnfrage.anId, ids)
					)
				)
		).map((a) => [a.anId, a.id])
	);

	const treffer: PartnerTreffer[] = [];
	for (const k of kandidaten) {
		const seine = aktive.filter((a) => a.mitgliedId === k.mitgliedId);
		const sucht = seine.find((a) => a.kategorieId === kategorieId);
		if (sucht ? spielerzahl.get(sucht.anmeldungId)! > 1 : seine.length >= GRENZE) continue;
		const s = spielerAus(k);
		treffer.push({
			mitgliedId: k.mitgliedId,
			name: namensteile(k),
			klassierung: s.klassierung,
			vermerk: vermerk(s),
			suchtPartner: sucht !== undefined,
			kommentar: sucht?.suchtext ?? null,
			anfrageId: anfragen.get(k.mitgliedId) ?? null
		});
		if (treffer.length === TREFFER) break;
	}
	return treffer;
}

/**
 * FR-48: Anfrage an einen Partner. Er braucht ein Login und muss passen (`passtAlsPaar`, fehlende
 * Angaben des anderen gelten als passend), darf dort nicht schon zu zweit sein und hat Platz;
 * der Anfragende braucht alle Angaben (FR-37) und Platz. Anfragen zählen nicht bei der Grenze.
 */
export async function stelleAnfrage(
	db: Db,
	kategorieId: number,
	vonId: number,
	anId: number,
	jetzt: Date
): Promise<
	| 'ok'
	| 'geschlossen'
	| 'voll'
	| 'passt-nicht'
	| 'schon-angemeldet'
	| 'schon-angefragt'
	| 'anfrage-offen'
	| 'angaben-fehlen'
	| 'nicht-gefunden'
> {
	if (vonId === anId) return 'passt-nicht';
	return db.transaction(async (tx) => {
		const gesperrt = await sperreMitglieder(tx, [vonId, anId]);
		const von = gesperrt.get(vonId);
		const an = gesperrt.get(anId);
		if (von?.status !== 'aktiv' || an?.status !== 'aktiv') return 'nicht-gefunden';
		if (!(await hatKontoMitLogin(tx, anId))) return 'nicht-gefunden';
		const z = await sperreDoppel(tx, kategorieId);
		if (!z) return 'nicht-gefunden';
		if (wirksamerStatus(z.t.status, z.t.anmeldeschluss, jetzt) !== 'offen') return 'geschlossen';
		const ich = spielerAus(von);
		if (fehlendeAngaben(ich).length > 0) return 'angaben-fehlen';
		if (!passtAlsPaar(regelAus(z.k), ich, spielerAus(an), false)) return 'passt-nicht';
		const standAn = await standIm(tx, z.t.id, kategorieId, anId);
		if (zuZweit(standAn) || !hatPlatz(standAn)) return 'passt-nicht';
		const standVon = await standIm(tx, z.t.id, kategorieId, vonId);
		if (zuZweit(standVon)) return 'schon-angemeldet';
		if (!hatPlatz(standVon)) return 'voll';
		// Je Kategorie eine offene Anfrage: an denselben `schon-angefragt`, an einen anderen `anfrage-offen`.
		const [offen] = await tx
			.select({ anId: partnerAnfrage.anId })
			.from(partnerAnfrage)
			.where(and(eq(partnerAnfrage.kategorieId, kategorieId), eq(partnerAnfrage.vonId, vonId)));
		if (offen) return offen.anId === anId ? 'schon-angefragt' : 'anfrage-offen';
		// Ein Wettlauf derselben Person (zwei Fenster) trifft den Unique; die Anfrage der anderen gilt.
		const neu = await tx
			.insert(partnerAnfrage)
			.values({ kategorieId, vonId, anId, gestelltAm: jetzt })
			.onConflictDoNothing({ target: [partnerAnfrage.kategorieId, partnerAnfrage.vonId] })
			.returning({ id: partnerAnfrage.id });
		return neu.length === 0 ? 'anfrage-offen' : 'ok';
	});
}

/**
 * Löscht eine offene Anfrage, wenn `seite` (`von` oder `an`) das Mitglied ist, und gibt sie zurück.
 * Gesperrt wird wie bei den anderen Wegen: beide Mitglieder (aufsteigende ID), Kategorie und
 * Turnier, dann die Anfrage; erst danach gilt der Anmeldeschluss. So löscht kein gleichzeitiges
 * Verlängern oder Annehmen eine Anfrage nach dem Schluss.
 */
async function loescheEigeneAnfrage(
	db: Db,
	anfrageId: number,
	seite: 'von' | 'an',
	mitgliedId: number,
	jetzt: Date
): Promise<
	| { vonId: number; kategorieId: number; kategorie: string; turnierId: number }
	| 'geschlossen'
	| 'nicht-gefunden'
> {
	const gehoert = and(
		eq(partnerAnfrage.id, anfrageId),
		eq(seite === 'von' ? partnerAnfrage.vonId : partnerAnfrage.anId, mitgliedId)
	);
	return db.transaction(async (tx) => {
		const [vorab] = await tx
			.select({
				vonId: partnerAnfrage.vonId,
				anId: partnerAnfrage.anId,
				kategorieId: partnerAnfrage.kategorieId
			})
			.from(partnerAnfrage)
			.where(gehoert);
		if (!vorab) return 'nicht-gefunden';
		await sperreMitglieder(tx, [vorab.vonId, vorab.anId]);
		const z = await sperreKategorieUndTurnier(tx, vorab.kategorieId);
		// Eine gleichzeitige Annahme oder Ablehnung kann sie inzwischen gelöscht haben.
		const [offen] = await tx
			.select({ id: partnerAnfrage.id })
			.from(partnerAnfrage)
			.where(gehoert)
			.for('update');
		if (!z || !offen) return 'nicht-gefunden';
		if (wirksamerStatus(z.t.status, z.t.anmeldeschluss, jetzt) !== 'offen') return 'geschlossen';
		await tx.delete(partnerAnfrage).where(eq(partnerAnfrage.id, anfrageId));
		return {
			vonId: vorab.vonId,
			kategorieId: z.k.id,
			kategorie: z.k.name,
			turnierId: z.t.id
		};
	});
}

/**
 * FR-48: eine eigene offene Anfrage zurückziehen (löscht sie); nach dem Anmeldeschluss bleibt sie
 * stehen (`geschlossen`).
 */
export async function zieheAnfrageZurueck(
	db: Db,
	anfrageId: number,
	vonId: number,
	jetzt: Date
): Promise<'ok' | 'geschlossen' | 'nicht-gefunden'> {
	const r = await loescheEigeneAnfrage(db, anfrageId, 'von', vonId, jetzt);
	return typeof r === 'string' ? r : 'ok';
}

/**
 * FR-48: eine Anfrage an einen selbst ablehnen, ohne Grund (löscht sie); nach dem Anmeldeschluss
 * bleibt sie stehen (`geschlossen`).
 */
export async function lehneAnfrageAb(
	db: Db,
	anfrageId: number,
	anId: number,
	jetzt: Date
): Promise<
	{ vonId: number; kategorie: string; turnierId: number } | 'geschlossen' | 'nicht-gefunden'
> {
	const r = await loescheEigeneAnfrage(db, anfrageId, 'an', anId, jetzt);
	if (typeof r === 'string') return r;
	return { vonId: r.vonId, kategorie: r.kategorie, turnierId: r.turnierId };
}

/**
 * Löscht alle offenen Anfragen der beiden in der Kategorie. Dritte, die eine davon gestellt oder
 * bekommen haben, stehen in `hinfaellig` beim Namen des Spielers, der nun einen Partner hat.
 */
async function loescheAnfragenDerBeiden(
	tx: DbOderTx,
	kategorieId: number,
	beide: (Namensteile & { id: number })[]
): Promise<Hinfaellig[]> {
	const ids = beide.map((b) => b.id);
	const weg = await tx
		.delete(partnerAnfrage)
		.where(
			and(
				eq(partnerAnfrage.kategorieId, kategorieId),
				or(inArray(partnerAnfrage.vonId, ids), inArray(partnerAnfrage.anId, ids))
			)
		)
		.returning({ vonId: partnerAnfrage.vonId, anId: partnerAnfrage.anId });
	const hinfaellig: Hinfaellig[] = [];
	for (const b of beide) {
		const andere = new Set<number>();
		for (const a of weg) {
			const gegenueber = a.vonId === b.id ? a.anId : a.anId === b.id ? a.vonId : null;
			if (gegenueber !== null && !ids.includes(gegenueber)) andere.add(gegenueber);
		}
		if (andere.size > 0) {
			hinfaellig.push({ anIds: [...andere].sort((x, y) => x - y), mitName: nameFuerText(b) });
		}
	}
	return hinfaellig;
}

/**
 * FR-48: eine Anfrage an einen selbst annehmen. Geprüft wird neu: Login, Anmeldeschluss, die
 * eigenen Angaben (FR-37), die Passung beider (`passtAlsPaar`, streng) und die Grenze für beide.
 * Hat der Anfragende kein Login mehr, ist die Anfrage weg (`hinfaellig`, keine Meldung). Ist einer
 * der beiden dort inzwischen zu zweit, ist die Anfrage weg (`schon-angemeldet`); sonst
 * bleibt sie bei einer Ablehnung stehen. Das Paar landet in der Anmeldung dessen, der schon
 * sucht (zuerst der Angefragte; suchen beide, ist die der Anfragenden *zurückgezogen*), sonst in
 * einer neuen; der Suchtext ist weg (FR-49). Alle übrigen Anfragen beider in der Kategorie
 * verfallen. Gesperrt werden beide Mitglieder, dann Kategorie, Turnier und Anfrage.
 */
export async function nimmAnfrageAn(
	db: Db,
	anfrageId: number,
	anId: number,
	jetzt: Date
): Promise<
	| {
			ergebnis: 'ok';
			vonId: number;
			kategorie: string;
			turnierId: number;
			hinfaellig: Hinfaellig[];
	  }
	| 'geschlossen'
	| 'voll'
	| 'passt-nicht'
	| 'schon-angemeldet'
	| 'angaben-fehlen'
	| 'hinfaellig'
	| 'nicht-gefunden'
> {
	return db.transaction(async (tx) => {
		const [vorab] = await tx
			.select({ vonId: partnerAnfrage.vonId, kategorieId: partnerAnfrage.kategorieId })
			.from(partnerAnfrage)
			.where(and(eq(partnerAnfrage.id, anfrageId), eq(partnerAnfrage.anId, anId)));
		if (!vorab) return 'nicht-gefunden';
		const gesperrt = await sperreMitglieder(tx, [vorab.vonId, anId]);
		const z = await sperreDoppel(tx, vorab.kategorieId);
		// Eine gleichzeitige Annahme kann sie inzwischen gelöscht haben.
		const [offen] = await tx
			.select({ id: partnerAnfrage.id })
			.from(partnerAnfrage)
			.where(eq(partnerAnfrage.id, anfrageId))
			.for('update');
		const von = gesperrt.get(vorab.vonId);
		const an = gesperrt.get(anId);
		if (!offen || !z || von?.status !== 'aktiv' || an?.status !== 'aktiv') return 'nicht-gefunden';
		if (!(await hatKontoMitLogin(tx, anId))) return 'nicht-gefunden';
		if (wirksamerStatus(z.t.status, z.t.anmeldeschluss, jetzt) !== 'offen') return 'geschlossen';
		// Ohne Login des Anfragenden (gesperrt oder Brief nicht eingelöst) erreicht ihn keine Antwort.
		if (!(await hatKontoMitLogin(tx, von.id))) {
			await tx.delete(partnerAnfrage).where(eq(partnerAnfrage.id, anfrageId));
			return 'hinfaellig';
		}
		const ich = spielerAus(an);
		if (fehlendeAngaben(ich).length > 0) return 'angaben-fehlen';
		if (!passtAlsPaar(regelAus(z.k), ich, spielerAus(von), true)) return 'passt-nicht';
		const standVon = await standIm(tx, z.t.id, z.k.id, von.id);
		const standAn = await standIm(tx, z.t.id, z.k.id, an.id);
		if (zuZweit(standVon) || zuZweit(standAn)) {
			await tx.delete(partnerAnfrage).where(eq(partnerAnfrage.id, anfrageId));
			return 'schon-angemeldet';
		}
		if (!hatPlatz(standVon) || !hatPlatz(standAn)) return 'voll';

		if (standAn.hier) {
			await tx
				.insert(anmeldungSpieler)
				.values({ anmeldungId: standAn.hier.anmeldungId, mitgliedId: von.id });
			await tx
				.update(anmeldung)
				.set({ suchtext: null, geaendertAm: jetzt })
				.where(eq(anmeldung.id, standAn.hier.anmeldungId));
			if (standVon.hier) {
				await tx
					.update(anmeldung)
					.set({ status: 'zurueckgezogen', suchtext: null, geaendertAm: jetzt })
					.where(eq(anmeldung.id, standVon.hier.anmeldungId));
			}
		} else if (standVon.hier) {
			await tx
				.insert(anmeldungSpieler)
				.values({ anmeldungId: standVon.hier.anmeldungId, mitgliedId: an.id });
			await tx
				.update(anmeldung)
				.set({ suchtext: null, geaendertAm: jetzt })
				.where(eq(anmeldung.id, standVon.hier.anmeldungId));
		} else {
			const [neu] = await tx
				.insert(anmeldung)
				.values({ kategorieId: z.k.id, angemeldetAm: jetzt, geaendertAm: jetzt })
				.returning({ id: anmeldung.id });
			await tx.insert(anmeldungSpieler).values([
				{ anmeldungId: neu.id, mitgliedId: von.id },
				{ anmeldungId: neu.id, mitgliedId: an.id }
			]);
		}
		const hinfaellig = await loescheAnfragenDerBeiden(tx, z.k.id, [von, an]);
		return {
			ergebnis: 'ok' as const,
			vonId: von.id,
			kategorie: z.k.name,
			turnierId: z.t.id,
			hinfaellig
		};
	});
}

/**
 * FR-49: Suchtext der eigenen aktiven Doppel-Anmeldung ändern, solange man allein sucht und das
 * Turnier offen ist; leer wird `null`. Die Länge prüft die Schnittstelle.
 */
export async function setzeSuchtext(
	db: Db,
	anmeldungId: number,
	mitgliedId: number,
	suchtext: string | null,
	jetzt: Date
): Promise<'ok' | 'geschlossen' | 'nicht-gefunden'> {
	return db.transaction(async (tx) => {
		if (!(await sperreMitglieder(tx, [mitgliedId])).has(mitgliedId)) return 'nicht-gefunden';
		// Unter der Sperre des Mitglieds kommt kein Partner mehr dazu.
		const spieler = await spielerDer(tx, anmeldungId);
		if (spieler.length !== 1 || spieler[0] !== mitgliedId) return 'nicht-gefunden';
		const [{ kategorieId }] = await tx
			.select({ kategorieId: anmeldung.kategorieId })
			.from(anmeldung)
			.where(eq(anmeldung.id, anmeldungId));
		const z = await sperreKategorieUndTurnier(tx, kategorieId);
		const [aktiv] = await tx
			.select({ id: anmeldung.id })
			.from(anmeldung)
			.where(and(eq(anmeldung.id, anmeldungId), istAktiv))
			.for('update');
		if (!z || z.k.art !== 'doppel' || !aktiv) return 'nicht-gefunden';
		if (wirksamerStatus(z.t.status, z.t.anmeldeschluss, jetzt) !== 'offen') return 'geschlossen';
		await tx
			.update(anmeldung)
			.set({ suchtext: suchtextAus(suchtext), geaendertAm: jetzt })
			.where(eq(anmeldung.id, anmeldungId));
		return 'ok';
	});
}
