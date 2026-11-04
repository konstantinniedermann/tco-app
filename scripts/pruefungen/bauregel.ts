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

// Admin-Routen sind dünn: Sie importieren nur den Dienst-Einstieg und die Schnittstellen.
const ADMIN_ROUTE = /^src\/routes\/api\/admin\/(?:.*\/)?\+server\.(ts|js)$/;
const ERLAUBTER_IMPORT = /(?:^|\/)lib\/server\/admin\/(?:index|schnittstellen)\.ts$|^\.\/\$types$/;

function importe(inhalt: string): string[] {
	const muster =
		/\b(?:import|export)\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
	return [...inhalt.matchAll(muster)].map((m) => m[1] ?? m[2] ?? m[3]);
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
		if (ADMIN_ROUTE.test(pfad)) {
			for (const quelle of importe(inhalt)) {
				if (!ERLAUBTER_IMPORT.test(quelle)) {
					befunde.push(
						`${pfad}: Admin-Route importiert '${quelle}'; erlaubt sind nur lib/server/admin/index.ts und schnittstellen.ts`
					);
				}
			}
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

/** Dateien, die die Bauregel betreffen: Routen, Konfiguration und jede `*.remote.*`. */
export function betrifftBauregel(pfad: string): boolean {
	return (
		pfad.startsWith('src/routes/') ||
		/^(vite|svelte)\.config\.[cm]?[tj]s$/.test(pfad) ||
		/\.remote\.(ts|js)$/.test(pfad)
	);
}

if (import.meta.main) {
	const pfade = versionierteDateien().filter(betrifftBauregel);
	meldeErgebnis('bauregel', pruefeBauregel(leseDateien(pfade)));
}
