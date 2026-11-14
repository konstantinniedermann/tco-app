import { rufeAb, type Abruf, type Holen, type Vertrag } from '../abruf.ts';
import type { AnsichtRolle } from '../server/admin/rollen.ts';

/** Die Antwort von `/api/sitzung` (`getSitzung` in `src/lib/server/sitzung/schnittstellen.ts`). */
export type Sitzung = {
	vorname: string;
	rufname: string | null;
	passkeyHinweis: boolean;
	verwaltung: boolean;
	ansicht: AnsichtRolle | null;
	nachrichtenOffen: number;
	interclub: boolean;
};

/**
 * 401 gilt nach dem Status, auch ohne lesbaren Körper. Ein Erfolg ohne lesbaren Körper bleibt ein
 * Erfolg mit `daten: undefined` (wie im Baustein): Wer die Daten liest, scheitert dann wie früher
 * am Lesen des Körpers.
 */
const SITZUNG: Vertrag<'abgemeldet'> = { woerter: ['abgemeldet'], koerper: 'nachsichtig' };

/**
 * Fragt die Sitzung ab. Die Ladefunktion reicht ihr `fetch` herein; so bleibt `/api/sitzung` ihre
 * Abhängigkeit. Ohne Netz ist das Ergebnis eine Störung; mit `'wurf'` geht stattdessen der Wurf von
 * `fetch` weiter (Fall G, Anhang E.5): Startseite und Profil zeigen dann wie früher die allgemeine
 * Fehlerseite und nicht den Satz der Server-Störung.
 */
export async function ladeSitzung(
	holen: Holen,
	beiNetzWeg: 'stoerung' | 'wurf' = 'stoerung'
): Promise<Abruf<Sitzung, 'abgemeldet'>> {
	let wurf: { fehler: unknown } | null = null;
	const merkt: Holen = async (pfad, init) => {
		try {
			return await holen(pfad, init);
		} catch (fehler) {
			wurf = { fehler };
			throw fehler;
		}
	};
	const r = await rufeAb<Sitzung, 'abgemeldet'>('/api/sitzung', { method: 'GET' }, merkt, SITZUNG);
	if (wurf !== null && beiNetzWeg === 'wurf') throw (wurf as { fehler: unknown }).fehler;
	return r;
}

/**
 * Ob eine Sitzung besteht, für Seiten, die auch ohne Login offen sind (Hilfe, Datenschutz): Nur
 * mit Sitzung zeigen sie die Reiter. Ohne Netz gilt «nicht angemeldet», die Seite bleibt lesbar.
 */
export async function hatSitzung(holen: typeof fetch): Promise<boolean> {
	return (await ladeSitzung(holen)).art === 'ok';
}
