import type { PageLoad } from './$types';

// Ohne Login erreichbar (A-HILFE-01). Antwortet der Kontakt-Endpunkt nicht, verweist die Seite
// auf den Brief statt einen Fehler zu zeigen.
export const load: PageLoad = async ({ fetch }) => {
	try {
		const antwort = await fetch('/api/kontakt');
		if (!antwort.ok) return { kontakt: null };
		const { kontakt } = (await antwort.json()) as { kontakt: string };
		return { kontakt };
	} catch {
		return { kontakt: null };
	}
};
