import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Alle versionierten Dateien ausser denen der Prüfskripte selbst (deren Fixtures sind absichtlich „falsch"). */
export function versionierteDateien(): string[] {
	const ausgabe = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf-8' });
	return ausgabe
		.split('\0')
		.filter((pfad) => pfad !== '' && !pfad.startsWith('scripts/pruefungen/'));
}

/** Test-Quellen von Vitest und Playwright: `*.test.*` und `*.spec.*` in ts/js. */
export function istTestquelle(pfad: string): boolean {
	return /\.(test|spec)\.[tj]s$/.test(pfad);
}

export function leseDateien(pfade: string[]): Map<string, string> {
	return new Map(pfade.map((pfad) => [pfad, readFileSync(pfad, 'utf-8')]));
}

/** Gibt die Befunde zeilenweise auf stderr aus und beendet mit Exit 1; sonst eine „ok"-Zeile. */
export function meldeErgebnis(name: string, befunde: string[]): never {
	if (befunde.length > 0) {
		for (const befund of befunde) console.error(`${name}: ${befund}`);
		process.exit(1);
	}
	console.log(`${name}: ok`);
	process.exit(0);
}
