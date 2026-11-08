/**
 * Ob eine Sitzung besteht, für Seiten, die auch ohne Login offen sind (Hilfe, Datenschutz): Nur
 * mit Sitzung zeigen sie die Reiter. Ohne Netz gilt «nicht angemeldet», die Seite bleibt lesbar.
 */
export async function hatSitzung(holen: typeof fetch): Promise<boolean> {
	try {
		return (await holen('/api/sitzung')).ok;
	} catch {
		return false;
	}
}
