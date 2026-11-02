import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pruefeWorkflow } from './workflow-rechte.ts';

const KOPF = 'name: X\non: push\n';
const WF_RECHTE = 'permissions:\n  contents: read\n';

/** Baut einen Workflow; `jobs` sind fertige Job-Texte (Einzug 2 für den Schlüssel). */
function workflow(jobs: string[], kopf = KOPF + WF_RECHTE): string {
	return `${kopf}\njobs:\n${jobs.join('\n')}\n`;
}

const perm = (rechte: string) =>
	`    permissions:\n${rechte
		.split(', ')
		.map((r) => `      ${r}`)
		.join('\n')}`;

const BAUEN = `  bauen:\n${perm('contents: read, packages: write')}\n    steps:\n      - run: echo bauen`;
const FINDEN = `  finden:\n${perm('contents: read, packages: read')}\n    steps:\n      - run: echo finden`;
const AUSLIEFERN = `  ausliefern:\n${perm('packages: read')}\n    steps:\n      - run: ssh host\n        env:\n          K: \${{ secrets.SSH_SCHLUESSEL_TEST }}`;
const RELEASE = `  release:\n${perm('contents: write')}\n    steps:\n      - run: echo release`;
const PRUEFEN = `  pruefen:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm ci`;

describe('pruefeWorkflow', () => {
	it('akzeptiert einen korrekten Workflow mit allen vier Jobs', () => {
		const yaml = workflow([BAUEN, FINDEN, AUSLIEFERN, RELEASE, PRUEFEN]);
		expect(pruefeWorkflow('w.yml', yaml)).toEqual([]);
	});
	it('meldet pruefen mit packages: write', () => {
		const yaml = workflow([
			`  pruefen:\n${perm('contents: read, packages: write')}\n    steps: []`
		]);
		const befunde = pruefeWorkflow('w.yml', yaml);
		expect(befunde).toHaveLength(1);
		expect(befunde[0]).toContain('w.yml: Job pruefen:');
	});
	it('akzeptiert einen Job ohne Block bei Workflow-Ebene contents: read', () => {
		expect(pruefeWorkflow('w.yml', workflow([PRUEFEN]))).toEqual([]);
	});
	it('meldet fehlende Workflow-Ebene', () => {
		const befunde = pruefeWorkflow('w.yml', workflow([PRUEFEN], KOPF));
		expect(befunde.length).toBeGreaterThan(0);
		expect(befunde[0]).toMatch(/^w\.yml: Workflow-Ebene/);
	});
	it('meldet Workflow-Ebene mit anderen Rechten', () => {
		const yaml = workflow([PRUEFEN], `${KOPF}permissions:\n  contents: write\n`);
		expect(pruefeWorkflow('w.yml', yaml).length).toBeGreaterThan(0);
	});
	it('meldet ein SSH-Secret im Job bauen', () => {
		const bauen = `${BAUEN}\n        env:\n          K: \${{ secrets.SSH_SCHLUESSEL_TEST }}`;
		const befunde = pruefeWorkflow('w.yml', workflow([bauen]));
		expect(befunde).toHaveLength(1);
		expect(befunde[0]).toContain('Job bauen');
	});
	it('meldet secrets[...] in einem anderen Job', () => {
		const pruefen = `${PRUEFEN}\n        env:\n          K: \${{ secrets['SSH_X'] }}`;
		expect(pruefeWorkflow('w.yml', workflow([pruefen]))).toHaveLength(1);
		const doppelt = `${PRUEFEN}\n        env:\n          K: \${{ secrets["SSH_X"] }}`;
		expect(pruefeWorkflow('w.yml', workflow([doppelt]))).toHaveLength(1);
	});
	it('lässt secrets.GITHUB_TOKEN überall zu', () => {
		const pruefen = `${PRUEFEN}\n        env:\n          T: \${{ secrets.GITHUB_TOKEN }} \${{ github.token }}`;
		expect(pruefeWorkflow('w.yml', workflow([pruefen]))).toEqual([]);
	});
	it('meldet ein Secret auf Workflow-Ebene', () => {
		const kopf = `${KOPF}env:\n  K: \${{ secrets.SSH_X }}\n${WF_RECHTE}`;
		expect(pruefeWorkflow('w.yml', workflow([PRUEFEN], kopf))).toHaveLength(1);
	});
	it('meldet ausliefern mit uses', () => {
		const ausliefern = `${AUSLIEFERN}\n      - uses: actions/checkout@abc`;
		const befunde = pruefeWorkflow('w.yml', workflow([ausliefern]));
		expect(befunde).toHaveLength(1);
		expect(befunde[0]).toContain('Job ausliefern');
	});
	it.each(['npm', 'npx', 'node', 'cache', 'artifact'])('meldet ausliefern mit %s', (wort) => {
		const ausliefern = `${AUSLIEFERN}\n      - run: ${wort} ci`;
		expect(pruefeWorkflow('w.yml', workflow([ausliefern]))).toHaveLength(1);
	});
	it('ignoriert Kommentare im Job ausliefern', () => {
		const ausliefern = `${AUSLIEFERN}\n      # kein npm, kein uses: hier\n`;
		expect(pruefeWorkflow('w.yml', workflow([ausliefern]))).toEqual([]);
	});
	it('meldet release mit contents: read statt write', () => {
		const release = `  release:\n${perm('contents: read')}\n    steps: []`;
		const befunde = pruefeWorkflow('w.yml', workflow([release]));
		expect(befunde).toHaveLength(1);
		expect(befunde[0]).toContain('Job release');
	});
	it('meldet permissions: write-all und read-all', () => {
		for (const wert of ['write-all', 'read-all']) {
			const job = `  pruefen:\n    permissions: ${wert}\n    steps: []`;
			expect(pruefeWorkflow('w.yml', workflow([job]))).toHaveLength(1);
		}
	});
	it('liest permissions: {} als leer', () => {
		const job = `  pruefen:\n    permissions: {}\n    steps: []`;
		expect(pruefeWorkflow('w.yml', workflow([job]))).toHaveLength(1);
	});
	it('fällt bei nicht lesbarem Job-Block durch (fail closed)', () => {
		const job = `  pruefen:\n    permissions:\n      - contents\n    steps: []`;
		const befunde = pruefeWorkflow('w.yml', workflow([job]));
		expect(befunde).toHaveLength(1);
		expect(befunde[0]).toContain('nicht lesbar');
	});
	it('fällt bei nicht lesbarem jobs-Abschnitt durch (fail closed)', () => {
		expect(pruefeWorkflow('w.yml', `${KOPF}${WF_RECHTE}jobs:\n`)).toHaveLength(1);
		const vierer = `${KOPF}${WF_RECHTE}jobs:\n    pruefen:\n        steps: []\n`;
		expect(pruefeWorkflow('w.yml', vierer)).toHaveLength(1);
		expect(pruefeWorkflow('w.yml', `${KOPF}${WF_RECHTE}`)).toHaveLength(1);
	});
	it.each(['.github/workflows/check.yml', '.github/workflows/secret-scan.yml'])(
		'akzeptiert die echte Datei %s',
		(pfad) => {
			expect(pruefeWorkflow(pfad, readFileSync(pfad, 'utf-8'))).toEqual([]);
		}
	);
});
