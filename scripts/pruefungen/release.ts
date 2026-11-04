import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { meldeErgebnis } from './dateien.ts';
import { istNurDoku } from './nur-doku.ts';

// Abgleich vor dem Release dev → main (`make release-check`, Ablauf im Skill tco-branching):
// Version in package.json, Abschnitte in docs/versionen.md und Tags müssen zusammenpassen, in
// beide Richtungen. Nicht Teil von `make check`, denn zwischen zwei Releases ist der Stand
// absichtlich offen (Einträge unter «Unveröffentlicht»).

const VERSIONEN = 'docs/versionen.md';
const VERSION = String.raw`\d+\.\d+\.\d+`;
const KOPF_VERSION = new RegExp(`^## (${VERSION})(?:\\s|$)`);
const TAG_VERSION = new RegExp(`^v(${VERSION})$`);
const MARKER = /nicht ausgeliefert/i;

export type Versionsabschnitt = { version: string; nichtAusgeliefert: boolean; zeile: number };

export type Releasestand = {
	/** Version aus package.json auf dev. */
	version: string;
	/** Version aus package.json auf origin/main. */
	versionMain: string;
	/** Inhalt von docs/versionen.md. */
	versionen: string;
	tags: string[];
	/** Ob origin/main...HEAD nur Doku ändert (Regel aus nur-doku.ts). */
	nurDoku: boolean;
};

/** Negativ, null oder positiv wie bei sort: a kleiner, gleich oder grösser als b. */
function vergleicheVersionen(a: string, b: string): number {
	const teileA = a.split('.').map(Number);
	const teileB = b.split('.').map(Number);
	for (let i = 0; i < 3; i++) if (teileA[i] !== teileB[i]) return teileA[i] - teileB[i];
	return 0;
}

type Ueberschrift = { text: string; zeile: number; inhalt: string[] };

/** `## `-Abschnitte mit ihren Inhaltszeilen; Codeblöcke zählen nicht. */
function ueberschriften(markdown: string): Ueberschrift[] {
	const liste: Ueberschrift[] = [];
	let imCode = false;
	markdown.split('\n').forEach((zeile, index) => {
		if (/^\s*(```|~~~)/.test(zeile)) imCode = !imCode;
		if (!imCode && zeile.startsWith('## ')) {
			liste.push({ text: zeile, zeile: index + 1, inhalt: [] });
		} else if (!imCode && /^# /.test(zeile)) {
			return;
		} else {
			liste.at(-1)?.inhalt.push(zeile);
		}
	});
	return liste;
}

/** Abschnitte `## X.Y.Z …` mit dem Marker «nicht ausgeliefert» aus der Überschrift. */
export function versionsabschnitte(markdown: string): Versionsabschnitt[] {
	return ueberschriften(markdown).flatMap(({ text, zeile }) => {
		const treffer = KOPF_VERSION.exec(text);
		return treffer ? [{ version: treffer[1], nichtAusgeliefert: MARKER.test(text), zeile }] : [];
	});
}

export function pruefeRelease(stand: Releasestand): string[] {
	const befunde: string[] = [];
	const abschnitte = versionsabschnitte(stand.versionen);
	const getaggt = new Set(stand.tags.flatMap((tag) => TAG_VERSION.exec(tag)?.[1] ?? []));

	const anzahl = new Map<string, number>();
	for (const { version } of abschnitte) anzahl.set(version, (anzahl.get(version) ?? 0) + 1);
	for (const [version, n] of anzahl)
		if (n > 1)
			befunde.push(`${VERSIONEN}: Version ${version} hat ${n} Abschnitte, erlaubt ist einer`);

	if (!anzahl.has(stand.version))
		befunde.push(
			`${VERSIONEN}: Kein Abschnitt «## ${stand.version}» für die Version aus package.json`
		);

	const vergleich = vergleicheVersionen(stand.version, stand.versionMain);
	if (vergleich < 0)
		befunde.push(`package.json: Version sinkt von ${stand.versionMain} auf ${stand.version}`);
	else if (vergleich === 0 && !stand.nurDoku)
		befunde.push(
			`package.json: Release enthält Code, aber die Version bleibt ${stand.version} — ` +
				`Versions-Commit fehlt (Skill tco-branching, Schritt 4a)`
		);

	const unveroeffentlicht = ueberschriften(stand.versionen).find(
		({ text }) => text.trim() === '## Unveröffentlicht'
	);
	if (!unveroeffentlicht) {
		befunde.push(`${VERSIONEN}: Abschnitt «## Unveröffentlicht» fehlt`);
	} else if (
		stand.version !== stand.versionMain &&
		unveroeffentlicht.inhalt.some((zeile) => zeile.trim() !== '')
	) {
		befunde.push(
			`${VERSIONEN}:${unveroeffentlicht.zeile}: «Unveröffentlicht» ist nicht leer, obwohl sich die Version ` +
				`von ${stand.versionMain} auf ${stand.version} ändert — Einträge in den Abschnitt der neuen Version`
		);
	}

	for (const { version, nichtAusgeliefert, zeile } of abschnitte) {
		if (nichtAusgeliefert && getaggt.has(version))
			befunde.push(
				`${VERSIONEN}:${zeile}: ${version} ist als «nicht ausgeliefert» markiert, aber Tag v${version} ` +
					`existiert — Marker entfernen`
			);
		if (!nichtAusgeliefert && !getaggt.has(version) && version !== stand.version)
			befunde.push(
				`${VERSIONEN}:${zeile}: ${version} ist nicht als «nicht ausgeliefert» markiert, hat aber keinen ` +
					`Tag v${version} — Marker setzen oder Tag prüfen`
			);
	}

	for (const version of getaggt)
		if (!anzahl.has(version)) befunde.push(`Tag v${version} hat keinen Abschnitt in ${VERSIONEN}`);

	return befunde;
}

function git(...argumente: string[]): string {
	return execFileSync('git', argumente, { encoding: 'utf-8' });
}

if (import.meta.main) {
	const versionAus = (json: string): string => JSON.parse(json).version;
	git('fetch', '--quiet', '--tags', 'origin', 'main');
	meldeErgebnis(
		'release',
		pruefeRelease({
			version: versionAus(readFileSync('package.json', 'utf-8')),
			versionMain: versionAus(git('show', 'origin/main:package.json')),
			versionen: readFileSync(VERSIONEN, 'utf-8'),
			tags: git('tag', '--list', 'v*').split('\n').filter(Boolean),
			nurDoku: istNurDoku(
				git('diff', '--name-only', '--no-renames', 'origin/main...HEAD').split('\n').filter(Boolean)
			)
		})
	);
}
