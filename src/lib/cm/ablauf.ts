// Der Ablauf einer Aktion auf der CM-Seite der Mitglieder (Schritt 16, B-22): sperren, Meldung und
// Fehler leeren, abrufen, die Sperre lösen, dann nach dem Ergebnis verzweigen. Die Seite reicht
// Sperre, Meldung, Fehler, Neuladen und den Wächter hinein; so bleibt der Ablauf ohne Browser
// prüfbar und kennt weder `$app` noch das Markup. Was bei `ok` geschieht und welcher Satz zu
// welchem Wort gehört, sagt die Aktion.
import { MELDUNG } from '../login/anmelden.ts';
import type { CmFelder, Ergebnis } from './api.ts';

/** Die Wörter, die eine Aktion mit Satz oder still nennen kann; alle anderen sind eine Störung. */
export type Wort = Exclude<Ergebnis<unknown>['art'], 'ok' | 'abgemeldet' | 'eingabe' | 'stoerung'>;

/** Was die Seite dem Ablauf gibt. Sperre, Meldung und Fehler liest und setzt er über sie. */
export type Seite = {
	laeuft: boolean;
	meldung: string | null;
	fehler: string | null;
	/** Lädt die Ansicht neu; das Ergebnis wertet der Ablauf nicht aus. */
	neuLaden: () => Promise<unknown>;
	/** Der Wächter nach einer Aktion (`leiteUmNachAktion`, Schritt 15). */
	waechter: (r: { art: 'abgemeldet' }) => Promise<unknown>;
};

export type Aktion<T> = {
	abruf: () => Promise<Ergebnis<T>>;
	/** Läuft nach dem Leeren von Meldung und Fehler, vor dem Abruf (etwa den Satz am Feld leeren). */
	vorher?: () => void;
	/** Was bei `ok` geschieht: Ansicht übernehmen, Satz, Fokus. */
	ok: (daten: T) => Promise<void>;
	/** Je Wort der Satz oder `null` (still); danach folgt `danach`. Jedes andere Wort ist eine Störung. */
	woerter: Partial<Record<Wort, string | null>>;
	/** Vor dem Satz eines Worts (etwa den Dialog schliessen). */
	vorWort?: () => void;
	/** Was nach dem Satz eines Worts geschieht; ohne Angabe lädt die Seite neu. */
	danach?: () => Promise<void>;
	/** Die Felder bei `eingabe`; ohne diese Angabe ist `eingabe` eine Störung. */
	eingabe?: (felder: CmFelder) => Promise<void>;
	/** Wo der Satz der Störung steht; ohne Angabe als Fehler der Seite. */
	stoerung?: (satz: string) => void;
};

/**
 * Führt eine Aktion aus. Läuft schon eine, tut der Aufruf nichts. Die Sperre fällt direkt nach dem
 * Abruf, vor jeder Folge: Der Fokus geht danach oft auf eine Taste mit `disabled={laeuft}`, und eine
 * gesperrte Taste nimmt keinen Fokus.
 */
export async function fuehreAblauf<T>(seite: Seite, aktion: Aktion<T>): Promise<void> {
	if (seite.laeuft) return;
	seite.laeuft = true;
	seite.meldung = null;
	seite.fehler = null;
	aktion.vorher?.();
	const r = await aktion.abruf();
	seite.laeuft = false;
	switch (r.art) {
		case 'ok':
			await aktion.ok(r.daten);
			return;
		case 'abgemeldet':
			await seite.waechter(r);
			return;
		case 'eingabe':
			if (aktion.eingabe) {
				await aktion.eingabe(r.felder);
				return;
			}
			break;
		case 'stoerung':
			break;
		default: {
			const satz = aktion.woerter[r.art];
			if (satz !== undefined) {
				aktion.vorWort?.();
				if (satz !== null) seite.fehler = satz;
				await (aktion.danach ?? seite.neuLaden)();
				return;
			}
		}
	}
	if (aktion.stoerung) aktion.stoerung(MELDUNG.stoerung);
	else seite.fehler = MELDUNG.stoerung;
}
