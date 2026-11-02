import { describe, expect, test, vi } from 'vitest';
import { baueCodeMail, erstelleSmtpMailer } from './mail.ts';

// Hält die Nachrichten fest, die nodemailer mit jsonTransport tatsächlich baut.
const gebaut = vi.hoisted(() => [] as { message: string }[]);

vi.mock('nodemailer', async (original) => {
	const echt = await original<typeof import('nodemailer')>();
	const createTransport = (...args: Parameters<typeof echt.default.createTransport>) => {
		const transporter = echt.default.createTransport(...args);
		const sendMail = transporter.sendMail.bind(transporter);
		transporter.sendMail = (async (...a: Parameters<typeof sendMail>) => {
			const info = await sendMail(...a);
			gebaut.push(info as unknown as { message: string });
			return info;
		}) as typeof transporter.sendMail;
		return transporter;
	};
	return { default: { ...echt.default, createTransport } };
});

describe('baueCodeMail', () => {
	test('Betreff, Text beginnt mit dem Code, ohne Link', () => {
		const { betreff, text } = baueCodeMail('123456');
		expect(betreff).toBe('Dein Code für MyTCO');
		expect(text.startsWith('123456')).toBe(true);
		expect(text).toContain('15 Minuten');
		expect(text).toContain(
			'Hast du keinen Code angefordert? Dann kannst du diese Mail ignorieren.'
		);
		expect(text).not.toContain('http');
	});
});

describe('erstelleSmtpMailer', () => {
	test('verschickt from, to, subject und text, ohne html', async () => {
		const mailer = erstelleSmtpMailer({ jsonTransport: true }, 'MyTCO <absender@example.org>');
		await mailer({ an: 'mitglied@example.org', betreff: 'Betreff', text: 'Inhalt 123456' });
		expect(gebaut).toHaveLength(1);
		const nachricht = JSON.parse(gebaut[0].message);
		expect(nachricht.from).toEqual({ name: 'MyTCO', address: 'absender@example.org' });
		expect(nachricht.to).toEqual([{ address: 'mitglied@example.org', name: '' }]);
		expect(nachricht.subject).toBe('Betreff');
		expect(nachricht.text).toBe('Inhalt 123456');
		expect(nachricht.html).toBeUndefined();
	});
});
