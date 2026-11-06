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

/** Was der Service Worker von einem offenen Fenster braucht (`WindowClient`). */
export type Fenster = {
	url: string;
	focus(): Promise<unknown>;
	navigate(url: string): Promise<Fenster | null>;
};

/** Was der Service Worker von `self.clients` braucht (`Clients`). */
export type Fensterliste = {
	matchAll(o: { type: 'window'; includeUncontrolled: boolean }): Promise<readonly Fenster[]>;
	openWindow(url: string): Promise<unknown>;
};

/**
 * Ein offenes Fenster von MyTCO navigiert zum Ziel und bekommt danach den Fokus. Lässt es sich
 * nicht navigieren (nicht vom Service Worker gesteuert), öffnet ein neues Fenster. Nie beides.
 */
export async function oeffneZiel(c: Fensterliste, ziel: string, ursprung: string): Promise<void> {
	const fenster = await c.matchAll({ type: 'window', includeUncontrolled: true });
	const offen = fenster.find((f) => new URL(f.url).origin === new URL(ursprung).origin);
	if (offen) {
		let geladen: Fenster | null;
		try {
			geladen = await offen.navigate(ziel);
		} catch {
			await c.openWindow(ziel);
			return;
		}
		// `null`: Die Seite ist geladen, gibt aber keinen Client zurück; kein zweites Fenster.
		await geladen?.focus().catch(() => undefined);
		return;
	}
	await c.openWindow(ziel);
}
