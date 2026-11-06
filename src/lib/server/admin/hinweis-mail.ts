import type { Bremsen } from '../login/bremse.ts';
import type { Mailer } from '../login/dienst.ts';

// SI-09: Text vom Projektleiter festgelegt (06.11.2026); nennt weder die alte noch die neue Adresse.
export function baueEmailHinweisMail(kontakt: string): { betreff: string; text: string } {
	return {
		betreff: 'Deine E-Mail-Adresse in MyTCO wurde geändert',
		text: [
			'Die Verwaltung von MyTCO hat die E-Mail-Adresse deines Kontos geändert. Mails von MyTCO gehen ab jetzt an die neue Adresse, auch der Code zum Anmelden.',
			'',
			`Hast du diese Änderung nicht verlangt? Dann melde dich bitte bei ${kontakt}.`
		].join('\n')
	};
}

export type HinweisAbh = { mailer: Mailer; kontakt: string; bremsen: Bremsen };

// Wirft nie. Die Mail zählt gegen die Grenzen der Empfänger-Adresse (SI-04), wird von ihnen aber
// nie blockiert: Sonst merkte die Person eine Übernahme nicht, wenn Login-Codes die Grenze
// ausgeschöpft haben (SI-09). Eine Flut bleibt begrenzt, weil nur eine bestätigte
// Adress-Änderung durch einen Mitglieder-Admin den Hinweis auslöst.
export function erstelleHinweis(abh: HinweisAbh): (an: string) => Promise<void> {
	const { mailer, kontakt, bremsen } = abh;
	return async (an) => {
		try {
			const adresse = an.trim().toLowerCase();
			bremsen.mailsProAdresseStunde.zaehle(adresse);
			bremsen.mailsProAdresseTag.zaehle(adresse);
			await mailer({ an, ...baueEmailHinweisMail(kontakt) });
		} catch {
			// SI-05: feste Zeile, keine Fehlerdetails (können Adresse oder Zugangsdaten enthalten).
			console.error('Hinweis-Mail nicht versandt');
		}
	};
}
