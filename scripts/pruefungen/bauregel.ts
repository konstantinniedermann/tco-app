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

// Admin-Routen sind dünn: Sie importieren aus dem Zusammenbau der Dienste nur die Einstiege der
// Verwaltung und von den Schnittstellen nur Einträge der Listen in VERWALTUNGS_DATEIEN. Nur diese
// decken die Rechte-Tests ab.
const ADMIN_ROUTE = /^src\/routes\/api\/admin\/(?:.*\/)?\+server\.(ts|js)$/;
const ADMIN_MODUL = /(?:^|\/|^\$)lib\/server\/admin(?:\/|$)/;
const SERVER = 'src/lib/server/';

/**
 * Wie eine Verwaltungs-Datei ausserhalb von api/admin gesperrt ist; eine Route dort darf aus ihr
 * nichts: `ordner` = der ganze Ordner `lib/server/admin` (ADMIN_MODUL); `pfad` = die Datei an ihrem
 * Pfad (reine Verwaltungs-Datei in einem Thema, E-38).
 */
type Aussen = 'ordner' | 'pfad';

// Die Schnittstellen-Dateien der Verwaltung (relativ zu src/lib/server/) mit ihrer Liste: die eine
// Stelle für die Menge der Listen in der Bauregel. Die erste muss es geben (ADMIN_SCHNITTSTELLEN);
// fehlt eine andere Liste, gilt sie als leer. Bereich Clubmeisterschaft: TURNIER_SCHNITTSTELLEN,
// CM_ADMIN_SCHNITTSTELLEN, GESPRAECH_ADMIN_SCHNITTSTELLEN; Mitteilungen der Verwaltung:
// MITTEILUNG_ADMIN_SCHNITTSTELLEN; Anlässe der Verwaltung: ANLASS_ADMIN_SCHNITTSTELLEN.
const VERWALTUNGS_DATEIEN: readonly { datei: string; liste: string; aussen: Aussen }[] = [
	{ datei: 'admin/schnittstellen.ts', liste: 'ADMIN_SCHNITTSTELLEN', aussen: 'ordner' },
	{ datei: 'turnier/schnittstellen.ts', liste: 'TURNIER_SCHNITTSTELLEN', aussen: 'pfad' },
	{ datei: 'cm/verwaltung-schnittstellen.ts', liste: 'CM_ADMIN_SCHNITTSTELLEN', aussen: 'pfad' },
	{
		datei: 'gespraech/verwaltung-schnittstellen.ts',
		liste: 'GESPRAECH_ADMIN_SCHNITTSTELLEN',
		aussen: 'pfad'
	},
	{
		datei: 'mitteilung/verwaltung-schnittstellen.ts',
		liste: 'MITTEILUNG_ADMIN_SCHNITTSTELLEN',
		aussen: 'pfad'
	},
	{
		datei: 'anlass/verwaltung-schnittstellen.ts',
		liste: 'ANLASS_ADMIN_SCHNITTSTELLEN',
		aussen: 'pfad'
	}
];

const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
/** «a, b und c» */
const aufzaehlung = (teile: readonly string[]) =>
	teile.length < 2 ? teile.join('') : `${teile.slice(0, -1).join(', ')} und ${teile.at(-1)}`;
const ohneEndung = (datei: string) => datei.replace(/\.ts$/, '');

const SCHNITTSTELLEN_IMPORT = new RegExp(
	`(?:^|\\/)lib\\/server\\/(?:${VERWALTUNGS_DATEIEN.map((v) => escape(ohneEndung(v.datei))).join('|')})\\.ts$`
);
const ERLAUBTER_IMPORT = new RegExp(
	`${SCHNITTSTELLEN_IMPORT.source}|(?:^|\\/)lib\\/server\\/dienste\\.ts$|^\\.\\/\\$types$`
);
// Die Einstiege der Verwaltung in `dienste.ts`: Admin-Routen dürfen aus `dienste.ts` nur diese.
// Ein neuer Einstieg der Verwaltung, der hier fehlt, ist für Admin-Routen gesperrt und fällt sofort
// auf. Ausserhalb von api/admin gilt die Erlaubt-Liste MITGLIEDER_EINSTIEGE; ein Name von hier
// bekommt dort die eigene Meldung «nur Routen unter src/routes/api/admin/ …».
const VERWALTUNGS_EINSTIEGE = ['holeAdminDienste', 'holeMitteilungAdminDienste'];
// Die Einstiege der Mitglieder: das Einzige, was eine Route ausserhalb von api/admin aus `dienste.ts`
// holen darf. Erlaubt-Liste, keine Sperrliste: Was die Prüfung nicht genau als einen dieser Namen
// erkennt (ein neuer Export, ein Kommentar statt Leerzeichen um `as`, ein Unicode-Escape im
// Bezeichner), ist ein Befund.
const MITGLIEDER_EINSTIEGE = [
	'holeLoginDienst',
	'holePasskeyDienst',
	'holeProfilDienste',
	'holeCmDienste',
	'holeMitteilungDienste',
	'holeAnlassDienste'
];
const AUS_DIENSTEN = /(?:^|\/)lib\/server\/dienste\.ts$/;
const ERLAUBT_DIENSTE = VERWALTUNGS_EINSTIEGE.join(' und ');
const ERLAUBT_MITGLIEDER = `erlaubt sind nur ${MITGLIEDER_EINSTIEGE.join(', ')}`;
const ERLAUBT_IMPORT = `erlaubt sind nur ${aufzaehlung(['dienste.ts', ...VERWALTUNGS_DATEIEN.map((v) => v.datei)])}`;
const ERLAUBT_LISTEN = `erlaubt sind nur Einträge aus ${aufzaehlung(VERWALTUNGS_DATEIEN.map((v) => v.liste))}`;
// Ausserhalb von api/admin: aus dem Zusammenbau der Dienste nur, was den Mitgliedern dient. `dienste.ts` mit und ohne Endung (auch `.js`, das Vite auf `.ts` auflöst),
// über `$lib` und mit Anhang (`?…`): Der Schutz hängt hier am Namen, nicht mehr am Pfad.
const DIENSTE_MODUL = /(?:^|\/|^\$)lib\/server\/dienste(?:\.(?:ts|js))?(?:[?#].*)?$/;
// Am Pfad gesperrte Dateien (`aussen: 'pfad'`): der Pfad ohne Endung, danach alles ausser einem
// weiteren Zeichen des Dateinamens (`.ts`, `.js`, ohne, `.mjs`, `?…`, `#…`), auch über `$lib`.
const NUR_VERWALTUNG = VERWALTUNGS_DATEIEN.filter((v) => v.aussen === 'pfad').map((v) => ({
	...v,
	muster: new RegExp(`(?:^|\\/|^\\$)lib\\/server\\/${escape(ohneEndung(v.datei))}(?![\\w-])`)
}));

// Grenze: Geprüft wird jede Datei für sich. Ein Modul unter src/lib, das Admin-Funktionen
// weiterreicht, fällt hier nicht auf; das bleibt Aufgabe des Reviews.

type Import =
	| { art: 'statisch'; quelle: string; klausel: string | null }
	| { art: 'dynamisch'; quelle: string | null };

/** Entfernt Kommentare, damit z. B. ein Apostroph in einem Kommentar keinen Import verschluckt. */
function ohneKommentare(inhalt: string): string {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
}

// Ein Text in Anführungszeichen, je bis zum schliessenden Zeichen derselben Zeile; ein Escape (`\'`,
// `\"`, `\\`) beendet ihn nicht.
const TEXT = `'(?:[^'\\\\\\n]|\\\\.)*'|"(?:[^"\\\\\\n]|\\\\.)*"`;
const SCHLUESSELWORT = /\b(?:import|export)\b/g;
const OHNE_KLAUSEL = /\s*['"]([^'"]+)['"]/y;
const BIS_FROM = `\\bfrom\\s*['"]([^'"]+)['"]`;
// Klausel ohne Anführungszeichen und ohne `;`: die Form, die die Bauregel vor Schritt 09 allein kannte.
const KLAUSEL = new RegExp(`([^'";]*?)${BIS_FROM}`, 'y');
// Klausel mit Namen in Anführungszeichen (`{ 'x' as y }`, `* as 'x'`, ES2022): Texte nur in
// geschweiften Klammern oder direkt nach `as`, sonst weder Anführungszeichen noch `;`. Ein anderer
// Text, etwa ein einzelner Apostroph in einem Template- oder Regex-Literal, beginnt so keine Klausel.
const KLAUSEL_MIT_TEXT = new RegExp(
	`((?:\\bas\\s+(?:${TEXT})|[^'";{}]|\\{(?:[^'"{}]|${TEXT})*\\})*?)${BIS_FROM}`,
	'y'
);

/** Prüft ein Muster ab einer Stelle, ohne den Text dahinter zu verbrauchen. */
function ab(muster: RegExp, text: string, stelle: number): RegExpExecArray | null {
	muster.lastIndex = stelle;
	return muster.exec(text);
}

// `klausel`: was zwischen `import`/`export` und `from` steht; `null` bei `import '…'`. Jedes
// Schlüsselwort wird für sich geprüft, nicht fortlaufend: Ein Treffer, der über einen Import
// hinwegläuft, verbraucht ihn nicht; der hat seinen eigenen. Je Schlüsselwort gilt zuerst die Form
// ohne Klausel (nur nach `import`), dann die Klausel ohne Anführungszeichen, erst dann die mit Namen
// in Anführungszeichen. So gibt es jeden Treffer der Fassung vor Schritt 09 weiter, mit derselben
// Klausel; dazu kommen Treffer, die sie verbraucht oder nicht erkannt hatte.
// Dynamisch: `quelle` ist `null`, wenn der Pfad berechnet wird (`import(variable)`).
function importe(inhalt: string): Import[] {
	const text = ohneKommentare(inhalt);
	const statisch: Import[] = [];
	for (const wort of text.matchAll(SCHLUESSELWORT)) {
		const stelle = wort.index + wort[0].length;
		const ohne = wort[0] === 'import' ? ab(OHNE_KLAUSEL, text, stelle) : null;
		if (ohne) {
			statisch.push({ art: 'statisch', quelle: ohne[1], klausel: null });
			continue;
		}
		const mit = ab(KLAUSEL, text, stelle) ?? ab(KLAUSEL_MIT_TEXT, text, stelle);
		if (mit) statisch.push({ art: 'statisch', quelle: mit[2], klausel: mit[1].trim() });
	}
	const dynamisch = /\bimport\s*\(\s*(?:['"`]([^'"`$]+)['"`]\s*\))?/g;
	return [
		...statisch,
		...[...text.matchAll(dynamisch)].map((m): Import => ({
			art: 'dynamisch',
			quelle: m[1] ?? null
		}))
	];
}

/**
 * Ein Name in Anführungszeichen ohne Escape ist derselbe Name wie ohne (`'x'` = `x`). Mit Escape,
 * anderem Inhalt oder unvollständig bleibt er, wie er steht, samt Anführungszeichen: Dann passt er
 * auf keine Liste und auf keine Erlaubt-Liste (`pruefeDiensteImporte`): ein Befund.
 */
function leseName(roh: string): string {
	const text = /^(['"])([^'"\\\n]*)\1$/.exec(roh);
	return text ? text[2] : roh;
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
			return [leseName(importiert), lokal ?? importiert];
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

const listeAus = (dateien: Map<string, string>, v: (typeof VERWALTUNGS_DATEIEN)[number]) =>
	schnittstellenListe(dateien.get(SERVER + v.datei) ?? '', v.liste);

/** Alle Namen der Verwaltungs-Listen; `null`, wenn die erste Liste fehlt. */
function adminSchnittstellen(dateien: Map<string, string>): Set<string> | null {
	const [erste, ...weitere] = VERWALTUNGS_DATEIEN;
	const admin = listeAus(dateien, erste);
	if (admin === null) return null;
	return new Set([...admin, ...weitere.flatMap((v) => [...(listeAus(dateien, v) ?? [])])]);
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
			befunde.push(`${pfad}: Admin-Route importiert '${imp.quelle}'; ${ERLAUBT_IMPORT}`);
			continue;
		}
		const ausListe = SCHNITTSTELLEN_IMPORT.test(imp.quelle);
		const ausDiensten = AUS_DIENSTEN.test(imp.quelle);
		if (!ausListe && !ausDiensten) continue;
		const namen = imp.klausel === null ? null : benannteNamen(imp.klausel);
		if (namen === null) {
			befunde.push(`${pfad}: Admin-Route importiert '${imp.quelle}' nicht mit Namen`);
			continue;
		}
		for (const [name, lokal] of namen) {
			if (ausListe ? erlaubt.has(name) : VERWALTUNGS_EINSTIEGE.includes(name)) {
				if (ausListe) schnittstellen.add(lokal);
				continue;
			}
			befunde.push(
				ausListe
					? `${pfad}: Admin-Route nutzt '${name}'; ${ERLAUBT_LISTEN}`
					: `${pfad}: Admin-Route importiert '${name}' aus ${imp.quelle}; erlaubt sind nur ${ERLAUBT_DIENSTE}`
			);
		}
	}
	// Die Dienste nur einer Schnittstelle übergeben: Wer `.db` herausholt, umgeht die Rechteprüfung.
	const code = ohneKommentare(inhalt).replace(/\bimport\b[^;]*?\bfrom\s*['"][^'"]+['"]\s*;?/g, '');
	for (const treffer of code.matchAll(
		new RegExp(`\\b(?:${VERWALTUNGS_EINSTIEGE.join('|')})\\b`, 'g')
	)) {
		const davor = /([A-Za-z_$][\w$]*)\s*\(\s*$/.exec(code.slice(0, treffer.index));
		const danach = code.slice(treffer.index + treffer[0].length);
		if (!davor || !schnittstellen.has(davor[1]) || !/^\s*\(\s*\)\s*[,)]/.test(danach)) {
			befunde.push(
				`${pfad}: ${treffer[0]}() nur direkt als erstes Argument einer Schnittstelle übergeben`
			);
		}
	}
	return befunde;
}

/** Ausserhalb von api/admin: aus `dienste.ts` nur Einstiege der Mitglieder, statisch und mit Namen. */
function pruefeDiensteImporte(pfad: string, imp: Import[]): string[] {
	const befunde: string[] = [];
	for (const i of imp) {
		if (i.quelle === null || !DIENSTE_MODUL.test(i.quelle)) continue;
		const namen = i.art === 'statisch' && i.klausel !== null ? benannteNamen(i.klausel) : null;
		if (namen === null) {
			befunde.push(`${pfad}: '${i.quelle}' nur statisch und mit Namen importieren`);
			continue;
		}
		for (const [name] of namen) {
			if (MITGLIEDER_EINSTIEGE.includes(name)) continue;
			if (!VERWALTUNGS_EINSTIEGE.includes(name)) {
				befunde.push(
					`${pfad}: aus dienste.ts nur Einstiege der Mitglieder, nicht '${name}'; ${ERLAUBT_MITGLIEDER}`
				);
				continue;
			}
			befunde.push(`${pfad}: nur Routen unter src/routes/api/admin/ dürfen '${name}' nutzen`);
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
		const [erste] = VERWALTUNGS_DATEIEN;
		befunde.push(`${SERVER}${erste.datei}: ${erste.liste} nicht gefunden`);
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
			for (const v of NUR_VERWALTUNG) {
				if (imp.some((i) => i.quelle !== null && v.muster.test(i.quelle))) {
					befunde.push(
						`${pfad}: nur Routen unter src/routes/api/admin/ dürfen lib/server/${v.datei} nutzen`
					);
				}
			}
			befunde.push(...pruefeDiensteImporte(pfad, imp));
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

/** Dateien, die die Bauregel betreffen: Routen, Konfiguration, jede `*.remote.*` und die Dateien mit den Verwaltungs-Listen. */
export function betrifftBauregel(pfad: string): boolean {
	return (
		pfad.startsWith('src/routes/') ||
		VERWALTUNGS_DATEIEN.some((v) => pfad === SERVER + v.datei) ||
		/^(vite|svelte)\.config\.[cm]?[tj]s$/.test(pfad) ||
		/\.remote\.(ts|js)$/.test(pfad)
	);
}

if (import.meta.main) {
	const pfade = versionierteDateien().filter(betrifftBauregel);
	meldeErgebnis('bauregel', pruefeBauregel(leseDateien(pfade)));
}
