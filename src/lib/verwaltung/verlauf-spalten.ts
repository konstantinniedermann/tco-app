// Spalten des Änderungsverlaufs für die Tabellen-Steuerung (#92). Der Verlauf filtert auf dem
// Server (er zeigt nur die neuesten 100 Treffer); `verlaufAbfrage` macht aus dem Filter der Seite
// die Abfrage. Sortieren läuft im Browser über die Treffer.
import { aktionText } from './anzeige.ts';
import type { VerlaufAbfrage, VerlaufEintrag } from './mitglieder-api.ts';
import type { Filter, Spalte } from './tabelle.ts';

type Art = VerlaufEintrag['aktion'];

// Record statt Liste: Kommt eine Aktion dazu, meldet der Compiler die Lücke hier.
const TEXT: Record<Art, string> = {
	angelegt: 'angelegt',
	'feld-geaendert': 'Angabe geändert',
	'rolle-vergeben': 'Rolle vergeben',
	'rolle-entzogen': 'Rolle entzogen',
	'sitzungen-beendet': 'Sitzungen beendet',
	'fairgate-uebertragen': 'In Fairgate übertragen',
	ausgetreten: 'Austritt erfasst',
	wiedereingetreten: 'Wiedereintritt erfasst',
	'loeschung-vorgemerkt': 'zum Löschen vorgemerkt',
	'loeschung-zurueckgenommen': 'Löschung rückgängig',
	'auskunft-erstellt': 'Auskunft erstellt',
	'brief-code-ausgestellt': 'Brief-Code ausgestellt',
	'cm-anmeldung-geaendert': 'CM-Anmeldung geändert'
};

/** Häkchen des Filters «Was», eines je Art der Änderung. */
export const VERLAUF_ARTEN: readonly { wert: Art; text: string }[] = Object.entries(TEXT).map(
	([wert, text]) => ({ wert: wert as Art, text })
);

export const VERLAUF_SPALTEN: Spalte<VerlaufEintrag>[] = [
	{
		schluessel: 'zeit',
		titel: 'Zeit',
		sortwert: (z) => z.zeitpunkt,
		filter: { art: 'bereich', zahl: 'datum' },
		breite: { start: 10, min: 8, max: 14 }
	},
	{
		schluessel: 'wer',
		titel: 'Wer',
		sortwert: (z) => z.urheber,
		filter: { art: 'text' },
		breite: { start: 12, min: 6, max: 25 }
	},
	{
		// Nicht «mitglied»: das ist schon der Parameter für «nur dieses Mitglied».
		schluessel: 'name',
		titel: 'Mitglied',
		sortwert: (z) => z.mitglied.name,
		filter: { art: 'text' },
		breite: { start: 12, min: 6, max: 25 }
	},
	{
		schluessel: 'was',
		titel: 'Was',
		sortwert: (z) => aktionText(z),
		filter: { art: 'werte', werte: VERLAUF_ARTEN },
		breite: { start: 16, min: 8, max: 30 }
	}
];

/** Die Abfrage an den Server aus dem Filter der Seite; leere Filter fallen weg. */
export function verlaufAbfrage(filter: Filter, mitglied: number | undefined): VerlaufAbfrage {
	const a: VerlaufAbfrage = {};
	if (mitglied !== undefined) a.mitglied = mitglied;
	const zeit = filter.zeit;
	if (zeit?.art === 'bereich') {
		if (zeit.von) a.von = zeit.von;
		if (zeit.bis) a.bis = zeit.bis;
	}
	const wer = filter.wer;
	if (wer?.art === 'text' && wer.text.trim()) a.wer = wer.text.trim();
	const name = filter.name;
	if (name?.art === 'text' && name.text.trim()) a.name = name.text.trim();
	const was = filter.was;
	if (was?.art === 'werte' && was.werte.length > 0) a.was = [...was.werte];
	return a;
}
