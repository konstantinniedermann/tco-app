// Umgebung der E2E-Tests: playwright.config.ts gibt sie dem Server, die Hilfen im Testprozess
// lesen dieselben Werte (gleicher Code-Schlüssel, gleiche Datenbank). Standardwerte wie in
// .env.example; jede Variable lässt sich aus der Umgebung überschreiben (CI).

export const DATENBANK_URL =
	process.env.DATABASE_URL ?? 'postgres://mytco:mytco_lokal@localhost:55432/mytco';

/** HTTP-API von Mailpit (docker-compose.yml, Service `mail`). */
export const MAILPIT_URL = 'http://localhost:58025';

const STANDARD = {
	MYTCO_CODE_SCHLUESSEL: 'nur-lokal-nicht-fuer-produktion-0123456789abcdef',
	MYTCO_SMTP_URL: 'smtp://localhost:51025',
	MYTCO_MAIL_ABSENDER: 'MyTCO <mytco@example.org>',
	MYTCO_KONTAKT: 'das Sekretariat (erfunden), sekretariat@example.org'
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
		MYTCO_ADRESSE: env.MYTCO_ADRESSE || adresse
	};
}
