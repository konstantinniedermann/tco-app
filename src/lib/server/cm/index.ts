import { holeDb } from '../db/index.ts';
import { leseEinstellungen } from '../einstellungen.ts';
import { erstelleSmtpMailer, leiteUm } from '../login/mail.ts';
import { erstelleBestaetigung } from './mail.ts';
import type { CmDienste } from './schnittstellen.ts';

let dienste: CmDienste | undefined;

// Die Bestätigungsmail läuft ohne Bremsen: Sie zählt nicht gegen die Code-Grenzen (SI-04).
export function holeCmDienste(): CmDienste {
	if (!dienste) {
		const einstellungen = leseEinstellungen();
		const mailer = leiteUm(
			erstelleSmtpMailer(einstellungen.smtpUrl, einstellungen.mailAbsender),
			einstellungen.mailNurAn
		);
		dienste = {
			db: holeDb(),
			bestaetigung: erstelleBestaetigung({ mailer, kontakt: einstellungen.kontakt })
		};
	}
	return dienste;
}
