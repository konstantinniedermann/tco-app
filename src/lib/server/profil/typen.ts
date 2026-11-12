// Dienst-Typ der Schnittstellen zum Profil. Keine Schnittstellen-Datei: Der Zusammenbau der
// Dienste holt ihn von hier.
import type { Db } from '../db/index.ts';
import type { EmailWechselDienst } from './email-wechsel.ts';

export type ProfilDienste = { db: Db; wechsel: EmailWechselDienst; jetzt?: () => Date };
