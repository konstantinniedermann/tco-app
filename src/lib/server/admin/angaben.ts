export const FELDER = [
	'mitgliedernummer',
	'vorname',
	'nachname',
	'strasse',
	'plz',
	'ort',
	'email',
	'telefon',
	'geschlecht',
	'jahrgang',
	'lizenznummer'
] as const;

export type Feld = (typeof FELDER)[number];

export type Angaben = {
	mitgliedernummer: string | null;
	vorname: string;
	nachname: string;
	strasse: string;
	plz: string;
	ort: string;
	email: string;
	telefon: string | null;
	geschlecht: 'w' | 'm' | null;
	jahrgang: number | null;
	lizenznummer: string | null;
};

export type Pruefung =
	{ ok: true; angaben: Angaben } | { ok: false; fehler: Partial<Record<Feld, string>> };

const MAX_TEXT = 100;
const MAX_EMAIL = 254;

/** Zeichenkette ohne Ränder; leer, fehlend oder kein Text ergibt `''`. */
function text(wert: unknown): string {
	return typeof wert === 'string' ? wert.trim() : '';
}

/**
 * Prüft und normalisiert Mitgliederangaben aus Formular, CSV oder Befehl. Leere freiwillige
 * Felder werden `null` (die Datenbank kennt keine leeren Zeichenketten). Unbekannte Schlüssel
 * werden ignoriert.
 */
export function pruefeAngaben(
	roh: unknown,
	opt: { nummerPflicht: boolean; jahr: number }
): Pruefung {
	if (roh === null || typeof roh !== 'object' || Array.isArray(roh)) {
		return { ok: false, fehler: { vorname: 'fehlt' } };
	}
	const eingabe = roh as Record<string, unknown>;
	const fehler: Partial<Record<Feld, string>> = {};

	const pflicht = (feld: Feld, max = MAX_TEXT): string => {
		const wert = text(eingabe[feld]);
		if (wert === '') fehler[feld] = 'fehlt';
		else if (wert.length > max) fehler[feld] = `höchstens ${max} Zeichen`;
		return wert;
	};

	const kennung = (feld: Feld, pflichtig: boolean): string | null => {
		const wert = text(eingabe[feld]);
		if (wert === '') {
			if (pflichtig) fehler[feld] = 'fehlt';
			return null;
		}
		if (!/^[A-Za-z0-9]{1,20}$/.test(wert)) {
			fehler[feld] = '1–20 Ziffern oder Buchstaben';
			return null;
		}
		return wert;
	};

	const mitgliedernummer = kennung('mitgliedernummer', opt.nummerPflicht);
	const vorname = pflicht('vorname');
	const nachname = pflicht('nachname');
	const strasse = pflicht('strasse');
	const ort = pflicht('ort');

	const plz = text(eingabe.plz);
	if (plz === '') fehler.plz = 'fehlt';
	else if (!/^\d{4}$/.test(plz)) fehler.plz = '4 Ziffern';

	const email = text(eingabe.email).toLowerCase();
	if (email === '') fehler.email = 'fehlt';
	else if (email.length > MAX_EMAIL || !email.includes('@')) {
		fehler.email = 'keine gültige E-Mail-Adresse';
	}

	let telefon: string | null = text(eingabe.telefon);
	if (telefon === '') telefon = null;
	else if (!/^[\d +]{6,20}$/.test(telefon)) {
		fehler.telefon = '6–20 Zeichen aus Ziffern, Leerzeichen und +';
		telefon = null;
	}

	let geschlecht: 'w' | 'm' | null = null;
	const g = text(eingabe.geschlecht);
	if (g === 'w' || g === 'm') geschlecht = g;
	else if (g !== '') fehler.geschlecht = 'w, m oder leer';

	let jahrgang: number | null = null;
	const j = eingabe.jahrgang;
	const jText = typeof j === 'number' ? String(j) : text(j);
	if (jText !== '') {
		const zahl = /^\d{4}$/.test(jText) ? Number(jText) : NaN;
		if (zahl >= 1900 && zahl <= opt.jahr) jahrgang = zahl;
		else fehler.jahrgang = `vierstellig, zwischen 1900 und ${opt.jahr}`;
	}

	const lizenznummer = kennung('lizenznummer', false);

	if (Object.keys(fehler).length > 0) return { ok: false, fehler };
	return {
		ok: true,
		angaben: {
			mitgliedernummer,
			vorname,
			nachname,
			strasse,
			plz,
			ort,
			email,
			telefon,
			geschlecht,
			jahrgang,
			lizenznummer
		}
	};
}
