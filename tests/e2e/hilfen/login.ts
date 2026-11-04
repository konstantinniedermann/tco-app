// Hilfen der Login-Tests im Testprozess: Konten anlegen und Brief-Codes ausstellen über
// dieselbe Fachlogik wie der Server (gleicher Schlüssel, gleiche Datenbank), Mail-Codes aus
// Mailpit lesen. Codes aus diesen Hilfen schicken nie eine Mail.
import { erstelleDb, type Db } from '../../../src/lib/server/db/index.ts';
import { erstelleBremsen } from '../../../src/lib/server/login/bremse.ts';
import { erstelleLoginDienst, type LoginDienst } from '../../../src/lib/server/login/dienst.ts';
import { machAdmin } from '../../../src/lib/server/admin/erster-admin.ts';
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
export async function legeKontoAn(vorname: string) {
	return legeMitgliedAn(hole().db, { vorname });
}

/** Erfundenes Mitglied mit Konto und frisch ausgestelltem Brief-Code (ohne Bindestrich). */
export async function legeKontoMitBriefCodeAn(vorname: string) {
	const konto = await legeKontoAn(vorname);
	const { code } = await hole().dienst.stelleBriefCodeAus(konto.kontoId);
	return { ...konto, code };
}

/** Wie `legeKontoMitBriefCodeAn`, das Konto hat zusätzlich die Rolle Admin (Code-Bestätigung fehlt noch). */
export async function legeAdminMitBriefCodeAn(vorname: string) {
	const konto = await legeKontoMitBriefCodeAn(vorname);
	await machAdmin(hole().db, konto.kontoId, new Date());
	return konto;
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
