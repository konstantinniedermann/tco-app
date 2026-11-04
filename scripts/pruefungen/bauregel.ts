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

// Admin-Routen sind dünn: Sie importieren nur den Dienst-Einstieg und die Schnittstellen, und
// von den Schnittstellen nur Einträge aus ADMIN_SCHNITTSTELLEN. Nur diese deckt der Rechte-Test
// («ohne Sitzung 401, ohne Rolle 403») ab.
const ADMIN_ROUTE = /^src\/routes\/api\/admin\/(?:.*\/)?\+server\.(ts|js)$/;
const ERLAUBTER_IMPORT = /(?:^|\/)lib\/server\/admin\/(?:index|schnittstellen)\.ts$|^\.\/\$types$/;
const ADMIN_MODUL = /(?:^|\/)lib\/server\/admin\/|^\$lib\/server\/admin\//;
const SCHNITTSTELLEN_DATEI = 'src/lib/server/admin/schnittstellen.ts';
const SCHNITTSTELLEN_IMPORT = /(?:^|\/)lib\/server\/admin\/schnittstellen\.ts$/;
const INDEX_IMPORT = /(?:^|\/)lib\/server\/admin\/index\.ts$/;
const AUS_INDEX = new Set(['holeAdminDienste']);

type Import = { quelle: string; klausel: string | null; dynamisch: boolean };

// `klausel`: was zwischen `import`/`export` und `from` steht; `null` bei `import '…'` und `import(…)`.
function importe(inhalt: string): Import[] {
	const muster =
		/\b(?:import|export)\b([^'"]*?)\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
	return [...inhalt.matchAll(muster)].map((m) =>
		m[2] !== undefined
			? { quelle: m[2], klausel: m[1].trim(), dynamisch: false }
			: { quelle: m[3] ?? m[4], klausel: null, dynamisch: m[4] !== undefined }
	);
}

/** Namen aus `{ a, b as c }` (ohne `type`); `null` bei Standard- oder Namensraum-Import. */
function benannteNamen(klausel: string): string[] | null {
	const t = klausel.replace(/^type\s+/, '');
	if (!/^\{[^}]*\}$/.test(t)) return null;
	return t
		.slice(1, -1)
		.split(',')
		.map(
			(e) =>
				e
					.trim()
					.replace(/^type\s+/, '')
					.split(/\s+as\s+/)[0]
		)
		.filter((n) => n !== '');
}

function adminSchnittstellen(dateien: Map<string, string>): Set<string> | null {
	const block = /\bexport\s+const\s+ADMIN_SCHNITTSTELLEN\s*=\s*\{([^}]*)\}/.exec(
		dateien.get(SCHNITTSTELLEN_DATEI) ?? ''
	);
	if (!block) return null;
	return new Set(
		block[1]
			.split(',')
			.map((e) => e.split(':')[0].trim())
			.filter((n) => n !== '')
	);
}

function pruefeAdminRoute(pfad: string, inhalt: string, erlaubt: Set<string>): string[] {
	const befunde: string[] = [];
	for (const imp of importe(inhalt)) {
		if (imp.dynamisch) {
			befunde.push(`${pfad}: Admin-Route lädt '${imp.quelle}' dynamisch; nur statische Importe`);
			continue;
		}
		if (!ERLAUBTER_IMPORT.test(imp.quelle)) {
			befunde.push(
				`${pfad}: Admin-Route importiert '${imp.quelle}'; erlaubt sind nur lib/server/admin/index.ts und schnittstellen.ts`
			);
			continue;
		}
		const ausListe = SCHNITTSTELLEN_IMPORT.test(imp.quelle);
		if (!ausListe && !INDEX_IMPORT.test(imp.quelle)) continue;
		const namen = imp.klausel === null ? null : benannteNamen(imp.klausel);
		if (namen === null) {
			befunde.push(`${pfad}: Admin-Route importiert '${imp.quelle}' nicht mit Namen`);
			continue;
		}
		for (const name of namen.filter((n) => !(ausListe ? erlaubt : AUS_INDEX).has(n))) {
			befunde.push(
				ausListe
					? `${pfad}: Admin-Route nutzt '${name}'; erlaubt sind nur Einträge aus ADMIN_SCHNITTSTELLEN`
					: `${pfad}: Admin-Route importiert '${name}' aus admin/index.ts; erlaubt ist nur holeAdminDienste`
			);
		}
	}
	// Die Dienste nur weiterreichen: Wer `.db` herausholt, umgeht die Rechteprüfung.
	const ohneImporte = inhalt.replace(/\bimport\b[^;]*?\bfrom\s*['"][^'"]+['"]\s*;?/g, '');
	for (const treffer of ohneImporte.matchAll(/\bholeAdminDienste\b/g)) {
		const danach = ohneImporte.slice(treffer.index + treffer[0].length);
		if (!/^\s*\(\s*\)\s*[,)]/.test(danach)) {
			befunde.push(
				`${pfad}: holeAdminDienste() nur direkt als Argument einer Schnittstelle übergeben`
			);
		}
	}
	return befunde;
}

/** Prüft die Bauregel: nur API-Routen (`+server.ts`), keine Server-Dateien neben Seiten, Form Actions oder Remote Functions. */
export function pruefeBauregel(dateien: Map<string, string>): string[] {
	const befunde: string[] = [];
	const liste = adminSchnittstellen(dateien);
	const mitAdminRoute = [...dateien.keys()].some((p) => ADMIN_ROUTE.test(p));
	if (mitAdminRoute && liste === null) {
		befunde.push(`${SCHNITTSTELLEN_DATEI}: ADMIN_SCHNITTSTELLEN nicht gefunden`);
	}
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
			if (liste !== null) befunde.push(...pruefeAdminRoute(pfad, inhalt, liste));
		} else if (inRoutes && importe(inhalt).some((i) => ADMIN_MODUL.test(i.quelle))) {
			befunde.push(
				`${pfad}: nur Routen unter src/routes/api/admin/ dürfen lib/server/admin nutzen`
			);
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

/** Dateien, die die Bauregel betreffen: Routen, Konfiguration, jede `*.remote.*` und die Liste der Admin-Schnittstellen. */
export function betrifftBauregel(pfad: string): boolean {
	return (
		pfad.startsWith('src/routes/') ||
		pfad === SCHNITTSTELLEN_DATEI ||
		/^(vite|svelte)\.config\.[cm]?[tj]s$/.test(pfad) ||
		/\.remote\.(ts|js)$/.test(pfad)
	);
}

if (import.meta.main) {
	const pfade = versionierteDateien().filter(betrifftBauregel);
	meldeErgebnis('bauregel', pruefeBauregel(leseDateien(pfade)));
}
