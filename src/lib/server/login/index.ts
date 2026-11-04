import { leseEinstellungen } from '../einstellungen.ts';
import { holeDb } from '../db/index.ts';
import { erstelleBremsen, type Bremsen } from './bremse.ts';
import { ChallengeSpeicher } from './challenge.ts';
import { erstelleLoginDienst, type LoginDienst } from './dienst.ts';
import { erstelleSmtpMailer, leiteUm } from './mail.ts';
import { erstelleSimpleWebAuthnPruefer } from './passkey-pruefer.ts';
import { erstellePasskeyDienst, type PasskeyDienst } from './passkey.ts';

let dienst: LoginDienst | undefined;
let passkeyDienst: PasskeyDienst | undefined;
let bremsen: Bremsen | undefined;

// Eine Instanz für Login-, Passkey- und Admin-Zugangsdienst: jeder Dienst zählt eigene Fehlversuche,
// nur die Instanz ist geteilt (Adress-Grenzen zählen Login- und Admin-Mails zusammen).
export function holeBremsen(): Bremsen {
	bremsen ??= erstelleBremsen();
	return bremsen;
}

// Träge erzeugter Einzelfall: Der Arbeitsspeicher der Bremsen muss über Anfragen hinweg leben.
export function holeLoginDienst(): LoginDienst {
	if (!dienst) {
		const einstellungen = leseEinstellungen();
		dienst = erstelleLoginDienst({
			db: holeDb(),
			schluessel: einstellungen.codeSchluessel,
			kontakt: einstellungen.kontakt,
			mailer: leiteUm(
				erstelleSmtpMailer(einstellungen.smtpUrl, einstellungen.mailAbsender),
				einstellungen.mailNurAn
			),
			bremsen: holeBremsen()
		});
	}
	return dienst;
}

export function holePasskeyDienst(): PasskeyDienst {
	if (!passkeyDienst) {
		passkeyDienst = erstellePasskeyDienst({
			db: holeDb(),
			pruefer: erstelleSimpleWebAuthnPruefer(),
			bremsen: holeBremsen(),
			challenges: new ChallengeSpeicher()
		});
	}
	return passkeyDienst;
}
