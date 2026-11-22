// Wann der regelmässige Interclub-Abruf welches Paar aus Saison und Wettbewerb holt (#81 Teil 3a).
// Reine Funktion: Die Lage (letzte Versuche, gelungene Importe, frische Spiele) kommt als Wert.
import { utcZuZuerich } from '../../anlass/zeit.ts';
import { jahrInZuerich } from '../datum.ts';
import type { Berichte, ImportWort } from './import.ts';
import { WETTBEWERBE, type Wettbewerb } from './swiss-tennis.ts';

export type Paar = { saison: number; wettbewerb: Wettbewerb };
export type Versuch = Paar & { versuchtAm: Date; wort: ImportWort };
export type Lage = {
	jetzt: Date;
	/** Letzter Versuch je Paar (Tabelle `ic_abruf`). */
	versuche: Versuch[];
	/** Paare mit Eintrag in `ic_stand` (Import gelungen, auch von Hand). */
	vorhanden: Paar[];
	/** Laufende Saison: Wettbewerbe mit eigenem Spiel von heute bis 7 Tage zurück, ohne Resultat oder ohne Bericht. */
	frisch: Wettbewerb[];
	/** Erste Saison zum Nachholen, Vorgabe `ERSTE_SAISON` (Tests setzen sie höher). */
	ab?: number;
};
export type Auftrag = Paar & { berichte: Berichte };

export const ERSTE_SAISON = 2021;
const MINUTE = 60_000;
// Etwas unter einer Stunde, damit ein Schlag kurz nach dem letzten Versuch nicht ausfällt.
const STUNDENLAUF = 55 * MINUTE;
const TAG = 24 * 60 * MINUTE;
const NACHT_AB = 23;
const TAG_AB = 7;

const gleich = (a: Paar, b: Paar) => a.saison === b.saison && a.wettbewerb === b.wettbewerb;
const her = (jetzt: Date, v: Versuch) => jetzt.getTime() - v.versuchtAm.getTime();

export function istFaellig(l: Lage): Auftrag[] {
	const stunde = Number(utcZuZuerich(l.jetzt).slice(11, 13));
	if (stunde >= NACHT_AB || stunde < TAG_AB) return [];

	const jahr = jahrInZuerich(l.jetzt);
	const letzter = (p: Paar) => l.versuche.find((v) => gleich(v, p));
	const auftraege: Auftrag[] = [];

	for (const wettbewerb of WETTBEWERBE) {
		const p = { saison: jahr, wettbewerb };
		const v = letzter(p);
		if (l.frisch.includes(wettbewerb)) {
			if (!v || her(l.jetzt, v) >= STUNDENLAUF) auftraege.push({ ...p, berichte: 'frische' });
		} else if (!v || her(l.jetzt, v) >= TAG) {
			auftraege.push({ ...p, berichte: 'fehlende' });
		}
	}

	// Nachholen: höchstens ein Paar pro Tag; nie versuchte zuerst, dann der älteste Versuch.
	const ab = l.ab ?? ERSTE_SAISON;
	const alt = (v: Versuch) => v.saison >= ab && v.saison < jahr;
	if (l.versuche.some((v) => alt(v) && her(l.jetzt, v) < TAG)) return auftraege;
	const offen: { paar: Paar; versuch: Versuch | undefined }[] = [];
	for (let saison = ab; saison < jahr; saison++)
		for (const wettbewerb of WETTBEWERBE) {
			const paar = { saison, wettbewerb };
			if (l.vorhanden.some((x) => gleich(x, paar))) continue;
			const v = letzter(paar);
			if (v && (v.wort === 'ok' || v.wort === 'keine-teams')) continue;
			offen.push({ paar, versuch: v });
		}
	const nie = offen.find((o) => !o.versuch);
	const naechstes =
		nie ??
		offen.reduce<(typeof offen)[number] | undefined>(
			(a, o) => (!a || o.versuch!.versuchtAm < a.versuch!.versuchtAm ? o : a),
			undefined
		);
	if (naechstes) auftraege.push({ ...naechstes.paar, berichte: 'fehlende' });
	return auftraege;
}
