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
	/** Nur Test: alle Mails gehen an diese eine Adresse. Auf Live leer (undefined). */
	mailNurAn: string | undefined;
	/** SI-22: VAPID-Schlüsselpaar für Push. Ohne Paar ist Push aus, Mitteilungen gehen per E-Mail. */
	vapid: { oeffentlich: string; privat: string } | undefined;
};

/** Annahme K-10: App-Adresse my.tcolten.ch, wenn MYTCO_ADRESSE fehlt */
export const STANDARD_ADRESSE = 'https://my.tcolten.ch';

/** Schlüssel aus `.env.example`; öffentlich im Repo, darum in Produktion verboten. */
export const BEISPIEL_SCHLUESSEL = 'nur-lokal-nicht-fuer-produktion-0123456789abcdef';

/** Öffentlicher VAPID-Schlüssel aus `.env.example`; im Repo bekannt, darum in Produktion verboten. */
export const BEISPIEL_VAPID_OEFFENTLICH =
	'BCUfPbrWschrERMITs9b_aJhHWZSvc7oWyUHpVd_omS5ejcBc5z7q2beiy7XknqCc5dnOM7olJiRPqYTc66ltm4'; // gitleaks:allow

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
	const smtpUrl = pflicht(env, 'MYTCO_SMTP_URL');
	if (env.NODE_ENV === 'production' && !tlsErzwungen(smtpUrl)) {
		throw new Error('MYTCO_SMTP_URL ohne TLS (smtps:// oder requireTLS=true)');
	}
	const mailNurAn = env.MAIL_NUR_AN?.trim() || undefined;
	// Genau eine nackte Adresse: keine Listentrenner (, ;) und keine Form «Name <a@b>».
	if (mailNurAn !== undefined && !/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(mailNurAn)) {
		throw new Error('MAIL_NUR_AN ist keine Mail-Adresse');
	}
	const vapid = leseVapid(env, env.NODE_ENV === 'production');
	return {
		codeSchluessel,
		smtpUrl,
		mailAbsender: pflicht(env, 'MYTCO_MAIL_ABSENDER'),
		kontakt: pflicht(env, 'MYTCO_KONTAKT'),
		adresse: env.MYTCO_ADRESSE || STANDARD_ADRESSE,
		mailNurAn,
		vapid
	};
}

/** Beide leer: Push aus. Beide gesetzt: je base64url. Fehlertexte nennen nie den Wert (SI-05). */
function leseVapid(
	env: Record<string, string | undefined>,
	produktion: boolean
): Einstellungen['vapid'] {
	const oeffentlich = env.MYTCO_VAPID_OEFFENTLICH?.trim() || undefined;
	const privat = env.MYTCO_VAPID_PRIVAT?.trim() || undefined;
	if (oeffentlich === undefined && privat === undefined) return undefined;
	if (oeffentlich === undefined || privat === undefined) {
		throw new Error('MYTCO_VAPID_OEFFENTLICH und MYTCO_VAPID_PRIVAT nur zusammen');
	}
	// P-256: öffentlicher Schlüssel 65 Byte (87 Zeichen), privater 32 Byte (43 Zeichen).
	for (const [name, wert, laenge] of [
		['MYTCO_VAPID_OEFFENTLICH', oeffentlich, 87],
		['MYTCO_VAPID_PRIVAT', privat, 43]
	] as const) {
		if (!/^[A-Za-z0-9_-]+$/.test(wert)) throw new Error(`${name} ist nicht base64url`);
		if (wert.length !== laenge) throw new Error(`${name} hat nicht ${laenge} Zeichen`);
	}
	if (produktion && oeffentlich === BEISPIEL_VAPID_OEFFENTLICH) {
		throw new Error('MYTCO_VAPID_OEFFENTLICH ist der Beispielwert aus .env.example');
	}
	return { oeffentlich, privat };
}

function pflicht(env: Record<string, string | undefined>, name: string): string {
	const wert = env[name];
	if (!wert) throw new Error(`${name} fehlt`);
	return wert;
}

/**
 * TLS ist erzwungen bei `smtps:` oder bei `smtp:` mit `requireTLS=true` (nodemailer wandelt
 * Query-Werte `true`/`false` in Booleans, `parseConnectionUrl`). Ausnahme ohne TLS nur für
 * Hosts, die nie zu einem echten Empfänger führen: Loopback und `.invalid` (RFC 2606, löst
 * nie auf). So kann auf Live keine echte Mail unverschlüsselt rausgehen, während das
 * Produktions-Image gegen `smtp://mail.invalid:25` und lokale Mailpit-Instanzen laufen kann.
 */
function tlsErzwungen(smtpUrl: string): boolean {
	let url: URL;
	try {
		url = new URL(smtpUrl);
	} catch {
		return false;
	}
	if (url.protocol === 'smtps:') return true;
	if (url.protocol !== 'smtp:') return false;
	if (url.searchParams.get('requireTLS') === 'true') return true;
	const host = url.hostname;
	return (
		host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.invalid')
	);
}
