// Eigene Angaben im Profil (A-KONTO-01, A-KONTO-02): Anfragen an `/api/profil…` und die
// Meldungen dazu (UI-06). Läuft nur im Browser, darum aus src/lib/server nur Typen.
// Annahme K-19.1: Telefon, Lizenznummer und E-Mail ändert das Mitglied selbst.
// Annahme K-19.2: die Adresse (Strasse, PLZ, Ort) ebenso.

import { rufeAb, woerterAus, type Holen, type Vertrag } from '../abruf.ts';
import { jsonPost } from '../json-post.ts';
import type { EigeneAngaben, EigenesFeld } from '../server/profil/angaben.ts';
import { istKlassierung, type Klassierung } from '../turnier/klassierung.ts';

export type { EigeneAngaben, EigenesFeld };

export type Ergebnis =
	'ok' | 'veraltet' | 'eingabe' | 'gleich' | 'zu-viele' | 'falsch' | 'stoerung';

export type Speichern =
	| { art: 'ok' | 'veraltet' | 'stoerung' }
	| {
			art: 'eingabe';
			felder: Partial<Record<EigenesFeld, string>>;
			/** Die Prüfung scheitert an einem Feld, das nur der Mitglieder-Admin ändert (Altdaten). */
			fremd: boolean;
	  };

export const MELDUNG_PROFIL = {
	veraltet: 'Deine Angaben wurden inzwischen geändert. Hier ist der neue Stand.',
	gleich: 'Das ist schon deine Adresse.',
	emailUngueltig: 'Das ist keine gültige E-Mail-Adresse. Prüf die Schreibweise.',
	codesFalsch:
		'Mindestens ein Code stimmt nicht oder ist abgelaufen. Prüfe beide Mails oder fordere neue Codes an.',
	neueCodes: 'Neue Codes sind unterwegs.',
	emailFehlt: 'Tipp deine neue E-Mail-Adresse ein.',
	codesFehlen: 'Tipp beide Codes ein, je 6 Ziffern aus den zwei Mails.'
} as const;

/**
 * Prüfung im Browser, bevor etwas zum Server geht (UI-06: Meldung beim Feld statt Browser-Blase).
 * Nur «fehlt»; ob eine Adresse gültig ist oder ein Code stimmt, entscheidet der Server.
 */
export function emailEingabeFehler(email: string): string | null {
	return email.trim() === '' ? MELDUNG_PROFIL.emailFehlt : null;
}

export function codeEingabeFehler(codeAlt: string, codeNeu: string): string | null {
	return codeAlt.trim() === '' || codeNeu.trim() === '' ? MELDUNG_PROFIL.codesFehlen : null;
}

/** Meldung, wenn Altdaten in einem Feld des Mitglieder-Admins das Speichern verhindern. */
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

/**
 * Die Fehlerwörter, die das Profil kennt. Der Körper ist nachsichtig: unlesbar gilt als leer. 401 und
 * 404 kennt das Profil nicht, sie bleiben Störung.
 */
type Wort = Exclude<Ergebnis, 'ok' | 'stoerung'>;
const VERTRAG: Vertrag<Wort> = {
	woerter: woerterAus<Wort>({
		veraltet: true,
		eingabe: true,
		gleich: true,
		falsch: true,
		'zu-viele': true
	}),
	koerper: 'nachsichtig'
};

/** Nur Daten: Jede Antwort ausser einem Erfolg ist `null`. */
const NUR_DATEN: Vertrag<never> = { woerter: [], koerper: 'nachsichtig' };

async function schicke(
	pfad: string,
	inhalt: object,
	holen: Holen
): Promise<{ art: Ergebnis; koerper: Record<string, unknown> }> {
	const r = await rufeAb<unknown, Wort>(pfad, jsonPost(inhalt), holen, VERTRAG);
	if (r.art === 'ok') return { art: 'ok', koerper: istObjekt(r.daten) ? r.daten : {} };
	if (r.art === 'stoerung') return { art: 'stoerung', koerper: {} };
	return { art: r.art, koerper: r.koerper };
}

/** Der Körper eines Erfolgs (kein Objekt gilt als leer); `null` bei jeder anderen Antwort. */
async function lade(pfad: string, holen: Holen): Promise<Record<string, unknown> | null> {
	const r = await rufeAb<unknown, never>(pfad, { method: 'GET' }, holen, NUR_DATEN);
	if (r.art !== 'ok') return null;
	return istObjekt(r.daten) ? r.daten : {};
}

/**
 * Angaben des angemeldeten Mitglieds, seine Klassierung (FR-37) und sein Rufname: beide gehören
 * nicht zu den Angaben der Verwaltung und kommen darum extra; `null` bei Störung oder ohne Sitzung.
 */
export async function ladeProfil(holen: Holen = fetch): Promise<{
	angaben: EigeneAngaben;
	klassierung: Klassierung | null;
	rufname: string | null;
} | null> {
	const k = await lade('/api/profil', holen);
	if (k === null || !istObjekt(k.angaben)) return null;
	return {
		angaben: k.angaben as EigeneAngaben,
		klassierung: istKlassierung(k.klassierung) ? k.klassierung : null,
		rufname: typeof k.rufname === 'string' ? k.rufname : null
	};
}

/** Angaben des angemeldeten Mitglieds; `null` bei Störung oder ohne Sitzung. */
export async function ladeAngaben(holen: Holen = fetch): Promise<EigeneAngaben | null> {
	return (await ladeProfil(holen))?.angaben ?? null;
}

/** Kontakt des Vereins für Fragen (Annahme K-21); `null`, wenn er sich nicht laden lässt. */
export async function ladeKontakt(holen: Holen = fetch): Promise<string | null> {
	const k = await lade('/api/kontakt', holen);
	return typeof k?.kontakt === 'string' ? k.kontakt : null;
}

/** `vorher`: die Angaben, wie die Seite sie geladen hat; sonst `veraltet` (zweiter Tab, Mitglieder-Admin). */
export async function speichereAngaben(
	neu: Partial<Record<EigenesFeld, string>>,
	vorher: EigeneAngaben,
	holen: Holen = fetch
): Promise<Speichern> {
	const { art, koerper } = await schicke('/api/profil', { angaben: neu, vorher }, holen);
	if (art === 'ok' || art === 'veraltet') return { art };
	if (art === 'eingabe') {
		const felder = istObjekt(koerper.felder)
			? (koerper.felder as Partial<Record<EigenesFeld, string>>)
			: {};
		return { art, felder, fremd: koerper.fremd === true };
	}
	return { art: 'stoerung' };
}

/** Schickt je einen Code an die bisherige und die neue Adresse. */
export async function starteWechsel(
	email: string,
	holen: Holen = fetch
): Promise<{ art: Ergebnis }> {
	return { art: (await schicke('/api/profil/email', { email }, holen)).art };
}

export async function bestaetigeWechsel(
	codeAlt: string,
	codeNeu: string,
	holen: Holen = fetch
): Promise<{ art: Ergebnis }> {
	return { art: (await schicke('/api/profil/email/bestaetigen', { codeAlt, codeNeu }, holen)).art };
}

/** Rufname im Profil setzen; leer löscht ihn. Bei `eingabe` steht die Meldung des Servers bereit. */
export async function speichereRufname(
	rufname: string,
	holen: Holen = fetch
): Promise<
	{ art: 'ok'; rufname: string | null } | { art: 'eingabe'; fehler: string } | { art: 'stoerung' }
> {
	const { art, koerper } = await schicke('/api/profil/rufname', { rufname }, holen);
	if (art === 'ok') {
		return { art, rufname: typeof koerper.rufname === 'string' ? koerper.rufname : null };
	}
	if (art === 'eingabe') {
		const felder = istObjekt(koerper.felder) ? koerper.felder : {};
		return {
			art,
			fehler: typeof felder.rufname === 'string' ? felder.rufname : 'Ungültig.'
		};
	}
	return { art: 'stoerung' };
}
