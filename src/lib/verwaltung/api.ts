// Kern der Anfragen der Verwaltung an `/api/admin/…`: die Antwort als typisiertes Ergebnis, die
// Fehlerwörter, die die Verwaltung kennt (gedeutet im Abruf-Baustein), und ihre Zusatzangaben.
// Die Anfragen selbst stehen je Bereich in `mitglieder-`, `turnier-`, `gespraech-`, `anlass-` und
// `zugang-api.ts`; die Seiten importieren dort, nicht hier. Die Seiten zeigen die Meldungen.
import { rufeAb, woerterAus, type Holen, type Json, type Vertrag } from '../abruf.ts';
import { jsonPost } from '../json-post.ts';
import type { Feld } from '../server/admin/angaben.ts';
import type { AnlassFeld } from '../server/anlass/angaben.ts';
import type { DateiFehler } from '../server/admin/einlesen.ts';
import type { Warnung } from '../server/cm/verwaltung.ts';
import type { ladeGespraech as ServerLadeGespraech } from '../server/gespraech/gespraech.ts';
import type { MitteilungFeld } from '../server/mitteilung/angaben.ts';
import type { KategorieFeld, TurnierFeld } from '../server/turnier/angaben.ts';

export type GespraechVerlauf = Json<NonNullable<Awaited<ReturnType<typeof ServerLadeGespraech>>>>;
type AlleFelder = Feld | AnlassFeld | TurnierFeld | KategorieFeld | MitteilungFeld | 'text';
export type { AnlassFeld, DateiFehler, Feld, KategorieFeld, TurnierFeld, Warnung };

export type Antwort<T> =
	| { art: 'ok'; daten: T }
	| { art: 'abgemeldet' }
	| { art: 'kein-admin' }
	| { art: 'unbestaetigt' }
	| { art: 'kein-recht' }
	| { art: 'nur-ansehen' }
	| { art: 'falsch' }
	| { art: 'zu-viele' }
	| { art: 'nicht-gefunden' }
	| { art: 'eingabe'; felder: Partial<Record<AlleFelder, string>> }
	| { art: 'vergeben'; feld: Feld | 'jahr' | 'name' }
	| { art: 'letzter-mytco' }
	| { art: 'eigenes-konto' }
	| { art: 'veraltet' }
	| { art: 'frist-abgelaufen' }
	| { art: 'schluss-vorbei' }
	| { art: 'keine-kategorie' }
	| { art: 'unzulaessig' }
	| { art: 'abgesagt' }
	| { art: 'art-gesperrt' }
	| { art: 'unpassend'; anzahl: number }
	| { art: 'hat-anmeldungen'; anzahl: number }
	| { art: 'nicht-moeglich'; anzahl: number }
	| { art: 'datei'; datei: DateiFehler }
	| { art: 'warnung'; warnungen: Warnung[] }
	| { art: 'schon-angemeldet' }
	| { art: 'vorbereitung' }
	| { art: 'nicht-beantragt' }
	| { art: 'nur-lesen' }
	| { art: 'inzwischen'; gespraech: GespraechVerlauf }
	| { art: 'stoerung' };

const STOERUNG: Antwort<never> = { art: 'stoerung' };

/** Die Fehlerwörter, die die Verwaltung kennt: genau die Arten von `Antwort` ausser ok und Störung. */
type Wort = Exclude<Antwort<unknown>['art'], 'ok' | 'stoerung'>;
const WOERTER: Record<Wort, true> = {
	abgemeldet: true,
	'kein-admin': true,
	unbestaetigt: true,
	'kein-recht': true,
	'nur-ansehen': true,
	falsch: true,
	'zu-viele': true,
	'nicht-gefunden': true,
	eingabe: true,
	vergeben: true,
	'letzter-mytco': true,
	'eigenes-konto': true,
	veraltet: true,
	'frist-abgelaufen': true,
	'schluss-vorbei': true,
	'keine-kategorie': true,
	unzulaessig: true,
	abgesagt: true,
	'art-gesperrt': true,
	unpassend: true,
	'hat-anmeldungen': true,
	'nicht-moeglich': true,
	datei: true,
	warnung: true,
	'schon-angemeldet': true,
	vorbereitung: true,
	'nicht-beantragt': true,
	'nur-lesen': true,
	inzwischen: true
};

/** Körper Pflicht; JSON `null` als Fehlerkörper gilt als `{}` (so war es hier immer). */
const VERTRAG: Vertrag<Wort> = {
	woerter: woerterAus<Wort>(WOERTER),
	koerper: 'pflicht',
	nullAlsLeer: true
};

/** Ein Objekt, auch eine Liste (so liess es die Verwaltung immer durch). */
const istObjektOderListe = (x: unknown): x is object => typeof x === 'object' && x !== null;

async function rufe<T>(pfad: string, init: RequestInit, holen: Holen): Promise<Antwort<T>> {
	const r = await rufeAb<T, Wort>(pfad, init, holen, VERTRAG);
	if (r.art === 'ok' || r.art === 'stoerung') return r;
	const k = r.koerper;
	switch (r.art) {
		case 'eingabe':
			return istObjektOderListe(k.felder)
				? { art: 'eingabe', felder: k.felder as Partial<Record<AlleFelder, string>> }
				: STOERUNG;
		case 'datei':
			return istObjektOderListe(k.datei)
				? { art: 'datei', datei: k.datei as DateiFehler }
				: STOERUNG;
		case 'vergeben':
			return typeof k.feld === 'string'
				? { art: 'vergeben', feld: k.feld as Feld | 'jahr' | 'name' }
				: STOERUNG;
		case 'unpassend':
		case 'hat-anmeldungen':
		case 'nicht-moeglich':
			return typeof k.anzahl === 'number' ? { art: r.art, anzahl: k.anzahl } : STOERUNG;
		case 'warnung':
			return Array.isArray(k.warnungen)
				? { art: 'warnung', warnungen: k.warnungen as Warnung[] }
				: STOERUNG;
		case 'inzwischen':
			return istObjektOderListe(k.gespraech)
				? { art: 'inzwischen', gespraech: k.gespraech as GespraechVerlauf }
				: STOERUNG;
		default:
			return { art: r.art };
	}
}

export const lese = <T>(pfad: string, holen: Holen) => rufe<T>(pfad, { method: 'GET' }, holen);

export const schicke = <T>(pfad: string, inhalt: object, holen: Holen) =>
	rufe<T>(pfad, jsonPost(inhalt), holen);

export const ADMIN = '/api/admin';
