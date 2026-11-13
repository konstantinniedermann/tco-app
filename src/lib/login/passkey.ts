// Passkey-Aufrufe im Browser: Anfragen an /api/passkey und der Dialog des Geräts.
// Läuft nur im Browser-Bundle, darum nichts aus src/lib/server. Der Browser-Teil wird
// übergeben (`Webauthn`), damit das ohne Browser testbar ist.

import {
	browserSupportsWebAuthn,
	startAuthentication,
	startRegistration
} from '@simplewebauthn/browser';
import { rufeAb, type Holen, type Vertrag } from '../abruf.ts';
import { jsonPost } from '../json-post';
import { sende } from './anmelden';

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

/** Nur Daten: Jede Antwort ausser einem Erfolg ist eine Störung; ohne lesbaren Körper keine Daten. */
const NUR_DATEN: Vertrag<never> = { woerter: [], koerper: 'nachsichtig' };
/** Optionen der Anmeldung: dazu 429 nach dem Status allein. */
const OPTIONEN_ANMELDEN: Vertrag<'zu-viele'> = { woerter: ['zu-viele'], koerper: 'nachsichtig' };
/** Entfernen: nur genau 204 ist ein Erfolg. */
const NUR_OHNE_KOERPER: Vertrag<never> = {
	woerter: [],
	koerper: 'nachsichtig',
	ohneKoerper: 'einzig'
};

function istObjekt(x: unknown): x is Record<string, unknown> {
	return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export async function richtePasskeyEin(
	holen: Holen = fetch,
	w: Webauthn = browserWebauthn
): Promise<'ok' | 'vorhanden' | 'abgebrochen' | 'fehler'> {
	const optionen = await rufeAb<unknown, never>(
		'/api/passkey/einrichten/optionen',
		jsonPost({}),
		holen,
		NUR_DATEN
	);
	if (optionen.art !== 'ok') return 'fehler';
	const opt = optionen.daten;
	if (!istObjekt(opt)) return 'fehler';
	let antwort: unknown;
	try {
		antwort = await w.registriere(opt);
	} catch (fehler) {
		if (istVorhanden(fehler)) return 'vorhanden';
		return istAbbruch(fehler) ? 'abgebrochen' : 'fehler';
	}
	const r = await sende('/api/passkey/einrichten', { antwort }, holen);
	return r.art === 'ok' ? 'ok' : 'fehler';
}

export async function meldeMitPasskeyAn(
	holen: Holen = fetch,
	w: Webauthn = browserWebauthn
): Promise<'ok' | 'abgebrochen' | 'falsch' | 'zu-viele' | 'stoerung'> {
	const antwortOpt = await rufeAb<unknown, 'zu-viele'>(
		'/api/passkey/anmelden/optionen',
		jsonPost({}),
		holen,
		OPTIONEN_ANMELDEN
	);
	if (antwortOpt.art === 'zu-viele') return 'zu-viele';
	if (antwortOpt.art !== 'ok') return 'stoerung';
	const inhalt = antwortOpt.daten;
	if (!istObjekt(inhalt) || !istObjekt(inhalt.optionen) || typeof inhalt.vorgang !== 'string')
		return 'stoerung';
	let antwort: unknown;
	try {
		antwort = await w.melde(inhalt.optionen);
	} catch (fehler) {
		return istAbbruch(fehler) ? 'abgebrochen' : 'falsch';
	}
	const r = await sende('/api/passkey/anmelden', { vorgang: inhalt.vorgang, antwort }, holen);
	return r.art === 'ok' || r.art === 'falsch' || r.art === 'zu-viele' ? r.art : 'stoerung';
}

export async function ladePasskeys(holen: Holen = fetch): Promise<PasskeyAnzeige[] | null> {
	const antwort = await rufeAb<unknown, never>('/api/passkey', { method: 'GET' }, holen, NUR_DATEN);
	if (antwort.art !== 'ok') return null;
	const inhalt = antwort.daten;
	if (!istObjekt(inhalt) || !Array.isArray(inhalt.passkeys)) return null;
	try {
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
	const antwort = await rufeAb(
		'/api/passkey/entfernen',
		jsonPost({ kennung }),
		holen,
		NUR_OHNE_KOERPER
	);
	if (antwort.art !== 'ok') return 'fehler';
	await meldeEntfernt(kennung);
	return 'ok';
}

export async function hinweisErledigt(holen: Holen = fetch): Promise<void> {
	await rufeAb('/api/passkey/hinweis', jsonPost({}), holen, NUR_DATEN);
}
