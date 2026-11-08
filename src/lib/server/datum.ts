import { utcZuZuerich } from '../anlass/zeit.ts';

/** Kalenderjahr in Schweizer Zeit (am 1. Januar um 0:30 schon das neue, auch auf einem Server in UTC). */
export const jahrInZuerich = (jetzt: Date): number => Number(utcZuZuerich(jetzt).slice(0, 4));

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
