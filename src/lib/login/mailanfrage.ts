// Merkt sich im Browser, an welche Adresse ein Mail-Code ging. Wechselt das Handy in die
// Mail-App und lädt MyTCO danach neu, steht wieder das Feld «Code aus der Mail» da.
// Der Speicher wird übergeben, damit das ohne Browser testbar ist. Speicher kann fehlen oder
// gesperrt sein (privates Fenster): jeder Zugriff steht in try/catch, ein Fehler gilt als
// «kein Eintrag».

export const MAILANFRAGE_SCHLUESSEL = 'mytco-mailanfrage';

/** So lange gilt ein Mail-Code (wie MAIL_CODE_GUELTIG_MS auf dem Server). */
const GUELTIG_MS = 15 * 60_000;

export type Speicher = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const OHNE_SPEICHER: Speicher = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/** localStorage des Browsers; schon der Zugriff kann werfen (gesperrter Speicher). */
export function holeSpeicher(hole: () => Storage = () => localStorage): Speicher {
	try {
		return hole() ?? OHNE_SPEICHER;
	} catch {
		return OHNE_SPEICHER;
	}
}

export function merkeMailanfrage(s: Pick<Storage, 'setItem'>, email: string, jetzt: number): void {
	try {
		s.setItem(MAILANFRAGE_SCHLUESSEL, JSON.stringify({ email, zeit: jetzt }));
	} catch {
		// Ohne Speicher fragt die Seite nach dem Neuladen einfach wieder nach der Adresse.
	}
}

/** Gemerkte Adresse oder null; abgelaufene und kaputte Einträge werden gelöscht. */
export function leseMailanfrage(
	s: Pick<Storage, 'getItem' | 'removeItem'>,
	jetzt: number
): string | null {
	try {
		const roh = s.getItem(MAILANFRAGE_SCHLUESSEL);
		if (roh === null) return null;
		const eintrag: unknown = JSON.parse(roh);
		if (typeof eintrag === 'object' && eintrag !== null && !Array.isArray(eintrag)) {
			const { email, zeit } = eintrag as Record<string, unknown>;
			const alter = typeof zeit === 'number' ? jetzt - zeit : NaN;
			if (typeof email === 'string' && email !== '' && alter >= 0 && alter <= GUELTIG_MS) {
				return email;
			}
		}
	} catch {
		// Kaputter Eintrag oder gesperrter Speicher: wie kein Eintrag.
	}
	vergissMailanfrage(s);
	return null;
}

export function vergissMailanfrage(s: Pick<Storage, 'removeItem'>): void {
	try {
		s.removeItem(MAILANFRAGE_SCHLUESSEL);
	} catch {
		// Nichts zu tun: ohne Speicher gibt es auch keinen Eintrag.
	}
}
