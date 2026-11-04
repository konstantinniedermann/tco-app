import { describe, expect, it } from 'vitest';
import { fehlerseite } from './fehlerseite.ts';

describe('fehlerseite', () => {
	it('UI-06: eigene Meldung der App bleibt, in der Verwaltung geht es zurück zur Verwaltung', () => {
		expect(
			fehlerseite(503, 'Die Verwaltung lässt sich gerade nicht öffnen.', '/verwaltung/mitglieder')
		).toEqual({
			titel: 'Gerade nicht erreichbar',
			text: 'Die Verwaltung lässt sich gerade nicht öffnen.',
			zurueck: { text: 'Zur Verwaltung', pfad: '/verwaltung/mitglieder' }
		});
	});

	it('404 aus der App: Meldung bleibt, Titel «Nicht gefunden»', () => {
		expect(fehlerseite(404, 'Dieses Mitglied gibt es nicht.', '/verwaltung/mitglieder/9')).toEqual({
			titel: 'Nicht gefunden',
			text: 'Dieses Mitglied gibt es nicht.',
			zurueck: { text: 'Zur Verwaltung', pfad: '/verwaltung/mitglieder' }
		});
	});

	it('englische Meldungen von SvelteKit werden zu deutschen, ausserhalb der Verwaltung zur Startseite', () => {
		expect(fehlerseite(404, 'Not Found', '/gibts-nicht')).toEqual({
			titel: 'Nicht gefunden',
			text: 'Diese Seite gibt es nicht.',
			zurueck: { text: 'Zur Startseite', pfad: '/' }
		});
		expect(fehlerseite(500, 'Internal Error', '/profil').text).toBe(
			'Etwas ist schiefgelaufen. Versuche es später noch einmal.'
		);
	});

	it('/verwaltungX zählt nicht zur Verwaltung', () => {
		expect(fehlerseite(404, 'Not Found', '/verwaltungX').zurueck.pfad).toBe('/');
	});
});
