// Die Fehlerwörter der Schnittstellen und die Form einer Fehlerantwort, geteilt von Server und
// Oberfläche (B-15, B-29). Der Server baut jede Fehlerantwort gegen diesen Typ (`antwort` in
// `src/lib/server/http.ts`), die Abruf-Module lesen `fehler` über `istFehlerwort`, die Tests beider
// Seiten stellen Antworten gegen denselben Typ. Ein Wort, das hier fehlt, macht `svelte-check` rot.
// Diese Datei importiert nichts: Die Oberfläche braucht die Liste als Wert, aus `src/lib/server/`
// darf sie nur Typen holen.

/** Alle Fehlerwörter, die der Server sendet; nach Statuscode geordnet. */
export const FEHLERWOERTER = [
	// 400
	'eingabe',
	'falsch',
	'benutzt',
	'datei',
	'gleich',
	// 401
	'abgemeldet',
	// 403
	'kein-admin',
	'unbestaetigt',
	'kein-recht',
	'nur-ansehen',
	// 404
	'nicht-gefunden',
	// 409
	'vergeben',
	'veraltet',
	'letzter-mytco',
	'eigenes-konto',
	'frist-abgelaufen',
	'nicht-moeglich',
	'push-aus',
	'geschlossen',
	'voll',
	'passt-nicht',
	'keine-wildcard',
	'schon-angefragt',
	'anfrage-offen',
	'hinfaellig',
	'angaben-fehlen',
	'schon-angemeldet',
	'vorbereitung',
	'nicht-beantragt',
	'nur-lesen',
	'inzwischen',
	'schluss-vorbei',
	'keine-kategorie',
	'unzulaessig',
	'abgesagt',
	'art-gesperrt',
	'unpassend',
	'hat-anmeldungen',
	'warnung',
	// 415
	'format',
	// 429
	'zu-viele'
] as const;

export type Fehlerwort = (typeof FEHLERWOERTER)[number];

export const istFehlerwort = (x: unknown): x is Fehlerwort =>
	typeof x === 'string' && (FEHLERWOERTER as readonly string[]).includes(x);

/** Die Statuscodes einer Fehlerantwort; ihr Körper hat immer die Form `Fehlerkoerper`. */
export type FehlerStatus = 400 | 401 | 403 | 404 | 409 | 415 | 429;

/** Feldname → Satz, den die Oberfläche beim Feld zeigen kann. */
export type Feldmeldungen = { readonly [feld: string]: string | undefined };

/**
 * Zusatzangaben, die ein Wort neben `fehler` und `felder` trägt (F-21, Variante A). Nur die hier
 * genannten Wörter tragen eine; was sie enthält, braucht die Oberfläche für ihre Meldung.
 */
type Zusatz = {
	/** `fremd`: Die Prüfung scheitert an einem Feld, das das Mitglied nicht selbst ändert (Profil). */
	eingabe: { fremd?: true };
	/** Kontakt des Vereins, wenn ein Brief-Code schon benutzt ist. */
	benutzt: { kontakt: string };
	/** Welches Feld schon vergeben ist; den Satz schreibt die Seite. */
	vergeben: { feld: string };
	/** Die Fehler der eingelesenen Datei. */
	datei: { datei: object };
	/** Zahl der betroffenen Mitglieder, Kategorien oder Anmeldungen. */
	'nicht-moeglich': { anzahl: number };
	unpassend: { anzahl: number };
	'hat-anmeldungen': { anzahl: number };
	/** Die Warnungen, die die Leitung mit «trotzdem» übergehen kann. */
	warnung: { warnungen: readonly string[] };
	/** Das Gespräch, wie es inzwischen steht (`null`, wenn es sich nicht laden lässt). */
	inzwischen: { gespraech: object | null };
};

type KoerperZu<W extends Fehlerwort> = {
	fehler: W;
	felder?: Feldmeldungen;
} & (W extends keyof Zusatz ? Zusatz[W] : unknown);

/** Die Wörter, die ohne Zusatzangabe auskommen: `{ fehler: wort }` ist ein ganzer Fehlerkörper. */
export type WortOhneZusatz = {
	[W in Fehlerwort]: { fehler: W } extends KoerperZu<W> ? W : never;
}[Fehlerwort];

/**
 * Altformen, die Schritt 08 abbaut; jede fällt mit ihrem Commit weg. Solange eine hier steht,
 * nimmt der Typ sie an.
 */
type Altform =
	// Anlass: der Name des Felds statt `felder`.
	| { fehler: 'eingabe'; feld: 'antwort' | 'bemerkung' }
	// Mitteilungen: `felder` als Liste der Namen.
	| { fehler: 'eingabe'; felder: readonly string[] };

/**
 * Der Körper jeder Fehlerantwort: `{ fehler, felder? }`, dazu die Zusatzangaben des Worts. Die
 * Wörter ohne Zusatz stehen in einem Glied, damit auch ein Wort aus einer Variablen passt (etwa das
 * Ergebnis einer Fachfunktion).
 */
export type Fehlerkoerper =
	| { fehler: WortOhneZusatz; felder?: Feldmeldungen }
	| { [W in keyof Zusatz]: KoerperZu<W> }[keyof Zusatz]
	| Altform;
