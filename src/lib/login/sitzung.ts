import { rufeAb, type Vertrag } from '../abruf.ts';

/** Nur ob ein Erfolg kommt; den Körper liest niemand. */
const NUR_ERFOLG: Vertrag<never> = { woerter: [], koerper: 'nachsichtig' };

/**
 * Ob eine Sitzung besteht, für Seiten, die auch ohne Login offen sind (Hilfe, Datenschutz): Nur
 * mit Sitzung zeigen sie die Reiter. Ohne Netz gilt «nicht angemeldet», die Seite bleibt lesbar.
 */
export async function hatSitzung(holen: typeof fetch): Promise<boolean> {
	const r = await rufeAb('/api/sitzung', { method: 'GET' }, holen, NUR_ERFOLG);
	return r.art === 'ok';
}
