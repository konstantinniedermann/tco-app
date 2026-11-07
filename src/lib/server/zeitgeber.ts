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

	const einmal = () => {
		// Nur die Tatsache, nie der Meldungstext (kann Personendaten enthalten).
		lauf().catch(() => console.error('Löschlauf fehlgeschlagen'));
	};
	const erster = setTimeout(() => {
		einmal();
		const wiederholung = setInterval(einmal, takt.abstand);
		wiederholung.unref();
		global[MERKER] = wiederholung;
	}, takt.start);
	erster.unref();
	global[MERKER] = erster;

	return () => {
		clearTimeout(erster);
		clearInterval(global[MERKER] as NodeJS.Timeout);
		delete global[MERKER];
	};
}
