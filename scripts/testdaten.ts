// Nur Test: legt nach dem Zurücksetzen erfundene Mitglieder an und schickt einen Brief-Code per
// Mail, die über MAIL_NUR_AN beim Projektleiter landet. Läuft im Laufzeit-Image mit
// `node scripts/testdaten.ts` (betrieb/bin/ausliefern, Schritt «testdaten laden»).
// Die Ausgabe landet in protokoll.log: nie Code, Adresse oder Werte aus der Datenbank (DS-06).
import { count } from 'drizzle-orm';
import { machAdmin } from '../src/lib/server/admin/erster-admin.ts';
import { formatiereDatum } from '../src/lib/server/datum.ts';
import { erstelleDb } from '../src/lib/server/db/index.ts';
import { mitglied } from '../src/lib/server/db/schema.ts';
import { leseEinstellungen, type Einstellungen } from '../src/lib/server/einstellungen.ts';
import { erstelleBremsen } from '../src/lib/server/login/bremse.ts';
import { formatiereBriefCode } from '../src/lib/server/login/codes.ts';
import { erstelleLoginDienst } from '../src/lib/server/login/dienst.ts';
import { erstelleSmtpMailer, leiteUm } from '../src/lib/server/login/mail.ts';
import { ERFUNDENE_MITGLIEDER, legeErfundeneMitgliederAn } from './erfundene-mitglieder.ts';

/**
 * Zwei Sperren: ohne MAIL_NUR_AN (Live) nie, und nur auf einer leeren Datenbank — eine
 * Mitgliederdatenbank wird nie angefasst, ein zweiter Lauf legt nichts doppelt an.
 */
export function testdatenVerweigert(
	env: Record<string, string | undefined>,
	anzahlMitglieder: number
): string | null {
	if (!env.MAIL_NUR_AN?.trim()) return 'MAIL_NUR_AN fehlt: testdaten laufen nur auf Test';
	if (anzahlMitglieder > 0) {
		return 'Mitglieder schon vorhanden: testdaten laufen nur auf einer leeren Datenbank';
	}
	return null;
}

export function baueBriefCodeMail(
	code: string,
	gueltigBis: Date,
	adresse: string
): { betreff: string; text: string } {
	return {
		betreff: 'Brief-Code für die Test-Umgebung',
		text: [
			'Die Test-Umgebung von MyTCO ist neu aufgesetzt, mit erfundenen Mitgliedern.',
			'',
			`Brief-Code: ${formatiereBriefCode(code)}`,
			`gültig bis ${formatiereDatum(gueltigBis)}, nur einmal`,
			`Adresse: ${adresse}`,
			'',
			'Codes per Mail für die erfundenen Mitglieder kommen ebenfalls an diese Adresse.'
		].join('\n')
	};
}

// Fehler aus Drizzle nennen in der Meldung die Parameter der Abfrage; nur den Code ausgeben.
function fehlercode(fehler: unknown): string {
	let aktuell: unknown = fehler;
	for (let i = 0; i < 3 && aktuell instanceof Error; i++) {
		const code = (aktuell as { code?: unknown }).code;
		if (typeof code === 'string') return code;
		aktuell = aktuell.cause;
	}
	return 'ohne Code';
}

async function ladeTestdaten(env: Record<string, string | undefined>): Promise<void> {
	let einstellungen: Einstellungen;
	try {
		einstellungen = leseEinstellungen(env);
	} catch (fehler) {
		// Die Meldungen von leseEinstellungen nennen nur Namen, nie Werte (SI-05).
		console.error(`testdaten: ${(fehler as Error).message}`);
		process.exitCode = 1;
		return;
	}
	if (!env.DATABASE_URL) {
		console.error('testdaten: DATABASE_URL fehlt');
		process.exitCode = 1;
		return;
	}
	const db = erstelleDb(env.DATABASE_URL);
	try {
		const [{ anzahl }] = await db.select({ anzahl: count() }).from(mitglied);
		const grund = testdatenVerweigert(env, anzahl);
		if (grund) {
			console.error(`testdaten: ${grund}`);
			process.exitCode = 1;
			return;
		}
		const kontoIds = await legeErfundeneMitgliederAn(db);
		console.log(`testdaten: ${kontoIds.length} erfundene Mitglieder angelegt`);
		// Das erste erfundene Mitglied ist auf Test der erste Admin; es meldet sich mit dem Brief-Code an.
		// Der erste Admin ist MyTCO-Admin und Mitglieder-Admin (machAdmin, K-18.4).
		await machAdmin(db, kontoIds[0], new Date());

		const dienst = erstelleLoginDienst({
			db,
			schluessel: einstellungen.codeSchluessel,
			kontakt: einstellungen.kontakt,
			mailer: async () => {},
			bremsen: erstelleBremsen()
		});
		const { code, gueltigBis } = await dienst.stelleBriefCodeAus(kontoIds[0]);
		const mailer = leiteUm(
			erstelleSmtpMailer(einstellungen.smtpUrl, einstellungen.mailAbsender),
			einstellungen.mailNurAn
		);
		const adresse = env.MYTCO_ADRESSE || env.ORIGIN || einstellungen.adresse;
		try {
			await mailer({
				an: ERFUNDENE_MITGLIEDER[0].email,
				...baueBriefCodeMail(code, gueltigBis, adresse)
			});
			console.log('testdaten: Mail mit Brief-Code verschickt');
		} catch {
			// Die Testdaten bleiben; ein gestörter Mail-Zugang soll Test nicht leer zurücklassen.
			console.log('testdaten: Mail mit Brief-Code nicht versandt');
		}
	} catch (fehler) {
		console.error(`testdaten: abgebrochen (${fehlercode(fehler)})`);
		process.exitCode = 1;
	} finally {
		await db.$client.end();
	}
}

if (import.meta.main) await ladeTestdaten(process.env);
