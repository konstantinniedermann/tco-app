import { describe, expect, it } from 'vitest';
import { ERFUNDENE_MITGLIEDER } from './erfundene-mitglieder.ts';
import { baueBriefCodeMail, testdatenVerweigert } from './testdaten.ts';

describe('Sperre der Testdaten', () => {
	it('verweigert ohne MAIL_NUR_AN (Live)', () => {
		expect(testdatenVerweigert({}, 0)).toBe('MAIL_NUR_AN fehlt: testdaten laufen nur auf Test');
	});

	it.each(['', '  '])('verweigert mit leerem MAIL_NUR_AN %j', (wert) => {
		expect(testdatenVerweigert({ MAIL_NUR_AN: wert }, 0)).toBe(
			'MAIL_NUR_AN fehlt: testdaten laufen nur auf Test'
		);
	});

	it('verweigert, wenn schon Mitglieder da sind (zweiter Lauf)', () => {
		expect(testdatenVerweigert({ MAIL_NUR_AN: 'pl@example.org' }, 3)).toBe(
			'Mitglieder schon vorhanden: testdaten laufen nur auf einer leeren Datenbank'
		);
	});

	it('erlaubt auf Test mit leerer Datenbank', () => {
		expect(testdatenVerweigert({ MAIL_NUR_AN: 'pl@example.org' }, 0)).toBeNull();
	});
});

describe('Mail mit dem Brief-Code', () => {
	const mail = baueBriefCodeMail(
		'ABCDEFGHJK',
		new Date('2027-01-31T12:00:00Z'),
		'https://test.example.org'
	);

	it('hat einen festen Betreff', () => {
		expect(mail.betreff).toBe('Brief-Code für die Test-Umgebung');
	});

	it('nennt den formatierten Code, die Gültigkeit wie im Brief und die Adresse', () => {
		expect(mail.text).toContain('ABCDE-FGHJK');
		expect(mail.text).toContain('gültig bis 31.01.2027');
		expect(mail.text).toContain('https://test.example.org');
	});
});

describe('Erfundene Mitglieder', () => {
	it('haben nur Adressen unter example.org (DS-08)', () => {
		expect(ERFUNDENE_MITGLIEDER.length).toBeGreaterThanOrEqual(2);
		for (const m of ERFUNDENE_MITGLIEDER) expect(m.email).toMatch(/^[a-z.]+@example\.org$/);
	});

	it('beginnen mit Erika Beispiel, an die der Brief-Code geht', () => {
		expect(ERFUNDENE_MITGLIEDER[0].email).toBe('erika.beispiel@example.org');
	});
});
