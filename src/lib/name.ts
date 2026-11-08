// Wie Namen angezeigt werden. Läuft auch im Browser: keine Importe aus src/lib/server.

export const RUFNAME_MAX = 10;
// Harte Grenze für die Textlänge: ein Graphem kann beliebig viele kombinierende Zeichen tragen.
export const RUFNAME_MAX_TEXT = 40;

export type Namensteile = { rufname: string | null; vorname: string; nachname: string };
export type Namensform = 'vorname-zuerst' | 'nachname-zuerst';

// Gleiches Muster wie in server/admin/angaben.ts, hier eigen, weil dieses Modul im Browser läuft.
const STEUERZEICHEN = /[\p{Cc}\p{Cf}]/u;

const klein = (s: string) => s.trim().toLocaleLowerCase('de-CH');

/** Der Rufname, wenn er angezeigt werden soll; `null` bei leer oder gleich dem Vornamen. */
export function sichtbarerRufname(n: Namensteile): string | null {
	const rufname = n.rufname?.trim();
	if (!rufname || klein(rufname) === klein(n.vorname)) return null;
	return rufname;
}

export function amtlicherName(n: Namensteile, form: Namensform): string {
	return form === 'vorname-zuerst' ? `${n.vorname} ${n.nachname}` : `${n.nachname}, ${n.vorname}`;
}

/** Wie das Mitglied angesprochen wird: Rufname, sonst Vorname. */
export function anredeName(n: Pick<Namensteile, 'rufname' | 'vorname'>): string {
	return sichtbarerRufname({ ...n, nachname: '' }) ?? n.vorname;
}

/** Kurze Textform: «Hannes (Johannes Muster)», ohne Rufname nur der amtliche Name. */
export function nameText(n: Namensteile, form: Namensform): string {
	const rufname = sichtbarerRufname(n);
	const amtlich = amtlicherName(n, form);
	return rufname ? `${rufname} (${amtlich})` : amtlich;
}

const grapheme = new Intl.Segmenter('de-CH', { granularity: 'grapheme' });

export function pruefeRufname(
	roh: unknown
): { ok: true; rufname: string | null } | { ok: false; fehler: string } {
	if (roh === null || roh === undefined) return { ok: true, rufname: null };
	if (typeof roh !== 'string') return { ok: false, fehler: 'Ungültig.' };
	const rufname = roh.trim();
	if (rufname === '') return { ok: true, rufname: null };
	if (STEUERZEICHEN.test(rufname)) {
		return { ok: false, fehler: 'Unsichtbares Sonderzeichen, bitte neu eintippen.' };
	}
	if (rufname.length > RUFNAME_MAX_TEXT || [...grapheme.segment(rufname)].length > RUFNAME_MAX) {
		return { ok: false, fehler: `Höchstens ${RUFNAME_MAX} Zeichen.` };
	}
	return { ok: true, rufname };
}
