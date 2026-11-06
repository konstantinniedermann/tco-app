import { afterEach, describe, expect, test, vi } from 'vitest';
import { erstelleBremsen } from '../login/bremse.ts';
import { baueEmailHinweisMail, erstelleHinweis } from './hinweis-mail.ts';

const fehler = vi.spyOn(console, 'error').mockImplementation(() => {});
afterEach(() => fehler.mockClear());

describe('baueEmailHinweisMail', () => {
	test('SI-09: Hinweis nennt keine Adressen und den Kontakt', () => {
		expect(baueEmailHinweisMail('kontakt@example.org')).toEqual({
			betreff: 'Deine E-Mail-Adresse in MyTCO wurde geändert',
			text: [
				'Die Verwaltung von MyTCO hat die E-Mail-Adresse deines Kontos geändert. Mails von MyTCO gehen ab jetzt an die neue Adresse, auch der Code zum Anmelden.',
				'',
				'Hast du diese Änderung nicht verlangt? Dann melde dich bitte bei kontakt@example.org.'
			].join('\n')
		});
	});
});

describe('erstelleHinweis', () => {
	test('SI-09: schickt den Hinweis an die alte Adresse', async () => {
		const post: { an: string; betreff: string }[] = [];
		const hinweis = erstelleHinweis({
			mailer: async (n) => {
				post.push(n);
			},
			kontakt: 'kontakt@example.org',
			bremsen: erstelleBremsen()
		});
		await hinweis('alt@example.org');
		expect(post).toHaveLength(1);
		expect(post[0].an).toBe('alt@example.org');
		expect(post[0].betreff).toBe('Deine E-Mail-Adresse in MyTCO wurde geändert');
	});

	test('SI-09, SI-05: ein werfender Mailer wirft nicht und erzeugt genau eine feste Logzeile', async () => {
		const hinweis = erstelleHinweis({
			mailer: async () => {
				throw new Error('SMTP-Fehler für alt@example.org');
			},
			kontakt: 'kontakt@example.org',
			bremsen: erstelleBremsen()
		});
		await expect(hinweis('alt@example.org')).resolves.toBeUndefined();
		expect(fehler.mock.calls).toEqual([['Hinweis-Mail nicht versandt']]);
	});

	test('SI-04, SI-09: ist die Grenze der Adresse erreicht, geht still keine Mail hinaus', async () => {
		const post: unknown[] = [];
		const bremsen = erstelleBremsen();
		const hinweis = erstelleHinweis({
			mailer: async (n) => {
				post.push(n);
			},
			kontakt: 'kontakt@example.org',
			bremsen
		});
		for (let i = 0; i < 3; i++) await hinweis('Alt@Example.org ');
		await hinweis('alt@example.org');
		expect(post).toHaveLength(3);
		expect(fehler).not.toHaveBeenCalled();
	});
});
