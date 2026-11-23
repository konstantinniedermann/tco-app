import { describe, expect, it } from 'vitest';
import {
	ausPlaywright,
	istCodeStandVon,
	leseEinstellungen,
	leseServerZeilen,
	leseZugang,
	tabelle
} from './test-pruefung.ts';

describe('leseEinstellungen', () => {
	it('nennt fehlende Einstellungen beim Namen', () => {
		expect(leseEinstellungen({})).toEqual({ fehlt: ['MYTCO_TEST_URL', 'MYTCO_TEST_SSH'] });
	});
	it('nimmt den Schlüssel aus der Vorgabe, wenn er fehlt', () => {
		expect(
			leseEinstellungen(
				{ MYTCO_TEST_URL: 'https://test.example.org/', MYTCO_TEST_SSH: 'ubuntu@host' },
				'/home/x'
			)
		).toEqual({
			url: 'https://test.example.org',
			ssh: 'ubuntu@host',
			schluessel: '/home/x/.ssh/mytco-server'
		});
	});
	it('lehnt eine Adresse ohne https ab', () => {
		expect(
			leseEinstellungen({ MYTCO_TEST_URL: 'http://test.example.org', MYTCO_TEST_SSH: 'u@h' })
		).toEqual({ fehlt: ['MYTCO_TEST_URL'] });
	});
});

describe('leseZugang', () => {
	it('liest den Wert aus proxy.env, ohne Anführungszeichen', () => {
		expect(leseZugang('A=1\nMYTCO_TEST_PASSWORT_HASH="abc$def"\n')).toBe('abc$def');
		expect(leseZugang("MYTCO_TEST_PASSWORT_HASH='xyz'")).toBe('xyz');
	});
	it('gibt null ohne Zeile oder bei leerem Wert', () => {
		expect(leseZugang('A=1')).toBeNull();
		expect(leseZugang('MYTCO_TEST_PASSWORT_HASH=')).toBeNull();
	});
});

describe('leseServerZeilen', () => {
	it('liest die Zeilen des Server-Teils und übergeht fremde', () => {
		expect(
			leseServerZeilen('fremd\npruefung: zeitgeber rot ZEITGEBER aus\npruefung: admin ok da\n')
		).toEqual([
			{ punkt: 'zeitgeber', ok: false, text: 'ZEITGEBER aus' },
			{ punkt: 'admin', ok: true, text: 'da' }
		]);
	});
	it('meldet Verweigern, Abbruch und leere Ausgabe als rot', () => {
		for (const ausgabe of ['pruefung: verweigert (nur Test)', 'pruefung: abgebrochen', '']) {
			const [b] = leseServerZeilen(ausgabe);
			expect(b.ok).toBe(false);
			expect(b.punkt).toBe('server');
		}
	});
});

describe('istCodeStandVon', () => {
	// Attrappe für git: Vorfahre ja/nein und die Pfade zwischen den Ständen.
	const git =
		(vorfahre: boolean, pfade: string[]) =>
		(args: string[]): string => {
			if (args[0] === 'merge-base') {
				if (!vorfahre) throw new Error('kein Vorfahre');
				return '';
			}
			return pfade.join('\n');
		};
	it('gilt, wenn zwischen Test und dev nur Doku liegt', () => {
		expect(istCodeStandVon('abc1234', 'f'.repeat(40), git(true, ['docs/a.md']))).toBe(true);
		expect(istCodeStandVon('abc1234', 'f'.repeat(40), git(true, []))).toBe(true);
	});
	it('gilt nicht, wenn Test kein Vorfahre ist oder Code dazwischen liegt', () => {
		expect(istCodeStandVon('abc1234', 'f'.repeat(40), git(false, []))).toBe(false);
		expect(istCodeStandVon('abc1234', 'f'.repeat(40), git(true, ['src/a.ts']))).toBe(false);
	});
	it('gilt nicht für einen leeren oder fremden Commit-Text', () => {
		expect(istCodeStandVon('', 'f'.repeat(40), git(true, []))).toBe(false);
		expect(istCodeStandVon('--all', 'f'.repeat(40), git(true, []))).toBe(false);
	});
});

describe('ausPlaywright', () => {
	it('macht aus dem JSON-Bericht je Test eine Zeile', () => {
		const bericht = {
			suites: [
				{
					specs: [
						{ title: 'Prüflauf: Fusszeile', ok: true },
						{ title: 'Prüflauf SI-08: Verwaltung', ok: false }
					],
					suites: [{ specs: [{ title: 'Prüflauf A-HILFE-01: Hilfe', ok: true }] }]
				}
			]
		};
		expect(ausPlaywright(bericht)).toEqual([
			{ punkt: 'Prüflauf: Fusszeile', ok: true, text: '' },
			{ punkt: 'Prüflauf SI-08: Verwaltung', ok: false, text: '' },
			{ punkt: 'Prüflauf A-HILFE-01: Hilfe', ok: true, text: '' }
		]);
	});
	it('meldet einen Bericht ohne Tests als rot', () => {
		expect(ausPlaywright({ suites: [] })).toEqual([
			{ punkt: 'browser', ok: false, text: 'kein Test gelaufen' }
		]);
	});
});

describe('tabelle', () => {
	it('zeigt jeden Punkt mit ok oder rot', () => {
		const t = tabelle([
			{ punkt: 'admin', ok: true, text: 'da' },
			{ punkt: 'zeitgeber', ok: false, text: 'aus' }
		]);
		expect(t).toContain('ok   admin');
		expect(t).toContain('rot  zeitgeber');
		expect(t.split('\n').filter((z) => z.includes('admin'))).toHaveLength(1);
	});
});
