import { utcZuZuerich, zuerichZuUtc } from '../anlass/zeit.ts';

/** Kalenderjahr in Schweizer Zeit (am 1. Januar um 0:30 schon das neue, auch auf einem Server in UTC). */
export const jahrInZuerich = (jetzt: Date): number => Number(utcZuZuerich(jetzt).slice(0, 4));

/** Heutiges Datum in Schweizer Zeit als `YYYY-MM-DD`. */
export const heuteInZuerich = (jetzt: Date): string => utcZuZuerich(jetzt).slice(0, 10);

/** `YYYY-MM-DD` plus (oder minus) ganze Tage, über Monats- und Jahresgrenzen. */
export function plusTage(iso: string, tage: number): string {
	const [j, m, t] = iso.split('-').map(Number);
	return new Date(Date.UTC(j, m - 1, t + tage)).toISOString().slice(0, 10);
}

/** Beginn (0:00) eines Tages `YYYY-MM-DD` in Schweizer Zeit als Zeitpunkt; ungültig: `null`. */
export function beginnDesTagesInZuerich(iso: string): Date | null {
	return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? zuerichZuUtc(`${iso}T00:00`) : null;
}

const DATUM = new Intl.DateTimeFormat('de-CH', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	timeZone: 'Europe/Zurich'
});

/** Datum in Schweizer Zeit, z. B. `31.01.2027` (Brief und Mail mit dem Brief-Code). */
export function formatiereDatum(datum: Date): string {
	return DATUM.format(datum);
}
