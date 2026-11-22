const MINUTE = 60_000;
export const STUNDE = 60 * MINUTE;
const TAG = 24 * STUNDE;

type Takt = { start: number; abstand: number };

/** Eine Art Takt: `name` trennt die Merker, `fehler` ist der feste Log-Text bei einem Wurf. */
export type ZeitgeberArt = { name: string; fehler: string };
export const LOESCHLAUF: ZeitgeberArt = { name: 'loeschlauf', fehler: 'Löschlauf fehlgeschlagen' };

// Startet einen Takt (erster Lauf nach `takt.start`, dann alle `takt.abstand`). Je Art ein Merker
// auf `globalThis`: Er verhindert einen zweiten Takt derselben Art, wenn der Dev-Server die Hooks neu
// lädt; verschiedene Arten laufen nebeneinander.
export function starteZeitgeber(
	lauf: () => Promise<unknown>,
	takt: Takt = { start: MINUTE, abstand: TAG },
	art: ZeitgeberArt = LOESCHLAUF
): () => void {
	const merker = Symbol.for(`mytco.zeitgeber.${art.name}`);
	const global = globalThis as Record<symbol, unknown>;
	if (global[merker]) return () => {};

	// Der Merker gehört genau diesem Start; ein alter Stopp darf einen neuen Takt nicht beenden.
	const eigener: { handle?: NodeJS.Timeout } = {};
	const einmal = () => {
		// Auch ein sofortiger Fehler (vor dem ersten Promise) wird gefangen. Geloggt wird nur der
		// feste Text der Art, nie der Meldungstext (kann Personendaten enthalten).
		Promise.resolve()
			.then(lauf)
			.catch(() => console.error(art.fehler));
	};
	eigener.handle = setTimeout(() => {
		einmal();
		eigener.handle = setInterval(einmal, takt.abstand);
		eigener.handle.unref();
	}, takt.start);
	eigener.handle.unref();
	global[merker] = eigener;

	return () => {
		if (global[merker] !== eigener) return;
		clearTimeout(eigener.handle);
		clearInterval(eigener.handle);
		delete global[merker];
	};
}
