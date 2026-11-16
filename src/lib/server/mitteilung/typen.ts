// Dienst-Typen der Mitteilungen. Keine Schnittstellen-Datei: Die Schnittstellen der Mitglieder und
// der Verwaltung (`schnittstellen.ts`, `verwaltung-schnittstellen.ts`), die Verwaltung von Turnier,
// CM und Gespräch und der Zusammenbau der Dienste holen sie von hier.
import type { AdminDienste } from '../admin/rechte.ts';
import type { Db } from '../db/index.ts';
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

// Für die Mitglieder: ohne Push-Sender und Mailer.
export type MitteilungDienste = { db: Db; vapidOeffentlich: string | null; jetzt?: () => Date };
