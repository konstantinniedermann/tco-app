import { readFileSync } from 'node:fs';

// Doku, die die App beim Bauen einliest (Seite «Datenschutz», DS-09): zählt als Code, sonst
// liefe eine reine Textänderung weder durch die Tests noch in die Auslieferung.
const IN_DER_APP = new Set(['docs/datenschutzerklaerung.md']);

/**
 * Doku = Endung `.md` oder Pfad unter `docs/`, ausser was die App einliest (IN_DER_APP). Die
 * leere Liste gilt als Doku. Dieselbe Regel steht in scripts/ci/code-stand.sh; ändert sich eine
 * Stelle, muss die andere mit.
 */
export function istNurDoku(pfade: string[]): boolean {
	return pfade.every(
		(pfad) => !IN_DER_APP.has(pfad) && (pfad.endsWith('.md') || pfad.startsWith('docs/'))
	);
}

if (import.meta.main) {
	const pfade = readFileSync(0, 'utf-8')
		.split('\n')
		.map((zeile) => zeile.trim())
		.filter((zeile) => zeile !== '');
	process.exit(istNurDoku(pfade) ? 0 : 1);
}
