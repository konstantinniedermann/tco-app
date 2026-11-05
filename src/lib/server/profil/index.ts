import { holeDb } from '../db/index.ts';
import { leseEinstellungen } from '../einstellungen.ts';
import { holeBremsen } from '../login/index.ts';
import { erstelleSmtpMailer, leiteUm } from '../login/mail.ts';
import { erstelleEmailWechselDienst } from './email-wechsel.ts';
import type { ProfilDienste } from './schnittstellen.ts';

let dienste: ProfilDienste | undefined;

// Träge erzeugter Einzelfall: Der Wechselspeicher liegt im Arbeitsspeicher und muss über alle
// Anfragen derselbe sein. Die Bremsen sind mit dem Login geteilt (Adress-Grenzen zählen zusammen).
export function holeProfilDienste(): ProfilDienste {
	if (!dienste) {
		const einstellungen = leseEinstellungen();
		const db = holeDb();
		dienste = {
			db,
			wechsel: erstelleEmailWechselDienst({
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
