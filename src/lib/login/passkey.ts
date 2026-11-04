// Passkey-Aufrufe im Browser: Anfragen an /api/passkey und der Dialog des Geräts.
// Läuft nur im Browser-Bundle, darum nichts aus src/lib/server. Der Browser-Teil wird
// übergeben (`Webauthn`), damit das ohne Browser testbar ist.

import {
	browserSupportsWebAuthn,
	startAuthentication,
	startRegistration
} from '@simplewebauthn/browser';
import { sende, type Holen } from './anmelden';

export type Webauthn = {
	unterstuetzt(): boolean;
	registriere(optionen: object): Promise<unknown>;
	melde(optionen: object): Promise<unknown>;
};

export const browserWebauthn: Webauthn = {
	unterstuetzt: () => browserSupportsWebAuthn(),
	registriere: (optionen) => startRegistration({ optionsJSON: optionen as never }),
	melde: (optionen) => startAuthentication({ optionsJSON: optionen as never })
};

export type PasskeyAnzeige = {
	kennung: string;
	geraet: string;
	eingerichtetAm: Date;
	zuletztBenutzt: Date | null;
};

export function kannPasskey(w: Webauthn = browserWebauthn): boolean {
	return w.unterstuetzt();
}

/** Hat der Fehler (evtl. als `cause`) diesen Namen? */
function hatName(fehler: unknown, name: string): boolean {
	for (let f = fehler, i = 0; f instanceof Error && i < 5; f = f.cause, i++) {
		if (f.name === name) return true;
	}
	return false;
}

/** Nutzer hat den Dialog des Geräts geschlossen. */
const istAbbruch = (fehler: unknown) => hatName(fehler, 'NotAllowedError');

/** Das Gerät hat schon einen Passkey für dieses Konto (excludeCredentials). */
const istVorhanden = (fehler: unknown) => hatName(fehler, 'InvalidStateError');

const JSON_KOPF = { 'content-type': 'application/json' };

/** POST mit JSON-Körper; null bei Netzfehler. */
async function post(pfad: string, inhalt: object, holen: Holen): Promise<Response | null> {
	try {
		return await holen(pfad, { method: 'POST', headers: JSON_KOPF, body: JSON.stringify(inhalt) });
	} catch {
		return null;
	}
}

async function leseJson(antwort: Response): Promise<unknown> {
	try {
		return await antwort.json();
	} catch {
		return null;
	}
}

function istObjekt(x: unknown): x is Record<string, unknown> {
	return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export async function richtePasskeyEin(
	holen: Holen = fetch,
	w: Webauthn = browserWebauthn
): Promise<'ok' | 'vorhanden' | 'abgebrochen' | 'fehler'> {
	const optionen = await post('/api/passkey/einrichten/optionen', {}, holen);
	if (!optionen?.ok) return 'fehler';
	const opt = await leseJson(optionen);
	if (!istObjekt(opt)) return 'fehler';
	let antwort: unknown;
	try {
		antwort = await w.registriere(opt);
	} catch (fehler) {
		if (istVorhanden(fehler)) return 'vorhanden';
		return istAbbruch(fehler) ? 'abgebrochen' : 'fehler';
	}
	const r = await sende('/api/passkey/einrichten', { antwort }, holen);
	return r.ergebnis === 'ok' ? 'ok' : 'fehler';
}

export async function meldeMitPasskeyAn(
	holen: Holen = fetch,
	w: Webauthn = browserWebauthn
): Promise<'ok' | 'abgebrochen' | 'falsch' | 'zu-viele' | 'stoerung'> {
	const antwortOpt = await post('/api/passkey/anmelden/optionen', {}, holen);
	if (!antwortOpt) return 'stoerung';
	if (antwortOpt.status === 429) return 'zu-viele';
	if (!antwortOpt.ok) return 'stoerung';
	const inhalt = await leseJson(antwortOpt);
	if (!istObjekt(inhalt) || !istObjekt(inhalt.optionen) || typeof inhalt.vorgang !== 'string')
		return 'stoerung';
	let antwort: unknown;
	try {
		antwort = await w.melde(inhalt.optionen);
	} catch (fehler) {
		return istAbbruch(fehler) ? 'abgebrochen' : 'falsch';
	}
	const r = await sende('/api/passkey/anmelden', { vorgang: inhalt.vorgang, antwort }, holen);
	return r.ergebnis === 'ok' || r.ergebnis === 'falsch' || r.ergebnis === 'zu-viele'
		? r.ergebnis
		: 'stoerung';
}

export async function ladePasskeys(holen: Holen = fetch): Promise<PasskeyAnzeige[] | null> {
	try {
		const antwort = await holen('/api/passkey', { method: 'GET' });
		if (!antwort.ok) return null;
		const inhalt = await leseJson(antwort);
		if (!istObjekt(inhalt) || !Array.isArray(inhalt.passkeys)) return null;
		return inhalt.passkeys.map((p: Record<string, string | null>) => ({
			kennung: p.kennung as string,
			geraet: p.geraet as string,
			eingerichtetAm: new Date(p.eingerichtetAm as string),
			zuletztBenutzt: p.zuletztBenutzt ? new Date(p.zuletztBenutzt) : null
		}));
	} catch {
		return null;
	}
}

/** Sagt dem Gerät, dass die Kennung nicht mehr gilt (Signal API); fehlt sie, passiert nichts. */
async function meldeEntfernt(kennung: string): Promise<void> {
	try {
		const pkc = (globalThis as unknown as { PublicKeyCredential?: Record<string, unknown> })
			.PublicKeyCredential;
		const signal = pkc?.signalUnknownCredential;
		if (typeof signal === 'function')
			await signal.call(pkc, { rpId: location.hostname, credentialId: kennung });
	} catch {
		// Nur ein Hinweis ans Gerät; Scheitern ist egal.
	}
}

export async function entfernePasskey(
	kennung: string,
	holen: Holen = fetch
): Promise<'ok' | 'fehler'> {
	const antwort = await post('/api/passkey/entfernen', { kennung }, holen);
	if (!antwort || antwort.status !== 204) return 'fehler';
	await meldeEntfernt(kennung);
	return 'ok';
}

export async function hinweisErledigt(holen: Holen = fetch): Promise<void> {
	await post('/api/passkey/hinweis', {}, holen);
}
