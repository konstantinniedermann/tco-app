// Mitteilungen in der Verwaltung (FR-42 bis FR-45): Anfragen an `/api/admin/…/mitteilungen` und
// die Texte, mit denen Formular, Vorschau und Verlauf Auswahl, Weg und Zahlen in Worten zeigen.
import type { Namensteile } from '../name.ts';
import {
	TURNIER_AUSWAHLEN,
	type AnlassAuswahl,
	type TurnierAuswahl,
	type VereinAuswahl
} from '../mitteilung/auswahl.ts';
import type { Vorlage } from '../mitteilung/vorlagen.ts';
import type { Art, Weg } from '../server/db/schema.ts';
import type { MitteilungFeld } from '../server/mitteilung/angaben.ts';
import type { Bezug, VerlaufEintrag } from '../server/mitteilung/verlauf.ts';
import type { Zahlen } from '../server/mitteilung/versand.ts';
import type { Holen, Json } from '../abruf.ts';
import { lese, schicke } from './api.ts';
import { ROLLEN_NAME } from './rollen-namen.ts';

export type { Art, Bezug, MitteilungFeld, Vorlage, Weg, Zahlen };
/** `kategorieId`: Kategorie einer Mitteilung zum Turnier (Spec A6); sonst und für alle `null`. */
export type MitteilungWerte = {
	titel: string;
	text: string;
	auswahl: string;
	weg: Weg;
	kategorieId: number | null;
};
export type MitteilungVerlauf = Json<VerlaufEintrag>;
export type MitteilungKategorie = { id: number; name: string; art: Art };
/** `kategorien`: nur zum Turnier, die aktiven Kategorien zur Wahl. */
export type Mitteilungen = {
	vorlagen: Vorlage[];
	verlauf: MitteilungVerlauf[];
	kategorien?: MitteilungKategorie[];
};
export type Vorschau = Omit<Zahlen, 'ersatzMails'> & { anzahl: number; namen: Namensteile[] };

const pfad = (b: Bezug) =>
	b.art === 'anlass'
		? `/api/admin/anlaesse/${b.anlassId}/mitteilungen`
		: b.art === 'turnier'
			? `/api/admin/turniere/${b.turnierId}/mitteilungen`
			: '/api/admin/mitteilungen';

/** Der Körper der Anfrage: die Kategorie nur zum Turnier. */
const koerper = (b: Bezug, w: MitteilungWerte) =>
	b.art === 'turnier' ? w : { titel: w.titel, text: w.text, auswahl: w.auswahl, weg: w.weg };

/** FR-43: Eine Vorschau gilt nur für genau die Werte, mit denen sie geholt wurde. */
export const gleicheWerte = (a: MitteilungWerte | null, b: MitteilungWerte) =>
	a !== null &&
	a.titel === b.titel &&
	a.text === b.text &&
	a.auswahl === b.auswahl &&
	a.weg === b.weg &&
	a.kategorieId === b.kategorieId;

export const ladeMitteilungen = (b: Bezug, holen: Holen = fetch) =>
	lese<Mitteilungen>(pfad(b), holen);

/** FR-43: wer die Mitteilung bekäme; schickt und speichert nichts. */
export const zeigeVorschau = (b: Bezug, werte: MitteilungWerte, holen: Holen = fetch) =>
	schicke<Vorschau>(`${pfad(b)}/vorschau`, koerper(b, werte), holen);

/** FR-42: schickt die Mitteilung; die Antwort kommt erst, wenn alle Pushes und Mails durch sind. */
export const sendeMitteilung = (b: Bezug, werte: MitteilungWerte, holen: Holen = fetch) =>
	schicke<Zahlen>(`${pfad(b)}/senden`, koerper(b, werte), holen);

export const AUSWAHL_NAMEN: Record<AnlassAuswahl, string> = {
	alle: 'Alle aktiven Mitglieder',
	'keine-antwort': 'Noch keine Antwort',
	kommt: 'Kommen',
	'kommt-nicht': 'Kommen nicht',
	'zu-pruefen': 'Antwort zu prüfen (Termin geändert)'
};

/** Spec A6: Empfänger einer Mitteilung zum Turnier. */
export const TURNIER_NAMEN: Record<TurnierAuswahl, string> = {
	alle: AUSWAHL_NAMEN.alle,
	angemeldet: 'Angemeldet',
	berechtigt: 'Spielberechtigt, noch nicht angemeldet',
	'sucht-partner': 'Doppel: sucht Partner'
};

/** Spec B11, B13: Empfänger einer Mitteilung an den Verein, Rollen wie auf der Seite *Rollen*. */
export const VEREIN_NAMEN: Record<VereinAuswahl, string> = {
	alle: AUSWAHL_NAMEN.alle,
	'rolle-mytco': `Alle mit Rolle ${ROLLEN_NAME.mytco}`,
	'rolle-mitglieder': `Alle mit Rolle ${ROLLEN_NAME.mitglieder}`,
	'rolle-cm': `Alle mit Rolle ${ROLLEN_NAME.cm}`,
	'rolle-lizenz': `Alle mit Rolle ${ROLLEN_NAME.lizenz}`
};

const NAMEN: Record<string, string> = { ...AUSWAHL_NAMEN, ...TURNIER_NAMEN, ...VEREIN_NAMEN };

/**
 * Empfänger in Worten (Spec A7); eine unbekannte Auswahl bleibt, wie sie ist. Zum Turnier mit der
 * Kategorie: «Angemeldet · Damen R7–R9», ohne «… · alle Kategorien» (ausser bei *alle*).
 */
export function auswahlText(auswahl: string, kategorie: string | null = null): string {
	const name = Object.hasOwn(NAMEN, auswahl) ? NAMEN[auswahl] : auswahl;
	if (kategorie !== null) return `${name} · ${kategorie}`;
	const zumTurnier =
		auswahl !== 'alle' && (TURNIER_AUSWAHLEN as readonly string[]).includes(auswahl);
	return zumTurnier ? `${name} · alle Kategorien` : name;
}

export const WEG_NAMEN: Record<Weg, string> = {
	push: 'Nur Push',
	'push-sonst-mail': 'Push, sonst E-Mail',
	'push-und-mail': 'Push und E-Mail an alle'
};
export const WEGE = Object.keys(WEG_NAMEN) as Weg[];

export const VORLAGE_NAMEN: Record<Vorlage['art'], string> = {
	erinnerung: 'Erinnerung',
	aenderung: 'Änderung',
	neu: 'Neuer Anlass',
	offen: 'Anmeldung offen'
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

/**
 * Spec A7: Empfänger in der Rückfrage, aus den Werten, die hinausgehen: «An: Angemeldet · Damen
 * R7–R9». `kategorien`: die des Turniers, für den Namen der gewählten Kategorie.
 */
export function empfaengerText(
	werte: Pick<MitteilungWerte, 'auswahl' | 'kategorieId'>,
	kategorien: readonly { id: number; name: string }[] = []
): string {
	const kategorie = kategorien.find((k) => k.id === werte.kategorieId)?.name ?? null;
	return `An: ${auswahlText(werte.auswahl, kategorie)}`;
}

/** Zahlen nach dem Senden und im Verlauf (Spec Ziel 12, 15). */
export function zahlenText(z: Zahlen): string {
	const teile = [`${z.push} per Push`, `${z.mails} per E-Mail`];
	if (z.ersatzMails > 0) teile.push(`${z.ersatzMails} ersatzweise per E-Mail`);
	if (z.nichtErreichbar > 0) teile.push(`nicht erreichbar: ${z.nichtErreichbar}`);
	return teile.join(', ');
}
