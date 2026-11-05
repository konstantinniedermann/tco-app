// Eigene Angaben im Profil (A-KONTO-01, A-KONTO-02): Anfragen an `/api/profil…` und die
// Meldungen dazu (UI-06). Läuft nur im Browser, darum aus src/lib/server nur Typen.
// Annahme K-19.1: Telefon, Lizenznummer und E-Mail ändert das Mitglied selbst.
// Annahme K-19.2: die Adresse (Strasse, PLZ, Ort) ebenso.

import { jsonPost } from '../json-post.ts';
import type { Holen } from '../login/anmelden.ts';
import type { EigeneAngaben, EigenesFeld } from '../server/profil/angaben.ts';

export type { EigeneAngaben, EigenesFeld };

export type Ergebnis =
	'ok' | 'veraltet' | 'eingabe' | 'gleich' | 'zu-viele' | 'falsch' | 'stoerung';

export type Speichern =
	| { ergebnis: 'ok' | 'veraltet' | 'stoerung' }
	| {
			ergebnis: 'eingabe';
			felder: Partial<Record<EigenesFeld, string>>;
			/** Die Prüfung scheitert an einem Feld, das nur der Admin ändert (Altdaten). */
			fremd: boolean;
	  };

export const MELDUNG_PROFIL = {
	veraltet: 'Deine Angaben wurden inzwischen geändert. Hier ist der neue Stand.',
	gleich: 'Das ist schon deine Adresse.',
	emailUngueltig: 'Das ist keine gültige E-Mail-Adresse. Prüf die Schreibweise.',
	codesFalsch:
		'Mindestens ein Code stimmt nicht oder ist abgelaufen. Prüfe beide Mails oder fordere neue Codes an.',
	neueCodes: 'Neue Codes sind unterwegs.'
} as const;

/** Meldung, wenn Altdaten in einem Feld des Admins das Speichern verhindern. */
export function fremdMeldung(kontakt: string | null): string {
	const satz = 'Deine Angaben lassen sich gerade nicht speichern.';
	return kontakt
		? `${satz} Bitte melde dich bei ${kontakt}.`
		: `${satz} Den Kontakt findest du in deinem Brief.`;
}

/**
 * Stand nach erfolgreichem Speichern, falls er sich nicht neu laden lässt: wie der Server
 * getrimmt, leeres Telefon bzw. leere Lizenznummer als `null`.
 */
export function mitAenderung(
	angaben: EigeneAngaben,
	neu: Partial<Record<EigenesFeld, string>>
): EigeneAngaben {
	const stand = { ...angaben };
	for (const [feld, roh] of Object.entries(neu) as [EigenesFeld, string][]) {
		const wert = roh.trim();
		if (feld === 'telefon' || feld === 'lizenznummer') stand[feld] = wert === '' ? null : wert;
		else stand[feld] = wert;
	}
	return stand;
}

function istObjekt(x: unknown): x is Record<string, unknown> {
	return typeof x === 'object' && x !== null && !Array.isArray(x);
}

async function leseJson(antwort: Response): Promise<Record<string, unknown>> {
	try {
		const inhalt: unknown = await antwort.json();
		return istObjekt(inhalt) ? inhalt : {};
	} catch {
		return {};
	}
}

/** Was Status und `fehler` der Schnittstelle bedeuten. */
function deute(status: number, k: Record<string, unknown>): Ergebnis {
	if (status >= 200 && status < 300) return 'ok';
	if (status === 409 && k.fehler === 'veraltet') return 'veraltet';
	if (status === 429) return 'zu-viele';
	if (status === 400 && (k.fehler === 'eingabe' || k.fehler === 'gleich' || k.fehler === 'falsch'))
		return k.fehler;
	return 'stoerung';
}

async function schicke(
	pfad: string,
	inhalt: object,
	holen: Holen
): Promise<{ ergebnis: Ergebnis; koerper: Record<string, unknown> }> {
	try {
		const antwort = await holen(pfad, jsonPost(inhalt));
		const koerper = await leseJson(antwort);
		return { ergebnis: deute(antwort.status, koerper), koerper };
	} catch {
		// Netz weg.
		return { ergebnis: 'stoerung', koerper: {} };
	}
}

/** Angaben des angemeldeten Mitglieds; `null` bei Störung oder ohne Sitzung. */
export async function ladeAngaben(holen: Holen = fetch): Promise<EigeneAngaben | null> {
	try {
		const antwort = await holen('/api/profil', { method: 'GET' });
		if (!antwort.ok) return null;
		const { angaben } = await leseJson(antwort);
		return istObjekt(angaben) ? (angaben as EigeneAngaben) : null;
	} catch {
		return null;
	}
}

/** Kontakt des Vereins für Fragen (Annahme K-21); `null`, wenn er sich nicht laden lässt. */
export async function ladeKontakt(holen: Holen = fetch): Promise<string | null> {
	try {
		const antwort = await holen('/api/kontakt', { method: 'GET' });
		if (!antwort.ok) return null;
		const { kontakt } = await leseJson(antwort);
		return typeof kontakt === 'string' ? kontakt : null;
	} catch {
		return null;
	}
}

/** `vorher`: die Angaben, wie die Seite sie geladen hat; sonst `veraltet` (zweiter Tab, Admin). */
export async function speichereAngaben(
	neu: Partial<Record<EigenesFeld, string>>,
	vorher: EigeneAngaben,
	holen: Holen = fetch
): Promise<Speichern> {
	const { ergebnis, koerper } = await schicke('/api/profil', { angaben: neu, vorher }, holen);
	if (ergebnis === 'ok' || ergebnis === 'veraltet') return { ergebnis };
	if (ergebnis === 'eingabe') {
		const felder = istObjekt(koerper.felder)
			? (koerper.felder as Partial<Record<EigenesFeld, string>>)
			: {};
		return { ergebnis, felder, fremd: koerper.fremd === true };
	}
	return { ergebnis: 'stoerung' };
}

/** Schickt je einen Code an die bisherige und die neue Adresse. */
export async function starteWechsel(email: string, holen: Holen = fetch): Promise<Ergebnis> {
	return (await schicke('/api/profil/email', { email }, holen)).ergebnis;
}

export async function bestaetigeWechsel(
	codeAlt: string,
	codeNeu: string,
	holen: Holen = fetch
): Promise<Ergebnis> {
	return (await schicke('/api/profil/email/bestaetigen', { codeAlt, codeNeu }, holen)).ergebnis;
}
