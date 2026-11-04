// Anfragen der Login-Seiten an die Schnittstellen und die Meldungen dazu (UI-06).
// Texte wörtlich aus der Spec «Login per Einmal-Code», Abschnitt «Ablauf in der App».

import { jsonPost } from '../json-post';

export type Ergebnis =
	| { ergebnis: 'ok' }
	| { ergebnis: 'falsch' }
	| { ergebnis: 'benutzt'; kontakt: string }
	| { ergebnis: 'zu-viele' }
	| { ergebnis: 'stoerung' };

export const MELDUNG = {
	briefFalsch: 'Dieser Code stimmt nicht. Prüf ihn oder lass dir einen neuen per E-Mail schicken.',
	mailFalsch: 'Dieser Code stimmt nicht. Prüf ihn oder lass dir einen neuen schicken.',
	zuViele: 'Zu viele Versuche. Versuch es in einer Stunde nochmals.',
	// Nicht in der Spec: Netz weg oder Server gestört.
	stoerung: 'Das hat nicht geklappt. Prüf die Verbindung und versuch es nochmals.',
	passkeyFalsch: 'Mit diesem Passkey klappt es nicht. Melde dich mit einem Code an.',
	passkeyEinrichten: 'Das hat nicht geklappt. Du kannst dich weiterhin mit einem Code anmelden.'
} as const;

export type Holen = (pfad: string, init: RequestInit) => Promise<Response>;

export async function sende(pfad: string, inhalt: object, holen: Holen = fetch): Promise<Ergebnis> {
	try {
		const antwort = await holen(pfad, jsonPost(inhalt));
		if (antwort.ok) return { ergebnis: 'ok' };
		if (antwort.status === 429) return { ergebnis: 'zu-viele' };
		if (antwort.status === 400) {
			const { fehler, kontakt } = (await antwort.json()) as { fehler?: unknown; kontakt?: unknown };
			if (fehler === 'benutzt' && typeof kontakt === 'string')
				return { ergebnis: 'benutzt', kontakt };
			if (fehler === 'falsch') return { ergebnis: 'falsch' };
		}
	} catch {
		// Netz weg oder Körper nicht lesbar: unten als Störung.
	}
	return { ergebnis: 'stoerung' };
}

/** Meldung beim Feld; `falsch` ist je nach Seite verschieden. */
export function meldung(r: Ergebnis, falsch: string): string | null {
	switch (r.ergebnis) {
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
