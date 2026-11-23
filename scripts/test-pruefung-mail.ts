// Prüflauf gegen Test (tests/test-server/): Codes aus dem Mail-Fänger von Test. Auf Test gehen alle
// Mails an eine Sammeladresse; die echte Adresse steht nur im Betreff («[Test für <adresse>] …»).
// Playwright schreibt bei Netzfehlern die Request-Header samt Zugangscookie in die Meldung: Darum
// geht jeder Fehler eines Abrufs nur als fester Text weiter.

/** Das Nötige von Playwrights `APIRequestContext` (page.request), für Tests nachbaubar. */
export type Abruf = {
	get(
		url: string,
		optionen?: { params?: Record<string, string>; timeout?: number }
	): Promise<{ ok(): boolean; status(): number; json(): Promise<unknown> }>;
};

type Treffer = { messages: { ID: string; Subject: string }[] };

const CODE_BETREFF = 'Dein Code für';
const ZEITGRENZE_MS = 10_000;
const NICHT_ERREICHBAR = 'Mail-Fänger von Test nicht erreichbar';

async function holeJson(
	request: Abruf,
	url: string,
	params?: Record<string, string>
): Promise<unknown> {
	let antwort: Awaited<ReturnType<Abruf['get']>>;
	try {
		antwort = await request.get(url, { params, timeout: ZEITGRENZE_MS });
	} catch {
		throw new Error(NICHT_ERREICHBAR);
	}
	if (!antwort.ok()) throw new Error(`Mail-Fänger von Test antwortet mit ${antwort.status()}`);
	return antwort.json();
}

/** IDs der Code-Mails an `adresse`, die jetzt im Mail-Fänger liegen. */
export async function codeMails(request: Abruf, adresse: string): Promise<string[]> {
	const treffer = (await holeJson(request, '/_mail/api/v1/search', {
		query: `subject:"Test für ${adresse}"`
	})) as Treffer;
	return treffer.messages.filter((m) => m.Subject.includes(CODE_BETREFF)).map((m) => m.ID);
}

/**
 * Wartet auf eine neue Code-Mail an `adresse` (nicht in `vorher`) und liest den Code. Neu statt
 * «nach Zeitpunkt»: Die Uhr des Servers und des Macs müssen nicht übereinstimmen.
 */
export async function holeTestMailCode(
	request: Abruf,
	adresse: string,
	vorher: string[]
): Promise<string> {
	const ende = Date.now() + 30_000;
	while (Date.now() < ende) {
		const neu = (await codeMails(request, adresse)).find((id) => !vorher.includes(id));
		if (neu) {
			const mail = (await holeJson(request, `/_mail/api/v1/message/${neu}`)) as { Text: string };
			const code = /\b(\d{6})\b/.exec(mail.Text)?.[1];
			if (code) return code;
			throw new Error('Mail ohne sechsstelligen Code');
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(`Keine neue Code-Mail an ${adresse} im Mail-Fänger`);
}
