// Dienst-Typ der Mitteilungen für die Verwaltung. Keine Schnittstellen-Datei: Die Verwaltung,
// das Gespräch und das Turnier holen ihn von hier.
import type { AdminDienste } from '../admin/rechte.ts';
import type { Mailer } from '../login/dienst.ts';
import type { PushSender } from './versand.ts';

/**
 * Die Rechte prüft die Verwaltung (`liest`/`schreibt`, Bereich `mitglieder`): Der Mitglieder-Admin
 * sendet, der MyTCO-Admin liest nur den Verlauf. `push: null` heisst: kein VAPID, Push ist aus.
 * `adresse`: Adresse von MyTCO für die Links.
 */
export type MitteilungAdminDienste = AdminDienste & {
	push: PushSender | null;
	mailer: Mailer;
	adresse: string;
};
