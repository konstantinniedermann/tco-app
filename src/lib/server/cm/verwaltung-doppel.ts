// Doppel verwalten durch den CM-Admin (A-ANMELDUNG-06, FR-46): Liste, von Hand anmelden,
// zusammenlegen, offene Anfragen als Paar anmelden oder löschen. Wie im Einzel (`verwaltung.ts`)
// warnt MyTCO, statt zu sperren; nie geht ein Spieler doppelt in dieselbe Kategorie, ein Paar mit
// mehr als zwei Spielern, ein Turnier *in Vorbereitung* oder ein Mitglied, das nicht *aktiv* ist.
// Ein Login ist für den CM-Admin nicht nötig. Gesperrt wird wie in Etappe 1: Mitglieder nach
// aufsteigender ID (`sperreMitglieder`), dann Kategorie und Turnier, dann Anmeldung oder Anfrage.
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Namensteile } from '../../name.ts';
import type { Klassierung } from '../../turnier/klassierung.ts';
import { punkte } from '../../turnier/klassierung.ts';
import { warnungenDoppel, type Spieler } from '../../turnier/passung.ts';
import { wirksamerStatus } from '../../turnier/status.ts';
import type { MitgliedStatus } from '../admin/mitglieder.ts';
import type { Db, DbOderTx } from '../db/index.ts';
import { anmeldung, anmeldungSpieler, kategorie, mitglied, partnerAnfrage } from '../db/schema.ts';
import { namensSpalten } from '../namen.ts';
import { spielerAus } from './angaben.ts';
import {
	istAktiv,
	nameFuerText,
	namensteile,
	regelAus,
	sperreKategorieUndTurnier,
	sperreMitglieder,
	spielerDer
} from './anmeldungen.ts';
import {
	bildePaar,
	hatPlatz,
	loescheAnfragenDerBeiden,
	standIm,
	zuZweit,
	type Hinfaellig,
	type Stand
} from './doppel.ts';
import {
	anfrageGeloeschtText,
	hinfaelligMeldung,
	vonHandAlleinText,
	vonHandPaarText
} from './doppel-meldung.ts';
import { schreibeGeaendert, type CmUrheber, type Warnung } from './verwaltung.ts';

/** Ein Spieler in der Doppel-Liste der Verwaltung; ohne Telefon und E-Mail (FR-19). */
export type DoppelSpieler = {
	mitgliedId: number;
	name: Namensteile;
	/** Austritt und Löschung zeigt die Liste als Plakette (FR-04). */
	mitgliedStatus: MitgliedStatus;
	geschlecht: 'w' | 'm' | null;
	klassierung: Klassierung | null;
};

export type DoppelVerwaltung = {
	/** `summe` ist `null`, wenn eine Klassierung fehlt. */
	paare: { anmeldungId: number; spieler: [DoppelSpieler, DoppelSpieler]; summe: number | null }[];
	suchende: { anmeldungId: number; spieler: DoppelSpieler; kommentar: string | null }[];
	anfragen: { anfrageId: number; von: DoppelSpieler; an: DoppelSpieler; gestelltAm: Date }[];
};

/** Eine Meldung an ein Mitglied; Titel und Pfad setzt die Schnittstelle. */
export type Benachrichtigung = { mitgliedId: number; text: string };

export type DoppelErgebnis = { ergebnis: 'ok'; turnierId: number; meldungen: Benachrichtigung[] };

export type DoppelAbgelehnt =
	{ warnungen: Warnung[] } | 'schon-angemeldet' | 'vorbereitung' | 'nicht-gefunden';

type Gesperrt =
	Awaited<ReturnType<typeof sperreMitglieder>> extends Map<number, infer M> ? M : never;
type Ziel = NonNullable<Awaited<ReturnType<typeof sperreKategorieUndTurnier>>>;

const namenOrdnung = new Intl.Collator('de-CH');

const nachName = (a: DoppelSpieler, b: DoppelSpieler) =>
	namenOrdnung.compare(a.name.nachname, b.name.nachname) ||
	namenOrdnung.compare(a.name.vorname, b.name.vorname) ||
	a.mitgliedId - b.mitgliedId;

const doppelSpieler = (z: {
	mitgliedId: number;
	rufname: string | null;
	vorname: string;
	nachname: string;
	status: string;
	geschlecht: string | null;
	klassierung: string | null;
}): DoppelSpieler => {
	const s = spielerAus({ ...z, jahrgang: null });
	return {
		mitgliedId: z.mitgliedId,
		name: namensteile(z),
		mitgliedStatus: z.status as MitgliedStatus,
		geschlecht: s.geschlecht,
		klassierung: s.klassierung
	};
};

const spielerSpaltenDoppel = {
	mitgliedId: mitglied.id,
	...namensSpalten,
	status: mitglied.status,
	geschlecht: mitglied.geschlecht,
	klassierung: mitglied.klassierung
};

/**
 * A-ANMELDUNG-06: Paare, Suchende und offene Anfragen einer Doppel-Kategorie; `null` für Einzel
 * oder eine unbekannte Kategorie. Paare und Suchende nach Nachname des ersten Spielers (die
 * Spieler eines Paars selbst nach Nachname), Anfragen älteste zuerst, auch die von Mitgliedern
 * ohne Login: Der CM-Admin kann sie trotzdem anmelden.
 */
export async function ladeDoppel(db: Db, kategorieId: number): Promise<DoppelVerwaltung | null> {
	const [k] = await db
		.select({ art: kategorie.art })
		.from(kategorie)
		.where(eq(kategorie.id, kategorieId));
	if (!k || k.art !== 'doppel') return null;

	const zeilen = await db
		.select({
			anmeldungId: anmeldung.id,
			suchtext: anmeldung.suchtext,
			...spielerSpaltenDoppel
		})
		.from(anmeldung)
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.innerJoin(mitglied, eq(mitglied.id, anmeldungSpieler.mitgliedId))
		.where(and(eq(anmeldung.kategorieId, kategorieId), istAktiv));
	const anmeldungen = new Map<number, { suchtext: string | null; spieler: DoppelSpieler[] }>();
	for (const z of zeilen) {
		const a = anmeldungen.get(z.anmeldungId) ?? { suchtext: z.suchtext, spieler: [] };
		a.spieler.push(doppelSpieler(z));
		anmeldungen.set(z.anmeldungId, a);
	}
	const sortiert = [...anmeldungen.entries()].map(([anmeldungId, a]) => ({
		anmeldungId,
		suchtext: a.suchtext,
		spieler: a.spieler.sort(nachName)
	}));
	sortiert.sort((a, b) => nachName(a.spieler[0], b.spieler[0]));

	const liste: DoppelVerwaltung = { paare: [], suchende: [], anfragen: [] };
	for (const a of sortiert) {
		if (a.spieler.length >= 2) {
			const [x, y] = a.spieler;
			liste.paare.push({
				anmeldungId: a.anmeldungId,
				spieler: [x, y],
				summe:
					x.klassierung !== null && y.klassierung !== null
						? punkte(x.klassierung) + punkte(y.klassierung)
						: null
			});
		} else {
			liste.suchende.push({
				anmeldungId: a.anmeldungId,
				spieler: a.spieler[0],
				kommentar: a.suchtext
			});
		}
	}

	const anfragen = await db
		.select({
			anfrageId: partnerAnfrage.id,
			vonId: partnerAnfrage.vonId,
			anId: partnerAnfrage.anId,
			gestelltAm: partnerAnfrage.gestelltAm
		})
		.from(partnerAnfrage)
		.where(eq(partnerAnfrage.kategorieId, kategorieId))
		.orderBy(asc(partnerAnfrage.gestelltAm), asc(partnerAnfrage.id));
	if (anfragen.length > 0) {
		const ids = [...new Set(anfragen.flatMap((a) => [a.vonId, a.anId]))];
		const personen = new Map(
			(await db.select(spielerSpaltenDoppel).from(mitglied).where(inArray(mitglied.id, ids))).map(
				(z) => [z.mitgliedId, doppelSpieler(z)]
			)
		);
		for (const a of anfragen) {
			liste.anfragen.push({
				anfrageId: a.anfrageId,
				von: personen.get(a.vonId)!,
				an: personen.get(a.anId)!,
				gestelltAm: a.gestelltAm
			});
		}
	}
	return liste;
}

/** Aktive Doppel-Kategorie mit Turnier, gesperrt `for share`; sonst `null`. */
async function sperreDoppel(tx: DbOderTx, kategorieId: number) {
	const z = await sperreKategorieUndTurnier(tx, kategorieId);
	return z && z.k.art === 'doppel' && z.k.status === 'aktiv' ? z : null;
}

/**
 * FR-46: Warnungen in fester Reihenfolge wie im Einzel. `voll`, wenn einer die Grenze erreicht
 * hat; eine eigene Anmeldung als Suchender in der Kategorie zählt schon mit (`hatPlatz`).
 */
function warnungen(
	ziel: Ziel,
	a: Spieler,
	b: Spieler | null,
	staende: Stand[],
	jetzt: Date
): Warnung[] {
	const w: Warnung[] = warnungenDoppel(regelAus(ziel.k), a, b);
	if (staende.some((s) => !hatPlatz(s))) w.push('voll');
	if (wirksamerStatus(ziel.t.status, ziel.t.anmeldeschluss, jetzt) !== 'offen') {
		w.push('geschlossen');
	}
	return w;
}

/** Meldungen nach Empfänger, bei gleichem Empfänger nach Text. */
const geordnet = (m: Benachrichtigung[]) =>
	m.sort((a, b) => a.mitgliedId - b.mitgliedId || a.text.localeCompare(b.text));

/** Wer Anfragen an oder von einem der beiden hatte, erfährt, dass sie hinfällig sind (FR-48). */
const hinfaelligFuer = (hinfaellig: Hinfaellig[], kategorie: string, turnierId: number) =>
	hinfaellig.flatMap((h) =>
		h.anIds.map((mitgliedId) => ({
			mitgliedId,
			text: hinfaelligMeldung(h.mitName, kategorie, turnierId).text
		}))
	);

/**
 * Nach einer Paarbildung des CM-Admins (`bildePaar`): Regel für alle Paarbildungen, die Anfragen
 * beider in der Kategorie verfallen; dazu Verlauf bei beiden, Meldung an beide mit dem Namen des
 * anderen und an die Dritten, deren Anfragen verfallen sind.
 */
async function nachPaar(
	tx: DbOderTx,
	urheber: CmUrheber,
	ziel: Ziel,
	[a, b]: [Gesperrt, Gesperrt],
	jetzt: Date
): Promise<DoppelErgebnis> {
	const hinfaellig = await loescheAnfragenDerBeiden(tx, ziel.k.id, [a, b]);
	await schreibeGeaendert(tx, a, urheber, jetzt);
	await schreibeGeaendert(tx, b, urheber, jetzt);
	return {
		ergebnis: 'ok',
		turnierId: ziel.t.id,
		meldungen: geordnet([
			{ mitgliedId: a.id, text: vonHandPaarText(nameFuerText(b), ziel.k.name) },
			{ mitgliedId: b.id, text: vonHandPaarText(nameFuerText(a), ziel.k.name) },
			...hinfaelligFuer(hinfaellig, ziel.k.name, ziel.t.id)
		])
	};
}

/**
 * FR-46: ein Paar (zwei Spieler) oder einen Suchenden (einer) von Hand anmelden, auch ohne Login
 * und nach dem Anmeldeschluss; gegen Passung, Grenze und Schluss nur mit `trotzdem`. Steht einer
 * der beiden hier schon allein, kommt der andere in diese Anmeldung (Suchtext weg). Stehen beide
 * allein (dafür gibt es *zusammenlegen*), einer zu zweit oder der Suchende schon hier:
 * `schon-angemeldet`. Beim Paar verfallen danach alle Anfragen beider in der Kategorie.
 * Sperren: Mitglieder, Kategorie und Turnier.
 */
export async function meldeDoppelVonHandAn(
	db: Db,
	urheber: CmUrheber,
	kategorieId: number,
	mitgliedIds: [number] | [number, number],
	jetzt: Date,
	trotzdem: boolean
): Promise<DoppelErgebnis | DoppelAbgelehnt> {
	if (mitgliedIds.length === 2 && mitgliedIds[0] === mitgliedIds[1]) return 'nicht-gefunden';
	return db.transaction(async (tx) => {
		const gesperrt = await sperreMitglieder(tx, mitgliedIds);
		const spieler: Gesperrt[] = [];
		for (const id of mitgliedIds) {
			const m = gesperrt.get(id);
			if (m?.status !== 'aktiv') return 'nicht-gefunden';
			spieler.push(m);
		}
		const ziel = await sperreDoppel(tx, kategorieId);
		if (!ziel) return 'nicht-gefunden';
		if (ziel.t.status === 'vorbereitung') return 'vorbereitung';
		const staende: Stand[] = [];
		for (const m of spieler) staende.push(await standIm(tx, ziel.t.id, kategorieId, m.id));
		const [a, b] = spieler;
		const [standA, standB] = staende;

		if (b === undefined) {
			if (standA.hier) return 'schon-angemeldet';
			if (!trotzdem) {
				const w = warnungen(ziel, spielerAus(a), null, staende, jetzt);
				if (w.length > 0) return { warnungen: w };
			}
			const [neu] = await tx
				.insert(anmeldung)
				.values({ kategorieId, status: 'bestaetigt', angemeldetAm: jetzt, geaendertAm: jetzt })
				.returning({ id: anmeldung.id });
			await tx.insert(anmeldungSpieler).values({ anmeldungId: neu.id, mitgliedId: a.id });
			await schreibeGeaendert(tx, a, urheber, jetzt);
			return {
				ergebnis: 'ok' as const,
				turnierId: ziel.t.id,
				meldungen: [{ mitgliedId: a.id, text: vonHandAlleinText(ziel.k.name) }]
			};
		}

		if (zuZweit(standA) || zuZweit(standB) || (standA.hier && standB.hier)) {
			return 'schon-angemeldet';
		}
		if (!trotzdem) {
			const w = warnungen(ziel, spielerAus(a), spielerAus(b), staende, jetzt);
			if (w.length > 0) return { warnungen: w };
		}
		await bildePaar(tx, kategorieId, [a, standA], [b, standB], jetzt);
		return nachPaar(tx, urheber, ziel, [a, b], jetzt);
	});
}

/**
 * FR-46: zwei Suchende derselben Doppel-Kategorie zu einem Paar zusammenlegen. Der Spieler aus
 * `mitAnmeldungId` kommt in `anmeldungId`, `mitAnmeldungId` ist *zurückgezogen*, beide Suchtexte
 * sind weg; danach verfallen die Anfragen beider in der Kategorie. Warnungen wie beim Anmelden.
 * Ist eine der beiden nicht mehr aktiv, nicht mehr allein oder in einer anderen Kategorie (die
 * Liste ist veraltet): `nicht-gefunden`. Sperren: beide Spieler, Kategorie und Turnier, dann
 * beide Anmeldungen.
 */
export async function legeZusammen(
	db: Db,
	urheber: CmUrheber,
	anmeldungId: number,
	mitAnmeldungId: number,
	jetzt: Date,
	trotzdem: boolean
): Promise<DoppelErgebnis | DoppelAbgelehnt> {
	if (anmeldungId === mitAnmeldungId) return 'nicht-gefunden';
	return db.transaction(async (tx) => {
		const vorher = [await spielerDer(tx, anmeldungId), await spielerDer(tx, mitAnmeldungId)];
		if (vorher.some((s) => s.length !== 1)) return 'nicht-gefunden';
		const [aId, bId] = [vorher[0][0], vorher[1][0]];
		const gesperrt = await sperreMitglieder(tx, [aId, bId]);
		// Jede Änderung an den Spielern einer Anmeldung sperrt sie zuerst: kam vor der Sperre ein
		// Partner dazu, ist die Liste veraltet.
		const nachher = [await spielerDer(tx, anmeldungId), await spielerDer(tx, mitAnmeldungId)];
		if (nachher.join('|') !== vorher.join('|')) return 'nicht-gefunden';
		const a = gesperrt.get(aId);
		const b = gesperrt.get(bId);
		if (aId === bId || a?.status !== 'aktiv' || b?.status !== 'aktiv') return 'nicht-gefunden';

		const [{ kategorieId }] = await tx
			.select({ kategorieId: anmeldung.kategorieId })
			.from(anmeldung)
			.where(eq(anmeldung.id, anmeldungId));
		const ziel = await sperreDoppel(tx, kategorieId);
		const aktiv = await tx
			.select({ id: anmeldung.id })
			.from(anmeldung)
			.where(
				and(
					inArray(anmeldung.id, [anmeldungId, mitAnmeldungId]),
					eq(anmeldung.kategorieId, kategorieId),
					istAktiv
				)
			)
			.for('update');
		if (!ziel || aktiv.length !== 2) return 'nicht-gefunden';
		if (ziel.t.status === 'vorbereitung') return 'vorbereitung';
		const standA = await standIm(tx, ziel.t.id, kategorieId, a.id);
		const standB = await standIm(tx, ziel.t.id, kategorieId, b.id);
		if (standA.hier?.anmeldungId !== anmeldungId || standB.hier?.anmeldungId !== mitAnmeldungId) {
			return 'nicht-gefunden';
		}
		if (!trotzdem) {
			const w = warnungen(ziel, spielerAus(a), spielerAus(b), [standA, standB], jetzt);
			if (w.length > 0) return { warnungen: w };
		}
		await bildePaar(tx, kategorieId, [a, standA], [b, standB], jetzt);
		return nachPaar(tx, urheber, ziel, [a, b], jetzt);
	});
}

/**
 * Die offene Anfrage mit beiden Mitgliedern, Kategorie und Turnier, alles gesperrt in der
 * Reihenfolge von Etappe 1; `null`, wenn sie (inzwischen) weg ist.
 */
async function sperreAnfrage(tx: DbOderTx, anfrageId: number) {
	const [vorab] = await tx
		.select({
			vonId: partnerAnfrage.vonId,
			anId: partnerAnfrage.anId,
			kategorieId: partnerAnfrage.kategorieId
		})
		.from(partnerAnfrage)
		.where(eq(partnerAnfrage.id, anfrageId));
	if (!vorab) return null;
	const gesperrt = await sperreMitglieder(tx, [vorab.vonId, vorab.anId]);
	const z = await sperreKategorieUndTurnier(tx, vorab.kategorieId);
	// Eine gleichzeitige Annahme oder Ablehnung kann sie inzwischen gelöscht haben.
	const [offen] = await tx
		.select({ id: partnerAnfrage.id })
		.from(partnerAnfrage)
		.where(eq(partnerAnfrage.id, anfrageId))
		.for('update');
	const von = gesperrt.get(vorab.vonId);
	const an = gesperrt.get(vorab.anId);
	if (!offen || !z || !von || !an) return null;
	return { von, an, z };
}

/**
 * FR-46: eine offene Anfrage als Paar anmelden, wie das Annehmen (`nimmAnfrageAn`), aber ohne
 * Login-Prüfung, auch nach dem Anmeldeschluss und mit Warnungen statt Sperre. Steht einer der
 * beiden hier schon zu zweit: `schon-angemeldet`, die Anfrage bleibt (der CM-Admin kann sie
 * löschen). Sperren: beide Mitglieder, Kategorie und Turnier, dann die Anfrage.
 */
export async function meldeAnfrageAlsPaarAn(
	db: Db,
	urheber: CmUrheber,
	anfrageId: number,
	jetzt: Date,
	trotzdem: boolean
): Promise<DoppelErgebnis | DoppelAbgelehnt> {
	return db.transaction(async (tx) => {
		const g = await sperreAnfrage(tx, anfrageId);
		if (!g || g.von.status !== 'aktiv' || g.an.status !== 'aktiv') return 'nicht-gefunden';
		const { von, an, z } = g;
		if (z.k.art !== 'doppel' || z.k.status !== 'aktiv') return 'nicht-gefunden';
		if (z.t.status === 'vorbereitung') return 'vorbereitung';
		const standAn = await standIm(tx, z.t.id, z.k.id, an.id);
		const standVon = await standIm(tx, z.t.id, z.k.id, von.id);
		if (zuZweit(standAn) || zuZweit(standVon)) return 'schon-angemeldet';
		if (!trotzdem) {
			const w = warnungen(z, spielerAus(an), spielerAus(von), [standAn, standVon], jetzt);
			if (w.length > 0) return { warnungen: w };
		}
		// Wie beim Annehmen: zuerst in die Anmeldung des Angefragten.
		await bildePaar(tx, z.k.id, [an, standAn], [von, standVon], jetzt);
		return nachPaar(tx, urheber, z, [an, von], jetzt);
	});
}

/**
 * FR-46: eine offene Anfrage löschen, vor und nach dem Anmeldeschluss; der Anfragende erfährt,
 * dass sie hinfällig ist. Keine Anmeldung ändert sich, darum kein Verlaufseintrag (FR-26) und
 * weder Urheber noch Zeitpunkt. Sperren: beide Mitglieder, Kategorie und Turnier, dann die Anfrage.
 */
export async function loescheAnfrage(
	db: Db,
	anfrageId: number
): Promise<DoppelErgebnis | 'nicht-gefunden'> {
	return db.transaction(async (tx) => {
		const g = await sperreAnfrage(tx, anfrageId);
		if (!g) return 'nicht-gefunden';
		await tx.delete(partnerAnfrage).where(eq(partnerAnfrage.id, anfrageId));
		return {
			ergebnis: 'ok' as const,
			turnierId: g.z.t.id,
			meldungen: [
				{ mitgliedId: g.von.id, text: anfrageGeloeschtText(nameFuerText(g.an), g.z.k.name) }
			]
		};
	});
}
