// Anfragen der Login-Seiten an die Schnittstellen und die Meldungen dazu (UI-06).
// Texte wörtlich aus der Spec «Login per Einmal-Code», Abschnitt «Ablauf in der App».

import { rufeAb, woerterAus, type Holen, type Vertrag } from '../abruf.ts';
import { jsonPost } from '../json-post';

export type Ergebnis =
	| { art: 'ok' }
	| { art: 'falsch' }
	| { art: 'benutzt'; kontakt: string }
	| { art: 'zu-viele' }
	| { art: 'stoerung' };

export const MELDUNG = {
	briefFalsch: 'Dieser Code stimmt nicht. Prüf ihn oder lass dir einen neuen per E-Mail schicken.',
	mailFalsch: 'Dieser Code stimmt nicht. Prüf ihn oder lass dir einen neuen schicken.',
	zuViele: 'Zu viele Versuche. Versuch es in einer Stunde nochmals.',
	// Nicht in der Spec: Netz weg oder Server gestört.
	stoerung: 'Das hat nicht geklappt. Prüf die Verbindung und versuch es nochmals.',
	passkeyFalsch: 'Mit diesem Passkey klappt es nicht. Melde dich mit einem Code an.',
	passkeyEinrichten: 'Das hat nicht geklappt. Du kannst dich weiterhin mit einem Code anmelden.'
} as const;

/** Die Fehlerwörter des Logins; der Körper ist nachsichtig (Erfolg und 429 brauchen keinen). */
type Wort = Exclude<Ergebnis['art'], 'ok' | 'stoerung'>;
const VERTRAG: Vertrag<Wort> = {
	woerter: woerterAus<Wort>({ falsch: true, benutzt: true, 'zu-viele': true }),
	koerper: 'nachsichtig'
};

export async function sende(pfad: string, inhalt: object, holen: Holen = fetch): Promise<Ergebnis> {
	const r = await rufeAb<unknown, Wort>(pfad, jsonPost(inhalt), holen, VERTRAG);
	switch (r.art) {
		case 'ok':
			return { art: 'ok' };
		case 'falsch':
		case 'zu-viele':
			return { art: r.art };
		case 'benutzt':
			return typeof r.koerper.kontakt === 'string'
				? { art: 'benutzt', kontakt: r.koerper.kontakt }
				: { art: 'stoerung' };
		default:
			return { art: 'stoerung' };
	}
}

/** A-LOGIN-01: mit dem Code aus dem Brief anmelden. */
export const meldeMitBriefAn = (code: string, holen: Holen = fetch) =>
	sende('/api/login/brief', { code }, holen);

/** Einen Code per E-Mail anfordern. */
export const fordereMailCodeAn = (email: string, holen: Holen = fetch) =>
	sende('/api/login/mail-code', { email }, holen);

/** Mit dem Code aus der E-Mail anmelden. */
export const meldeMitMailAn = (email: string, code: string, holen: Holen = fetch) =>
	sende('/api/login/mail', { email, code }, holen);

/** Abmelden; der Server antwortet auch ohne Sitzung mit Erfolg. */
export const meldeSichAb = (holen: Holen = fetch) => sende('/api/logout', {}, holen);

/** Meldung beim Feld; `falsch` ist je nach Seite verschieden. */
export function meldung(r: Ergebnis, falsch: string): string | null {
	switch (r.art) {
		case 'ok':
			return null;
		case 'falsch':
			return falsch;
		case 'benutzt':
			return `Dieser Code wurde schon benutzt. Wende dich an ${r.kontakt}.`;
		case 'zu-viele':
			return MELDUNG.zuViele;
		default:
			return MELDUNG.stoerung;
	}
}
