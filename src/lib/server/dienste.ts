// Zusammenbau der Dienste (B-13): Hier entstehen die Einzelstücke, die über Anfragen hinweg leben,
// und die Versender. Oberste Schicht: Diese Datei darf jedes Modul importieren, und kein Modul unter
// src/lib/server/ importiert sie (eslint.config.js); sie holen nur Routen, der Hook und Tests.
//
// Exportiert sind genau die neun Einstiege. Bremsen und Versender bleiben privat: Die Bauregel
// verbietet ausserhalb von api/admin/ nur die Einstiege der Verwaltung, nicht weitere Namen.
//
// Alles entsteht träge beim ersten Aufruf und wird erst nach gelungenem Bau gemerkt: Wirft
// `leseEinstellungen`, versucht es der nächste Aufruf neu. Beim Laden der Datei entsteht nichts,
// denn `init` im Hook läuft auch beim Bauen, und dort gibt es die Einstellungen nicht.
import { erstelleHinweis } from './admin/hinweis-mail.ts';
import type { AdminDienste } from './admin/rechte.ts';
import { erstelleZugangDienst } from './admin/zugang.ts';
import type { AnlassDienste } from './anlass/typen.ts';
import type { InterclubDienste } from './interclub/typen.ts';
import { erstelleBestaetigung } from './cm/mail.ts';
import type { CmDienste } from './cm/typen.ts';
import { holeDb } from './db/index.ts';
import { leseEinstellungen, type Einstellungen } from './einstellungen.ts';
import { erstelleBremsen, type Bremsen } from './login/bremse.ts';
import { ChallengeSpeicher } from './login/challenge.ts';
import { erstelleLoginDienst, type LoginDienst, type Mailer } from './login/dienst.ts';
import { erstelleSmtpMailer, leiteUm } from './login/mail.ts';
import { erstelleSimpleWebAuthnPruefer } from './login/passkey-pruefer.ts';
import { erstellePasskeyDienst, type PasskeyDienst } from './login/passkey.ts';
import { meldeMitgliedern } from './mitteilung/meldung.ts';
import type { MitteilungAdminDienste, MitteilungDienste } from './mitteilung/typen.ts';
import { MAILS_GLEICHZEITIG, type PushSender } from './mitteilung/versand.ts';
import { erstelleWebPush, kontaktFuerPush } from './mitteilung/web-push.ts';
import { erstelleEmailWechselDienst } from './profil/email-wechsel.ts';
import type { ProfilDienste } from './profil/typen.ts';

// ---- Privat: Bremsen und Versender ----

let bremsen: Bremsen | undefined;
let mailer: Mailer | undefined;
let poolMailer: Mailer | undefined;
/** `undefined`: noch nicht gebaut; `null`: ohne VAPID-Paar ist Push aus. */
let push: PushSender | null | undefined;

// Eine Instanz für Login, Passkey, Zugang und Hinweis der Verwaltung und den Wechsel der Adresse im
// Profil: Jeder Dienst zählt eigene Fehlversuche, nur die Instanz ist geteilt (die Grenzen je
// Adresse und je IP zählen über alle Wege zusammen, SI-04, SI-09).
function holeBremsen(): Bremsen {
	bremsen ??= erstelleBremsen();
	return bremsen;
}

// SI-17: Die einzige Stelle, an der ein Mail-Versender entsteht; auf Test leitet `MAIL_NUR_AN` jede
// Mail um.
function baueMailer(transport: string | object, e: Einstellungen): Mailer {
	return leiteUm(erstelleSmtpMailer(transport, e.mailAbsender), e.mailNurAn);
}

// Der Versender für einzelne Mails: Codes, Hinweis, Bestätigung der CM-Anmeldung und Meldungen an
// Einzelne, die Mitglieder auslösen (FR-47). Es sind wenige, ein Pool lohnt nicht.
function holeMailer(e: Einstellungen): Mailer {
	mailer ??= baueMailer(e.smtpUrl, e);
	return mailer;
}

// Der Versender der Mitteilungs-Verwaltung, mit offenen SMTP-Verbindungen (Pool), weil eine
// Mitteilung Hunderte Mails auf einmal schickt.
function holePoolMailer(e: Einstellungen): Mailer {
	poolMailer ??= baueMailer({ url: e.smtpUrl, pool: true, maxConnections: MAILS_GLEICHZEITIG }, e);
	return poolMailer;
}

// SI-22: Ohne VAPID-Paar ist Push aus, Mitteilungen und Meldungen gehen per E-Mail.
function holePush(e: Einstellungen): PushSender | null {
	if (push === undefined) {
		push = e.vapid ? erstelleWebPush(e.vapid, kontaktFuerPush(e.adresse, e.mailAbsender)) : null;
	}
	return push;
}

// ---- Einstiege ----

let loginDienst: LoginDienst | undefined;
let passkeyDienst: PasskeyDienst | undefined;
let adminDienste: AdminDienste | undefined;
let mitteilungAdminDienste: MitteilungAdminDienste | undefined;
let profilDienste: ProfilDienste | undefined;
let cmDienste: CmDienste | undefined;
let mitteilungDienste: MitteilungDienste | undefined;
let anlassDienste: AnlassDienste | undefined;
let interclubDienste: InterclubDienste | undefined;

export function holeLoginDienst(): LoginDienst {
	if (!loginDienst) {
		const e = leseEinstellungen();
		loginDienst = erstelleLoginDienst({
			db: holeDb(),
			schluessel: e.codeSchluessel,
			kontakt: e.kontakt,
			mailer: holeMailer(e),
			bremsen: holeBremsen()
		});
	}
	return loginDienst;
}

// Die offenen Anfragen liegen im Arbeitsspeicher: «Optionen» und «Einlösen» sind zwei Anfragen.
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

export function holeAdminDienste(): AdminDienste {
	if (!adminDienste) {
		const e = leseEinstellungen();
		const db = holeDb();
		const m = holeMailer(e);
		const b = holeBremsen();
		adminDienste = {
			db,
			zugang: erstelleZugangDienst({
				db,
				schluessel: e.codeSchluessel,
				kontakt: e.kontakt,
				mailer: m,
				bremsen: b
			}),
			hinweis: erstelleHinweis({ mailer: m, kontakt: e.kontakt, bremsen: b }),
			brief: { schluessel: e.codeSchluessel, adresse: e.adresse, kontakt: e.kontakt }
		};
	}
	return adminDienste;
}

// Ein eigenes Objekt neben `holeAdminDienste`: Zugang und Datenbank wie die übrige Verwaltung, dazu
// Push, der Versender mit Pool und die Adresse für die Links.
export function holeMitteilungAdminDienste(): MitteilungAdminDienste {
	if (!mitteilungAdminDienste) {
		const e = leseEinstellungen();
		mitteilungAdminDienste = {
			...holeAdminDienste(),
			push: holePush(e),
			mailer: holePoolMailer(e),
			adresse: e.adresse
		};
	}
	return mitteilungAdminDienste;
}

// Der Wechselspeicher liegt im Arbeitsspeicher: «Starten» und «Bestätigen» sind zwei Anfragen.
export function holeProfilDienste(): ProfilDienste {
	if (!profilDienste) {
		const e = leseEinstellungen();
		const db = holeDb();
		profilDienste = {
			db,
			wechsel: erstelleEmailWechselDienst({
				db,
				schluessel: e.codeSchluessel,
				kontakt: e.kontakt,
				mailer: holeMailer(e),
				bremsen: holeBremsen()
			})
		};
	}
	return profilDienste;
}

// Die Bestätigungsmail läuft ohne Bremsen: Sie zählt nicht gegen die Code-Grenzen (SI-04).
export function holeCmDienste(): CmDienste {
	if (!cmDienste) {
		const e = leseEinstellungen();
		const m = holeMailer(e);
		const db = holeDb();
		// Reihenfolge wie bisher: Versender, Datenbank, Push.
		const melder = { db, push: holePush(e), mailer: m, adresse: e.adresse };
		cmDienste = {
			db,
			bestaetigung: erstelleBestaetigung({ mailer: m, kontakt: e.kontakt }),
			melde: (ids, meldung) => meldeMitgliedern(melder, ids, meldung)
		};
	}
	return cmDienste;
}

export function holeMitteilungDienste(): MitteilungDienste {
	mitteilungDienste ??= {
		db: holeDb(),
		vapidOeffentlich: leseEinstellungen().vapid?.oeffentlich ?? null
	};
	return mitteilungDienste;
}

export function holeAnlassDienste(): AnlassDienste {
	anlassDienste ??= { db: holeDb() };
	return anlassDienste;
}

export function holeInterclubDienste(): InterclubDienste {
	interclubDienste ??= { db: holeDb() };
	return interclubDienste;
}
