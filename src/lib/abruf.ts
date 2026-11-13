// Der gemeinsame Abruf-Baustein der Oberfläche (B-20): eine Anfrage an eine Schnittstelle und ihre
// Antwort als Ergebnis. Statuscodes deutet nur er; ein Modul je Thema nennt Adresse, Anfrage und
// seinen Vertrag und bildet den Körper eines Fehlerworts auf seine Zusatzangaben ab. Er wirft nie.
// Diese Datei importiert nur `./fehler.ts`, nichts aus `$app` und kein Thema: So bleibt sie ohne
// Browser prüfbar.
import { STATUS_DES_WORTS, istFehlerwort, type Fehlerwort } from './fehler.ts';

/** Wie `fetch`; jede Abruf-Funktion nimmt es als Parameter (Ladefunktion, Test, Abbruch). */
export type Holen = (pfad: string, init: RequestInit) => Promise<Response>;

/** Was nach JSON im Browser ankommt: Zeitpunkte sind Zeichenketten. */
export type Json<T> = T extends Date
	? string
	: T extends (infer U)[]
		? Json<U>[]
		: T extends object
			? { [K in keyof T]: Json<T[K]> }
			: T;

/**
 * Was ein Modul dem Baustein über seine Antworten sagt. Mit diesen vier Angaben bleibt jeder Rand
 * der Module gleich, wie er vor dem Baustein war (Anhang E.1 in docs/refactoring-analyse.md).
 */
export type Vertrag<W extends Fehlerwort> = {
	/** 1. Die Fehlerwörter, die das Modul kennt; jedes andere Wort wird `stoerung`. */
	readonly woerter: readonly W[];
	/**
	 * 2. `pflicht`: Ein unlesbarer Körper ist eine Störung, auch bei Erfolg, und JSON `null` als
	 * Fehlerkörper ebenso. `nachsichtig`: Die Deutung läuft ohne Körper weiter; ein Erfolg hat dann
	 * `daten: undefined` (nicht `{}`: «nichts gelesen» bleibt unterscheidbar), ein Fehler zählt
	 * nach dem Status allein.
	 */
	readonly koerper: 'pflicht' | 'nachsichtig';
	/**
	 * 3. `erfolg`: 204 ist ein Erfolg mit `{}` als Daten, ohne den Körper zu lesen. `einzig`: dazu ist
	 * jedes andere 2xx eine Störung. Ohne Angabe wird auch bei 204 gelesen.
	 */
	readonly ohneKoerper?: 'erfolg' | 'einzig';
	/** 4. JSON `null` als Fehlerkörper gilt als `{}` (nur bei `pflicht` von Belang). */
	readonly nullAlsLeer?: boolean;
};

/**
 * Die Wörter eines Vertrags aus einem Objekt mit genau einem Schlüssel je Wort. Mit dem Typ der
 * Wörter angegeben (`woerterAus<Wort>({ … })`) ist die Liste an ihn gebunden: Ein fehlendes oder ein
 * überzähliges Wort ist ein Typfehler.
 */
export const woerterAus = <W extends Fehlerwort>(woerter: Record<W, true>): readonly W[] =>
	Object.keys(woerter) as W[];

/** Der Körper einer Fehlerantwort, wie er ankam; Zusatzangaben liest das Modul selbst. */
export type Fehlerangaben = Readonly<Record<string, unknown>>;

export type Abruf<T, W extends Fehlerwort> =
	{ art: 'ok'; daten: T } | { art: W; koerper: Fehlerangaben } | { art: 'stoerung' };

/** Für diese Status genügt der Status allein; das Wort im Körper liest niemand. */
export const STATUS_ALLEIN: Readonly<Partial<Record<number, Fehlerwort>>> = {
	401: 'abgemeldet',
	404: 'nicht-gefunden',
	429: 'zu-viele'
};

const STOERUNG = { art: 'stoerung' } as const;

const istObjekt = (x: unknown): x is Fehlerangaben =>
	typeof x === 'object' && x !== null && !Array.isArray(x);

const kennt = <W extends Fehlerwort>(vertrag: Vertrag<W>, wort: Fehlerwort): wort is W =>
	(vertrag.woerter as readonly Fehlerwort[]).includes(wort);

/** Der Körper als JSON; `null`, wenn er sich nicht lesen lässt (leer, kein JSON, abgebrochen). */
async function lies(r: Response): Promise<{ wert: unknown } | null> {
	try {
		return { wert: await r.json() };
	} catch {
		return null;
	}
}

/**
 * Ruft ab und deutet die Antwort nach dem Vertrag des Moduls: Netzfehler → `stoerung`; 2xx → `ok`;
 * 401, 404, 429 → das Wort dieses Status, wenn der Vertrag es nennt; sonst das Wort aus dem Körper,
 * wenn es in der Liste steht, laut Tabelle zu diesem Status gehört und im Vertrag steht; sonst
 * `stoerung`.
 */
export async function rufeAb<T, W extends Fehlerwort>(
	pfad: string,
	init: RequestInit,
	holen: Holen,
	vertrag: Vertrag<W>
): Promise<Abruf<T, W>> {
	try {
		const r = await holen(pfad, init);
		if (vertrag.ohneKoerper && r.status === 204) return { art: 'ok', daten: {} as T };
		if (vertrag.ohneKoerper === 'einzig' && r.ok) return STOERUNG;
		const gelesen = await lies(r);
		if (gelesen === null && vertrag.koerper === 'pflicht') return STOERUNG;
		if (r.ok) return { art: 'ok', daten: gelesen?.wert as T };

		const wert = gelesen?.wert;
		if (wert === null && vertrag.koerper === 'pflicht' && !vertrag.nullAlsLeer) return STOERUNG;
		const koerper: Fehlerangaben = istObjekt(wert) ? wert : {};

		const allein = STATUS_ALLEIN[r.status];
		if (allein !== undefined && kennt(vertrag, allein)) return { art: allein, koerper };

		const wort = istFehlerwort(koerper.fehler) ? koerper.fehler : null;
		if (wort !== null && STATUS_DES_WORTS[wort] === r.status && kennt(vertrag, wort))
			return { art: wort, koerper };
		return STOERUNG;
	} catch {
		return STOERUNG;
	}
}
