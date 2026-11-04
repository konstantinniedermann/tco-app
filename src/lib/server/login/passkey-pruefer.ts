// Einzige Stelle, die @simplewebauthn/server importiert.
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse
} from '@simplewebauthn/server';
import type {
	AuthenticationResponseJSON,
	AuthenticatorTransport,
	RegistrationResponseJSON
} from '@simplewebauthn/server';

export type Ort = { rpId: string; herkunft: string };
export type GespeicherterPasskey = {
	kennung: string;
	oeffentlicherSchluessel: string;
	zaehler: number;
	transporte: string[];
};

export type PasskeyPruefer = {
	optionenEinrichten(p: {
		ort: Ort;
		kontoKennung: string;
		name: string;
		anzeigename: string;
		vorhandene: GespeicherterPasskey[];
	}): Promise<{ optionen: object; challenge: string }>;
	pruefeEinrichten(p: {
		ort: Ort;
		challenge: string;
		antwort: unknown;
	}): Promise<GespeicherterPasskey | null>;
	optionenAnmelden(p: { ort: Ort }): Promise<{ optionen: object; challenge: string }>;
	pruefeAnmelden(p: {
		ort: Ort;
		challenge: string;
		antwort: unknown;
		passkey: GespeicherterPasskey;
	}): Promise<{ zaehler: number } | null>;
};

const KENNUNG = /^[A-Za-z0-9_-]+$/;

/** `id` der Browser-Antwort, nur wenn base64url und höchstens 1023 Zeichen. */
export function kennungAusAntwort(antwort: unknown): string | null {
	if (typeof antwort !== 'object' || antwort === null) return null;
	const id = (antwort as { id?: unknown }).id;
	if (typeof id !== 'string' || id.length > 1023 || !KENNUNG.test(id)) return null;
	return id;
}

function zuBytes(base64url: string): Uint8Array<ArrayBuffer> {
	return new Uint8Array(Buffer.from(base64url, 'base64url'));
}

function zuBase64url(bytes: Uint8Array): string {
	return Buffer.from(bytes).toString('base64url');
}

function scheitere(): null {
	console.error('Passkey-Prüfung gescheitert');
	return null;
}

export function erstelleSimpleWebAuthnPruefer(): PasskeyPruefer {
	return {
		async optionenEinrichten({ ort, kontoKennung, name, anzeigename, vorhandene }) {
			const optionen = await generateRegistrationOptions({
				rpName: 'MyTCO',
				rpID: ort.rpId,
				userName: name,
				userDisplayName: anzeigename,
				userID: zuBytes(kontoKennung),
				attestationType: 'none',
				authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
				excludeCredentials: vorhandene.map((p) => ({
					id: p.kennung,
					transports: p.transporte as AuthenticatorTransport[]
				}))
			});
			return { optionen, challenge: optionen.challenge };
		},

		async pruefeEinrichten({ ort, challenge, antwort }) {
			try {
				const ergebnis = await verifyRegistrationResponse({
					response: antwort as RegistrationResponseJSON,
					expectedChallenge: challenge,
					expectedOrigin: ort.herkunft,
					expectedRPID: ort.rpId,
					requireUserVerification: true
				});
				if (!ergebnis.verified) return null;
				const { credential } = ergebnis.registrationInfo;
				return {
					kennung: credential.id,
					oeffentlicherSchluessel: zuBase64url(credential.publicKey),
					zaehler: credential.counter,
					transporte: [...(credential.transports ?? [])]
				};
			} catch {
				return scheitere();
			}
		},

		async optionenAnmelden({ ort }) {
			const optionen = await generateAuthenticationOptions({
				rpID: ort.rpId,
				userVerification: 'required'
			});
			return { optionen, challenge: optionen.challenge };
		},

		async pruefeAnmelden({ ort, challenge, antwort, passkey }) {
			try {
				const ergebnis = await verifyAuthenticationResponse({
					response: antwort as AuthenticationResponseJSON,
					expectedChallenge: challenge,
					expectedOrigin: ort.herkunft,
					expectedRPID: ort.rpId,
					requireUserVerification: true,
					credential: {
						id: passkey.kennung,
						publicKey: zuBytes(passkey.oeffentlicherSchluessel),
						counter: passkey.zaehler,
						transports: passkey.transporte as AuthenticatorTransport[]
					}
				});
				if (!ergebnis.verified) return null;
				return { zaehler: ergebnis.authenticationInfo.newCounter };
			} catch {
				return scheitere();
			}
		}
	};
}
