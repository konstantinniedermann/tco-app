// Anzeigehilfen für Turniere und Kategorien: reine Funktionen, ohne Zeitzonenverschiebung.
import type { KategorieWerte } from '../server/turnier/angaben.ts';
import type { Geschlecht, TurnierStatus } from '../server/db/schema.ts';

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
