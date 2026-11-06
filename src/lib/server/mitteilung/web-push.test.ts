import { beforeEach, describe, expect, test, vi } from 'vitest';

const { sendNotification } = vi.hoisted(() => ({ sendNotification: vi.fn() }));
vi.mock('web-push', () => ({ sendNotification }));

import { erstelleWebPush } from './web-push.ts';

const VAPID = { oeffentlich: 'oeffentlicher-schluessel', privat: 'privater-schluessel' };
const ABO = { endpunkt: 'https://fcm.googleapis.com/fcm/send/erfunden', p256dh: 'p', auth: 'a' };
const fehlerMitStatus = (statusCode: number) =>
	Object.assign(new Error('Push-Dienst'), { statusCode });

beforeEach(() => {
	sendNotification.mockReset();
});

describe('Web-Push-Adapter', () => {
	test('FR-44: Erfolg gibt ok, mit TTL 86400 und den VAPID-Angaben', async () => {
		sendNotification.mockResolvedValue({ statusCode: 201 });
		const sende = erstelleWebPush(VAPID, 'https://my.tcolten.ch');
		expect(await sende(ABO, '{"titel":"T"}')).toBe('ok');
		expect(sendNotification).toHaveBeenCalledExactlyOnceWith(
			{ endpoint: ABO.endpunkt, keys: { p256dh: 'p', auth: 'a' } },
			'{"titel":"T"}',
			{
				TTL: 86400,
				vapidDetails: {
					subject: 'https://my.tcolten.ch',
					publicKey: VAPID.oeffentlich,
					privateKey: VAPID.privat
				}
			}
		);
	});

	test('FR-44: Status 404 und 410 heissen ungültig', async () => {
		const sende = erstelleWebPush(VAPID, 'https://my.tcolten.ch');
		for (const status of [404, 410]) {
			sendNotification.mockRejectedValueOnce(fehlerMitStatus(status));
			expect(await sende(ABO, 'x'), String(status)).toBe('ungueltig');
		}
	});

	test('FR-44: andere Fehler heissen fehler', async () => {
		const sende = erstelleWebPush(VAPID, 'https://my.tcolten.ch');
		sendNotification.mockRejectedValueOnce(fehlerMitStatus(429));
		expect(await sende(ABO, 'x')).toBe('fehler');
		sendNotification.mockRejectedValueOnce(new Error('Netz weg'));
		expect(await sende(ABO, 'x')).toBe('fehler');
		sendNotification.mockRejectedValueOnce(null);
		expect(await sende(ABO, 'x')).toBe('fehler');
		sendNotification.mockImplementationOnce(() => {
			throw new Error('sofort');
		});
		expect(await sende(ABO, 'x')).toBe('fehler');
	});
});
