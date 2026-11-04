import { leseEinstellungen } from '../einstellungen.ts';
import { holeDb } from '../db/index.ts';
import { holeBremsen } from '../login/index.ts';
import { erstelleSmtpMailer, leiteUm } from '../login/mail.ts';
import type { AdminDienste } from './schnittstellen.ts';
import { erstelleZugangDienst } from './zugang.ts';

let dienste: AdminDienste | undefined;

// Träge erzeugter Einzelfall; die Bremsen sind mit dem Login geteilt (Adress-Grenzen zählen zusammen).
export function holeAdminDienste(): AdminDienste {
	if (!dienste) {
		const einstellungen = leseEinstellungen();
		const db = holeDb();
		dienste = {
			db,
			zugang: erstelleZugangDienst({
				db,
				schluessel: einstellungen.codeSchluessel,
				kontakt: einstellungen.kontakt,
				mailer: leiteUm(
					erstelleSmtpMailer(einstellungen.smtpUrl, einstellungen.mailAbsender),
					einstellungen.mailNurAn
				),
				bremsen: holeBremsen()
			})
		};
	}
	return dienste;
}
