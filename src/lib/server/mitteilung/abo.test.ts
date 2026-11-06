import { describe, expect, test } from 'vitest';
import { pruefeAbo } from './abo.ts';

const KEYS = {
	p256dh: 'erfundener-oeffentlicher-schluessel',
	auth: 'erfundenes-auth-geheimnis'
};
const abo = (endpoint: string, keys: unknown = KEYS) => ({ endpoint, keys });

describe('Push-Abo prüfen', () => {
	test('SI-21: Endpunkt von fcm.googleapis.com ist gültig', () => {
		const r = pruefeAbo(abo('https://fcm.googleapis.com/fcm/send/abc'));
		expect(r).toEqual({
			ok: true,
			abo: { endpunkt: 'https://fcm.googleapis.com/fcm/send/abc', ...KEYS }
		});
	});

	test('SI-21: Endpunkt von web.push.apple.com ist gültig', () => {
		expect(pruefeAbo(abo('https://web.push.apple.com/QAbc')).ok).toBe(true);
	});

	test('SI-21: Endpunkt von updates.push.services.mozilla.com ist gültig', () => {
		expect(pruefeAbo(abo('https://updates.push.services.mozilla.com/wpush/v2/x')).ok).toBe(true);
	});

	test('SI-21: Endpunkt von *.notify.windows.com ist gültig', () => {
		expect(pruefeAbo(abo('https://db5p.notify.windows.com/w/?token=x')).ok).toBe(true);
	});

	test('SI-21: http: wird abgewiesen', () => {
		expect(pruefeAbo(abo('http://fcm.googleapis.com/fcm/send/abc')).ok).toBe(false);
	});

	test('SI-21: fremder Host wird abgewiesen', () => {
		for (const u of [
			'https://example.org/x',
			'https://fcm.googleapis.com.evil.example/x',
			'https://evilpush.apple.com/x',
			'https://push.apple.com/x',
			'https://' + 'user:geheim' + '\u0040' + 'fcm.googleapis.com/x',
			'https://fcm.googleapis.com:8443/x',
			'kein url'
		])
			expect(pruefeAbo(abo(u)).ok, u).toBe(false);
	});

	test('SI-21: Endpunkt über 1000 Zeichen wird abgewiesen', () => {
		const lang = 'https://fcm.googleapis.com/' + 'a'.repeat(1000);
		expect(pruefeAbo(abo(lang)).ok).toBe(false);
	});

	test('SI-21: Schlüssel mit + oder / wird abgewiesen', () => {
		expect(pruefeAbo(abo('https://fcm.googleapis.com/x', { ...KEYS, p256dh: 'ab+cd' })).ok).toBe(
			false
		);
		expect(pruefeAbo(abo('https://fcm.googleapis.com/x', { ...KEYS, auth: 'ab/cd' })).ok).toBe(
			false
		);
		expect(pruefeAbo(abo('https://fcm.googleapis.com/x', { ...KEYS, auth: 'abcd==' })).ok).toBe(
			false
		);
	});

	test('SI-21: fehlende oder falsche Form wird abgewiesen', () => {
		for (const r of [
			null,
			'x',
			{},
			{ endpoint: 1, keys: KEYS },
			{ endpoint: 'https://fcm.googleapis.com/x' }
		])
			expect(pruefeAbo(r).ok).toBe(false);
	});
});
