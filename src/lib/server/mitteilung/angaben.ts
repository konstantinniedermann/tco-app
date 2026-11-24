// Angaben einer Mitteilung prüfen, ohne Datenbank (FR-42 bis FR-44).
import type { TurnierAuswahl } from '../../mitteilung/auswahl.ts';
import { MAX_TEXT, MAX_TITEL } from '../../mitteilung/vorlagen.ts';
import type { Art, Weg } from '../db/schema.ts';

export type MitteilungFeld = 'titel' | 'text' | 'auswahl' | 'kategorie' | 'weg';
export type MitteilungWerte = { titel: string; text: string; auswahl: string; weg: Weg };

export const WEGE: readonly Weg[] = ['push', 'push-sonst-mail', 'push-und-mail'];

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const passt = (s: string, max: number) => s.length > 0 && s.length <= max;

/** `auswahlen`: die Empfänger-Auswahlen, die der Bezug kennt (z. B. `ANLASS_AUSWAHLEN`). */
export function pruefeMitteilung(
	roh: unknown,
	auswahlen: readonly string[]
): { ok: true; werte: MitteilungWerte } | { ok: false; felder: MitteilungFeld[] } {
	const r = typeof roh === 'object' && roh !== null ? (roh as Record<string, unknown>) : {};
	const titel = text(r.titel);
	const inhalt = text(r.text);
	const { auswahl, weg } = r;
	const felder: MitteilungFeld[] = [];
	if (!passt(titel, MAX_TITEL)) felder.push('titel');
	if (!passt(inhalt, MAX_TEXT)) felder.push('text');
	if (typeof auswahl !== 'string' || !auswahlen.includes(auswahl)) felder.push('auswahl');
	if (!WEGE.includes(weg as Weg)) felder.push('weg');
	if (felder.length > 0) return { ok: false, felder };
	return { ok: true, werte: { titel, text: inhalt, auswahl: auswahl as string, weg: weg as Weg } };
}

/**
 * Spec A6: die Kategorie einer Mitteilung zum Turnier (`kategorieId` im Körper). Fehlt sie oder ist
 * sie `null`, gilt das ganze Turnier. `kategorien` sind die aktiven Kategorien dieses Turniers: Eine
 * abgesagte oder fremde ist darum unbekannt. Bei *alle* gibt es keine Kategorie, bei *sucht Partner*
 * nur eine Doppel-Kategorie.
 */
export function pruefeKategorie(
	roh: unknown,
	auswahl: TurnierAuswahl,
	kategorien: readonly { id: number; name: string; art: Art }[]
): { ok: true; kategorie: { id: number; name: string } | null } | { ok: false } {
	const r = typeof roh === 'object' && roh !== null ? (roh as Record<string, unknown>) : {};
	const id = r.kategorieId;
	if (id === undefined || id === null) return { ok: true, kategorie: null };
	if (auswahl === 'alle') return { ok: false };
	const k = kategorien.find((k) => Number.isInteger(id) && k.id === id);
	if (!k || (auswahl === 'sucht-partner' && k.art !== 'doppel')) return { ok: false };
	return { ok: true, kategorie: { id: k.id, name: k.name } };
}
