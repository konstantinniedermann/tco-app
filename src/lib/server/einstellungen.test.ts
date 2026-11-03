import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { BEISPIEL_SCHLUESSEL, leseEinstellungen } from './einstellungen.ts';

const schluessel = 'k'.repeat(32);
const vollstaendig = {
	MYTCO_CODE_SCHLUESSEL: schluessel,
	MYTCO_SMTP_URL: 'smtp://mail.example.org:25',
	MYTCO_MAIL_ABSENDER: 'MyTCO <mytco@example.org>',
	MYTCO_KONTAKT: 'das Sekretariat (erfunden), sekretariat@example.org',
	MYTCO_ADRESSE: 'http://localhost:5173'
};

describe('leseEinstellungen', () => {
	test('wirft ohne MYTCO_CODE_SCHLUESSEL', () => {
		const ohne = { ...vollstaendig, MYTCO_CODE_SCHLUESSEL: undefined };
		expect(() => leseEinstellungen(ohne)).toThrow(
			'MYTCO_CODE_SCHLUESSEL fehlt oder ist kürzer als 32 Zeichen'
		);
	});

	test('wirft bei einem Schlüssel mit 31 Zeichen', () => {
		const env = { ...vollstaendig, MYTCO_CODE_SCHLUESSEL: 'k'.repeat(31) };
		expect(() => leseEinstellungen(env)).toThrow(
			'MYTCO_CODE_SCHLUESSEL fehlt oder ist kürzer als 32 Zeichen'
		);
	});

	test('Beispielschlüssel steht so in .env.example', () => {
		expect(readFileSync('.env.example', 'utf-8')).toContain(
			`MYTCO_CODE_SCHLUESSEL=${BEISPIEL_SCHLUESSEL}\n`
		);
	});

	test('wirft in Produktion beim Beispielschlüssel; der Fehlertext nennt keinen Wert', () => {
		const env = {
			...vollstaendig,
			MYTCO_CODE_SCHLUESSEL: BEISPIEL_SCHLUESSEL,
			NODE_ENV: 'production'
		};
		expect(() => leseEinstellungen(env)).toThrow(
			new Error('MYTCO_CODE_SCHLUESSEL ist der Beispielwert aus .env.example')
		);
	});

	test('nimmt den Beispielschlüssel ausserhalb von Produktion an', () => {
		for (const NODE_ENV of [undefined, 'development', 'test']) {
			const env = { ...vollstaendig, MYTCO_CODE_SCHLUESSEL: BEISPIEL_SCHLUESSEL, NODE_ENV };
			expect(leseEinstellungen(env).codeSchluessel).toBe(BEISPIEL_SCHLUESSEL);
		}
	});

	test('nimmt in Produktion einen eigenen Schlüssel an', () => {
		const env = {
			...vollstaendig,
			MYTCO_SMTP_URL: 'smtps://mail.example.org:465',
			NODE_ENV: 'production'
		};
		expect(leseEinstellungen(env).codeSchluessel).toBe(schluessel);
	});

	test('Standardadresse ist https://my.tcolten.ch', () => {
		const ohne = { ...vollstaendig, MYTCO_ADRESSE: undefined };
		expect(leseEinstellungen(ohne).adresse).toBe('https://my.tcolten.ch');
	});

	test('liest alle Werte', () => {
		expect(leseEinstellungen(vollstaendig)).toEqual({
			codeSchluessel: schluessel,
			smtpUrl: 'smtp://mail.example.org:25',
			mailAbsender: 'MyTCO <mytco@example.org>',
			kontakt: 'das Sekretariat (erfunden), sekretariat@example.org',
			adresse: 'http://localhost:5173'
		});
	});

	test.each(['MYTCO_SMTP_URL', 'MYTCO_MAIL_ABSENDER', 'MYTCO_KONTAKT'])(
		'%s ist Pflicht; der Fehlertext nennt nur den Namen, nie einen Wert',
		(name) => {
			for (const wert of [undefined, '']) {
				const env = { ...vollstaendig, [name]: wert };
				expect(() => leseEinstellungen(env)).toThrow(new Error(`${name} fehlt`));
			}
		}
	);

	describe('MAIL_NUR_AN', () => {
		test('ohne Angabe oder leer ist mailNurAn undefined', () => {
			expect(leseEinstellungen(vollstaendig).mailNurAn).toBeUndefined();
			expect(leseEinstellungen({ ...vollstaendig, MAIL_NUR_AN: '' }).mailNurAn).toBeUndefined();
		});

		test('nimmt eine Adresse an', () => {
			const env = { ...vollstaendig, MAIL_NUR_AN: 'pl@example.org' };
			expect(leseEinstellungen(env).mailNurAn).toBe('pl@example.org');
		});

		test('wirft bei einem Wert ohne Adresse; der Fehlertext nennt keinen Wert', () => {
			const env = { ...vollstaendig, MAIL_NUR_AN: 'keine adresse' };
			expect(() => leseEinstellungen(env)).toThrow(new Error('MAIL_NUR_AN ist keine Mail-Adresse'));
		});
	});

	describe('TLS-Pflicht in Produktion', () => {
		const prod = (MYTCO_SMTP_URL: string) => ({
			...vollstaendig,
			MYTCO_SMTP_URL,
			NODE_ENV: 'production'
		});
		const fehler = new Error('MYTCO_SMTP_URL ohne TLS (smtps:// oder requireTLS=true)');

		test.each(['smtp://mail.example.org:587', 'smtp://mail.example.org:587?requireTLS=false'])(
			'weist %s ab',
			(url) => {
				expect(() => leseEinstellungen(prod(url))).toThrow(fehler);
			}
		);

		test.each([
			'smtps://mail.example.org:465',
			'smtp://mail.example.org:587?requireTLS=true',
			'SMTPS://MAIL.EXAMPLE.ORG'
		])('nimmt %s an', (url) => {
			expect(leseEinstellungen(prod(url)).smtpUrl).toBe(url);
		});

		test.each([
			'smtp://localhost:51025',
			'smtp://127.0.0.1:25',
			'smtp://[::1]:25',
			'smtp://mail.invalid:25'
		])('nimmt %s ohne TLS an (Ausnahme: nie ein echter Empfänger)', (url) => {
			expect(leseEinstellungen(prod(url)).smtpUrl).toBe(url);
		});

		test('ausserhalb von Produktion ist smtp:// ohne TLS erlaubt', () => {
			const env = { ...vollstaendig, MYTCO_SMTP_URL: 'smtp://mail.example.org:25' };
			expect(leseEinstellungen(env).smtpUrl).toBe('smtp://mail.example.org:25');
		});
	});
});
