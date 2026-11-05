// Angaben eines Anlasses und Antworten der Mitglieder prüfen, ohne Datenbank.
import { zuerichZuUtc } from '../../anlass/zeit.ts';
import type { Antwort } from '../db/schema.ts';

export type AnlassFeld = 'titel' | 'beginn' | 'ort' | 'einladung' | 'anmeldeschluss';

export type AnlassWerte = {
	titel: string;
	beginn: Date;
	ort: string;
	einladung: string;
	anmeldeschluss: Date;
};

export const MAX_KURZ = 120;
export const MAX_EINLADUNG = 5000;
export const MAX_BEMERKUNG = 500;

const MELDUNG = {
	titel: 'Bitte einen Titel angeben.',
	zeit: 'Bitte Datum und Zeit angeben.',
	ort: 'Bitte einen Ort angeben.',
	schluss: 'Der Anmeldeschluss darf nicht nach dem Beginn liegen.',
	kurz: `Höchstens ${MAX_KURZ} Zeichen.`,
	einladung: `Höchstens ${MAX_EINLADUNG} Zeichen.`
} as const;

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const zeit = (v: unknown) => (typeof v === 'string' ? zuerichZuUtc(v) : null);

export function pruefeAnlass(
	roh: Record<string, unknown>
): { ok: true; werte: AnlassWerte } | { ok: false; felder: Partial<Record<AnlassFeld, string>> } {
	const felder: Partial<Record<AnlassFeld, string>> = {};
	const titel = text(roh.titel);
	const ort = text(roh.ort);
	const einladung = text(roh.einladung);
	const beginn = zeit(roh.beginn);
	const anmeldeschluss = zeit(roh.anmeldeschluss);

	if (!titel) felder.titel = MELDUNG.titel;
	else if (titel.length > MAX_KURZ) felder.titel = MELDUNG.kurz;
	if (!beginn) felder.beginn = MELDUNG.zeit;
	if (!ort) felder.ort = MELDUNG.ort;
	else if (ort.length > MAX_KURZ) felder.ort = MELDUNG.kurz;
	if (einladung.length > MAX_EINLADUNG) felder.einladung = MELDUNG.einladung;
	if (!anmeldeschluss) felder.anmeldeschluss = MELDUNG.zeit;
	else if (beginn && anmeldeschluss > beginn) felder.anmeldeschluss = MELDUNG.schluss;

	if (Object.keys(felder).length > 0 || !beginn || !anmeldeschluss) return { ok: false, felder };
	return { ok: true, werte: { titel, beginn, ort, einladung, anmeldeschluss } };
}

export function pruefeAntwort(
	roh: Record<string, unknown>
):
	| { ok: true; antwort: Antwort; bemerkung: string | null }
	| { ok: false; feld: 'antwort' | 'bemerkung' } {
	const antwort = roh.antwort;
	if (antwort !== 'kommt' && antwort !== 'kommt-nicht') return { ok: false, feld: 'antwort' };
	if (antwort === 'kommt') return { ok: true, antwort, bemerkung: null };
	if (roh.bemerkung !== undefined && roh.bemerkung !== null && typeof roh.bemerkung !== 'string')
		return { ok: false, feld: 'bemerkung' };
	const bemerkung = text(roh.bemerkung);
	if (bemerkung.length > MAX_BEMERKUNG) return { ok: false, feld: 'bemerkung' };
	return { ok: true, antwort, bemerkung: bemerkung || null };
}
