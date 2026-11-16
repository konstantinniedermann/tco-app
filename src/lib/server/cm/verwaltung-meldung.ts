// Meldung der Verwaltung an einen Spieler der Clubmeisterschaft (FR-47). Gebraucht von den
// Schnittstellen des Turniers (`turnier/schnittstellen.ts`, Kategorie ändern oder absagen) und
// der Anmeldungs-Verwaltung (`verwaltung-schnittstellen.ts`).
import type { AdminUrheber } from '../admin/rechte.ts';
import { meldeMitgliedern } from '../mitteilung/meldung.ts';
import type { MitteilungAdminDienste } from '../mitteilung/typen.ts';

/**
 * FR-47: persönliche Meldung an den Spieler, erst nach dem Speichern. Ohne Namen anderer
 * Mitglieder, ausser im Doppel der andere Spieler (DS-05); nie der CM-Admin. Betrifft es den CM-Admin selbst, entfällt sie. Die Antwort
 * wartet nicht auf Push und Mail; wirft `meldeMitgliedern` doch, bleibt das still (SI-05).
 */
export function melde(
	d: MitteilungAdminDienste,
	urheber: AdminUrheber,
	mitgliedId: number,
	turnierId: number,
	text: string
): void {
	if (mitgliedId === urheber.mitgliedId) return;
	void meldeMitgliedern(
		{ db: d.db, push: d.push, mailer: d.mailer, adresse: d.adresse },
		[mitgliedId],
		{ titel: 'Clubmeisterschaft', text, pfad: `/clubmeisterschaft/${turnierId}` }
	).catch(() => {});
}
