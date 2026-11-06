import { afterEach, describe, expect, test, vi } from 'vitest';
import { baueBestaetigungsMail, erstelleBestaetigung } from './mail.ts';

const fehler = vi.spyOn(console, 'error').mockImplementation(() => {});
afterEach(() => fehler.mockClear());

const inhalt = {
	turniername: 'Clubmeisterschaft 2027',
	aktion: 'an' as const,
	kategorie: 'Herren R1–R6',
	eigene: ['Herren R1–R6', 'Senioren 45+'],
	anmeldeschluss: '2027-05-31'
};

describe('baueBestaetigungsMail', () => {
	test('A-ANMELDUNG-05: Mail nach Anmeldung nennt die Kategorie und alle aktuellen Anmeldungen', () => {
		expect(baueBestaetigungsMail(inhalt, 'kontakt@example.org')).toEqual({
			betreff: 'Clubmeisterschaft 2027: deine Anmeldungen',
			text: [
				'Du hast dich für «Herren R1–R6» angemeldet.',
				'',
				'Deine Anmeldungen für die Clubmeisterschaft 2027:',
				'- Herren R1–R6',
				'- Senioren 45+',
				'',
				'Bis zum Anmeldeschluss am Montag, 31. Mai 2027 kannst du dich in MyTCO unter «Clubmeisterschaft 2027» an- und abmelden.',
				'',
				'Fragen? Schreib an kontakt@example.org.'
			].join('\n')
		});
	});

	test('A-ANMELDUNG-05: Mail nach letzter Abmeldung sagt, dass keine bleibt', () => {
		const { text } = baueBestaetigungsMail(
			{ ...inhalt, aktion: 'ab', eigene: [] },
			'kontakt@example.org'
		);
		expect(text).toBe(
			[
				'Du hast dich von «Herren R1–R6» abgemeldet.',
				'',
				'Du bist zurzeit für keine Kategorie angemeldet.',
				'',
				'Bis zum Anmeldeschluss am Montag, 31. Mai 2027 kannst du dich in MyTCO unter «Clubmeisterschaft 2027» an- und abmelden.',
				'',
				'Fragen? Schreib an kontakt@example.org.'
			].join('\n')
		);
	});

	test('A-ANMELDUNG-05: Abmeldung mit bleibenden Anmeldungen listet sie', () => {
		const { text } = baueBestaetigungsMail(
			{ ...inhalt, aktion: 'ab', eigene: ['Senioren 45+'] },
			'kontakt@example.org'
		);
		expect(text).toContain('Du hast dich von «Herren R1–R6» abgemeldet.');
		expect(text).toContain('Deine Anmeldungen für die Clubmeisterschaft 2027:\n- Senioren 45+\n');
	});
});

describe('erstelleBestaetigung', () => {
	test('A-ANMELDUNG-05: schickt die Mail an die Adresse', async () => {
		const post: { an: string; betreff: string }[] = [];
		const senden = erstelleBestaetigung({
			mailer: async (n) => {
				post.push(n);
			},
			kontakt: 'kontakt@example.org'
		});
		await senden('mitglied@example.org', inhalt);
		expect(post).toHaveLength(1);
		expect(post[0].an).toBe('mitglied@example.org');
		expect(post[0].betreff).toBe('Clubmeisterschaft 2027: deine Anmeldungen');
	});

	test('SI-05: gestörter Versand wirft nicht und loggt nur die feste Zeile', async () => {
		const senden = erstelleBestaetigung({
			mailer: async () => {
				throw new Error('SMTP-Fehler für mitglied@example.org');
			},
			kontakt: 'kontakt@example.org'
		});
		await expect(senden('mitglied@example.org', inhalt)).resolves.toBeUndefined();
		expect(fehler.mock.calls).toEqual([['Bestätigungs-Mail nicht versandt']]);
	});
});
