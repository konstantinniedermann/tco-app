import { istTestquelle, leseDateien, meldeErgebnis, versionierteDateien } from './dateien.ts';

const MAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
// Schweizer Nummern, international (+41, 0041, auch «+41 (0)79» und «+41 (79)») und national
// (079 …, auch ohne Trenner). Erlaubt ist nur die Vorwahl 00, die es nicht gibt (Testkonzept).
const TELEFON_INTERNATIONAL =
	/(?:\+|(?<![\dA-Za-z])00)41 ?(?:\(0\) ?)?\(?(\d{2})\)?[ -]?\d{3}[ -]?\d{2}[ -]?\d{2}(?![\dA-Za-z])/g;
const TELEFON_NATIONAL = /(?<![\dA-Za-z+])0(\d{2})[ /-]?\d{3}[ -]?\d{2}[ -]?\d{2}(?![\dA-Za-z])/g;

function istTestdatei(pfad: string): boolean {
	const teile = pfad.split('/');
	const name = teile.at(-1) ?? pfad;
	return (
		istTestquelle(pfad) ||
		pfad.startsWith('tests/') ||
		name.startsWith('seed') ||
		name.startsWith('musterbrief') ||
		pfad === 'scripts/testdaten.ts' ||
		name.startsWith('erfundene-') ||
		name.startsWith('beispiel-') ||
		teile
			.slice(0, -1)
			.some((verzeichnis) => /^seeds?$/.test(verzeichnis) || verzeichnis.startsWith('beispiel-'))
	);
}

/**
 * In Test-, Seed-, Testdaten-, Beispiel- und Musterbrief-Dateien haben Mailadressen nur die Domain
 * `example.org` und Telefonnummern nur die Vorwahl 00 (`+41 00 …`, national `000 …`).
 */
export function pruefeTestdaten(dateien: Map<string, string>): string[] {
	const befunde: string[] = [];
	for (const [pfad, inhalt] of dateien) {
		if (!istTestdatei(pfad)) continue;
		for (const mail of inhalt.match(MAIL) ?? []) {
			if (mail.split('@')[1].toLowerCase() !== 'example.org') befunde.push(`${pfad}: ${mail}`);
		}
		for (const muster of [TELEFON_INTERNATIONAL, TELEFON_NATIONAL]) {
			for (const [nummer, vorwahl] of inhalt.matchAll(muster)) {
				if (vorwahl !== '00') befunde.push(`${pfad}: ${nummer}`);
			}
		}
	}
	return befunde;
}

if (import.meta.main) {
	const pfade = versionierteDateien().filter(istTestdatei);
	meldeErgebnis('testdaten', pruefeTestdaten(leseDateien(pfade)));
}
