// Anzeigehilfen für Turniere und Kategorien: reine Funktionen, ohne Zeitzonenverschiebung.
import type { AnmeldungZeile, SpielerTreffer, Warnung } from '../server/cm/verwaltung.ts';
import type { KategorieWerte } from '../server/turnier/angaben.ts';
import type { Geschlecht, TurnierStatus } from '../server/db/schema.ts';
import { klassierungName } from '../turnier/klassierung.ts';
import { plakette } from './anzeige.ts';

const STATUS: Record<
	TurnierStatus,
	{ text: string; klasse: 'plakette-offen' | 'plakette-ok' | 'plakette-gesperrt' }
> = {
	vorbereitung: { text: 'in Vorbereitung', klasse: 'plakette-offen' },
	offen: { text: 'Anmeldung offen', klasse: 'plakette-ok' },
	geschlossen: { text: 'Anmeldung geschlossen', klasse: 'plakette-gesperrt' }
};

export const statusText = (s: TurnierStatus) => STATUS[s];

/** Kalendertag `YYYY-MM-DD` als Mittag UTC, damit keine Zeitzone den Tag verschiebt. */
function mittag(datum: string): Date {
	const [j, m, t] = datum.split('-').map(Number);
	return new Date(Date.UTC(j, m - 1, t, 12));
}

const LANG = new Intl.DateTimeFormat('de-CH', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC'
});

const KURZ = new Intl.DateTimeFormat('de-CH', {
	day: 'numeric',
	month: 'numeric',
	year: 'numeric',
	timeZone: 'UTC'
});

/** `'2027-05-31'` → `'Montag, 31. Mai 2027'`. */
export const datumLang = (datum: string) => LANG.format(mittag(datum));

/** `'2027-05-31'` → `'31.5.2027'`. */
export const datumKurz = (datum: string) => KURZ.format(mittag(datum));

const GESCHLECHT: Record<Geschlecht, string> = {
	herren: 'Herren',
	damen: 'Damen',
	mixed: 'Mixed',
	offen: 'offen'
};

export const geschlechtText = (g: Geschlecht) => GESCHLECHT[g];

export function jahrgangText(von: number | null, bis: number | null): string {
	if (von !== null && bis !== null) return `${von}–${bis}`;
	if (von !== null) return `ab ${von}`;
	if (bis !== null) return `bis ${bis}`;
	return '';
}

export function klassierungText(
	k: Pick<KategorieWerte, 'art' | 'klassierungVon' | 'klassierungBis' | 'mindestsumme'>
): string {
	if (k.art === 'doppel') return `Summe ab ${k.mindestsumme}`;
	return `${k.klassierungVon}–${k.klassierungBis}`;
}

/** FR-36: Rückfrage beim Ändern einer Kategorie, deren Anmeldungen nicht mehr passen. */
export const unpassendText = (n: number) =>
	n === 1
		? '1 Anmeldung passt nach der Änderung nicht mehr zu dieser Kategorie. Sie bleibt trotzdem stehen.'
		: `${n} Anmeldungen passen nach der Änderung nicht mehr zu dieser Kategorie. Sie bleiben trotzdem stehen.`;

/** FR-36: Einzel oder Doppel wechseln geht nur ohne aktive Anmeldungen (409 `art-gesperrt`). */
export const ART_GESPERRT =
	'Einzel oder Doppel lässt sich nur ändern, solange niemand angemeldet ist.';

/** FR-35: Absagen geht erst ohne aktive Anmeldungen. */
export const absageSperreText = (n: number) =>
	n === 1
		? 'Diese Kategorie hat 1 aktive Anmeldung. Absagen geht erst, wenn keine mehr da ist.'
		: `Diese Kategorie hat ${n} aktive Anmeldungen. Absagen geht erst, wenn keine mehr da sind.`;

const WARNUNG: Record<Warnung, string> = {
	'angaben-fehlen': 'Angaben fehlen.',
	'passt-nicht': 'Passt nicht zur Kategorie.',
	voll: 'Hat schon 3 Anmeldungen.',
	geschlossen: 'Anmeldung ist geschlossen.'
};

/** FR-46: Warnungen vor dem Anmelden oder Verschieben von Hand, in der Reihenfolge des Servers. */
export const warnungText = (w: readonly Warnung[]) => w.map((x) => WARNUNG[x]).join(' ');

/** A-ANMELDUNG-06: «5 Anmeldungen, 1 Wildcard-Antrag»; Anträge zählen bei den Anmeldungen mit. */
export function anmeldungenText(zeilen: readonly Pick<AnmeldungZeile, 'status'>[]): string {
	if (zeilen.length === 0) return 'Noch keine Anmeldungen.';
	const n = zeilen.length;
	const antraege = zeilen.filter((z) => z.status === 'beantragt').length;
	const text = n === 1 ? '1 Anmeldung' : `${n} Anmeldungen`;
	if (antraege === 0) return text;
	return `${text}, ${antraege === 1 ? '1 Wildcard-Antrag' : `${antraege} Wildcard-Anträge`}`;
}

const ANMELDUNG_STATUS: Record<
	AnmeldungZeile['status'],
	{ text: string; klasse: 'plakette-ok' | 'plakette-offen' }
> = {
	bestaetigt: { text: 'bestätigt', klasse: 'plakette-ok' },
	beantragt: { text: 'Wildcard beantragt', klasse: 'plakette-offen' }
};

export const anmeldungStatus = (s: AnmeldungZeile['status']) => ANMELDUNG_STATUS[s];

/** FR-04: Plakette neben dem Namen für Austritt, Löschvormerkung und Löschung; sonst keine. */
export function mitgliedVermerk(status: AnmeldungZeile['mitgliedStatus']) {
	return status === 'aktiv' ? null : plakette({ login: 'ohne-brief', status });
}

/** Geschlecht eines Spielers wie in den Angaben der Mitglieder-Verwaltung. */
export const spielerGeschlechtText = (g: 'w' | 'm' | null) =>
	g === 'w' ? 'weiblich' : g === 'm' ? 'männlich' : '–';

/** Angaben eines Treffers der Spielersuche: «R7 · weiblich · 1990»; Fehlendes beim Namen. */
export const trefferText = (t: Pick<SpielerTreffer, 'klassierung' | 'geschlecht' | 'jahrgang'>) =>
	[
		t.klassierung === null ? 'Klassierung fehlt' : klassierungName(t.klassierung),
		t.geschlecht === null ? 'Geschlecht fehlt' : spielerGeschlechtText(t.geschlecht),
		t.jahrgang === null ? 'Jahrgang fehlt' : String(t.jahrgang)
	].join(' · ');
