// Hilfen des Prüflaufs gegen Test: Codes aus dem Mail-Fänger von Test. Auf Test gehen alle Mails an
// eine Sammeladresse; die echte Adresse steht nur im Betreff («[Test für <adresse>] …»).
import type { APIRequestContext } from '@playwright/test';

type Treffer = { messages: { ID: string; Subject: string }[] };

const CODE_BETREFF = 'Dein Code für';

/** IDs der Code-Mails an `adresse`, die jetzt im Mail-Fänger liegen. */
export async function codeMails(request: APIRequestContext, adresse: string): Promise<string[]> {
	const antwort = await request.get('/_mail/api/v1/search', {
		params: { query: `subject:"Test für ${adresse}"` }
	});
	if (!antwort.ok()) throw new Error(`Mail-Fänger antwortet mit ${antwort.status()}`);
	return ((await antwort.json()) as Treffer).messages
		.filter((m) => m.Subject.includes(CODE_BETREFF))
		.map((m) => m.ID);
}

/**
 * Wartet auf eine neue Code-Mail an `adresse` (nicht in `vorher`) und liest den Code. Neu statt
 * «nach Zeitpunkt»: Die Uhr des Servers und des Macs müssen nicht übereinstimmen.
 */
export async function holeTestMailCode(
	request: APIRequestContext,
	adresse: string,
	vorher: string[]
): Promise<string> {
	const ende = Date.now() + 30_000;
	while (Date.now() < ende) {
		const neu = (await codeMails(request, adresse)).find((id) => !vorher.includes(id));
		if (neu) {
			const mail = await request.get(`/_mail/api/v1/message/${neu}`);
			const code = /\b(\d{6})\b/.exec(((await mail.json()) as { Text: string }).Text)?.[1];
			if (code) return code;
			throw new Error('Mail ohne sechsstelligen Code');
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(`Keine neue Code-Mail an ${adresse} im Mail-Fänger`);
}
