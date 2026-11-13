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

/**
 * Der Status, mit dem der Server jedes Wort sendet. Die Oberfläche lässt ein Wort nur mit diesem
 * Status gelten (`src/lib/abruf.ts`); ein Wort ohne Zeile oder eine Zeile ohne Wort ist ein Typfehler.
 */
export const STATUS_DES_WORTS = {
	eingabe: 400,
	falsch: 400,
	benutzt: 400,
	datei: 400,
	gleich: 400,
	abgemeldet: 401,
	'kein-admin': 403,
	unbestaetigt: 403,
	'kein-recht': 403,
	'nur-ansehen': 403,
	'nicht-gefunden': 404,
	vergeben: 409,
	veraltet: 409,
	'letzter-mytco': 409,
	'eigenes-konto': 409,
	'frist-abgelaufen': 409,
	'nicht-moeglich': 409,
	'push-aus': 409,
	geschlossen: 409,
	voll: 409,
	'passt-nicht': 409,
	'keine-wildcard': 409,
	'schon-angefragt': 409,
	'anfrage-offen': 409,
	hinfaellig: 409,
	'angaben-fehlen': 409,
	'schon-angemeldet': 409,
	vorbereitung: 409,
	'nicht-beantragt': 409,
	'nur-lesen': 409,
	inzwischen: 409,
	'schluss-vorbei': 409,
	'keine-kategorie': 409,
	unzulaessig: 409,
	abgesagt: 409,
	'art-gesperrt': 409,
	unpassend: 409,
	'hat-anmeldungen': 409,
	warnung: 409,
	format: 415,
	'zu-viele': 429
} as const satisfies { readonly [W in Fehlerwort]: FehlerStatus };

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
 * Der Körper jeder Fehlerantwort: `{ fehler, felder? }`, dazu die Zusatzangaben des Worts. Die
 * Wörter ohne Zusatz stehen in einem Glied, damit auch ein Wort aus einer Variablen passt (etwa das
 * Ergebnis einer Fachfunktion).
 */
export type Fehlerkoerper =
	| { fehler: WortOhneZusatz; felder?: Feldmeldungen }
	| { [W in keyof Zusatz]: KoerperZu<W> }[keyof Zusatz];
