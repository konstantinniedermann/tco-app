import { describe, expect, it } from 'vitest';
import { PRUEFKONTEN } from './pruefkonten.ts';
import { pruefungVerweigert } from './test-pruefung-server.ts';

describe('pruefungVerweigert', () => {
	it('verweigert ohne MAIL_NUR_AN: Das Image läuft auch auf Live', () => {
		expect(pruefungVerweigert({ DATABASE_URL: 'postgres://x' })).toBe('verweigert (nur Test)');
		expect(pruefungVerweigert({ MAIL_NUR_AN: '  ', DATABASE_URL: 'postgres://x' })).toBe(
			'verweigert (nur Test)'
		);
	});
	it('bricht ohne Datenbank ab', () => {
		expect(pruefungVerweigert({ MAIL_NUR_AN: 'pl@example.org' })).toBe('abgebrochen');
	});
	it('läuft auf Test', () => {
		expect(
			pruefungVerweigert({ MAIL_NUR_AN: 'pl@example.org', DATABASE_URL: 'postgres://x' })
		).toBeNull();
	});
});

describe('PRUEFKONTEN', () => {
	it('sind erfunden und unter example.org (DS-08)', () => {
		expect(PRUEFKONTEN.map((k) => k.email)).toEqual([
			'paul.pruefung@example.org',
			'pia.pruefung@example.org'
		]);
	});
});
