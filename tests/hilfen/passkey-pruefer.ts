import { randomUUID } from 'node:crypto';
import type { PasskeyPruefer } from '../../src/lib/server/login/passkey-pruefer.ts';

/**
 * Test-Prüfer: Die Antwort `{ id, ok, challenge, kennung? }` steht für die signierte
 * Browser-Antwort. Wie beim echten Prüfer gilt sie nur mit der Challenge, die der Dienst
 * übergibt (die Signatur deckt die Challenge ab). `kennung` simuliert eine abweichende
 * Credential-ID der Bibliothek.
 */
export type Antwort = { id: string; ok: boolean; challenge?: string; kennung?: string };

export function testPruefer() {
	const aufrufe = {
		einrichten: [] as {
			kontoKennung: string;
			name: string;
			anzeigename: string;
			vorhandene: string[];
		}[],
		pruefeAnmelden: 0
	};
	const passt = (antwort: unknown, challenge: string): antwort is Antwort => {
		const a = antwort as Antwort;
		return a.ok === true && a.challenge === challenge;
	};
	const pruefer: PasskeyPruefer = {
		async optionenEinrichten({ ort, kontoKennung, name, anzeigename, vorhandene }) {
			aufrufe.einrichten.push({
				kontoKennung,
				name,
				anzeigename,
				vorhandene: vorhandene.map((p) => p.kennung)
			});
			const challenge = randomUUID();
			return { optionen: { challenge, rpId: ort.rpId }, challenge };
		},
		async pruefeEinrichten({ challenge, antwort }) {
			if (!passt(antwort, challenge)) return null;
			return {
				kennung: antwort.kennung ?? antwort.id,
				oeffentlicherSchluessel: `schluessel-${antwort.id}`,
				zaehler: 0,
				transporte: ['internal', 'hybrid']
			};
		},
		async optionenAnmelden({ ort }) {
			const challenge = randomUUID();
			return { optionen: { challenge, rpId: ort.rpId }, challenge };
		},
		async pruefeAnmelden({ challenge, antwort, passkey: p }) {
			aufrufe.pruefeAnmelden++;
			if (!passt(antwort, challenge) || antwort.id !== p.kennung) return null;
			if (p.oeffentlicherSchluessel !== `schluessel-${p.kennung}`) return null;
			return { zaehler: p.zaehler + 1 };
		}
	};
	return { pruefer, aufrufe };
}
