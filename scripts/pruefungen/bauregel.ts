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
// von den Schnittstellen nur Einträge aus ADMIN_SCHNITTSTELLEN oder TURNIER_SCHNITTSTELLEN (Bereich
// Clubmeisterschaft, offen auch für `cm`). Nur diese decken die Rechte-Tests ab.
const ADMIN_ROUTE = /^src\/routes\/api\/admin\/(?:.*\/)?\+server\.(ts|js)$/;
const ERLAUBTER_IMPORT =
	/(?:^|\/)lib\/server\/(?:admin\/(?:index|schnittstellen)|turnier\/schnittstellen)\.ts$|^\.\/\$types$/;
const ADMIN_MODUL = /(?:^|\/|^\$)lib\/server\/admin(?:\/|$)/;
const SCHNITTSTELLEN_DATEI = 'src/lib/server/admin/schnittstellen.ts';
const TURNIER_DATEI = 'src/lib/server/turnier/schnittstellen.ts';
const SCHNITTSTELLEN_IMPORT = /(?:^|\/)lib\/server\/(?:admin|turnier)\/schnittstellen\.ts$/;
const INDEX_IMPORT = /(?:^|\/)lib\/server\/admin\/index\.ts$/;
const AUS_INDEX = new Set(['holeAdminDienste']);

// Grenze: Geprüft wird jede Datei für sich. Ein Modul unter src/lib, das Admin-Funktionen
// weiterreicht, fällt hier nicht auf; das bleibt Aufgabe des Reviews.

type Import =
	| { art: 'statisch'; quelle: string; klausel: string | null }
	| { art: 'dynamisch'; quelle: string | null };

/** Entfernt Kommentare, damit z. B. ein Apostroph in einem Kommentar keinen Import verschluckt. */
function ohneKommentare(inhalt: string): string {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
}

// `klausel`: was zwischen `import`/`export` und `from` steht; `null` bei `import '…'`.
// Dynamisch: `quelle` ist `null`, wenn der Pfad berechnet wird (`import(variable)`).
function importe(inhalt: string): Import[] {
	const text = ohneKommentare(inhalt);
	const statisch =
		/\b(?:import|export)\b([^'";]*?)\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/g;
	const dynamisch = /\bimport\s*\(\s*(?:['"`]([^'"`$]+)['"`]\s*\))?/g;
	return [
		...[...text.matchAll(statisch)].map((m): Import =>
			m[2] !== undefined
				? { art: 'statisch', quelle: m[2], klausel: m[1].trim() }
				: { art: 'statisch', quelle: m[3], klausel: null }
		),
		...[...text.matchAll(dynamisch)].map((m): Import => ({
			art: 'dynamisch',
			quelle: m[1] ?? null
		}))
	];
}

/** Paare [importiert, lokal] aus `{ a, b as c }` (ohne `type`); `null` bei Standard- oder Namensraum-Import. */
function benannteNamen(klausel: string): [string, string][] | null {
	const t = klausel.replace(/^type\s+/, '');
	if (!/^\{[^}]*\}$/.test(t)) return null;
	return t
		.slice(1, -1)
		.split(',')
		.map((e) => e.trim().replace(/^type\s+/, ''))
		.filter((e) => e !== '')
		.map((e): [string, string] => {
			const [importiert, lokal] = e.split(/\s+as\s+/);
			return [importiert, lokal ?? importiert];
		});
}

function schnittstellenListe(inhalt: string, konstante: string): Set<string> | null {
	const block = new RegExp(`\\bexport\\s+const\\s+${konstante}\\s*=\\s*\\{([^}]*)\\}`).exec(inhalt);
	if (!block) return null;
	return new Set(
		block[1]
			.split(',')
			.map((e) => e.split(':')[0].trim())
			.filter((n) => n !== '')
	);
}

function adminSchnittstellen(dateien: Map<string, string>): Set<string> | null {
	const admin = schnittstellenListe(
		dateien.get(SCHNITTSTELLEN_DATEI) ?? '',
		'ADMIN_SCHNITTSTELLEN'
	);
	if (admin === null) return null;
	const turnier = schnittstellenListe(dateien.get(TURNIER_DATEI) ?? '', 'TURNIER_SCHNITTSTELLEN');
	return new Set([...admin, ...(turnier ?? [])]);
}

function pruefeAdminRoute(pfad: string, inhalt: string, erlaubt: Set<string>): string[] {
	const befunde: string[] = [];
	// Lokale Namen der erlaubten Schnittstellen (auch mit `as` umbenannt).
	const schnittstellen = new Set<string>();
	for (const imp of importe(inhalt)) {
		if (imp.art === 'dynamisch') {
			befunde.push(
				`${pfad}: Admin-Route lädt '${imp.quelle ?? '(berechnet)'}' dynamisch; nur statische Importe`
			);
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
		for (const [name, lokal] of namen) {
			if ((ausListe ? erlaubt : AUS_INDEX).has(name)) {
				if (ausListe) schnittstellen.add(lokal);
				continue;
			}
			befunde.push(
				ausListe
					? `${pfad}: Admin-Route nutzt '${name}'; erlaubt sind nur Einträge aus ADMIN_SCHNITTSTELLEN`
					: `${pfad}: Admin-Route importiert '${name}' aus admin/index.ts; erlaubt ist nur holeAdminDienste`
			);
		}
	}
	// Die Dienste nur einer Schnittstelle übergeben: Wer `.db` herausholt, umgeht die Rechteprüfung.
	const code = ohneKommentare(inhalt).replace(/\bimport\b[^;]*?\bfrom\s*['"][^'"]+['"]\s*;?/g, '');
	for (const treffer of code.matchAll(/\bholeAdminDienste\b/g)) {
		const davor = /([A-Za-z_$][\w$]*)\s*\(\s*$/.exec(code.slice(0, treffer.index));
		const danach = code.slice(treffer.index + treffer[0].length);
		if (!davor || !schnittstellen.has(davor[1]) || !/^\s*\(\s*\)\s*[,)]/.test(danach)) {
			befunde.push(
				`${pfad}: holeAdminDienste() nur direkt als erstes Argument einer Schnittstelle übergeben`
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
		} else if (inRoutes) {
			const imp = importe(inhalt);
			if (imp.some((i) => i.quelle !== null && ADMIN_MODUL.test(i.quelle))) {
				befunde.push(
					`${pfad}: nur Routen unter src/routes/api/admin/ dürfen lib/server/admin nutzen`
				);
			}
			if (imp.some((i) => i.quelle === null)) {
				befunde.push(`${pfad}: dynamischer Import mit berechnetem Pfad lässt sich nicht prüfen`);
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

/** Dateien, die die Bauregel betreffen: Routen, Konfiguration, jede `*.remote.*` und die Liste der Admin-Schnittstellen. */
export function betrifftBauregel(pfad: string): boolean {
	return (
		pfad.startsWith('src/routes/') ||
		pfad === SCHNITTSTELLEN_DATEI ||
		pfad === TURNIER_DATEI ||
		/^(vite|svelte)\.config\.[cm]?[tj]s$/.test(pfad) ||
		/\.remote\.(ts|js)$/.test(pfad)
	);
}

if (import.meta.main) {
	const pfade = versionierteDateien().filter(betrifftBauregel);
	meldeErgebnis('bauregel', pruefeBauregel(leseDateien(pfade)));
}
