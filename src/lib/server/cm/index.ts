import { holeDb } from '../db/index.ts';
import { leseEinstellungen } from '../einstellungen.ts';
import { erstelleSmtpMailer, leiteUm } from '../login/mail.ts';
import { meldeMitgliedern } from '../mitteilung/meldung.ts';
import { erstelleWebPush, kontaktFuerPush } from '../mitteilung/web-push.ts';
import { erstelleBestaetigung } from './mail.ts';
import type { CmDienste } from './typen.ts';

let dienste: CmDienste | undefined;

// Die Bestätigungsmail läuft ohne Bremsen: Sie zählt nicht gegen die Code-Grenzen (SI-04).
// Meldungen an Einzelne (FR-47) nutzen denselben Mailer; es sind wenige, ein Pool lohnt nicht.
export function holeCmDienste(): CmDienste {
	if (!dienste) {
		const einstellungen = leseEinstellungen();
		const mailer = leiteUm(
			erstelleSmtpMailer(einstellungen.smtpUrl, einstellungen.mailAbsender),
			einstellungen.mailNurAn
		);
		const db = holeDb();
		// SI-22: Ohne VAPID-Paar ist Push aus, Meldungen gehen per E-Mail.
		const push = einstellungen.vapid
			? erstelleWebPush(
					einstellungen.vapid,
					kontaktFuerPush(einstellungen.adresse, einstellungen.mailAbsender)
				)
			: null;
		const melder = { db, push, mailer, adresse: einstellungen.adresse };
		dienste = {
			db,
			bestaetigung: erstelleBestaetigung({ mailer, kontakt: einstellungen.kontakt }),
			melde: (ids, m) => meldeMitgliedern(melder, ids, m)
		};
	}
	return dienste;
}
