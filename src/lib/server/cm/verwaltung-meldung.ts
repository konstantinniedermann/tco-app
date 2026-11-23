// Meldung der Verwaltung an einen Spieler der Clubmeisterschaft (FR-47, FR-56). Gebraucht von den
// Schnittstellen des Turniers (`turnier/schnittstellen.ts`, Kategorie ändern oder absagen) und
// der Anmeldungs-Verwaltung (`verwaltung-schnittstellen.ts`).
import { meldeVerwaltung } from '../admin/meldung.ts';
import type { AdminUrheber } from '../admin/rechte.ts';
import type { MitteilungAdminDienste } from '../mitteilung/typen.ts';

const TITEL = 'Clubmeisterschaft';

/**
 * FR-47: persönliche Meldung an den Spieler, erst nach dem Speichern, mit dem Weg zum Turnier.
 * Ohne Namen anderer Mitglieder, ausser im Doppel der andere Spieler (DS-05); nie der CM-Admin.
 * Versand über `meldeVerwaltung` (`admin/meldung.ts`): Betrifft es den CM-Admin selbst, entfällt
 * sie; die Antwort wartet nicht auf Push und Mail, Fehler bleiben still (SI-05).
 */
export function melde(
	d: MitteilungAdminDienste,
	urheber: AdminUrheber,
	mitgliedId: number,
	turnierId: number,
	text: string
): void {
	meldeVerwaltung(d, urheber, mitgliedId, {
		titel: TITEL,
		text,
		pfad: `/clubmeisterschaft/${turnierId}`
	});
}

/** FR-56: Der CM-Admin hat die Klassierung korrigiert; ohne den neuen Wert (DS-05), zum Profil. */
export function meldeKlassierung(
	d: MitteilungAdminDienste,
	urheber: AdminUrheber,
	mitgliedId: number
): void {
	meldeVerwaltung(d, urheber, mitgliedId, {
		titel: TITEL,
		text: 'Der CM-Admin hat deine Klassierung geändert.',
		pfad: '/profil'
	});
}
