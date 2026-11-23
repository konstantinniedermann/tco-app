// Hilfen der Login-Tests im Testprozess: Konten und Mitglieder anlegen und Brief-Codes ausstellen
// über dieselbe Fachlogik wie der Server (gleicher Schlüssel, gleiche Datenbank). Codes aus diesen
// Hilfen schicken nie eine Mail. Turnier, Anlass und Mailpit stehen in den Dateien daneben.
import { createHash, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { machAdmin } from '../../../src/lib/server/admin/erster-admin.ts';
import { setzeRollen, type Rolle } from '../../../src/lib/server/admin/rollen.ts';
import { icFolgen, konto, mitglied, pushAbo, sitzung } from '../../../src/lib/server/db/schema.ts';
import { erstelleSitzung } from '../../../src/lib/server/login/sitzung.ts';
import { legeMitgliedAn } from '../../hilfen/mitglieder.ts';
import { hole, schliesseVerbindung } from './verbindung.ts';

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

export async function setzeJahrgang(mitgliedId: number, jahrgang: number | null): Promise<void> {
	await hole().db.update(mitglied).set({ jahrgang }).where(eq(mitglied.id, mitgliedId));
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

/** Das Konto hat ein Login, als hätte es den Brief-Code eingelöst, ohne Browser. */
export async function gibLogin(kontoId: number): Promise<void> {
	await hole()
		.db.update(konto)
		.set({ briefCodeBenutztAm: new Date() })
		.where(eq(konto.id, kontoId));
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

/** Ein angemeldetes Gerät des Mitglieds, wahlweise mit erfundenem Push-Abo; ohne Browser. */
export async function legeGeraetAn(kontoId: number, push: boolean): Promise<void> {
	const kennung = await erstelleSitzung(hole().db, kontoId, new Date());
	if (!push) return;
	await hole()
		.db.insert(pushAbo)
		.values({
			endpunkt: `https://push.example.org/${randomUUID()}`,
			sitzungHash: createHash('sha256').update(kennung).digest('hex'),
			kontoId,
			p256dh: 'erfunden',
			auth: 'erfunden',
			eingerichtetAm: new Date()
		});
}

/** Schaltet ein Thema der Mitteilungen ab, wie es das Mitglied im Profil täte. */
export async function schalteThemaVereinAb(kontoId: number): Promise<void> {
	await hole().db.update(konto).set({ themaVerein: false }).where(eq(konto.id, kontoId));
}

/** Das Konto folgt dem Interclub-Team direkt in der Datenbank, auch ohne Push (wie nach dem Abschalten). */
export async function folgeTeamDirekt(kontoId: number, teamId: number): Promise<void> {
	await hole().db.insert(icFolgen).values({ kontoId, teamId, seit: new Date() });
}

export async function schliesseLoginHilfen(): Promise<void> {
	await schliesseVerbindung();
}
