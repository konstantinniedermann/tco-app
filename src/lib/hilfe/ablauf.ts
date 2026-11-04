// Takt der Anleitung (UI-09): ein Bild pro Schritt, das letzte Bild ist «Fertig» und bleibt
// länger stehen; nach drei Durchläufen hält die Animation dort an.

export const SCHRITT_MS = 3500;
export const FERTIG_MS = 6000;
export const DURCHLAEUFE = 3;

/** `schritt` zählt ab 0; das letzte Bild (`anzahl - 1`) ist «Fertig». */
export type Ablauf = { schritt: number; durchlauf: number; anzahl: number };

export function start(anzahl: number): Ablauf {
	return { schritt: 0, durchlauf: 1, anzahl };
}

function istFertig(a: Ablauf): boolean {
	return a.schritt === a.anzahl - 1;
}

export function dauerMs(a: Ablauf): number {
	return istFertig(a) ? FERTIG_MS : SCHRITT_MS;
}

export function weiter(a: Ablauf): Ablauf | 'ende' {
	if (!istFertig(a)) return { ...a, schritt: a.schritt + 1 };
	if (a.durchlauf >= DURCHLAEUFE) return 'ende';
	return { ...a, schritt: 0, durchlauf: a.durchlauf + 1 };
}
