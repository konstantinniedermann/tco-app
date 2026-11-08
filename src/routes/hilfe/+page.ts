import { hatSitzung } from '../../lib/login/sitzung.ts';
import type { PageLoad } from './$types';

// Ohne Login erreichbar (A-HILFE-01). Antwortet der Kontakt-Endpunkt nicht, verweist die Seite
// auf den Brief statt einen Fehler zu zeigen. `angemeldet`: Reiter und Zurück-Link (feste Ordnung).
export const load: PageLoad = async ({ fetch }) => {
	const [kontakt, angemeldet] = await Promise.all([holeKontakt(fetch), hatSitzung(fetch)]);
	return { kontakt, angemeldet };
};

async function holeKontakt(holen: typeof fetch): Promise<string | null> {
	try {
		const antwort = await holen('/api/kontakt');
		if (!antwort.ok) return null;
		return ((await antwort.json()) as { kontakt: string }).kontakt;
	} catch {
		return null;
	}
}
