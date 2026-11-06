// Anzeigenamen der Admin-Rollen; nur Typen aus dem Server, darum auch im Browser nutzbar.
import type { Rolle } from '../server/admin/rollen.ts';

export const ROLLEN_NAME: Record<Rolle, string> = {
	mytco: 'MyTCO-Admin',
	mitglieder: 'Mitglieder-Admin',
	cm: 'CM-Admin',
	lizenz: 'Lizenz-Admin'
};
