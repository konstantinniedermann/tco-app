// Meldungen der Verwaltung an ein Mitglied nach einer Änderung (FR-56): Profil, Rolle, Zugang.
// Gebraucht von den Schnittstellen der Verwaltung (`schnittstellen.ts`); `meldeVerwaltung` auch von
// den Meldungen der CM (`cm/verwaltung-meldung.ts`).
import { FELD_NAMEN } from '../../feld-namen.ts';
import { ROLLEN_NAME } from '../../verwaltung/rollen-namen.ts';
import { meldeMitgliedern } from '../mitteilung/meldung.ts';
import type { MitteilungAdminDienste } from '../mitteilung/typen.ts';
import { FELDER, type Feld } from './angaben.ts';
import type { AdminUrheber } from './rechte.ts';
import type { Rolle } from './rollen.ts';

export type Meldung = { titel: string; text: string; pfad: string };

/** Nennt nur die geänderten Felder, nie den neuen Wert (DS-05); in der Reihenfolge von FELDER. */
export function profilMeldung(geaendert: Feld[]): Meldung {
	const namen = FELDER.filter((f) => geaendert.includes(f)).map((f) => FELD_NAMEN[f]);
	return {
		titel: 'Dein Profil',
		text: `Die Verwaltung hat dein Profil geändert: ${namen.join(', ')}.`,
		pfad: '/profil'
	};
}

export function rolleMeldung(rolle: Rolle, art: 'vergeben' | 'entzogen'): Meldung {
	const name = ROLLEN_NAME[rolle];
	return {
		titel: 'MyTCO',
		text:
			art === 'vergeben'
				? `Du hast neu die Rolle «${name}».`
				: `Deine Rolle «${name}» wurde entfernt.`,
		pfad: '/'
	};
}

/** Wiedereintritt und Rücknahme der Löschung. */
export function zugangMeldung(): Meldung {
	return { titel: 'MyTCO', text: 'Dein Zugang zu MyTCO ist wieder offen.', pfad: '/' };
}

/**
 * FR-56: Meldung an das Mitglied, erst nach dem Speichern. Betrifft es den Admin selbst, entfällt
 * sie. Die Antwort wartet nicht auf Push und Mail; wirft `meldeMitgliedern` doch, bleibt das still
 * (SI-05).
 */
export function meldeVerwaltung(
	d: MitteilungAdminDienste,
	urheber: AdminUrheber,
	mitgliedId: number,
	m: Meldung
): void {
	if (mitgliedId === urheber.mitgliedId) return;
	void meldeMitgliedern(
		{ db: d.db, push: d.push, mailer: d.mailer, adresse: d.adresse },
		[mitgliedId],
		m
	).catch(() => {});
}
