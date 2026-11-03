import { istTestquelle, leseDateien, meldeErgebnis, versionierteDateien } from './dateien.ts';

const MAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

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
		teile.slice(0, -1).some((verzeichnis) => /^seeds?$/.test(verzeichnis))
	);
}

/** Mailadressen in Test-, Seed-, Testdaten- und Musterbrief-Dateien dürfen nur die Domain `example.org` haben. */
export function pruefeTestdaten(dateien: Map<string, string>): string[] {
	const befunde: string[] = [];
	for (const [pfad, inhalt] of dateien) {
		if (!istTestdatei(pfad)) continue;
		for (const mail of inhalt.match(MAIL) ?? []) {
			if (mail.split('@')[1].toLowerCase() !== 'example.org') befunde.push(`${pfad}: ${mail}`);
		}
	}
	return befunde;
}

if (import.meta.main) {
	const pfade = versionierteDateien().filter(istTestdatei);
	meldeErgebnis('testdaten', pruefeTestdaten(leseDateien(pfade)));
}
