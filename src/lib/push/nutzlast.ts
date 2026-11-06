// Was der Service Worker mit einem Push macht (FR-40): Nutzlast lesen und das Ziel beim Tipp
// bestimmen. Ausgelagert, damit es ohne Service Worker testbar ist.

export type Nutzlast = { titel: string; text: string; link: string };

const istText = (w: unknown): w is string => typeof w === 'string' && w.length > 0;

/** `{ titel, text, link }` aus dem Push; fehlt etwas oder ist es kein JSON: `null` (nichts zeigen). */
export function leseNutzlast(daten: { json(): unknown } | null): Nutzlast | null {
	try {
		const n = daten?.json() as Partial<Record<keyof Nutzlast, unknown>> | null | undefined;
		if (typeof n !== 'object' || n === null) return null;
		if (!istText(n.titel) || !istText(n.text) || !istText(n.link)) return null;
		return { titel: n.titel, text: n.text, link: n.link };
	} catch {
		return null;
	}
}

/** Der Link als volle Adresse, wenn er zu MyTCO selbst führt; sonst die Startseite. */
export function sicheresZiel(link: unknown, ursprung: string): string {
	const start = new URL('/', ursprung).href;
	if (typeof link !== 'string') return start;
	try {
		const ziel = new URL(link, ursprung);
		return ziel.origin === new URL(ursprung).origin ? ziel.href : start;
	} catch {
		return start;
	}
}
