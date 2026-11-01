import { istTestquelle, leseDateien, meldeErgebnis, versionierteDateien } from './dateien.ts';

// Übersprungen, bedingt oder als «erwartet fehlschlagend» markiert, auch `skip()` aus dem Kontext.
const SKIP = /\.(skip|fixme|skipIf|runIf|todo|fails?)\b|\bx(it|test|describe)\(|\bskip\(/;
const BEGRUENDET = /\/\/.*\bskip:\s*\S/;

/** Jeder Treffer von SKIP verlangt in derselben Zeile einen Kommentar `skip: <Grund>`. */
export function pruefeSkip(dateien: Map<string, string>): string[] {
	const befunde: string[] = [];
	for (const [pfad, inhalt] of dateien) {
		inhalt.split('\n').forEach((zeile, index) => {
			if (SKIP.test(zeile) && !BEGRUENDET.test(zeile)) {
				befunde.push(`${pfad}:${index + 1}: übersprungener Test ohne «// skip: Grund»`);
			}
		});
	}
	return befunde;
}

if (import.meta.main) {
	const pfade = versionierteDateien().filter(istTestquelle);
	meldeErgebnis('skip', pruefeSkip(leseDateien(pfade)));
}
