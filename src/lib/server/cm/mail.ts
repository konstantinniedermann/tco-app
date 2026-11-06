import type { Mailer } from '../login/dienst.ts';
import { datumLang } from '../../verwaltung/turnier-anzeige.ts';

export type BestaetigungInhalt = {
	turniername: string;
	aktion: 'an' | 'ab';
	kategorie: string;
	eigene: string[];
	anmeldeschluss: string;
};

// A-ANMELDUNG-05: Text vom Projektleiter festgelegt (06.11.2026).
export function baueBestaetigungsMail(
	i: BestaetigungInhalt,
	kontakt: string
): { betreff: string; text: string } {
	const erste =
		i.aktion === 'an'
			? `Du hast dich für «${i.kategorie}» angemeldet.`
			: `Du hast dich von «${i.kategorie}» abgemeldet.`;
	const liste =
		i.eigene.length > 0
			? [`Deine Anmeldungen für die ${i.turniername}:`, ...i.eigene.map((k) => `- ${k}`)]
			: ['Du bist zurzeit für keine Kategorie angemeldet.'];
	return {
		betreff: `${i.turniername}: deine Anmeldungen`,
		text: [
			erste,
			'',
			...liste,
			'',
			`Bis zum Anmeldeschluss am ${datumLang(i.anmeldeschluss)} kannst du dich in MyTCO unter «${i.turniername}» an- und abmelden.`,
			'',
			`Fragen? Schreib an ${kontakt}.`
		].join('\n')
	};
}

// Wirft nie; zählt nicht gegen die Code-Grenzen (SI-04). Die Anmeldung gilt auch ohne Mail.
export function erstelleBestaetigung(abh: {
	mailer: Mailer;
	kontakt: string;
}): (an: string, i: BestaetigungInhalt) => Promise<void> {
	const { mailer, kontakt } = abh;
	return async (an, i) => {
		try {
			await mailer({ an, ...baueBestaetigungsMail(i, kontakt) });
		} catch {
			// SI-05: feste Zeile, keine Fehlerdetails (können Adresse oder Zugangsdaten enthalten).
			console.error('Bestätigungs-Mail nicht versandt');
		}
	};
}
