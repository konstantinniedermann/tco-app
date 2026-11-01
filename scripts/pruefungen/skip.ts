import { leseDateien, meldeErgebnis, versionierteDateien } from './dateien.ts';

const SKIP = /\.(skip|fixme)\(/;
const BEGRUENDET = /\/\/.*\bskip:/;

/** `.skip(`/`.fixme(` verlangt in derselben Zeile einen Kommentar `skip: <Grund>`. */
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
	const pfade = versionierteDateien().filter((pfad) => pfad.endsWith('.test.ts'));
	meldeErgebnis('skip', pruefeSkip(leseDateien(pfade)));
}
