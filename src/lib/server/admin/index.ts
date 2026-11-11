import { leseEinstellungen } from '../einstellungen.ts';
import { holeDb } from '../db/index.ts';
import { holeBremsen } from '../login/index.ts';
import { erstelleSmtpMailer, leiteUm } from '../login/mail.ts';
import type { AdminDienste } from './rechte.ts';
import { erstelleHinweis } from './hinweis-mail.ts';
import { erstelleZugangDienst } from './zugang.ts';

let dienste: AdminDienste | undefined;

// Träge erzeugter Einzelfall; die Bremsen sind mit dem Login geteilt (Adress-Grenzen zählen zusammen).
export function holeAdminDienste(): AdminDienste {
	if (!dienste) {
		const einstellungen = leseEinstellungen();
		const db = holeDb();
		const mailer = leiteUm(
			erstelleSmtpMailer(einstellungen.smtpUrl, einstellungen.mailAbsender),
			einstellungen.mailNurAn
		);
		const bremsen = holeBremsen();
		dienste = {
			db,
			zugang: erstelleZugangDienst({
				db,
				schluessel: einstellungen.codeSchluessel,
				kontakt: einstellungen.kontakt,
				mailer,
				bremsen
			}),
			hinweis: erstelleHinweis({ mailer, kontakt: einstellungen.kontakt, bremsen }),
			brief: {
				schluessel: einstellungen.codeSchluessel,
				adresse: einstellungen.adresse,
				kontakt: einstellungen.kontakt
			}
		};
	}
	return dienste;
}
