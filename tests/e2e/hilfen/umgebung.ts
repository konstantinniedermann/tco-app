// Umgebung der E2E-Tests: playwright.config.ts gibt sie dem Server, die Hilfen im Testprozess
// lesen dieselben Werte (gleicher Code-Schlüssel, gleiche Datenbank). Standardwerte wie in
// .env.example; jede Variable lässt sich aus der Umgebung überschreiben (CI).

export const DATENBANK_URL =
	process.env.DATABASE_URL ?? 'postgres://mytco:mytco_lokal@localhost:55432/mytco';

/** HTTP-API von Mailpit (docker-compose.yml, Service `mail`); in der CI über den Service-Namen. */
export const MAILPIT_URL = process.env.MAILPIT_URL || 'http://localhost:58025';

const STANDARD = {
	MYTCO_CODE_SCHLUESSEL: 'nur-lokal-nicht-fuer-produktion-0123456789abcdef',
	// IP statt «localhost»: Mailpit lauscht nur auf 127.0.0.1, und wie nodemailer «localhost»
	// auflöst, hängt vom DNS des Netzes ab (in manchen Netzen landet es auf ::1).
	MYTCO_SMTP_URL: 'smtp://127.0.0.1:51025',
	MYTCO_MAIL_ABSENDER: 'MyTCO <mytco@example.org>',
	MYTCO_KONTAKT: 'das Sekretariat (erfunden), sekretariat@example.org',
	// Das Beispiel-Paar aus .env.example (SI-22): Mit Schlüssel zeigt die App Push an. Echt
	// abonniert wird im E2E nicht, der Push-Dienst ist in der CI nicht erreichbar.
	MYTCO_VAPID_OEFFENTLICH:
		'BCUfPbrWschrERMITs9b_aJhHWZSvc7oWyUHpVd_omS5ejcBc5z7q2beiy7XknqCc5dnOM7olJiRPqYTc66ltm4', // gitleaks:allow
	MYTCO_VAPID_PRIVAT: 'AlluMnyXOTzUIJlj8DqJ8fyieKtuVOMsa0u-fKAuKxI' // gitleaks:allow
};

export type E2eEinstellungen = typeof STANDARD & { MYTCO_ADRESSE: string };

/** `adresse` ist die baseURL der Tests; dorthin zeigen Links in Mails und Briefen. */
export function e2eEinstellungen(adresse: string): E2eEinstellungen {
	const env = process.env;
	return {
		MYTCO_CODE_SCHLUESSEL: env.MYTCO_CODE_SCHLUESSEL || STANDARD.MYTCO_CODE_SCHLUESSEL,
		MYTCO_SMTP_URL: env.MYTCO_SMTP_URL || STANDARD.MYTCO_SMTP_URL,
		MYTCO_MAIL_ABSENDER: env.MYTCO_MAIL_ABSENDER || STANDARD.MYTCO_MAIL_ABSENDER,
		MYTCO_KONTAKT: env.MYTCO_KONTAKT || STANDARD.MYTCO_KONTAKT,
		MYTCO_VAPID_OEFFENTLICH: env.MYTCO_VAPID_OEFFENTLICH || STANDARD.MYTCO_VAPID_OEFFENTLICH,
		MYTCO_VAPID_PRIVAT: env.MYTCO_VAPID_PRIVAT || STANDARD.MYTCO_VAPID_PRIVAT,
		MYTCO_ADRESSE: env.MYTCO_ADRESSE || adresse
	};
}
