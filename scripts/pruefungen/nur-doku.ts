import { readFileSync } from 'node:fs';

/** Doku = Endung `.md` oder Pfad unter `docs/`. Die leere Liste gilt als Doku. */
export function istNurDoku(pfade: string[]): boolean {
	return pfade.every((pfad) => pfad.endsWith('.md') || pfad.startsWith('docs/'));
}

if (import.meta.main) {
	const pfade = readFileSync(0, 'utf-8')
		.split('\n')
		.map((zeile) => zeile.trim())
		.filter((zeile) => zeile !== '');
	process.exit(istNurDoku(pfade) ? 0 : 1);
}
