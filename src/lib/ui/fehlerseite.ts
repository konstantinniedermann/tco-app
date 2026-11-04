// Was die Fehlerseite (`src/routes/+error.svelte`) zeigt: Titel, Meldung in Worten und den Weg
// zurück (UI-06). Eigene Meldungen der App (`error(503, '…')`) bleiben; die knappen englischen
// Meldungen von SvelteKit werden ersetzt.

export type Fehlerseite = {
	titel: string;
	text: string;
	zurueck: { text: string; pfad: '/' | '/verwaltung/mitglieder' };
};

const ERSATZ: Record<string, string> = {
	'Not Found': 'Diese Seite gibt es nicht.',
	'Internal Error': 'Etwas ist schiefgelaufen. Versuche es später noch einmal.'
};

export function fehlerseite(
	status: number,
	meldung: string | undefined,
	pfad: string
): Fehlerseite {
	const verwaltung = pfad === '/verwaltung' || pfad.startsWith('/verwaltung/');
	const text =
		(meldung && (ERSATZ[meldung] ?? meldung)) ||
		'Etwas ist schiefgelaufen. Versuche es später noch einmal.';
	return {
		titel: status === 404 ? 'Nicht gefunden' : 'Gerade nicht erreichbar',
		text,
		zurueck: verwaltung
			? { text: 'Zur Verwaltung', pfad: '/verwaltung/mitglieder' }
			: { text: 'Zur Startseite', pfad: '/' }
	};
}
