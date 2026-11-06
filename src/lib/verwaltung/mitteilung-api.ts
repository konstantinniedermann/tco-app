// Mitteilungen in der Verwaltung (FR-42 bis FR-45): Anfragen an `/api/admin/…/mitteilungen` und
// die Texte, mit denen Formular, Vorschau und Verlauf Auswahl, Weg und Zahlen in Worten zeigen.
import type { AnlassAuswahl } from '../mitteilung/auswahl.ts';
import { MAX_TEXT, MAX_TITEL, type Vorlage } from '../mitteilung/vorlagen.ts';
import type { Weg } from '../server/db/schema.ts';
import type { MitteilungFeld } from '../server/mitteilung/angaben.ts';
import type { Bezug, VerlaufEintrag } from '../server/mitteilung/verlauf.ts';
import type { Zahlen } from '../server/mitteilung/versand.ts';
import { lese, schicke, type Antwort, type Holen, type Json } from './api.ts';

export type { Bezug, MitteilungFeld, Vorlage, Weg, Zahlen };
export type MitteilungWerte = { titel: string; text: string; auswahl: string; weg: Weg };
export type MitteilungVerlauf = Json<VerlaufEintrag>;
export type Mitteilungen = { vorlagen: Vorlage[]; verlauf: MitteilungVerlauf[] };
export type Vorschau = Omit<Zahlen, 'ersatzMails'> & { anzahl: number; namen: string[] };

const pfad = (b: Bezug) =>
	b.art === 'anlass' ? `/api/admin/anlaesse/${b.anlassId}/mitteilungen` : '/api/admin/mitteilungen';

const FELD_MELDUNG: Record<MitteilungFeld, string> = {
	titel: `Bitte einen Titel mit höchstens ${MAX_TITEL} Zeichen angeben.`,
	text: `Bitte einen Text mit höchstens ${MAX_TEXT} Zeichen angeben.`,
	auswahl: 'Bitte die Empfänger wählen.',
	weg: 'Bitte einen Weg wählen.'
};

/** Der Server nennt die falschen Felder als Liste; die Seite zeigt je Feld einen Satz (UI-06). */
function mitMeldungen<T>(a: Antwort<T>): Antwort<T> {
	if (a.art !== 'eingabe' || !Array.isArray(a.felder)) return a;
	const felder = (a.felder as unknown[]).filter((f): f is MitteilungFeld =>
		Object.hasOwn(FELD_MELDUNG, String(f))
	);
	return { art: 'eingabe', felder: Object.fromEntries(felder.map((f) => [f, FELD_MELDUNG[f]])) };
}

export const ladeMitteilungen = (b: Bezug, holen: Holen = fetch) =>
	lese<Mitteilungen>(pfad(b), holen);

/** FR-43: wer die Mitteilung bekäme; schickt und speichert nichts. */
export const zeigeVorschau = async (b: Bezug, werte: MitteilungWerte, holen: Holen = fetch) =>
	mitMeldungen(await schicke<Vorschau>(`${pfad(b)}/vorschau`, werte, holen));

/** FR-42: schickt die Mitteilung; die Antwort kommt erst, wenn alle Pushes und Mails durch sind. */
export const sendeMitteilung = async (b: Bezug, werte: MitteilungWerte, holen: Holen = fetch) =>
	mitMeldungen(await schicke<Zahlen>(`${pfad(b)}/senden`, werte, holen));

export const AUSWAHL_NAMEN: Record<AnlassAuswahl, string> = {
	alle: 'Alle aktiven Mitglieder',
	'keine-antwort': 'Noch keine Antwort',
	kommt: 'Kommen',
	'kommt-nicht': 'Kommen nicht',
	'zu-pruefen': 'Antwort zu prüfen (Termin geändert)'
};

/** Empfänger in Worten; eine unbekannte Auswahl bleibt, wie sie ist. */
export const auswahlText = (auswahl: string) =>
	Object.hasOwn(AUSWAHL_NAMEN, auswahl) ? AUSWAHL_NAMEN[auswahl as AnlassAuswahl] : auswahl;

export const WEG_NAMEN: Record<Weg, string> = {
	push: 'Nur Push',
	'push-sonst-mail': 'Push, sonst E-Mail',
	'push-und-mail': 'Push und E-Mail an alle'
};
export const WEGE = Object.keys(WEG_NAMEN) as Weg[];

export const VORLAGE_NAMEN: Record<Vorlage['art'], string> = {
	erinnerung: 'Erinnerung',
	aenderung: 'Änderung',
	neu: 'Neuer Anlass'
};

const mitglieder = (n: number) => `${n} ${n === 1 ? 'Mitglied' : 'Mitglieder'}`;

/** Spec Ziel 11: «37 Mitglieder: 12 per Push, 25 per E-Mail», darunter «nicht erreichbar: 2». */
export function vorschauZeilen(v: Omit<Vorschau, 'namen'>, weg: Weg): string[] {
	let zeile: string;
	if (weg === 'push-und-mail') {
		// Erreicht wird, wer Push oder E-Mail bekommt; wer beides hat, zählt in `push` und `mails`.
		const beides = v.push + v.mails - (v.anzahl - v.nichtErreichbar);
		const teile = [`${beides} per Push und E-Mail`, `${v.mails - beides} nur per E-Mail`];
		if (v.push > beides) teile.push(`${v.push - beides} nur per Push`);
		zeile = `${mitglieder(v.anzahl)}: ${teile.join(', ')}`;
	} else {
		zeile = `${mitglieder(v.anzahl)}: ${v.push} per Push, ${v.mails} per E-Mail`;
	}
	return v.nichtErreichbar > 0 ? [zeile, `nicht erreichbar: ${v.nichtErreichbar}`] : [zeile];
}

export const rueckfrageText = (anzahl: number) => `Jetzt an ${mitglieder(anzahl)} senden?`;

/** Zahlen nach dem Senden und im Verlauf (Spec Ziel 12, 15). */
export function zahlenText(z: Zahlen): string {
	const teile = [`${z.push} per Push`, `${z.mails} per E-Mail`];
	if (z.ersatzMails > 0) teile.push(`${z.ersatzMails} ersatzweise per E-Mail`);
	if (z.nichtErreichbar > 0) teile.push(`nicht erreichbar: ${z.nichtErreichbar}`);
	return teile.join(', ');
}
