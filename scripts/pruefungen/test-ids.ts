import { readFileSync } from 'node:fs';
import {
	istTestquelle,
	leseDateien,
	meldeErgebnis,
	versionierteDateien,
	wirdAusgefuehrt
} from './dateien.ts';

export type Dokus = {
	fachmodell: string;
	rollen: string;
	anforderungen: string;
	testkonzept: string;
};

function umgesetzteIds(markdown: string, idMuster: RegExp): string[] {
	const ids: string[] = [];
	for (const zeile of markdown.split('\n')) {
		if (!zeile.trimStart().startsWith('|')) continue;
		const zellen = zeile
			.trim()
			.replace(/^\||\|$/g, '')
			.split('|')
			.map((zelle) => zelle.trim());
		const id = zellen[0];
		const status = (zellen.at(-1) ?? '').replace(/\\?\*/g, '').trim().toLowerCase();
		if (zellen.length > 1 && idMuster.test(id) && status.startsWith('umgesetzt')) ids.push(id);
	}
	return ids;
}

function checkliste(testkonzept: string): string {
	const treffer = /^## Checkliste vor dem Release\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(
		testkonzept
	);
	return treffer?.[1] ?? '';
}

/** FR-/RR-/A-IDs mit Status `umgesetzt`; A-IDs aus der Release-Checkliste gelten als abgedeckt. */
export function faelligeIds(dokus: Dokus): string[] {
	const abgedeckt = checkliste(dokus.testkonzept);
	const anforderungen = umgesetzteIds(dokus.anforderungen, /^A-[A-Z0-9]+(?:-[A-Z0-9]+)*$/).filter(
		(id) => !new RegExp(`(?<![\\w-])${id}(?![\\w-])`).test(abgedeckt)
	);
	return [
		...umgesetzteIds(dokus.fachmodell, /^FR-\d+$/),
		...umgesetzteIds(dokus.rollen, /^RR-\d+$/),
		...anforderungen
	];
}

/** IDs, die in keiner Testquelle als ganzes Wort vorkommen (`FR-1` ≠ `FR-10`). */
export function fehlendeTests(ids: string[], testquellen: string[]): string[] {
	return ids.filter(
		(id) => !testquellen.some((quelle) => new RegExp(`(?<![\\w-])${id}(?![\\w-])`).test(quelle))
	);
}

/** Testdateien, die weder Vitest noch Playwright ausführt — sie dürfen keine ID abdecken. */
export function nichtAusgefuehrteTests(testpfade: string[]): string[] {
	return testpfade
		.filter((pfad) => !wirdAusgefuehrt(pfad))
		.map((pfad) => `${pfad}: Testdatei wird von keinem Testprogramm ausgeführt`);
}

if (import.meta.main) {
	const lies = (pfad: string) => readFileSync(pfad, 'utf-8');
	const ids = faelligeIds({
		fachmodell: lies('docs/fachmodell.md'),
		rollen: lies('docs/rollen-und-rechte.md'),
		anforderungen: lies('docs/anforderungen/anforderungen.md'),
		testkonzept: lies('docs/testkonzept.md')
	});
	const testpfade = versionierteDateien().filter(istTestquelle);
	const quellen = [...leseDateien(testpfade.filter(wirdAusgefuehrt)).values()];
	meldeErgebnis('test-ids', [
		...nichtAusgefuehrteTests(testpfade),
		...fehlendeTests(ids, quellen).map((id) => `${id} ist umgesetzt, aber kein Test nennt die ID`)
	]);
}
