import { describe, expect, test } from 'vitest';
import { versionsText } from './version.ts';

// ADR-012: Auf Test sollen sich Stände mit gleicher Nummer unterscheiden lassen, Live zeigt nur
// die Nummer. Test erkennt die Fusszeile an der Adresse (test.my.tcolten.ch, test.<ip>.sslip.io).
describe('versionsText', () => {
	test('auf Test: Nummer und Kurzform des Commits', () => {
		expect(versionsText('0.23.0', 'a1b2c3d', 'test.my.tcolten.ch')).toBe('0.23.0 · a1b2c3d');
		expect(versionsText('0.23.0', 'a1b2c3d', 'test.179-237-82-222.sslip.io')).toBe(
			'0.23.0 · a1b2c3d'
		);
	});

	test('auf Live und lokal: nur die Nummer', () => {
		expect(versionsText('0.23.0', 'a1b2c3d', 'my.tcolten.ch')).toBe('0.23.0');
		expect(versionsText('0.23.0', 'a1b2c3d', 'localhost')).toBe('0.23.0');
		expect(versionsText('0.23.0', 'a1b2c3d', 'contest.example.org')).toBe('0.23.0');
	});

	test('ohne Commit (lokaler Build) auch auf Test nur die Nummer', () => {
		expect(versionsText('0.23.0', '', 'test.my.tcolten.ch')).toBe('0.23.0');
	});
});
