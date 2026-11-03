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
