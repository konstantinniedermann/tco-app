import { leseDateien, meldeErgebnis, versionierteDateien } from './dateien.ts';

const ACTIONS_DEKLARATION = /\bexport\s+(?:const|let|var|(?:async\s+)?function\s*\*?)\s*actions\b/;

/** Erkennt `export { actions }` und `export { x as actions }` (auch mit mehreren Namen). */
function exportiertActions(inhalt: string): boolean {
	for (const block of inhalt.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
		const namen = block[1].split(',').map((eintrag) =>
			eintrag
				.trim()
				.split(/\s+as\s+/)
				.pop()
		);
		if (namen.includes('actions')) return true;
	}
	return false;
}

/** Prüft die Bauregel: nur API-Routen (`+server.ts`), keine Server-Dateien neben Seiten, Form Actions oder Remote Functions. */
export function pruefeBauregel(dateien: Map<string, string>): string[] {
	const befunde: string[] = [];
	for (const [pfad, inhalt] of dateien) {
		const name = pfad.split('/').pop() ?? pfad;
		const inRoutes = pfad.startsWith('src/routes/');

		if (inRoutes && /\.server\.(ts|js)$/.test(name) && !name.startsWith('+server.')) {
			befunde.push(`${pfad}: Server-Datei neben einer Seite; Daten laufen über +server.ts`);
		}
		if (inRoutes && (ACTIONS_DEKLARATION.test(inhalt) || exportiertActions(inhalt))) {
			befunde.push(`${pfad}: Form Actions sind nicht vorgesehen`);
		}
		if (/\.remote\.(ts|js)$/.test(name)) {
			befunde.push(`${pfad}: Remote Functions sind nicht vorgesehen`);
		}
		if (/^(vite|svelte)\.config\.[cm]?[tj]s$/.test(name) && /\bremoteFunctions\b/.test(inhalt)) {
			befunde.push(`${pfad}: remoteFunctions darf nicht aktiviert werden`);
		}
	}
	return befunde;
}

if (import.meta.main) {
	const pfade = versionierteDateien().filter(
		(pfad) => pfad.startsWith('src/routes/') || /^(vite|svelte)\.config\.[cm]?[tj]s$/.test(pfad)
	);
	meldeErgebnis('bauregel', pruefeBauregel(leseDateien(pfade)));
}
