import { leseDateien, meldeErgebnis, versionierteDateien } from './dateien.ts';

// Rechtemodell der CI (ohne YAML-Paket): Workflow-Ebene genau `contents: read`; die
// wirksamen Rechte je Job sind fest vorgegeben; SSH-Secrets nur im Job `ausliefern`,
// und der läuft ohne npm/node/Fremd-Actions/Cache/Artefakte.
const WORKFLOW_RECHTE = ['contents: read'];
const JOB_RECHTE: Record<string, string[]> = {
	bauen: ['contents: read', 'packages: write'],
	finden: ['contents: read', 'packages: read'],
	ausliefern: ['packages: read'],
	release: ['contents: write']
};
const STANDARD_RECHTE = ['contents: read'];
const AUSLIEFERN = 'ausliefern';
const VERBOTENE_WOERTER = ['npm', 'npx', 'node', 'cache', 'artifact'];

type Zeile = { einzug: number; text: string };

/** Zerlegt in Zeilen mit Einzug; leere Zeilen und reine Kommentarzeilen entfallen. */
function zeilen(yaml: string): Zeile[] {
	return yaml
		.split('\n')
		.map((roh) => roh.replace(/\r$/, ''))
		.filter((roh) => roh.trim() !== '' && !roh.trim().startsWith('#'))
		.map((roh) => ({ einzug: roh.length - roh.trimStart().length, text: roh.trim() }));
}

/** Ohne Zeilenende-Kommentar (` # …`), nur für die Rechte-Struktur. */
function ohneKommentar(text: string): string {
	return text.replace(/\s+#.*$/, '').trim();
}

/**
 * Liest den `permissions:`-Block, dessen Kopfzeile `liste[start]` ist. Ergebnis: sortierte
 * Einträge `name: stufe` (Stufe `none` entfällt) oder `null`, wenn nicht lesbar. Inline-Form:
 * `{}` → leer; `read-all`/`write-all` → eigener Eintrag (passt zu keiner Vorgabe, also Befund).
 */
function leseRechte(liste: Zeile[], start: number): string[] | null {
	const kopf = ohneKommentar(liste[start].text).replace(/^permissions:\s*/, '');
	if (kopf === '{}') return [];
	if (kopf === 'read-all' || kopf === 'write-all') return [kopf];
	if (kopf !== '') return null;
	const rechte: string[] = [];
	let eintraege = 0;
	for (let i = start + 1; i < liste.length && liste[i].einzug > liste[start].einzug; i++) {
		const treffer = /^([\w-]+):\s*(read|write|none)$/.exec(ohneKommentar(liste[i].text));
		if (!treffer) return null;
		eintraege++;
		if (treffer[2] !== 'none') rechte.push(`${treffer[1]}: ${treffer[2]}`);
	}
	return eintraege > 0 ? rechte.sort() : null;
}

/** Namen aller `secrets.X` / `secrets['X']` in `${{ }}`; `null` für nicht auswertbare Zugriffe. */
function secretNamen(text: string): (string | null)[] {
	const namen: (string | null)[] = [];
	for (const ausdruck of text.match(/\$\{\{[\s\S]*?\}\}/g) ?? []) {
		const rest = ausdruck.replace(
			/\bsecrets(?:\.([A-Za-z_][\w-]*)|\[\s*['"]([^'"]+)['"]\s*\])/g,
			(_, punkt, klammer) => {
				namen.push(punkt ?? klammer);
				return '';
			}
		);
		if (/\bsecrets\b/.test(rest)) namen.push(null);
	}
	if (/^\s*secrets:\s*inherit\b/m.test(text)) namen.push(null);
	return namen;
}

function gleich(a: string[], b: string[]): boolean {
	const x = [...a].sort();
	const y = [...b].sort();
	return x.length === y.length && x.every((wert, i) => wert === y[i]);
}

/**
 * Prüft eine Workflow-Datei; Befunde `<pfad>: Job <name>: <Regel>` bzw. `<pfad>: <Regel>`.
 * Der Parser kennt nur Einzug: `permissions:` bei 0, `jobs:` bei 0, Job-Schlüssel bei 2,
 * Job-`permissions:` bei 4. Was er so nicht lesen kann, ist ein Befund (fail closed).
 */
export function pruefeWorkflow(pfad: string, yaml: string): string[] {
	const befunde: string[] = [];
	const wf = (regel: string) => befunde.push(`${pfad}: ${regel}`);
	const job = (name: string, regel: string) => befunde.push(`${pfad}: Job ${name}: ${regel}`);
	const alle = zeilen(yaml);

	// Workflow-Ebene
	const wfStart = alle.findIndex((z) => z.einzug === 0 && /^permissions:/.test(z.text));
	let wfRechte: string[] = [];
	if (wfStart < 0) {
		wf('Workflow-Ebene ohne `permissions:` (erwartet: contents: read)');
	} else {
		const gelesen = leseRechte(alle, wfStart);
		if (gelesen === null) wf('Workflow-Ebene: `permissions:` nicht lesbar');
		else {
			wfRechte = gelesen;
			if (!gleich(gelesen, WORKFLOW_RECHTE)) {
				wf(`Workflow-Ebene: Rechte [${gelesen.join(', ')}] statt [${WORKFLOW_RECHTE.join(', ')}]`);
			}
		}
	}

	const jobsStart = alle.findIndex((z) => z.einzug === 0 && z.text === 'jobs:');
	if (jobsStart < 0) {
		wf('kein Abschnitt `jobs:` gefunden');
		return befunde;
	}
	let jobsEnde = jobsStart + 1;
	while (jobsEnde < alle.length && alle[jobsEnde].einzug > 0) jobsEnde++;
	const inJobs = alle.slice(jobsStart + 1, jobsEnde);
	const schluessel = inJobs.map((z, i) => ({ z, i })).filter(({ z }) => z.einzug <= 2);
	if (
		schluessel.length === 0 ||
		schluessel.some(({ z }) => z.einzug !== 2 || !/^[\w-]+:$/.test(z.text))
	) {
		wf('Abschnitt `jobs:` nicht lesbar (erwartet: Job-Schlüssel mit 2 Leerzeichen Einzug)');
		return befunde;
	}

	// Secrets ausserhalb der Jobs gelten wie in einem fremden Job
	const ausserhalb = [...alle.slice(0, jobsStart), ...alle.slice(jobsEnde)]
		.map((z) => z.text)
		.join('\n');
	for (const name of secretNamen(ausserhalb)) {
		if (name !== 'GITHUB_TOKEN') {
			wf(`Workflow-Ebene: Zugriff auf Secret ${name ?? '(nicht auswertbar)'}`);
		}
	}

	schluessel.forEach(({ z, i }, n) => {
		const name = z.text.slice(0, -1);
		const ende = n + 1 < schluessel.length ? schluessel[n + 1].i : inJobs.length;
		const koerper = inJobs.slice(i + 1, ende);

		// Wirksame Rechte: eigener Block, sonst Workflow-Ebene
		const pStart = koerper.findIndex((k) => k.einzug === 4 && /^permissions:/.test(k.text));
		let wirksam = wfRechte;
		let lesbar = true;
		if (pStart >= 0) {
			const gelesen = leseRechte(koerper, pStart);
			if (gelesen === null) {
				lesbar = false;
				job(name, '`permissions:` nicht lesbar');
			} else wirksam = gelesen;
		}
		const soll = JOB_RECHTE[name] ?? STANDARD_RECHTE;
		if (lesbar && !gleich(wirksam, soll)) {
			job(name, `Rechte [${wirksam.join(', ')}] statt [${soll.join(', ')}]`);
		}

		const text = [z.text, ...koerper.map((k) => k.text)].join('\n');
		if (name !== AUSLIEFERN) {
			for (const secret of secretNamen(text)) {
				if (secret !== 'GITHUB_TOKEN') {
					job(
						name,
						`Zugriff auf Secret ${secret ?? '(nicht auswertbar)'} nur im Job ${AUSLIEFERN} erlaubt`
					);
				}
			}
		} else {
			if (/\buses\s*:/.test(text)) job(name, 'darf kein `uses:` enthalten');
			for (const wort of VERBOTENE_WOERTER) {
				if (new RegExp(`\\b${wort}\\b`).test(text)) job(name, `enthält verbotenes Wort «${wort}»`);
			}
		}
	});
	return befunde;
}

if (import.meta.main) {
	const pfade = versionierteDateien().filter((pfad) =>
		/^\.github\/workflows\/[^/]+\.ya?ml$/.test(pfad)
	);
	const befunde = [...leseDateien(pfade)].flatMap(([pfad, yaml]) => pruefeWorkflow(pfad, yaml));
	meldeErgebnis('workflow-rechte', befunde);
}
