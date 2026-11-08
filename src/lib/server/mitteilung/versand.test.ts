import { describe, expect, test } from 'vitest';
import type { Empfaenger } from './empfaenger.ts';
import { vorschau } from './versand.ts';

// Erfundene Empfänger: mit Push und Mail, nur Push, nur Mail, nichts.
const ABO = { endpunkt: 'https://fcm.googleapis.com/fcm/send/x', p256dh: 'p', auth: 'a' };
const EMPF: Empfaenger[] = [
	{
		mitgliedId: 1,
		name: { rufname: 'Anni', vorname: 'Anna', nachname: 'Aebi' },
		email: 'anna@example.org',
		abos: [ABO, ABO]
	},
	{
		mitgliedId: 2,
		name: { rufname: null, vorname: 'Beat', nachname: 'Brunner' },
		email: null,
		abos: [ABO]
	},
	{
		mitgliedId: 3,
		name: { rufname: null, vorname: 'Carla', nachname: 'Christen' },
		email: 'carla@example.org',
		abos: []
	},
	{
		mitgliedId: 4,
		name: { rufname: null, vorname: 'Dario', nachname: 'Dubach' },
		email: null,
		abos: []
	}
];
const NAMEN = EMPF.map((e) => e.name);

describe('Vorschau einer Mitteilung', () => {
	test('FR-44: Vorschau nur Push: Mitglieder ohne Abo sind nicht erreichbar', () => {
		expect(vorschau(EMPF, 'push', true)).toEqual({
			anzahl: 4,
			namen: NAMEN,
			push: 2,
			mails: 0,
			ersatzMails: 0,
			nichtErreichbar: 2
		});
	});

	test('FR-44: Vorschau Push sonst Mail: Mail nur an Mitglieder ohne Abo', () => {
		expect(vorschau(EMPF, 'push-sonst-mail', true)).toEqual({
			anzahl: 4,
			namen: NAMEN,
			push: 2,
			mails: 1,
			ersatzMails: 0,
			nichtErreichbar: 1
		});
	});

	test('FR-44: Vorschau Push und Mail: Mail an alle mit Adresse', () => {
		expect(vorschau(EMPF, 'push-und-mail', true)).toEqual({
			anzahl: 4,
			namen: NAMEN,
			push: 2,
			mails: 2,
			ersatzMails: 0,
			nichtErreichbar: 1
		});
	});

	test('FR-44: Vorschau ohne VAPID zählt jeden als ohne Push', () => {
		expect(vorschau(EMPF, 'push', false)).toMatchObject({ push: 0, mails: 0, nichtErreichbar: 4 });
		expect(vorschau(EMPF, 'push-sonst-mail', false)).toMatchObject({
			push: 0,
			mails: 2,
			nichtErreichbar: 2
		});
	});

	test('FR-44: Vorschau ohne Empfänger ist leer', () => {
		expect(vorschau([], 'push-sonst-mail', true)).toEqual({
			anzahl: 0,
			namen: [],
			push: 0,
			mails: 0,
			ersatzMails: 0,
			nichtErreichbar: 0
		});
	});
});
