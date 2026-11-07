const MERKER = Symbol.for('mytco.zeitgeber');
const MINUTE = 60_000;
const TAG = 24 * 60 * MINUTE;

type Takt = { start: number; abstand: number };

// Startet den täglichen Takt (erster Lauf kurz nach dem Start). Der Merker auf `globalThis`
// verhindert einen zweiten Takt, wenn der Dev-Server die Hooks neu lädt.
export function starteZeitgeber(
	lauf: () => Promise<unknown>,
	takt: Takt = { start: MINUTE, abstand: TAG }
): () => void {
	const global = globalThis as Record<symbol, unknown>;
	if (global[MERKER]) return () => {};

	// Der Merker gehört genau diesem Start; ein alter Stopp darf einen neuen Takt nicht beenden.
	const eigener: { handle?: NodeJS.Timeout } = {};
	const einmal = () => {
		// Auch ein sofortiger Fehler (vor dem ersten Promise) wird gefangen. Geloggt wird nur die
		// Tatsache, nie der Meldungstext (kann Personendaten enthalten).
		Promise.resolve()
			.then(lauf)
			.catch(() => console.error('Löschlauf fehlgeschlagen'));
	};
	eigener.handle = setTimeout(() => {
		einmal();
		eigener.handle = setInterval(einmal, takt.abstand);
		eigener.handle.unref();
	}, takt.start);
	eigener.handle.unref();
	global[MERKER] = eigener;

	return () => {
		if (global[MERKER] !== eigener) return;
		clearTimeout(eigener.handle);
		clearInterval(eigener.handle);
		delete global[MERKER];
	};
}
