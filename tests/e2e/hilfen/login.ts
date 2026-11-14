// Hilfen der Login-Tests im Testprozess: Konten anlegen und Brief-Codes ausstellen über
// dieselbe Fachlogik wie der Server (gleicher Schlüssel, gleiche Datenbank), Mail-Codes aus
// Mailpit lesen. Codes aus diesen Hilfen schicken nie eine Mail.
import { erstelleDb, type Db } from '../../../src/lib/server/db/index.ts';
import { erstelleBremsen } from '../../../src/lib/server/login/bremse.ts';
import { erstelleLoginDienst, type LoginDienst } from '../../../src/lib/server/login/dienst.ts';
import { and, desc, eq } from 'drizzle-orm';
import { machAdmin } from '../../../src/lib/server/admin/erster-admin.ts';
import { legeAnlassAn, melde } from '../../../src/lib/server/anlass/anlaesse.ts';
import { setzeRollen, type Rolle } from '../../../src/lib/server/admin/rollen.ts';
import {
	beantrageWildcard,
	meldeAn as meldeZurCmAnInDb
} from '../../../src/lib/server/cm/anmeldungen.ts';
import { stelleAnfrage } from '../../../src/lib/server/cm/doppel.ts';
import { antworte, schreibeAlsMitglied } from '../../../src/lib/server/gespraech/gespraech.ts';
import { meldeDoppelVonHandAn } from '../../../src/lib/server/cm/verwaltung-doppel.ts';
import {
	gespraech,
	konto,
	mitglied,
	nachricht,
	sitzung,
	turnier
} from '../../../src/lib/server/db/schema.ts';
import type { KategorieWerte } from '../../../src/lib/server/turnier/angaben.ts';
import {
	legeKategorieAn,
	legeTurnierAn as legeTurnierInDbAn,
	setzeStatus
} from '../../../src/lib/server/turnier/turniere.ts';
import type { Klassierung } from '../../../src/lib/turnier/klassierung.ts';
import { legeMitgliedAn } from '../../hilfen/mitglieder.ts';
import { DATENBANK_URL, MAILPIT_URL, e2eEinstellungen } from './umgebung.ts';

let verbindung: { db: Db; dienst: LoginDienst } | undefined;

function hole() {
	if (!verbindung) {
		const db = erstelleDb(DATENBANK_URL);
		const einstellungen = e2eEinstellungen('');
		const dienst = erstelleLoginDienst({
			db,
			schluessel: einstellungen.MYTCO_CODE_SCHLUESSEL,
			kontakt: einstellungen.MYTCO_KONTAKT,
			mailer: async () => {
				throw new Error('Die E2E-Hilfen verschicken keine Mails');
			},
			bremsen: erstelleBremsen()
		});
		verbindung = { db, dienst };
	}
	return verbindung;
}

/** Erfundenes Mitglied mit Konto; die Adresse ist pro Aufruf eindeutig. */
export async function legeKontoAn(vorname: string, nachname?: string) {
	return legeMitgliedAn(hole().db, { vorname, nachname });
}

/** Erfundenes Mitglied mit Konto und frisch ausgestelltem Brief-Code (ohne Bindestrich). */
export async function legeKontoMitBriefCodeAn(vorname: string, nachname?: string) {
	const konto = await legeKontoAn(vorname, nachname);
	const { code } = await hole().dienst.stelleBriefCodeAus(konto.kontoId);
	return { ...konto, code };
}

/**
 * Wie `legeKontoMitBriefCodeAn`, das Konto hat zusätzlich die Rollen des ersten Admins, MyTCO-Admin
 * und Mitglieder-Admin (Code-Bestätigung fehlt noch).
 */
export async function legeAdminMitBriefCodeAn(vorname: string) {
	const konto = await legeKontoMitBriefCodeAn(vorname);
	await machAdmin(hole().db, konto.kontoId, new Date());
	return konto;
}

/** Wie `legeKontoMitBriefCodeAn`, das Konto hat genau diese Rollen (Code-Bestätigung fehlt noch). */
export async function legeRollenkontoMitBriefCodeAn(
	vorname: string,
	rollen: Rolle[],
	nachname?: string
) {
	const konto = await legeKontoMitBriefCodeAn(vorname, nachname);
	await setzeRollen(hole().db, { art: 'automatisch' }, konto.kontoId, rollen, [], new Date());
	return konto;
}

/** Wie `legeKontoMitBriefCodeAn`, das Konto hat nur die Rolle CM (Code-Bestätigung fehlt noch). */
export async function legeCmMitBriefCodeAn(vorname: string) {
	return legeRollenkontoMitBriefCodeAn(vorname, ['cm']);
}

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
 *
 * Ein festes Jahr nur für Tests aus Branches, die vor dieser Umstellung entstanden sind: Dann wird
 * ein altes Turnier desselben Jahres vorher gelöscht, und wie früher kommt nur die Nummer zurück.
 * Neue Tests geben kein Jahr an.
 */
export async function legeTurnierAn(): Promise<TestTurnier>;
export async function legeTurnierAn(festesJahr: number): Promise<number>;
export async function legeTurnierAn(festesJahr?: number): Promise<TestTurnier | number> {
	if (festesJahr !== undefined) return (await legeTurnierMitFestemJahrAn(festesJahr)).turnierId;
	return legeTurnierInFreiemJahrAn();
}

async function legeTurnierMitFestemJahrAn(jahr: number): Promise<TestTurnier> {
	await loescheTurnier(jahr);
	const r = await legeTurnierImJahrAn(jahr);
	if (r.ergebnis !== 'ok') throw new Error(`Turnier ${jahr} liess sich nicht anlegen`);
	return { turnierId: r.id, jahr };
}

async function legeTurnierInFreiemJahrAn(): Promise<TestTurnier> {
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
 * Reihenfolge der Werte. Das feste Jahr wie bei `legeTurnierAn` nur für ältere Branches.
 */
export async function legeOffenesTurnierAn(
	kategorien: KategorieWerte[]
): Promise<TestTurnier & { kategorieIds: number[] }>;
export async function legeOffenesTurnierAn(
	festesJahr: number,
	kategorien: KategorieWerte[]
): Promise<TestTurnier & { kategorieIds: number[] }>;
export async function legeOffenesTurnierAn(
	erstes: number | KategorieWerte[],
	zweites?: KategorieWerte[]
): Promise<TestTurnier & { kategorieIds: number[] }> {
	const kategorien = typeof erstes === 'number' ? (zweites ?? []) : erstes;
	const { turnierId, jahr } =
		typeof erstes === 'number'
			? await legeTurnierMitFestemJahrAn(erstes)
			: await legeTurnierInFreiemJahrAn();
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

/** Leert die Strasse eines erfundenen Mitglieds: Die Adresse ist dann unvollständig (A-LOGIN-01). */
export async function leereStrasse(mitgliedId: number): Promise<void> {
	await hole().db.update(mitglied).set({ strasse: '' }).where(eq(mitglied.id, mitgliedId));
}

/** Setzt den Rufnamen eines erfundenen Mitglieds (nur das Mitglied selbst tut das im Profil). */
export async function setzeRufname(mitgliedId: number, rufname: string | null): Promise<void> {
	await hole().db.update(mitglied).set({ rufname }).where(eq(mitglied.id, mitgliedId));
}

/** Setzt die Telefonnummer eines erfundenen Mitglieds (FR-19: Doppelpartner sehen sie). */
export async function setzeTelefon(mitgliedId: number, telefon: string): Promise<void> {
	await hole().db.update(mitglied).set({ telefon }).where(eq(mitglied.id, mitgliedId));
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

/**
 * Das erfundene Mitglied ist ausgetreten, ohne die Folgen eines Austritts (seine Anmeldungen
 * bleiben stehen), wie nach dem Anmeldeschluss.
 */
export async function setzeAusgetreten(mitgliedId: number): Promise<void> {
	await hole()
		.db.update(mitglied)
		.set({ status: 'ausgetreten', austrittAm: new Date() })
		.where(eq(mitglied.id, mitgliedId));
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

/** Das Konto hat ein Login, als hätte es den Brief-Code eingelöst, ohne Browser. */
export async function gibLogin(kontoId: number): Promise<void> {
	await hole()
		.db.update(konto)
		.set({ briefCodeBenutztAm: new Date() })
		.where(eq(konto.id, kontoId));
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

/** Erfundener Anlass weit in der Zukunft mit offener Anmeldung; gibt seine Nummer zurück. */
export async function legeOffenenAnlassAn(erstelltVon: number, titel: string): Promise<number> {
	return legeAnlassAn(hole().db, erstelltVon, {
		titel,
		beginn: new Date('2099-05-20T17:00:00Z'),
		ort: 'Clubhaus, Musterweg 1, Olten',
		einladung: '',
		anmeldeschluss: new Date('2099-05-17T21:59:00Z')
	});
}

/** Das Mitglied antwortet auf den Anlass, ohne Bemerkung (bei «kommt nicht» auf Wunsch mit). */
export async function meldeZumAnlass(
	anlassId: number,
	mitgliedId: number,
	antwort: 'kommt' | 'kommt-nicht',
	bemerkung: string | null = null
): Promise<void> {
	const r = await melde(hole().db, anlassId, mitgliedId, { antwort, bemerkung }, new Date());
	if (r !== 'ok') throw new Error(`Antwort auf Anlass ${anlassId}: ${r}`);
}

/** Stellt für ein bestehendes Konto einen weiteren Brief-Code aus (ohne Bindestrich). */
export async function stelleBriefCodeAus(kontoId: number): Promise<string> {
	return (await hole().dienst.stelleBriefCodeAus(kontoId)).code;
}

/** Lässt den Brief-Code eines Kontos ablaufen (gestern), ohne ihn zu benutzen. */
export async function laesstBriefCodeAblaufen(kontoId: number): Promise<void> {
	const gestern = new Date(Date.now() - 24 * 60 * 60 * 1000);
	await hole().db.update(konto).set({ briefCodeAblauf: gestern }).where(eq(konto.id, kontoId));
}

/**
 * Erfundenes Mitglied, ausgetreten oder zum Löschen vorgemerkt, mit gespeicherten Rollen.
 * `davor`: der Zustand vor dem Vormerken (nur bei `vorgemerkt`).
 */
export async function legeEhemaligesAn(
	vorname: string,
	nachname: string,
	status: 'ausgetreten' | 'vorgemerkt',
	rollen: Rolle[],
	davor: 'aktiv' | 'ausgetreten' = 'aktiv'
) {
	const m = await legeMitgliedAn(hole().db, { vorname, nachname, status, rollen });
	if (status === 'vorgemerkt' && davor === 'ausgetreten') {
		await hole()
			.db.update(mitglied)
			.set({ statusVorher: 'ausgetreten', austrittAm: new Date() })
			.where(eq(mitglied.id, m.mitgliedId));
	}
	return m;
}

export async function beendeAlleSitzungen(kontoId: number): Promise<void> {
	await hole().dienst.beendeAlleSitzungen(kontoId);
}

/**
 * Bestätigt die Verwaltung für alle Sitzungen des Kontos direkt in der Datenbank, wie es der
 * Mail-Code auf «Verwaltung öffnen» täte; ohne Mail (Budget je Adresse, Mailpit).
 */
export async function bestaetigeVerwaltungDirekt(kontoId: number): Promise<void> {
	await hole()
		.db.update(sitzung)
		.set({ adminBestaetigtAm: new Date() })
		.where(eq(sitzung.kontoId, kontoId));
}

type Treffer = { messages: { ID: string }[] };

/** Mails an `adresse` (neueste zuerst), wahlweise nur mit diesem Betreff. */
async function sucheMails(adresse: string, betreff?: string): Promise<{ ID: string }[]> {
	const suche = new URL('/api/v1/search', MAILPIT_URL);
	suche.searchParams.set('query', `to:"${adresse}"${betreff ? ` subject:"${betreff}"` : ''}`);
	const antwort = await fetch(suche);
	return antwort.ok ? ((await antwort.json()) as Treffer).messages : [];
}

async function mailText(id: string): Promise<string> {
	const mail = await fetch(new URL(`/api/v1/message/${id}`, MAILPIT_URL));
	return ((await mail.json()) as { Text: string }).Text;
}

// Alle Code-Mails (Login, Verwaltung, neue E-Mail-Adresse) beginnen den Betreff so.
const CODE_BETREFF = 'Dein Code für';
const warte = () => new Promise((r) => setTimeout(r, 250));

/**
 * Wartet auf die Code-Mail an `adresse` (der Versand läuft nach der Antwort) und liest den Code.
 * Nur Mails mit dem Betreff der Code-Mail: CM-Admins bekommen auch Meldungen paralleler Tests
 * (FR-47), etwa zu einem neuen Wildcard-Antrag.
 */
export async function holeMailCode(adresse: string, wartezeitMs = 15_000): Promise<string> {
	const ende = Date.now() + wartezeitMs;
	while (Date.now() < ende) {
		const [neueste] = await sucheMails(adresse, CODE_BETREFF);
		if (neueste) {
			const code = /\b(\d{6})\b/.exec(await mailText(neueste.ID))?.[1];
			if (code) return code;
			throw new Error('Mail ohne sechsstelligen Code');
		}
		await warte();
	}
	throw new Error('Keine Mail in Mailpit angekommen');
}

/**
 * Wartet auf eine Mail an `adresse` mit diesem Betreff, deren Text `inhalt` enthält, und gibt den
 * Text zurück (Meldungen ohne Push-Abo kommen als Mail, FR-47).
 */
export async function warteAufMail(
	adresse: string,
	betreff: string,
	inhalt: string,
	wartezeitMs = 15_000
): Promise<string> {
	const ende = Date.now() + wartezeitMs;
	while (Date.now() < ende) {
		for (const { ID } of await sucheMails(adresse, betreff)) {
			const text = await mailText(ID);
			if (text.includes(inhalt)) return text;
		}
		await warte();
	}
	throw new Error(`Keine Mail «${betreff}» mit «${inhalt}» in Mailpit angekommen`);
}

export async function schliesseLoginHilfen(): Promise<void> {
	await verbindung?.db.$client.end();
	verbindung = undefined;
}
