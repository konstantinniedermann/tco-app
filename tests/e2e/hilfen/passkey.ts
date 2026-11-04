// Virtueller Authenticator über das Chrome DevTools Protocol (nur Chromium): ersetzt Face ID,
// Fingerabdruck und Handy-PIN, damit Passkeys im Test ohne Gerät entstehen und funktionieren.
import type { Page } from '@playwright/test';

/** Schaltet einen virtuellen Geräte-Authenticator ein; die Rückgabe entfernt ihn wieder. */
export async function virtuellerAuthenticator(page: Page): Promise<() => Promise<void>> {
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('WebAuthn.enable');
	const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
		options: {
			protocol: 'ctap2',
			transport: 'internal',
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
			automaticPresenceSimulation: true
		}
	});
	return async () => {
		await cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
		await cdp.send('WebAuthn.disable');
		await cdp.detach();
	};
}

/** Ob der Browser WebAuthn meldet; dieselbe Prüfung wie `kannPasskey` der App. */
export function browserKannPasskey(page: Page): Promise<boolean> {
	return page.evaluate(() => typeof PublicKeyCredential !== 'undefined');
}
