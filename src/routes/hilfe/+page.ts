import { hatSitzung } from '../../lib/login/sitzung.ts';
import { ladeKontakt } from '../../lib/profil/angaben.ts';
import type { PageLoad } from './$types';

// Ohne Login erreichbar (A-HILFE-01). Antwortet der Kontakt-Endpunkt nicht, verweist die Seite
// auf den Brief statt einen Fehler zu zeigen. `angemeldet`: Reiter und Zurück-Link (feste Ordnung).
export const load: PageLoad = async ({ fetch }) => {
	const [kontakt, angemeldet] = await Promise.all([ladeKontakt(fetch), hatSitzung(fetch)]);
	return { kontakt, angemeldet };
};
