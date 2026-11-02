import { leseEinstellungen } from '../einstellungen.ts';
import { holeDb } from '../db/index.ts';
import { erstelleBremsen } from './bremse.ts';
import { erstelleLoginDienst, type LoginDienst } from './dienst.ts';
import { erstelleSmtpMailer } from './mail.ts';

let dienst: LoginDienst | undefined;

// Träge erzeugter Einzelfall: Der Arbeitsspeicher der Bremsen muss über Anfragen hinweg leben.
export function holeLoginDienst(): LoginDienst {
	if (!dienst) {
		const einstellungen = leseEinstellungen();
		dienst = erstelleLoginDienst({
			db: holeDb(),
			schluessel: einstellungen.codeSchluessel,
			kontakt: einstellungen.kontakt,
			mailer: erstelleSmtpMailer(einstellungen.smtpUrl, einstellungen.mailAbsender),
			bremsen: erstelleBremsen()
		});
	}
	return dienst;
}
