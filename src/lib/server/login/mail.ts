import nodemailer from 'nodemailer';
import type { Mailer } from './dienst.ts';

export function baueCodeMail(code: string): { betreff: string; text: string } {
	return {
		betreff: 'Dein Code für MyTCO',
		text: [
			`${code} ist dein Code für MyTCO.`,
			'',
			'Der Code gilt 15 Minuten und nur einmal. Gib ihn auf der Anmeldeseite ein.',
			'',
			'Hast du keinen Code angefordert? Dann kannst du diese Mail ignorieren.'
		].join('\n')
	};
}

// SI-09: Je ein Code an die bisherige und an die neue Adresse; erst beide zusammen ändern die Adresse.
export function baueWechselCodeMail(
	code: string,
	art: 'alt' | 'neu'
): { betreff: string; text: string } {
	const fuer = art === 'alt' ? 'die bisherige Adresse' : 'die neue Adresse';
	const anderer = art === 'alt' ? 'an deine neue Adresse' : 'an deine bisherige Adresse';
	return {
		betreff: 'Dein Code für die Änderung deiner E-Mail-Adresse bei MyTCO',
		text: [
			`${code} ist dein Code für ${fuer}.`,
			'',
			`Du willst deine E-Mail-Adresse bei MyTCO ändern. Gib diesen Code im Feld für ${fuer} ein, zusammen mit dem Code, der ${anderer} ging.`,
			'',
			'Der Code gilt 15 Minuten und nur einmal.',
			'',
			'Hast du keine Änderung angefordert? Dann kannst du diese Mail ignorieren, deine Adresse bleibt, wie sie ist.'
		].join('\n')
	};
}

// SI-04: Geht statt eines Codes an eine neue Adresse, die schon einem anderen Mitglied gehört.
export function baueAdresseVergebenMail(kontakt: string): { betreff: string; text: string } {
	return {
		betreff: 'Änderung der E-Mail-Adresse bei MyTCO nicht möglich',
		text: [
			'Jemand wollte diese Adresse bei MyTCO als neue E-Mail-Adresse eintragen.',
			'',
			'Diese Adresse ist bei MyTCO schon in Gebrauch, eine Änderung ist nicht möglich.',
			'',
			`Hast du Fragen dazu? Dann melde dich bei ${kontakt}.`
		].join('\n')
	};
}

// Annahme K-11: Versand über einen austauschbaren SMTP-Zugang (URL), Anbieter offen
export function erstelleSmtpMailer(transport: string | object, absender: string): Mailer {
	const transporter = nodemailer.createTransport(transport);
	return async ({ an, betreff, text }) => {
		await transporter.sendMail({ from: absender, to: an, subject: betreff, text });
	};
}

// Test-Umgebung: jede Mail geht an das Ziel, der Betreff nennt den ursprünglichen Empfänger.
export function leiteUm(mailer: Mailer, ziel: string | undefined): Mailer {
	if (!ziel) return mailer;
	return ({ an, betreff, text }) =>
		mailer({ an: ziel, betreff: `[Test für ${an}] ${betreff}`, text });
}
