// Anfragen der Login-Seiten an die Schnittstellen und die Meldungen dazu (UI-06).
// Texte wörtlich aus der Spec «Login per Einmal-Code», Abschnitt «Ablauf in der App».

import { rufeAb, type Holen, type Vertrag } from '../abruf.ts';
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

/** Die Fehlerwörter des Logins; der Körper ist nachsichtig (Erfolg und 429 brauchen keinen). */
type Wort = 'falsch' | 'benutzt' | 'zu-viele';
const VERTRAG: Vertrag<Wort> = {
	woerter: ['falsch', 'benutzt', 'zu-viele'],
	koerper: 'nachsichtig'
};

export async function sende(pfad: string, inhalt: object, holen: Holen = fetch): Promise<Ergebnis> {
	const r = await rufeAb<unknown, Wort>(pfad, jsonPost(inhalt), holen, VERTRAG);
	switch (r.art) {
		case 'ok':
			return { ergebnis: 'ok' };
		case 'falsch':
		case 'zu-viele':
			return { ergebnis: r.art };
		case 'benutzt':
			return typeof r.koerper.kontakt === 'string'
				? { ergebnis: 'benutzt', kontakt: r.koerper.kontakt }
				: { ergebnis: 'stoerung' };
		default:
			return { ergebnis: 'stoerung' };
	}
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
