// Hilfen der E2E-Tests für Mails: lesen Mails und Codes aus Mailpit. Ohne Datenbank.
import { MAILPIT_URL } from './umgebung.ts';

type Treffer = { messages: { ID: string }[] };

/** Mails an `adresse` (neueste zuerst), wahlweise nur mit diesem Betreff. */
async function sucheMails(adresse: string, betreff?: string): Promise<{ ID: string }[]> {
	const suche = new URL('/api/v1/search', MAILPIT_URL);
	suche.searchParams.set('query', `to:"${adresse}"${betreff ? ` subject:"${betreff}"` : ''}`);
	const antwort = await fetch(suche);
	return antwort.ok ? ((await antwort.json()) as Treffer).messages : [];
}

async function mailText(id: string): Promise<string> {
	const mail = await fetch(new URL(`/api/v1/message/${id}`, MAILPIT_URL));
	return ((await mail.json()) as { Text: string }).Text;
}

// Alle Code-Mails (Login, Verwaltung, neue E-Mail-Adresse) beginnen den Betreff so.
const CODE_BETREFF = 'Dein Code für';
const warte = () => new Promise((r) => setTimeout(r, 250));

/**
 * Wartet auf die Code-Mail an `adresse` (der Versand läuft nach der Antwort) und liest den Code.
 * Nur Mails mit dem Betreff der Code-Mail: CM-Admins bekommen auch Meldungen paralleler Tests
 * (FR-47), etwa zu einem neuen Wildcard-Antrag.
 */
export async function holeMailCode(adresse: string, wartezeitMs = 15_000): Promise<string> {
	const ende = Date.now() + wartezeitMs;
	while (Date.now() < ende) {
		const [neueste] = await sucheMails(adresse, CODE_BETREFF);
		if (neueste) {
			const code = /\b(\d{6})\b/.exec(await mailText(neueste.ID))?.[1];
			if (code) return code;
			throw new Error('Mail ohne sechsstelligen Code');
		}
		await warte();
	}
	throw new Error('Keine Mail in Mailpit angekommen');
}

/**
 * Wartet auf eine Mail an `adresse` mit diesem Betreff, deren Text `inhalt` enthält, und gibt den
 * Text zurück (Meldungen ohne Push-Abo kommen als Mail, FR-47).
 */
export async function warteAufMail(
	adresse: string,
	betreff: string,
	inhalt: string,
	wartezeitMs = 15_000
): Promise<string> {
	const ende = Date.now() + wartezeitMs;
	while (Date.now() < ende) {
		for (const { ID } of await sucheMails(adresse, betreff)) {
			const text = await mailText(ID);
			if (text.includes(inhalt)) return text;
		}
		await warte();
	}
	throw new Error(`Keine Mail «${betreff}» mit «${inhalt}» in Mailpit angekommen`);
}
