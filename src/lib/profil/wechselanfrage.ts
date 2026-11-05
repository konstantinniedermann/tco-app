// Merkt sich im Browser die neue Adresse eines angefangenen E-Mail-Wechsels (A-KONTO-01), wie
// der Login die Mail-Anfrage: Wechselt die Startbildschirm-App in die Mail-App und lädt danach
// neu, steht wieder Schritt 2 da. 15 Minuten gültig (wie die Codes), eigener Schlüssel; jeder
// Zugriff in try/catch (siehe mailanfrage.ts).

import {
	leseMailanfrage,
	merkeMailanfrage,
	vergissMailanfrage,
	type Speicher
} from '../login/mailanfrage.ts';

export const WECHSEL_SCHLUESSEL = 'mytco-email-wechsel';

export type WechselZustand = { schritt: 'adresse' | 'codes'; email: string };

export function merkeWechsel(s: Pick<Storage, 'setItem'>, email: string, jetzt: number): void {
	merkeMailanfrage(s, email, jetzt, WECHSEL_SCHLUESSEL);
}

export function vergissWechsel(s: Pick<Storage, 'removeItem'>): void {
	vergissMailanfrage(s, WECHSEL_SCHLUESSEL);
}

/** Beim Start der App: abgelaufene oder kaputte Einträge löschen (gültige bleiben). */
export function raeumeWechselAuf(s: Speicher, jetzt: number): void {
	leseMailanfrage(s, jetzt, WECHSEL_SCHLUESSEL);
}

/** Womit die Unterseite startet: mit gültigem Eintrag gleich bei den Codes. */
export function startZustand(s: Speicher, jetzt: number): WechselZustand {
	const email = leseMailanfrage(s, jetzt, WECHSEL_SCHLUESSEL);
	return email ? { schritt: 'codes', email } : { schritt: 'adresse', email: '' };
}
