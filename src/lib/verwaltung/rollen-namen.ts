// Anzeigenamen der Admin-Rollen; nur Typen aus dem Server, darum auch im Browser nutzbar.
import type { AnsichtRolle, Rolle } from '../server/admin/rollen.ts';

export const ROLLEN_NAME: Record<Rolle, string> = {
	mytco: 'MyTCO-Admin',
	mitglieder: 'Mitglieder-Admin',
	cm: 'CM-Admin',
	lizenz: 'Lizenz-Admin'
};

/** Rollen für «Ansicht als …», in der Reihenfolge der Auswahl (wie `ANSICHT_ROLLEN`). */
export const ANSICHT_NAME: Record<AnsichtRolle, string> = {
	mitglied: 'Mitglied',
	mitglieder: ROLLEN_NAME.mitglieder,
	cm: ROLLEN_NAME.cm,
	lizenz: ROLLEN_NAME.lizenz
};
