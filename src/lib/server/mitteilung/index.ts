import { holeAdminDienste } from '../admin/index.ts';
import { holeDb } from '../db/index.ts';
import { leseEinstellungen } from '../einstellungen.ts';
import { erstelleSmtpMailer, leiteUm } from '../login/mail.ts';
import type { MitteilungAdminDienste, MitteilungDienste } from './schnittstellen.ts';
import { MAILS_GLEICHZEITIG } from './versand.ts';
import { erstelleWebPush, kontaktFuerPush } from './web-push.ts';

let dienste: MitteilungDienste | undefined;
let adminDienste: MitteilungAdminDienste | undefined;

export function holeMitteilungDienste(): MitteilungDienste {
	dienste ??= {
		db: holeDb(),
		vapidOeffentlich: leseEinstellungen().vapid?.oeffentlich ?? null
	};
	return dienste;
}

// Träge erzeugter Einzelfall. Zugang und Datenbank wie die übrige Verwaltung; ein eigener Mailer
// mit offenen SMTP-Verbindungen (Pool), weil eine Mitteilung Hunderte Mails auf einmal schickt.
export function holeMitteilungAdminDienste(): MitteilungAdminDienste {
	if (!adminDienste) {
		const e = leseEinstellungen();
		const smtp = { url: e.smtpUrl, pool: true, maxConnections: MAILS_GLEICHZEITIG };
		adminDienste = {
			...holeAdminDienste(),
			// SI-22: Ohne VAPID-Paar ist Push aus, Mitteilungen gehen per E-Mail.
			push: e.vapid ? erstelleWebPush(e.vapid, kontaktFuerPush(e.adresse, e.mailAbsender)) : null,
			mailer: leiteUm(erstelleSmtpMailer(smtp, e.mailAbsender), e.mailNurAn),
			adresse: e.adresse
		};
	}
	return adminDienste;
}
