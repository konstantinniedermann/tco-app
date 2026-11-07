// Push an den Push-Dienst des Browsers (W3C Web Push, VAPID; Spec Ziel 13). Dünner Adapter um
// `web-push`; der Versand (`versand.ts`) kennt nur den `PushSender`.
import { sendNotification } from 'web-push';
import type { PushSender } from './versand.ts';

// Ein Push, der einen Tag nicht zugestellt werden konnte, ist veraltet.
const TTL_SEKUNDEN = 24 * 60 * 60;
// Ein hängender Push-Dienst hält den Versand nicht auf: Nach 10 s ohne Antwort gilt der Push als
// gescheitert (`web-push` bricht die Anfrage mit «Socket timeout» ab).
const TIMEOUT_MS = 10_000;

/**
 * Kontakt für den Push-Dienst (VAPID `subject`): die Adresse von MyTCO, wenn sie `https:` ist,
 * sonst `mailto:` mit der nackten Adresse des Mail-Absenders (`MyTCO <a@b>` → `mailto:a@b`).
 * `web-push` lehnt `http:` ab, und lokal läuft MyTCO unter `http://localhost`.
 */
export function kontaktFuerPush(adresse: string, mailAbsender: string): string {
	if (adresse.startsWith('https:')) return adresse;
	const inKlammern = /<([^<>]+)>\s*$/.exec(mailAbsender);
	return `mailto:${(inKlammern ? inKlammern[1] : mailAbsender).trim()}`;
}

/** `subject`: Kontakt für den Push-Dienst, eine `https:`- oder `mailto:`-Adresse. */
export function erstelleWebPush(
	vapid: { oeffentlich: string; privat: string },
	subject: string
): PushSender {
	const optionen = {
		TTL: TTL_SEKUNDEN,
		timeout: TIMEOUT_MS,
		vapidDetails: { subject, publicKey: vapid.oeffentlich, privateKey: vapid.privat }
	};
	return async (abo, nutzlast) => {
		try {
			await sendNotification(
				{ endpoint: abo.endpunkt, keys: { p256dh: abo.p256dh, auth: abo.auth } },
				nutzlast,
				optionen
			);
			return 'ok';
		} catch (fehler) {
			// 404/410: Das Abo gibt es beim Push-Dienst nicht mehr (abgelaufen, Push entzogen).
			const status = (fehler as { statusCode?: unknown } | null)?.statusCode;
			return status === 404 || status === 410 ? 'ungueltig' : 'fehler';
		}
	};
}
