// Anzeigehilfen der Interclub-Ansicht (UI-Leitbild, Reiter IC und Seite eines Teams): reine
// Funktionen, ohne Browser prüfbar.
import { utcZuZuerich } from '../anlass/zeit.ts';

export type Ergebnis = 'sieg' | 'niederlage' | 'unentschieden';
export type Entscheid = 'aufstieg' | 'abstieg';
export type Ansicht = 'resultate' | 'teams';

// Der Spieltag ist ein Kalendertag ohne Zeitzone; der Wochentag hängt nicht vom Gerät ab.
const WOCHENTAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** `2026-05-09` → «Sa 09.05.»; mit Uhrzeit «So 07.06., 09:00». */
export function datumText(datum: string, zeit: string | null = null): string {
	const [j, m, t] = datum.split('-').map(Number);
	const tag = WOCHENTAG[new Date(Date.UTC(j, m - 1, t)).getUTCDay()];
	const text = `${tag} ${datum.slice(8, 10)}.${datum.slice(5, 7)}.`;
	return zeit ? `${text}, ${zeit}` : text;
}

/** «Stand: 13.11.2026, 08:56» in Zürcher Zeit. */
export function standText(stand: Date | string): string {
	const lokal = utcZuZuerich(new Date(stand));
	const [datum, zeit] = lokal.split('T');
	const [j, m, t] = datum.split('-');
	return `Stand: ${t}.${m}.${j}, ${zeit}`;
}

const ERGEBNIS_TEXT: Record<Ergebnis, string> = {
	sieg: 'Sieg',
	niederlage: 'Niederlage',
	unentschieden: 'Unentschieden'
};

export const ergebnisText = (e: Ergebnis): string => ERGEBNIS_TEXT[e];

const PLAKETTE: Record<Ergebnis, string> = {
	sieg: 'plakette-ok',
	niederlage: 'plakette-niederlage',
	unentschieden: 'plakette-leise'
};

/** Klasse der Plakette zum Ergebnis (UI-Leitbild, Baustein Plakette). */
export const plakette = (e: Ergebnis): string => PLAKETTE[e];

export const ortText = (tcoHeim: boolean): string => (tcoHeim ? 'Heim' : 'Auswärts');

const ENTSCHEID_TEXT: Record<Entscheid, string> = {
	aufstieg: 'Aufstiegsspiele',
	abstieg: 'Abstiegsspiele'
};

export const entscheidText = (e: Entscheid): string => ENTSCHEID_TEXT[e];

/** «Olten 1 · 2. von 4 · Aufstiegsspiele»; ohne Rang nur der Teamname. */
export function kachelText(
	teamName: string,
	rang: number | null,
	von: number,
	entscheid: Entscheid | null
): string {
	const teile = [teamName];
	if (rang !== null) teile.push(`${rang}. von ${von}`);
	if (entscheid !== null) teile.push(entscheidText(entscheid));
	return teile.join(' · ');
}

/** «Olten 1 · Gruppe 62 · 2. von 4»; ohne eigene Zeile in der Rangliste ohne Rang. */
export function teamText(
	teamName: string,
	gruppe: number,
	rangliste: readonly { rang: number; eigen: boolean }[]
): string {
	const eigen = rangliste.find((z) => z.eigen);
	const teile = [teamName, `Gruppe ${gruppe}`];
	if (eigen) teile.push(`${eigen.rang}. von ${rangliste.length}`);
	return teile.join(' · ');
}

type Saisonstand = {
	abgeschlossen: boolean;
	letzte: readonly unknown[];
	naechste: readonly unknown[];
};

/** Pause zwischen Spieltagen: Die Saison läuft, aber 7 Tage zurück und voraus spielt kein TCO-Team. */
export const pause = (u: Saisonstand): boolean =>
	!u.abgeschlossen && u.letzte.length === 0 && u.naechste.length === 0;

/** Vorgewählt im Umschalter der Übersicht: nach der Saison und in einer Pause die Teams. */
export const vorgewaehlt = (u: Saisonstand): Ansicht =>
	u.abgeschlossen || pause(u) ? 'teams' : 'resultate';

function gruppiere<T, K>(liste: readonly T[], schluessel: (x: T) => K): { k: K; spiele: T[] }[] {
	const gruppen: { k: K; spiele: T[] }[] = [];
	for (const x of liste) {
		const k = schluessel(x);
		const letzte = gruppen.at(-1);
		if (letzte && letzte.k === k) letzte.spiele.push(x);
		else gruppen.push({ k, spiele: [x] });
	}
	return gruppen;
}

/** Aufeinanderfolgende Spiele desselben Tags, in der gelieferten Reihenfolge. */
export const nachTag = <T extends { datum: string }>(spiele: readonly T[]) =>
	gruppiere(spiele, (s) => s.datum).map(({ k, spiele }) => ({ datum: k, spiele }));

/** Aufeinanderfolgende Spiele derselben Runde, in der gelieferten Reihenfolge. */
export const nachRunde = <T extends { runde: number }>(spiele: readonly T[]) =>
	gruppiere(spiele, (s) => s.runde).map(({ k, spiele }) => ({ runde: k, spiele }));
