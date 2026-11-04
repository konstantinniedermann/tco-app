import { afterEach, describe, expect, it, vi } from 'vitest';
import * as lib from '@simplewebauthn/server';
import { erstelleSimpleWebAuthnPruefer, kennungAusAntwort } from './passkey-pruefer.ts';

vi.mock('@simplewebauthn/server', () => ({
	generateRegistrationOptions: vi.fn(),
	generateAuthenticationOptions: vi.fn(),
	verifyRegistrationResponse: vi.fn(),
	verifyAuthenticationResponse: vi.fn()
}));

const mocks = vi.mocked(lib);
const ort = { rpId: 'tco.example.org', herkunft: 'https://tco.example.org' };
const gespeichert = {
	kennung: 'kennung-1',
	oeffentlicherSchluessel: Buffer.from([1, 2, 3]).toString('base64url'),
	zaehler: 4,
	transporte: ['internal']
};

afterEach(() => {
	vi.resetAllMocks();
	vi.restoreAllMocks();
});

describe('kennungAusAntwort', () => {
	it('A-LOGIN-07: liefert die id nur, wenn sie base64url und höchstens 1023 Zeichen lang ist', () => {
		expect(kennungAusAntwort({ id: 'abC-_12' })).toBe('abC-_12');
		expect(kennungAusAntwort({ id: 'a'.repeat(1023) })).toBe('a'.repeat(1023));
		expect(kennungAusAntwort({ id: 'a'.repeat(1024) })).toBeNull();
		for (const schlecht of [{ id: '' }, { id: 'a b' }, { id: 'a=' }, { id: 5 }, {}, null, 'x', 7])
			expect(kennungAusAntwort(schlecht)).toBeNull();
	});
});

describe('erstelleSimpleWebAuthnPruefer', () => {
	it('A-LOGIN-07: Einrichten-Optionen tragen die festen Vorgaben und liefern die Challenge', async () => {
		mocks.generateRegistrationOptions.mockResolvedValue({ challenge: 'ch-1' } as never);
		const r = await erstelleSimpleWebAuthnPruefer().optionenEinrichten({
			ort,
			kontoKennung: Buffer.from([9, 8, 7]).toString('base64url'),
			name: 'a@example.org',
			anzeigename: 'Anna',
			vorhandene: [gespeichert]
		});
		expect(r.challenge).toBe('ch-1');
		expect(mocks.generateRegistrationOptions).toHaveBeenCalledWith({
			rpName: 'MyTCO',
			rpID: 'tco.example.org',
			userName: 'a@example.org',
			userDisplayName: 'Anna',
			userID: new Uint8Array([9, 8, 7]),
			attestationType: 'none',
			authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
			excludeCredentials: [{ id: 'kennung-1', transports: ['internal'] }]
		});
	});

	it('A-LOGIN-07: Anmelden-Optionen tragen rpID und verlangen Nutzerprüfung', async () => {
		mocks.generateAuthenticationOptions.mockResolvedValue({ challenge: 'ch-2' } as never);
		const r = await erstelleSimpleWebAuthnPruefer().optionenAnmelden({ ort });
		expect(r.challenge).toBe('ch-2');
		expect(mocks.generateAuthenticationOptions).toHaveBeenCalledWith({
			rpID: 'tco.example.org',
			userVerification: 'required'
		});
	});

	it('A-LOGIN-07: prüft die Einrichtung mit Challenge, Herkunft, rpID und Nutzerprüfung und bildet den Passkey ab', async () => {
		mocks.verifyRegistrationResponse.mockResolvedValue({
			verified: true,
			registrationInfo: {
				credential: {
					id: 'neu-1',
					publicKey: new Uint8Array([5, 6, 7]),
					counter: 2,
					transports: ['internal', 'hybrid']
				}
			}
		} as never);
		const antwort = { id: 'neu-1' };
		const r = await erstelleSimpleWebAuthnPruefer().pruefeEinrichten({
			ort,
			challenge: 'ch-1',
			antwort
		});
		expect(mocks.verifyRegistrationResponse).toHaveBeenCalledWith({
			response: antwort,
			expectedChallenge: 'ch-1',
			expectedOrigin: 'https://tco.example.org',
			expectedRPID: 'tco.example.org',
			requireUserVerification: true
		});
		expect(r).toEqual({
			kennung: 'neu-1',
			oeffentlicherSchluessel: Buffer.from([5, 6, 7]).toString('base64url'),
			zaehler: 2,
			transporte: ['internal', 'hybrid']
		});
	});

	it('A-LOGIN-07: Einrichtung ohne Transporte liefert eine leere Liste', async () => {
		mocks.verifyRegistrationResponse.mockResolvedValue({
			verified: true,
			registrationInfo: { credential: { id: 'x', publicKey: new Uint8Array([1]), counter: 0 } }
		} as never);
		const r = await erstelleSimpleWebAuthnPruefer().pruefeEinrichten({
			ort,
			challenge: 'c',
			antwort: {}
		});
		expect(r?.transporte).toEqual([]);
	});

	it('SI-18: nicht bestätigte Einrichtung liefert null', async () => {
		mocks.verifyRegistrationResponse.mockResolvedValue({ verified: false } as never);
		expect(
			await erstelleSimpleWebAuthnPruefer().pruefeEinrichten({ ort, challenge: 'c', antwort: {} })
		).toBeNull();
	});

	it('SI-18: wirft die Bibliothek bei der Einrichtung, ist das Ergebnis null und nur der feste Text steht im Log', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		mocks.verifyRegistrationResponse.mockRejectedValue(new Error('Geheimes Detail abc'));
		expect(
			await erstelleSimpleWebAuthnPruefer().pruefeEinrichten({ ort, challenge: 'c', antwort: {} })
		).toBeNull();
		expect(log.mock.calls).toEqual([['Passkey-Prüfung gescheitert']]);
	});

	it('SI-18: prüft die Anmeldung mit Challenge, Herkunft, rpID, Nutzerprüfung und gespeichertem Passkey', async () => {
		mocks.verifyAuthenticationResponse.mockResolvedValue({
			verified: true,
			authenticationInfo: { newCounter: 5 }
		} as never);
		const antwort = { id: 'kennung-1' };
		const r = await erstelleSimpleWebAuthnPruefer().pruefeAnmelden({
			ort,
			challenge: 'ch-2',
			antwort,
			passkey: gespeichert
		});
		expect(r).toEqual({ zaehler: 5 });
		expect(mocks.verifyAuthenticationResponse).toHaveBeenCalledWith({
			response: antwort,
			expectedChallenge: 'ch-2',
			expectedOrigin: 'https://tco.example.org',
			expectedRPID: 'tco.example.org',
			requireUserVerification: true,
			credential: {
				id: 'kennung-1',
				publicKey: new Uint8Array([1, 2, 3]),
				counter: 4,
				transports: ['internal']
			}
		});
	});

	it('SI-18: nicht bestätigte Anmeldung liefert null', async () => {
		mocks.verifyAuthenticationResponse.mockResolvedValue({ verified: false } as never);
		expect(
			await erstelleSimpleWebAuthnPruefer().pruefeAnmelden({
				ort,
				challenge: 'c',
				antwort: {},
				passkey: gespeichert
			})
		).toBeNull();
	});

	it('SI-18: wirft die Bibliothek bei der Anmeldung, ist das Ergebnis null und nur der feste Text steht im Log', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		mocks.verifyAuthenticationResponse.mockRejectedValue(new Error('Geheimes Detail xyz'));
		expect(
			await erstelleSimpleWebAuthnPruefer().pruefeAnmelden({
				ort,
				challenge: 'c',
				antwort: {},
				passkey: gespeichert
			})
		).toBeNull();
		expect(log.mock.calls).toEqual([['Passkey-Prüfung gescheitert']]);
	});
});
