// Hilfen der E2E-Tests für Turnier, Clubmeisterschaft und Gespräch: legen erfundene Turniere,
// Anmeldungen und Nachrichten über dieselbe Fachlogik wie der Server an, ohne Mail.
import { and, desc, eq } from 'drizzle-orm';
import {
	beantrageWildcard,
	meldeAn as meldeZurCmAnInDb
} from '../../../src/lib/server/cm/anmeldungen.ts';
import { stelleAnfrage } from '../../../src/lib/server/cm/doppel.ts';
import { meldeDoppelVonHandAn } from '../../../src/lib/server/cm/verwaltung-doppel.ts';
import { antworte, schreibeAlsMitglied } from '../../../src/lib/server/gespraech/gespraech.ts';
import { gespraech, mitglied, nachricht, turnier } from '../../../src/lib/server/db/schema.ts';
import type { KategorieWerte } from '../../../src/lib/server/turnier/angaben.ts';
import {
	legeKategorieAn,
	legeTurnierAn as legeTurnierInDbAn,
	setzeStatus
} from '../../../src/lib/server/turnier/turniere.ts';
import type { Klassierung } from '../../../src/lib/turnier/klassierung.ts';
import { hole } from './verbindung.ts';

// Pro Jahr gibt es nur ein Turnier, und alle Testdateien eines Laufs teilen die Datenbank. Darum
// sucht sich die Hilfe das Jahr selbst: zufällig aus diesem Bereich, bei «vergeben» ein anderes.
// Feste Jahre von Hand stiessen parallel laufende Dateien gegenseitig ihre Turniere weg. Der
// Bereich liegt über dem Turnierformular (bis 2100, turnier.test.ts nimmt 2097–2099) und über dem
// Turnier aus `make seed` (2027) und bleibt vierstellig wie echte Jahre.
const FREIE_JAHRE = { von: 3000, bis: 9999 };

export type TestTurnier = { turnierId: number; jahr: number };

async function legeTurnierImJahrAn(jahr: number) {
	return legeTurnierInDbAn(hole().db, {
		jahr,
		name: `Clubmeisterschaft ${jahr}`,
		anmeldeschluss: `${jahr}-05-31`,
		nummern: []
	});
}

/**
 * Erfundenes Turnier in Vorbereitung, ohne Kategorien, in einem freien Jahr. Gibt Nummer und Jahr
 * zurück; der Name ist «Clubmeisterschaft <Jahr>».
 */
export async function legeTurnierAn(): Promise<TestTurnier> {
	for (let versuch = 0; versuch < 20; versuch++) {
		const frei =
			FREIE_JAHRE.von + Math.floor(Math.random() * (FREIE_JAHRE.bis - FREIE_JAHRE.von + 1));
		const r = await legeTurnierImJahrAn(frei);
		if (r.ergebnis === 'ok') return { turnierId: r.id, jahr: frei };
	}
	throw new Error('Kein freies Turnierjahr gefunden');
}

/**
 * Löscht das Turnier dieses Jahres samt Kategorien und Turniernummern (Fremdschlüssel mit
 * Cascade). Für Tests mit festem Jahr, die ein Turnier übers Formular anlegen (turnier.test.ts).
 */
export async function loescheTurnier(jahr: number): Promise<void> {
	await hole().db.delete(turnier).where(eq(turnier.jahr, jahr));
}

/** Gibt dem Turnier einen anderen (erfundenen) Namen, z. B. einen sehr langen. */
export async function benenneTurnier(turnierId: number, name: string): Promise<void> {
	await hole().db.update(turnier).set({ name }).where(eq(turnier.id, turnierId));
}

/**
 * Wie `legeTurnierAn`, dazu diese Kategorien und offene Anmeldung (Anmeldeschluss 31. Mai des
 * Jahres). Gibt Nummer und Jahr des Turniers und die Nummern der Kategorien zurück, in der
 * Reihenfolge der Werte.
 */
export async function legeOffenesTurnierAn(
	kategorien: KategorieWerte[]
): Promise<TestTurnier & { kategorieIds: number[] }> {
	const { turnierId, jahr } = await legeTurnierAn();
	const kategorieIds: number[] = [];
	for (const werte of kategorien) {
		const r = await legeKategorieAn(hole().db, turnierId, werte);
		if (r.ergebnis !== 'ok') throw new Error(`Kategorie ${werte.name} liess sich nicht anlegen`);
		kategorieIds.push(r.id);
	}
	if ((await setzeStatus(hole().db, turnierId, 'offen', new Date())) !== 'ok') {
		throw new Error(`Anmeldung zum Turnier ${jahr} liess sich nicht öffnen`);
	}
	return { turnierId, jahr, kategorieIds };
}

/** Setzt die CM-Angaben eines erfundenen Mitglieds (FR-37); nicht genannte bleiben, wie sie sind. */
export async function setzeSpielerangaben(
	mitgliedId: number,
	angaben: Partial<{
		geschlecht: 'w' | 'm';
		jahrgang: number;
		klassierung: Klassierung;
		telefon: string;
	}>
): Promise<void> {
	await hole().db.update(mitglied).set(angaben).where(eq(mitglied.id, mitgliedId));
}

/**
 * Partner-Anfrage im Doppel über die Fachlogik (FR-48), ohne Meldung an den Angefragten. Er
 * braucht ein Login (Brief-Code eingelöst).
 */
export async function stelleAnfrageDirekt(
	kategorieId: number,
	vonId: number,
	anId: number
): Promise<void> {
	const r = await stelleAnfrage(hole().db, kategorieId, vonId, anId, new Date());
	if (r !== 'ok') throw new Error(`Anfrage für Kategorie ${kategorieId}: ${r}`);
}

/**
 * Meldet ein Mitglied über die Fachlogik zu einer Kategorie an (ohne Mail); im Doppel allein
 * (*sucht Partner*), wahlweise mit Kommentar (FR-49).
 */
export async function meldeZurCmAn(
	kategorieId: number,
	mitgliedId: number,
	suchtext: string | null = null
): Promise<void> {
	const r = await meldeZurCmAnInDb(hole().db, kategorieId, mitgliedId, new Date(), suchtext);
	if (r !== 'ok') throw new Error(`Anmeldung zur Kategorie ${kategorieId}: ${r}`);
}

/**
 * Meldet ein Paar über die Fachlogik der Verwaltung an (FR-46), als CM-Admin `cmMitgliedId`, ohne
 * Meldung an die Spieler; Warnungen übergeht es.
 */
export async function meldePaarDirektAn(
	kategorieId: number,
	paar: [number, number],
	cmMitgliedId: number
): Promise<void> {
	const r = await meldeDoppelVonHandAn(
		hole().db,
		{ art: 'admin', mitgliedId: cmMitgliedId },
		kategorieId,
		paar,
		new Date(),
		true
	);
	if (typeof r !== 'object' || !('ergebnis' in r)) {
		throw new Error(`Paar für Kategorie ${kategorieId}: ${JSON.stringify(r)}`);
	}
}

/** Setzt die Kontaktperson des Turniers direkt (die Verwaltung prüft die Rolle, siehe turnier.test.ts). */
export async function setzeKontaktperson(turnierId: number, mitgliedId: number): Promise<void> {
	await hole()
		.db.update(turnier)
		.set({ kontaktMitgliedId: mitgliedId })
		.where(eq(turnier.id, turnierId));
}

/** Das Turnier hat keine Kontaktperson mehr (z. B. wegen verlorener Rolle). */
export async function entferneKontaktperson(turnierId: number): Promise<void> {
	await hole().db.update(turnier).set({ kontaktMitgliedId: null }).where(eq(turnier.id, turnierId));
}

/** Das Mitglied schreibt der Turnierleitung, über die Fachlogik (FR-50), ohne Meldung. */
export async function schreibeNachricht(
	turnierId: number,
	mitgliedId: number,
	text: string
): Promise<void> {
	const r = await schreibeAlsMitglied(hole().db, turnierId, mitgliedId, text, new Date());
	if (typeof r === 'string') throw new Error(`Nachricht an die Turnierleitung: ${r}`);
}

/** Ein CM-Admin antwortet im Gespräch des Mitglieds (FR-52), über die Fachlogik, ohne Meldung. */
export async function antworteAlsLeitung(
	turnierId: number,
	mitgliedId: number,
	adminId: number,
	text: string
): Promise<void> {
	const db = hole().db;
	const [g] = await db
		.select({ id: gespraech.id })
		.from(gespraech)
		.where(and(eq(gespraech.turnierId, turnierId), eq(gespraech.mitgliedId, mitgliedId)));
	if (!g) throw new Error('Kein Gespräch zum Antworten');
	const [letzte] = await db
		.select({ id: nachricht.id })
		.from(nachricht)
		.where(eq(nachricht.gespraechId, g.id))
		.orderBy(desc(nachricht.id))
		.limit(1);
	const r = await antworte(db, g.id, adminId, text, letzte.id, false, new Date());
	if (typeof r === 'string' || r.ergebnis !== 'ok')
		throw new Error('Antwort liess sich nicht senden');
}

/** Setzt den Anmeldeschluss eines Turniers (`YYYY-MM-DD`), etwa auf ein vergangenes Datum. */
export async function setzeAnmeldeschluss(turnierId: number, datum: string): Promise<void> {
	await hole().db.update(turnier).set({ anmeldeschluss: datum }).where(eq(turnier.id, turnierId));
}

/** Wildcard-Antrag über die Fachlogik (FR-08), ohne Mail an Spieler und CM-Admins. */
export async function beantrageWildcardDirekt(
	kategorieId: number,
	mitgliedId: number,
	kommentar: string
): Promise<void> {
	const r = await beantrageWildcard(hole().db, kategorieId, mitgliedId, kommentar, new Date());
	if (r !== 'ok') throw new Error(`Wildcard-Antrag für Kategorie ${kategorieId}: ${r}`);
}
