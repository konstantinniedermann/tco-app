// Push an den Push-Dienst des Browsers (W3C Web Push, VAPID; Spec Ziel 13). Dünner Adapter um
// `web-push`; der Versand (`versand.ts`) kennt nur den `PushSender`.
import { sendNotification } from 'web-push';
import type { PushSender } from './versand.ts';

// Ein Push, der einen Tag nicht zugestellt werden konnte, ist veraltet.
const TTL_SEKUNDEN = 24 * 60 * 60;

/** `subject`: Kontakt für den Push-Dienst, eine `https:`- oder `mailto:`-Adresse. */
export function erstelleWebPush(
	vapid: { oeffentlich: string; privat: string },
	subject: string
): PushSender {
	const optionen = {
		TTL: TTL_SEKUNDEN,
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
