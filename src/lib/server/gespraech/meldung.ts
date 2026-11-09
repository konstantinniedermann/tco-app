// Meldungen zum Gespräch mit der Turnierleitung (FR-53, DS-05): ohne Nachrichtentext und ohne
// Namen, nur Anlass und Link.
export const MELDUNG_TITEL = 'Clubmeisterschaft';
export const NACHRICHT_TEXT = 'Neue Nachricht an die Turnierleitung.';
export const ANTWORT_TEXT = 'Die Turnierleitung hat dir geantwortet.';

/** Link für die Kontaktperson: das Gespräch in der Verwaltung. */
export const pfadVerwaltung = (turnierId: number, gespraechId: number) =>
	`/verwaltung/turniere/${turnierId}/nachrichten/${gespraechId}`;

/** Link für das Mitglied: sein Gespräch mit der Turnierleitung. */
export const pfadMitglied = (turnierId: number) => `/clubmeisterschaft/${turnierId}/kontakt`;
