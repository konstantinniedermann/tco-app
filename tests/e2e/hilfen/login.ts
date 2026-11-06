// Hilfen der Login-Tests im Testprozess: Konten anlegen und Brief-Codes ausstellen über
// dieselbe Fachlogik wie der Server (gleicher Schlüssel, gleiche Datenbank), Mail-Codes aus
// Mailpit lesen. Codes aus diesen Hilfen schicken nie eine Mail.
import { erstelleDb, type Db } from '../../../src/lib/server/db/index.ts';
import { erstelleBremsen } from '../../../src/lib/server/login/bremse.ts';
import { erstelleLoginDienst, type LoginDienst } from '../../../src/lib/server/login/dienst.ts';
import { eq } from 'drizzle-orm';
import { machAdmin } from '../../../src/lib/server/admin/erster-admin.ts';
import { legeAnlassAn, melde } from '../../../src/lib/server/anlass/anlaesse.ts';
import { setzeRollen, type Rolle } from '../../../src/lib/server/admin/rollen.ts';
import { turnier } from '../../../src/lib/server/db/schema.ts';
import { legeTurnierAn as legeTurnierInDbAn } from '../../../src/lib/server/turnier/turniere.ts';
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

/**
 * Erfundenes Turnier dieses Jahres in Vorbereitung, ohne Kategorien; ein altes desselben Jahres
 * wird vorher gelöscht (pro Jahr gibt es nur eines). Gibt seine Nummer zurück.
 */
export async function legeTurnierAn(jahr: number): Promise<number> {
	await loescheTurnier(jahr);
	const r = await legeTurnierInDbAn(hole().db, {
		jahr,
		name: `Clubmeisterschaft ${jahr}`,
		anmeldeschluss: `${jahr}-05-31`,
		nummern: []
	});
	if (r.ergebnis !== 'ok') throw new Error(`Turnier ${jahr} liess sich nicht anlegen`);
	return r.id;
}

/**
 * Löscht das Turnier dieses Jahres samt Kategorien und Turniernummern (Fremdschlüssel mit
 * Cascade). Die E2E-Datenbank überdauert die Läufe, und pro Jahr gibt es nur ein Turnier.
 */
export async function loescheTurnier(jahr: number): Promise<void> {
	await hole().db.delete(turnier).where(eq(turnier.jahr, jahr));
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

/** Das Mitglied antwortet auf den Anlass, ohne Bemerkung. */
export async function meldeZumAnlass(
	anlassId: number,
	mitgliedId: number,
	antwort: 'kommt' | 'kommt-nicht'
): Promise<void> {
	const r = await melde(hole().db, anlassId, mitgliedId, { antwort, bemerkung: null }, new Date());
	if (r !== 'ok') throw new Error(`Antwort auf Anlass ${anlassId}: ${r}`);
}

/** Stellt für ein bestehendes Konto einen weiteren Brief-Code aus (ohne Bindestrich). */
export async function stelleBriefCodeAus(kontoId: number): Promise<string> {
	return (await hole().dienst.stelleBriefCodeAus(kontoId)).code;
}

export async function beendeAlleSitzungen(kontoId: number): Promise<void> {
	await hole().dienst.beendeAlleSitzungen(kontoId);
}

type Treffer = { messages: { ID: string }[] };

/** Wartet auf die Mail an `adresse` (der Versand läuft nach der Antwort) und liest den Code. */
export async function holeMailCode(adresse: string, wartezeitMs = 15_000): Promise<string> {
	const suche = new URL('/api/v1/search', MAILPIT_URL);
	suche.searchParams.set('query', `to:"${adresse}"`);
	const ende = Date.now() + wartezeitMs;
	while (Date.now() < ende) {
		const antwort = await fetch(suche);
		if (antwort.ok) {
			const [neueste] = ((await antwort.json()) as Treffer).messages;
			if (neueste) {
				const mail = await fetch(new URL(`/api/v1/message/${neueste.ID}`, MAILPIT_URL));
				const { Text } = (await mail.json()) as { Text: string };
				const code = /\b(\d{6})\b/.exec(Text)?.[1];
				if (code) return code;
				throw new Error('Mail ohne sechsstelligen Code');
			}
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	throw new Error('Keine Mail in Mailpit angekommen');
}

export async function schliesseLoginHilfen(): Promise<void> {
	await verbindung?.db.$client.end();
	verbindung = undefined;
}
