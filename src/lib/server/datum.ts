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
