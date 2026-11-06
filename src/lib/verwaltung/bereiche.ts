// RR-07: Wer welchen Bereich der Verwaltung liest und wer darin schreibt. Nur Typen aus dem
// Server, darum auch im Browser nutzbar; durchgesetzt wird an den Schnittstellen.
import type { VerwaltungsRolle } from '../server/admin/rollen.ts';

export type Bereich = 'mitglieder' | 'cm' | 'rollen';
export type Art = 'lesen' | 'schreiben';

// Der MyTCO-Admin liest alles und schreibt nur die Rollen (Regel 3); keine Rolle vertritt eine
// andere (Regel 4).
export const BEREICHE: Record<
	Bereich,
	{ lesen: readonly VerwaltungsRolle[]; schreiben: readonly VerwaltungsRolle[] }
> = {
	mitglieder: { lesen: ['mitglieder', 'mytco'], schreiben: ['mitglieder'] },
	cm: { lesen: ['cm', 'mytco'], schreiben: ['cm'] },
	rollen: { lesen: ['mytco'], schreiben: ['mytco'] }
};

/** RR-01: Die Rechte addieren sich; eine der Rollen genügt. */
export function darf(rollen: readonly VerwaltungsRolle[], bereich: Bereich, art: Art): boolean {
	return rollen.some((r) => BEREICHE[bereich][art].includes(r));
}
