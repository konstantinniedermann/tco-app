import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { istNurDoku } from './nur-doku.ts';

// Grüner Stand: `make check` merkt sich am Ende den geprüften Prüfstand, der Pre-Push-Hook
// überspringt das volle `make check` für einen schon grün geprüften Prüfstand.
// Prüfstand = SHA-256 über alle Dateien eines Commits ausser Doku (Regel aus nur-doku.ts, aber
// mit den Mockups, die ein Test liest) und
// ohne die Versionsnummer in package.json/package-lock.json: Der Merge nach dev bringt die neue
// Nummer, der Code bleibt derselbe. Die Liste liegt im gemeinsamen Git-Ordner (alle Worktrees),
// unversioniert; die CI prüft unabhängig davon jeden Push auf dev.
//
//   beginn          vor dem Prüfen: HEAD festhalten, wenn nichts Uncommittetes herumliegt
//   merken          nach grünem Prüfen: Prüfstand von HEAD merken, wenn HEAD gleich und sauber blieb
//   pruefen <rev>   Exit 0, wenn der Prüfstand von <rev> grün gemerkt ist; sonst (auch bei Fehlern) 1

const LISTE = 'mytco-gruene-staende';
const BEGINN = 'mytco-check-beginn';
const HOECHSTENS = 200;
const OHNE_VERSION = new Set(['package.json', 'package-lock.json']);

function git(...argumente: string[]): string {
	return execFileSync('git', argumente, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
}

// Doku, die ein Test liest (tests/e2e/mockups.test.ts, UI-03): zählt hier als Code.
const VON_TESTS_GELESEN = 'docs/ui-mockups/';

function zaehltAlsDoku(pfad: string): boolean {
	return !pfad.startsWith(VON_TESTS_GELESEN) && istNurDoku([pfad]);
}

/**
 * package.json bzw. package-lock.json ohne die eigene Versionsnummer, sonst wörtlich (Prettier
 * prüft auch die Form); andere Dateien unverändert. Die eigene Nummer steht in package.json
 * zuerst, in package-lock.json zuerst oben und dann unter `packages[""]`.
 */
export function ohneVersion(pfad: string, inhalt: string): string {
	if (!OHNE_VERSION.has(pfad)) return inhalt;
	const version = JSON.parse(inhalt).version;
	if (typeof version !== 'string') return inhalt;
	const eintrag = `"version": ${JSON.stringify(version)}`;
	let text = inhalt;
	for (let i = 0; i < (pfad === 'package-lock.json' ? 2 : 1); i++)
		text = text.replace(eintrag, '"version": "…"');
	return text;
}

/** Prüfstand eines Commits (64 Hex-Zeichen). Wirft, wenn package.json o. ä. unlesbar ist. */
export function pruefstand(rev: string): string {
	const eintraege = git('-c', 'core.quotePath=false', 'ls-tree', '-r', '-z', rev)
		.split('\0')
		.filter(Boolean)
		.map((zeile) => {
			const tab = zeile.indexOf('\t');
			const [modus, , blob] = zeile.slice(0, tab).split(' ');
			return { modus, blob, pfad: zeile.slice(tab + 1) };
		})
		.filter(({ pfad }) => !zaehltAlsDoku(pfad))
		.map(({ modus, blob, pfad }) => {
			if (!OHNE_VERSION.has(pfad)) return `${modus} ${blob} ${pfad}`;
			const inhalt = ohneVersion(pfad, git('show', `${rev}:${pfad}`));
			return `${modus} ${createHash('sha256').update(inhalt).digest('hex')} ${pfad}`;
		});
	return createHash('sha256').update(eintraege.join('\n')).digest('hex');
}

function gemeinsamerPfad(name: string): string {
	return resolve(git('rev-parse', '--git-common-dir').trim(), name);
}

function eigenerPfad(name: string): string {
	return resolve(git('rev-parse', '--git-path', name).trim());
}

function istSauber(): boolean {
	return git('status', '--porcelain', '--untracked-files=normal').trim() === '';
}

function head(): string {
	return git('rev-parse', 'HEAD').trim();
}

function beginn(): void {
	writeFileSync(eigenerPfad(BEGINN), istSauber() ? head() : 'unsauber');
}

function merken(): void {
	const datei = eigenerPfad(BEGINN);
	const begonnen = existsSync(datei) ? readFileSync(datei, 'utf-8').trim() : '';
	rmSync(datei, { force: true });
	let grund = '';
	if (begonnen === '') grund = 'kein Beginn festgehalten';
	else if (begonnen === 'unsauber') grund = 'beim Beginn lag Uncommittetes herum';
	else if (begonnen !== head()) grund = 'während der Prüfung kam ein Commit dazu';
	else if (!istSauber()) grund = 'es liegt Uncommittetes herum';
	if (grund) {
		console.log(`gruener-stand: Stand nicht gemerkt (${grund}) — der nächste Push prüft voll.`);
		return;
	}
	const liste = gemeinsamerPfad(LISTE);
	const stand = pruefstand('HEAD');
	appendFileSync(liste, `${stand}\n`);
	const zeilen = readFileSync(liste, 'utf-8').split('\n').filter(Boolean);
	if (zeilen.length > HOECHSTENS) writeFileSync(liste, zeilen.slice(-HOECHSTENS).join('\n') + '\n');
	console.log(`gruener-stand: grüner Stand ${stand.slice(0, 12)} gemerkt.`);
}

function pruefen(rev: string): boolean {
	const liste = gemeinsamerPfad(LISTE);
	if (!existsSync(liste)) return false;
	const stand = pruefstand(rev);
	if (!readFileSync(liste, 'utf-8').split('\n').includes(stand)) return false;
	console.log(
		`gruener-stand: ${rev.slice(0, 7)} ist schon grün geprüft (Stand ${stand.slice(0, 12)}; ` +
			`seither nur Doku/Version) — make check entfällt, die CI prüft weiter.`
	);
	return true;
}

if (import.meta.main) {
	const [befehl, rev] = process.argv.slice(2);
	try {
		if (befehl === 'beginn') beginn();
		else if (befehl === 'merken') merken();
		else if (befehl === 'pruefen' && rev) process.exit(pruefen(rev) ? 0 : 1);
		else {
			console.error('Aufruf: gruener-stand.ts beginn | merken | pruefen <rev>');
			process.exit(2);
		}
	} catch (fehler) {
		// Im Zweifel voll prüfen: Ein Fehler zählt nie als grün und bricht make check nicht ab.
		console.error(`gruener-stand: ${(fehler as Error).message.split('\n')[0]}`);
		process.exit(befehl === 'pruefen' ? 1 : 0);
	}
}
