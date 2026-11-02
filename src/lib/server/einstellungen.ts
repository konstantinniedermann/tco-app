export type Einstellungen = {
	/** Geheimer Schlüssel für die Code-Verarbeitung, mindestens 32 Zeichen. */
	codeSchluessel: string;
	/** Annahme K-11: Versand über einen austauschbaren SMTP-Zugang (URL), Anbieter offen */
	smtpUrl: string;
	mailAbsender: string;
	/** Annahme K-21: Ansprechperson bei Login-Problemen ist eine Einstellung */
	kontakt: string;
	/** Annahme K-10: App-Adresse my.tcolten.ch */
	adresse: string;
};

/** Annahme K-10: App-Adresse my.tcolten.ch, wenn MYTCO_ADRESSE fehlt */
export const STANDARD_ADRESSE = 'https://my.tcolten.ch';

/** Schlüssel aus `.env.example`; öffentlich im Repo, darum in Produktion verboten. */
export const BEISPIEL_SCHLUESSEL = 'nur-lokal-nicht-fuer-produktion-0123456789abcdef';

/**
 * process.env statt `$app/env/private`, Begründung wie bei `holeDb` in `db/index.ts`.
 * Fehlertexte nennen nur den Namen der Variablen, nie ihren Wert (SI-05).
 */
export function leseEinstellungen(
	env: Record<string, string | undefined> = process.env
): Einstellungen {
	const codeSchluessel = env.MYTCO_CODE_SCHLUESSEL;
	if (!codeSchluessel || codeSchluessel.length < 32) {
		throw new Error('MYTCO_CODE_SCHLUESSEL fehlt oder ist kürzer als 32 Zeichen');
	}
	if (env.NODE_ENV === 'production' && codeSchluessel === BEISPIEL_SCHLUESSEL) {
		throw new Error('MYTCO_CODE_SCHLUESSEL ist der Beispielwert aus .env.example');
	}
	return {
		codeSchluessel,
		smtpUrl: pflicht(env, 'MYTCO_SMTP_URL'),
		mailAbsender: pflicht(env, 'MYTCO_MAIL_ABSENDER'),
		kontakt: pflicht(env, 'MYTCO_KONTAKT'),
		adresse: env.MYTCO_ADRESSE || STANDARD_ADRESSE
	};
}

function pflicht(env: Record<string, string | undefined>, name: string): string {
	const wert = env[name];
	if (!wert) throw new Error(`${name} fehlt`);
	return wert;
}
