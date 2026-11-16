// Vorlagen für Mitteilungen (Spec Ziel 7) und die Grenzen jeder Mitteilung (FR-42). Rein, ohne
// Server-Teile: Das Formular füllt die Vorlage im Browser, sobald der Admin sie wählt.
import { formatiereBeginn, formatiereTag } from '../anlass/zeit.ts';

/** FR-42: Längere Pushes kürzt das iPhone. */
export const MAX_TITEL = 50;
export const MAX_TEXT = 200;

/** FR-42: Satz je Feld, wenn die Angaben einer Mitteilung nicht passen (UI-06); der Server schickt ihn. */
export const FELD_MELDUNG = {
	titel: `Bitte einen Titel mit höchstens ${MAX_TITEL} Zeichen angeben.`,
	text: `Bitte einen Text mit höchstens ${MAX_TEXT} Zeichen angeben.`,
	auswahl: 'Bitte die Empfänger wählen.',
	weg: 'Bitte einen Weg wählen.'
} as const;

export type VorlageArt = 'erinnerung' | 'aenderung' | 'neu';
export type Vorlage = { art: VorlageArt; titel: string; text: string };

const AUSLASSUNG = '…';

/** Höchstens `max` Zeichen (UTF-16 wie `maxlength`); gekürzt endet es auf `…`. */
function kuerze(s: string, max: number): string {
	if (s.length <= max) return s;
	let teil = s.slice(0, max - AUSLASSUNG.length);
	// Kein halbes Zeichen ausserhalb der Grundebene (z. B. Emoji) stehen lassen.
	if (/[\uD800-\uDBFF]$/.test(teil)) teil = teil.slice(0, -1);
	return teil.trimEnd() + AUSLASSUNG;
}

/** `vor` + Anlasstitel + `nach`, wobei nur der Anlasstitel gekürzt wird, bis es in `max` passt. */
const mitTitel = (vor: string, titel: string, nach: string, max: number) =>
	vor + kuerze(titel, max - vor.length - nach.length) + nach;

export function vorlagenAnlass(a: {
	titel: string;
	beginn: Date;
	anmeldeschluss: Date;
}): Vorlage[] {
	const t = a.titel;
	const titel = (vor: string) => mitTitel(vor, t, '', MAX_TITEL);
	const text = (vor: string, nach: string) => mitTitel(vor, t, nach, MAX_TEXT);
	const schluss = formatiereTag(a.anmeldeschluss.toISOString());
	const beginn = formatiereBeginn(a.beginn.toISOString());
	return [
		{
			art: 'erinnerung',
			titel: titel('Erinnerung: '),
			text: text('', `: Bitte melde dich bis ${schluss} an oder ab.`)
		},
		{
			art: 'aenderung',
			titel: titel('Geändert: '),
			text: text('', ': Datum, Zeit oder Ort geändert. Bitte prüfe deine Antwort.')
		},
		{
			art: 'neu',
			titel: titel('Neuer Anlass: '),
			text: text('Neu in MyTCO: ', ` am ${beginn}. Melde dich an.`)
		}
	];
}
