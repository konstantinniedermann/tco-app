import { execFileSync } from 'node:child_process';
import { meldeErgebnis } from './dateien.ts';
import { istNurDoku } from './nur-doku.ts';
import { versionsabschnitte } from './release.ts';

// Prüfung beim Push auf dev (.githooks/pre-push): Jeder Schritt auf dev (Merge-Commit, erster
// Elternteil), der Code bringt, erhöht die Version um genau einen Schritt und hat zuoberst in
// docs/versionen.md seinen Abschnitt. Reine Doku lässt die Version stehen. Welcher Schritt
// (Korrektur, Neben- oder Hauptversion) gewählt wird, entscheidet der Merge (Skill tco-branching).

export type Versionsschritt = {
	commit: string;
	/** Ob der Schritt gegenüber dem ersten Elternteil nur Doku ändert (Regel aus nur-doku.ts). */
	nurDoku: boolean;
	versionVorher: string;
	version: string;
	/** Oberster Versionsabschnitt in docs/versionen.md nach dem Schritt. */
	obersteVersion: string | undefined;
};

/** Ob `neu` genau ein Schritt nach `alt` ist: x.y.(z+1), x.(y+1).0 oder (x+1).0.0. */
export function istNaechsteVersion(alt: string, neu: string): boolean {
	const [a, b, c] = alt.split('.').map(Number);
	return [`${a}.${b}.${c + 1}`, `${a}.${b + 1}.0`, `${a + 1}.0.0`].includes(neu);
}

export function pruefeVersionsschritte(schritte: Versionsschritt[]): string[] {
	const befunde: string[] = [];
	for (const { commit, nurDoku, versionVorher, version, obersteVersion } of schritte) {
		if (nurDoku) {
			if (version !== versionVorher)
				befunde.push(
					`${commit}: reine Doku, aber Version steigt von ${versionVorher} auf ${version} — ` +
						`die Nummer steigt nur mit Code`
				);
			continue;
		}
		if (version === versionVorher) {
			befunde.push(
				`${commit}: Merge mit Code, aber Version bleibt ${version} — beim Merge nach dev ` +
					`erhöhen (Skill tco-branching, Schritt 4)`
			);
			continue;
		}
		if (!istNaechsteVersion(versionVorher, version))
			befunde.push(`${commit}: ${versionVorher} → ${version} ist kein einzelner Schritt`);
		if (obersteVersion !== version)
			befunde.push(
				`${commit}: docs/versionen.md — oberster Abschnitt ist ${obersteVersion ?? 'keiner'}, ` +
					`nicht ${version}`
			);
	}
	return befunde;
}

function git(...argumente: string[]): string {
	return execFileSync('git', argumente, { encoding: 'utf-8' });
}

if (import.meta.main) {
	const bereich = process.argv[2];
	if (!bereich) {
		console.error('version-merge: Bereich fehlt (alt..neu)');
		process.exit(2);
	}
	const versionBei = (commit: string): string =>
		JSON.parse(git('show', `${commit}:package.json`)).version;
	// Was schon auf main liegt, ist ein Release: Das Realign nach dem Release spult dev auf den
	// Merge-Commit von main vor, der alle Nummern seit dem letzten Release auf einmal bringt.
	let ohneMain: string[] = [];
	try {
		git('rev-parse', '--verify', '--quiet', 'origin/main');
		ohneMain = ['^origin/main'];
	} catch {
		// Ohne origin/main (frischer Klon ohne Fetch) wird alles geprüft.
	}
	const commits = git('rev-list', '--first-parent', '--reverse', bereich, ...ohneMain)
		.split('\n')
		.filter(Boolean);
	const schritte = commits.flatMap((commit): Versionsschritt[] => {
		const eltern = git('rev-list', '--parents', '-n', '1', commit).trim().split(' ');
		if (eltern.length < 2) return [];
		const vorher = eltern[1];
		const pfade = git('diff', '--name-only', '--no-renames', vorher, commit)
			.split('\n')
			.filter(Boolean);
		return [
			{
				commit: commit.slice(0, 7),
				nurDoku: istNurDoku(pfade),
				versionVorher: versionBei(vorher),
				version: versionBei(commit),
				obersteVersion: versionsabschnitte(git('show', `${commit}:docs/versionen.md`))[0]?.version
			}
		];
	});
	meldeErgebnis('version-merge', pruefeVersionsschritte(schritte));
}
