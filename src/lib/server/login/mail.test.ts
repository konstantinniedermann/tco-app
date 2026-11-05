import { describe, expect, test, vi } from 'vitest';
import {
	baueAdresseVergebenMail,
	baueCodeMail,
	baueWechselCodeMail,
	erstelleSmtpMailer,
	leiteUm
} from './mail.ts';
import type { Mailer } from './dienst.ts';

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

describe('baueWechselCodeMail', () => {
	test('SI-09: Mail an die bisherige Adresse nennt Code und «bisherige»', () => {
		const { betreff, text } = baueWechselCodeMail('123456', 'alt');
		expect(betreff).not.toBe('');
		expect(text.startsWith('123456')).toBe(true);
		expect(text).toContain('bisherige');
		expect(text).toContain('15 Minuten');
		expect(text).not.toContain('http');
		expect(text).not.toContain('ß');
	});

	test('SI-09: Mail an die neue Adresse nennt Code und «neue»', () => {
		const { text } = baueWechselCodeMail('654321', 'neu');
		expect(text.startsWith('654321')).toBe(true);
		expect(text).toContain('neue Adresse');
		expect(text).not.toContain('http');
	});
});

describe('baueAdresseVergebenMail', () => {
	test('SI-04: Hinweis ohne Code, mit Kontakt', () => {
		const { betreff, text } = baueAdresseVergebenMail('kontakt@example.org');
		expect(betreff).not.toBe('');
		expect(text).not.toMatch(/\d{6}/);
		expect(text).toContain('schon in Gebrauch');
		expect(text).toContain('kontakt@example.org');
		expect(text).not.toContain('ß');
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

describe('leiteUm', () => {
	const sammler = () => {
		const aufrufe: Parameters<Mailer>[0][] = [];
		const mailer: Mailer = async (n) => {
			aufrufe.push(n);
		};
		return { aufrufe, mailer };
	};

	test('ohne Ziel bleibt der Mailer unverändert', () => {
		const { mailer } = sammler();
		expect(leiteUm(mailer, undefined)).toBe(mailer);
	});

	test('mit Ziel geht die Mail an das Ziel, der Betreff nennt den ursprünglichen Empfänger', async () => {
		const { aufrufe, mailer } = sammler();
		await leiteUm(
			mailer,
			'pl@example.org'
		)({
			an: 'erika.beispiel@example.org',
			betreff: 'Dein Code für MyTCO',
			text: 'x'
		});
		expect(aufrufe).toEqual([
			{
				an: 'pl@example.org',
				betreff: '[Test für erika.beispiel@example.org] Dein Code für MyTCO',
				text: 'x'
			}
		]);
	});
});
