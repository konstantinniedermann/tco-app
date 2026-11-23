// Gedächtnis der Tabellen-Steuerung (#92): hält Sortierung, Filter (auch Text) und Suche je
// Tabelle nur im Arbeitsspeicher des Tabs, damit die Ansicht jede Rückkehr zur Liste innerhalb der
// App übersteht (Zurück, Pfad, Seitenleiste). Kein Browserspeicher: Neuladen vergisst es.
import type { Filter, Sortierung } from './tabelle.ts';

export type Stand = { sortierung: Sortierung; filter: Filter; suche?: string };

const gedaechtnis = new Map<string, Stand>();

export function merke(tabelle: string, stand: Stand): void {
	gedaechtnis.set(tabelle, stand);
}

export function erinnere(tabelle: string): Stand | undefined {
	return gedaechtnis.get(tabelle);
}
