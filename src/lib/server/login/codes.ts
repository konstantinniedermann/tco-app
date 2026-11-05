import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const BRIEF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const BRIEF_CODE_GUELTIG_MS = 90 * 24 * 60 * 60 * 1000;
export const MAIL_CODE_GUELTIG_MS = 15 * 60 * 1000;
export const MAIL_CODE_MAX_FEHLVERSUCHE = 5;

const BRIEF_LAENGE = 10;
const MAIL_LAENGE = 6;

type Zufall = (n: number) => Uint8Array;

/**
 * Zieht `laenge` Zeichen aus `vorrat`. Bytes ab der grössten durch die Vorratsgrösse
 * teilbaren Grenze werden verworfen (Rejection Sampling), damit kein Zeichen häufiger
 * vorkommt als die anderen.
 */
function ziehe(vorrat: string, laenge: number, zufall: Zufall): string {
	const grenze = 256 - (256 % vorrat.length);
	let ergebnis = '';
	while (ergebnis.length < laenge) {
		for (const byte of zufall(laenge - ergebnis.length)) {
			if (byte < grenze) ergebnis += vorrat[byte % vorrat.length];
		}
	}
	return ergebnis;
}

export function erzeugeBriefCode(zufall: Zufall = randomBytes): string {
	return ziehe(BRIEF_ALPHABET, BRIEF_LAENGE, zufall);
}

export function erzeugeMailCode(zufall: Zufall = randomBytes): string {
	return ziehe('0123456789', MAIL_LAENGE, zufall);
}

export function normalisiereBriefCode(eingabe: string): string | null {
	if (eingabe.length > 100) return null;
	const code = eingabe.replace(/[\s-]/g, '').toUpperCase();
	if (code.length !== BRIEF_LAENGE) return null;
	for (const zeichen of code) if (!BRIEF_ALPHABET.includes(zeichen)) return null;
	return code;
}

export function normalisiereMailCode(eingabe: string): string | null {
	if (eingabe.length > 100) return null;
	const code = eingabe.replace(/\s/g, '');
	return /^\d{6}$/.test(code) ? code : null;
}

export function formatiereBriefCode(code: string): string {
	return `${code.slice(0, 5)}-${code.slice(5)}`;
}

function hmac(schluessel: string, daten: string): string {
	return createHmac('sha256', schluessel).update(daten).digest('hex');
}

export function hashBriefCode(schluessel: string, code: string): string {
	return hmac(schluessel, `brief:${code}`);
}

export function hashMailCode(schluessel: string, kontoId: number, code: string): string {
	return hmac(schluessel, `mail:${kontoId}:${code}`);
}

// SI-09: Die Art gehört in den Hash, damit vertauschte Codes nicht passen.
export function hashWechselCode(
	schluessel: string,
	kontoId: number,
	art: 'alt' | 'neu',
	code: string
): string {
	return hmac(schluessel, `wechsel:${art}:${kontoId}:${code}`);
}

export function hashAdminCode(schluessel: string, sitzungHash: string, code: string): string {
	return hmac(schluessel, `admin:${sitzungHash}:${code}`);
}

export function gleich(a: string, b: string): boolean {
	const x = Buffer.from(a);
	const y = Buffer.from(b);
	return x.length === y.length && timingSafeEqual(x, y);
}
