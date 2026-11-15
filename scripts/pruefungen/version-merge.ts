import { execFileSync } from 'node:child_process';
import { meldeErgebnis } from './dateien.ts';
import { istNurDoku } from './nur-doku.ts';
import { unveroeffentlicht, versionsabschnitte } from './release.ts';

// Prüfung beim Push auf dev (.githooks/pre-push), je Schritt auf dev (erster Elternteil). Eine
// Nummer entsteht nur im Doku-Abgleich vor dem Release dev → main (ADR-012):
// (a) Code, Nummer bleibt: unter «Unveröffentlicht» in docs/versionen.md steht mindestens eine
//     nicht leere Zeile, die vorher dort nicht stand (der Eintrag des Merges).
// (b) Nummer steigt (der Abgleich): um genau einen Schritt, ihr Abschnitt zuoberst,
//     «Unveröffentlicht» leer.
// (c) Reine Doku: keine Forderung an den Eintrag; die Nummer bleibt.
// Welche Stufe der Abgleich wählt, steht im Skill tco-branching (Schritt 4a).

export type Versionsschritt = {
	commit: string;
	/** Ob der Schritt gegenüber dem ersten Elternteil nur Doku ändert (Regel aus nur-doku.ts). */
	nurDoku: boolean;
	versionVorher: string;
	version: string;
	/** Oberster Versionsabschnitt in docs/versionen.md nach dem Schritt. */
	obersteVersion: string | undefined;
	/** Inhaltszeilen von «## Unveröffentlicht» vor dem Schritt; undefined, wenn der Abschnitt fehlt. */
	unveroeffentlichtVorher: string[] | undefined;
	/** Inhaltszeilen von «## Unveröffentlicht» nach dem Schritt; undefined, wenn der Abschnitt fehlt. */
	unveroeffentlicht: string[] | undefined;
};

/** Ob `neu` genau ein Schritt nach `alt` ist: x.y.(z+1), x.(y+1).0 oder (x+1).0.0. */
export function istNaechsteVersion(alt: string, neu: string): boolean {
	const [a, b, c] = alt.split('.').map(Number);
	return [`${a}.${b}.${c + 1}`, `${a}.${b + 1}.0`, `${a + 1}.0.0`].includes(neu);
}

/** Nicht leere Zeilen, Leerraum zusammengefasst: Eine reine Leerzeichen-Änderung zählt nicht. */
function eintragszeilen(inhalt: string[]): Set<string> {
	return new Set(inhalt.map((zeile) => zeile.replace(/\s+/g, ' ').trim()).filter(Boolean));
}

const OHNE_ABSCHNITT = 'docs/versionen.md — Abschnitt «## Unveröffentlicht» fehlt';

export function pruefeVersionsschritte(schritte: Versionsschritt[]): string[] {
	const befunde: string[] = [];
	for (const schritt of schritte) {
		const { commit, nurDoku, versionVorher, version, obersteVersion } = schritt;
		if (nurDoku) {
			if (version !== versionVorher)
				befunde.push(
					`${commit}: reine Doku, aber Version steigt von ${versionVorher} auf ${version} — ` +
						`die Nummer steigt nur mit Code`
				);
			continue;
		}
		if (schritt.unveroeffentlicht === undefined) {
			befunde.push(`${commit}: ${OHNE_ABSCHNITT}`);
			continue;
		}
		const nachher = eintragszeilen(schritt.unveroeffentlicht);
		if (version === versionVorher) {
			const vorher = eintragszeilen(schritt.unveroeffentlichtVorher ?? []);
			if (![...nachher].some((zeile) => !vorher.has(zeile)))
				befunde.push(
					`${commit}: Merge mit Code ohne neuen Eintrag unter «Unveröffentlicht» in ` +
						`docs/versionen.md — Eintrag ergänzen (Skill tco-branching, Schritt 4)`
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
		if (nachher.size > 0)
			befunde.push(
				`${commit}: Version steigt auf ${version}, aber «Unveröffentlicht» ist nicht leer — ` +
					`Einträge in den Abschnitt «## ${version}» (Skill tco-branching, Schritt 4a)`
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
	const versionenBei = (commit: string): string => git('show', `${commit}:docs/versionen.md`);
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
		const versionen = versionenBei(commit);
		return [
			{
				commit: commit.slice(0, 7),
				nurDoku: istNurDoku(pfade),
				versionVorher: versionBei(vorher),
				version: versionBei(commit),
				obersteVersion: versionsabschnitte(versionen)[0]?.version,
				unveroeffentlichtVorher: unveroeffentlicht(versionenBei(vorher))?.inhalt,
				unveroeffentlicht: unveroeffentlicht(versionen)?.inhalt
			}
		];
	});
	meldeErgebnis('version-merge', pruefeVersionsschritte(schritte));
}
