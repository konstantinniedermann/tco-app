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

// Domain aus Teilen ohne Punkt: keine leeren Teile wie in «a@example..org».
const ADRESSE = /^[^\s@,;<>]+@[^\s@,;<>.]+(?:\.[^\s@,;<>.]+)+$/;
// Steuerzeichen (Cc) und unsichtbare Formatzeichen (Cf, z. B. Nullbreite, Schreibrichtung).
const STEUERZEICHEN = /[\p{Cc}\p{Cf}]/u;

/** Fehlertext für eine getrimmte, klein geschriebene E-Mail-Adresse, `null` wenn sie gültig ist. */
export function emailFehler(email: string): string | null {
	if (email === '') return 'fehlt';
	if (email.length > MAX_EMAIL || !ADRESSE.test(email) || STEUERZEICHEN.test(email)) {
		return 'keine gültige E-Mail-Adresse';
	}
	return null;
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

	/**
	 * Liest ein Feld als getrimmte Zeichenkette. `undefined`/`null` ergeben `''`. Zahlen gelten
	 * nur, wo `zahl` es erlaubt ('jahr': endliche Zahl, 'nummer': nicht negative ganze Zahl);
	 * jeder andere Typ setzt den Fehler `'ungültig'` und ergibt `''`.
	 */
	const lies = (feld: Feld, zahl?: 'jahr' | 'nummer'): string => {
		const wert = eingabe[feld];
		if (wert === undefined || wert === null) return '';
		if (typeof wert === 'string') return wert.trim();
		if (
			typeof wert === 'number' &&
			((zahl === 'jahr' && Number.isFinite(wert)) ||
				(zahl === 'nummer' && Number.isSafeInteger(wert) && wert >= 0))
		) {
			return String(wert);
		}
		fehler[feld] = 'ungültig';
		return '';
	};

	const pflicht = (feld: Feld, max = MAX_TEXT): string => {
		const wert = lies(feld);
		if (fehler[feld]) return '';
		if (wert === '') fehler[feld] = 'fehlt';
		else if (wert.length > max) fehler[feld] = `höchstens ${max} Zeichen`;
		else if (STEUERZEICHEN.test(wert))
			fehler[feld] = 'unsichtbares Sonderzeichen, bitte neu eintippen';
		return wert;
	};

	const kennung = (feld: Feld, pflichtig: boolean): string | null => {
		const wert = lies(feld, 'nummer');
		if (fehler[feld]) return null;
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

	const plz = lies('plz');
	if (fehler.plz) {
		// bereits als ungültig markiert
	} else if (plz === '') fehler.plz = 'fehlt';
	else if (!/^\d{4}$/.test(plz)) fehler.plz = '4 Ziffern';

	const email = lies('email').toLowerCase();
	if (!fehler.email) {
		const f = emailFehler(email);
		if (f) fehler.email = f;
	}

	let telefon: string | null = lies('telefon');
	if (telefon === '') telefon = null;
	else if (!/^[\d +]{6,20}$/.test(telefon)) {
		fehler.telefon = '6–20 Zeichen aus Ziffern, Leerzeichen und +';
		telefon = null;
	}

	let geschlecht: 'w' | 'm' | null = null;
	const g = lies('geschlecht');
	if (g === 'w' || g === 'm') geschlecht = g;
	else if (g !== '') fehler.geschlecht = 'w, m oder leer';

	let jahrgang: number | null = null;
	const jText = lies('jahrgang', 'jahr');
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

const TEXT_ODER_LEER = new Set<Feld>(['mitgliedernummer', 'telefon', 'lizenznummer']);

/**
 * Liest den Stand, den die Seite beim Laden erhalten hat (`Detail.angaben`, mitgeschickt beim
 * Speichern). Er wird nur verglichen, nicht gespeichert, darum ohne Normalisierung; `null`, wenn
 * die Form nicht stimmt.
 */
export function leseStand(roh: unknown): Angaben | null {
	if (roh === null || typeof roh !== 'object' || Array.isArray(roh)) return null;
	const s = roh as Record<string, unknown>;
	for (const feld of FELDER) {
		const wert = s[feld];
		const ok =
			feld === 'jahrgang'
				? wert === null || typeof wert === 'number'
				: feld === 'geschlecht'
					? wert === null || wert === 'w' || wert === 'm'
					: typeof wert === 'string' || (wert === null && TEXT_ODER_LEER.has(feld));
		if (!ok) return null;
	}
	return Object.fromEntries(FELDER.map((f) => [f, s[f]])) as Angaben;
}
