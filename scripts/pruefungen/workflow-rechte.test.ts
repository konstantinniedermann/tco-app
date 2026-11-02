import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pruefeWorkflow } from './workflow-rechte.ts';

const W = '.github/workflows/check.yml';
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
const FREIGEBEN = `  freigeben:\n${perm('packages: write')}\n    steps:\n      - run: echo freigeben`;
const AUSLIEFERN = `  ausliefern:\n${perm('packages: read')}\n    steps:\n      - run: ssh host\n        env:\n          K: \${{ secrets.SSH_SCHLUESSEL_TEST }}`;
const RELEASE = `  release:\n${perm('contents: write')}\n    steps:\n      - run: echo release`;
const PRUEFEN = `  pruefen:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm ci`;

describe('pruefeWorkflow', () => {
	it('akzeptiert einen korrekten Workflow mit allen Sonderjobs', () => {
		const yaml = workflow([BAUEN, FINDEN, FREIGEBEN, AUSLIEFERN, RELEASE, PRUEFEN]);
		expect(pruefeWorkflow(W, yaml)).toEqual([]);
	});
	it('meldet pruefen mit packages: write', () => {
		const yaml = workflow([
			`  pruefen:\n${perm('contents: read, packages: write')}\n    steps: []`
		]);
		const befunde = pruefeWorkflow(W, yaml);
		expect(befunde).toHaveLength(1);
		expect(befunde[0]).toContain(': Job pruefen:');
	});
	it('nimmt für einen Job namens constructor den Standard, nicht die Prototyp-Eigenschaft', () => {
		const job = `  constructor:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo x`;
		expect(pruefeWorkflow(W, workflow([job]))).toEqual([]);
		const mitRecht = `  constructor:\n${perm('contents: read, packages: write')}\n    steps: []`;
		expect(pruefeWorkflow(W, workflow([mitRecht]))).toHaveLength(1);
	});
	it('akzeptiert einen Job ohne Block bei Workflow-Ebene contents: read', () => {
		expect(pruefeWorkflow(W, workflow([PRUEFEN]))).toEqual([]);
	});
	it('meldet fehlende Workflow-Ebene', () => {
		const befunde = pruefeWorkflow(W, workflow([PRUEFEN], KOPF));
		expect(befunde.length).toBeGreaterThan(0);
		expect(befunde[0]).toContain(': Workflow-Ebene');
	});
	it('meldet Workflow-Ebene mit anderen Rechten', () => {
		const yaml = workflow([PRUEFEN], `${KOPF}permissions:\n  contents: write\n`);
		expect(pruefeWorkflow(W, yaml).length).toBeGreaterThan(0);
	});
	it('meldet ein SSH-Secret im Job bauen', () => {
		const bauen = `${BAUEN}\n        env:\n          K: \${{ secrets.SSH_SCHLUESSEL_TEST }}`;
		const befunde = pruefeWorkflow(W, workflow([bauen]));
		expect(befunde).toHaveLength(1);
		expect(befunde[0]).toContain('Job bauen');
	});
	it('meldet secrets[...] in einem anderen Job', () => {
		const pruefen = `${PRUEFEN}\n        env:\n          K: \${{ secrets['SSH_X'] }}`;
		expect(pruefeWorkflow(W, workflow([pruefen]))).toHaveLength(1);
		const doppelt = `${PRUEFEN}\n        env:\n          K: \${{ secrets["SSH_X"] }}`;
		expect(pruefeWorkflow(W, workflow([doppelt]))).toHaveLength(1);
	});
	it('lässt secrets.GITHUB_TOKEN überall zu', () => {
		const pruefen = `${PRUEFEN}\n        env:\n          T: \${{ secrets.GITHUB_TOKEN }} \${{ github.token }}`;
		expect(pruefeWorkflow(W, workflow([pruefen]))).toEqual([]);
	});
	it('meldet ein Secret auf Workflow-Ebene', () => {
		const kopf = `${KOPF}env:\n  K: \${{ secrets.SSH_X }}\n${WF_RECHTE}`;
		expect(pruefeWorkflow(W, workflow([PRUEFEN], kopf))).toHaveLength(1);
	});
	it('meldet ausliefern mit uses', () => {
		const ausliefern = `${AUSLIEFERN}\n      - uses: actions/checkout@abc`;
		const befunde = pruefeWorkflow(W, workflow([ausliefern]));
		expect(befunde).toHaveLength(1);
		expect(befunde[0]).toContain('Job ausliefern');
	});
	it.each(['npm', 'npx', 'node', 'cache', 'artifact'])('meldet ausliefern mit %s', (wort) => {
		const ausliefern = `${AUSLIEFERN}\n      - run: ${wort} ci`;
		expect(pruefeWorkflow(W, workflow([ausliefern]))).toHaveLength(1);
	});
	it('ignoriert Kommentare im Job ausliefern', () => {
		const ausliefern = `${AUSLIEFERN}\n      # kein npm, kein uses: hier\n`;
		expect(pruefeWorkflow(W, workflow([ausliefern]))).toEqual([]);
	});
	it('meldet freigeben mit contents: read zusätzlich zu packages: write', () => {
		const job = `  freigeben:\n${perm('contents: read, packages: write')}\n    steps: []`;
		const befunde = pruefeWorkflow(W, workflow([job]));
		expect(befunde).toHaveLength(1);
		expect(befunde[0]).toContain('Job freigeben');
	});
	it('meldet release mit contents: read statt write', () => {
		const release = `  release:\n${perm('contents: read')}\n    steps: []`;
		const befunde = pruefeWorkflow(W, workflow([release]));
		expect(befunde).toHaveLength(1);
		expect(befunde[0]).toContain('Job release');
	});
	it('meldet permissions: write-all und read-all', () => {
		for (const wert of ['write-all', 'read-all']) {
			const job = `  pruefen:\n    permissions: ${wert}\n    steps: []`;
			expect(pruefeWorkflow(W, workflow([job]))).toHaveLength(1);
		}
	});
	it('liest permissions: {} als leer', () => {
		const job = `  pruefen:\n    permissions: {}\n    steps: []`;
		expect(pruefeWorkflow(W, workflow([job]))).toHaveLength(1);
	});
	it('fällt bei nicht lesbarem Job-Block durch (fail closed)', () => {
		const job = `  pruefen:\n    permissions:\n      - contents\n    steps: []`;
		const befunde = pruefeWorkflow(W, workflow([job]));
		expect(befunde).toHaveLength(1);
		expect(befunde[0]).toContain('nicht lesbar');
	});
	it('fällt bei nicht lesbarem jobs-Abschnitt durch (fail closed)', () => {
		expect(pruefeWorkflow(W, `${KOPF}${WF_RECHTE}jobs:\n`)).toHaveLength(1);
		const vierer = `${KOPF}${WF_RECHTE}jobs:\n    pruefen:\n        steps: []\n`;
		expect(pruefeWorkflow(W, vierer)).toHaveLength(1);
		expect(pruefeWorkflow(W, `${KOPF}${WF_RECHTE}`)).toHaveLength(1);
	});
	it.each(['.github/workflows/check.yml', '.github/workflows/secret-scan.yml'])(
		'akzeptiert die echte Datei %s',
		(pfad) => {
			expect(pruefeWorkflow(pfad, readFileSync(pfad, 'utf-8'))).toEqual([]);
		}
	);

	it('erkennt secrets ohne Rücksicht auf Gross-/Kleinschreibung', () => {
		for (const ausdruck of ['SECRETS.SSH_X', "Secrets['X']", 'secrets.github_token_x']) {
			const pruefen = `${PRUEFEN}\n        env:\n          K: \${{ ${ausdruck} }}`;
			expect(pruefeWorkflow(W, workflow([pruefen]))).toHaveLength(1);
		}
		const token = `${PRUEFEN}\n        env:\n          K: \${{ Secrets.github_token }}`;
		expect(pruefeWorkflow(W, workflow([token]))).toEqual([]);
	});
	it('meldet nicht auswertbare Secret-Zugriffe', () => {
		for (const ausdruck of ['toJSON(secrets)', "secrets[format('SSH_{0}', 'X')]"]) {
			const pruefen = `${PRUEFEN}\n        env:\n          K: \${{ ${ausdruck} }}`;
			expect(pruefeWorkflow(W, workflow([pruefen]))).toHaveLength(1);
		}
		const erbt = `${PRUEFEN}\n    secrets: inherit`;
		expect(pruefeWorkflow(W, workflow([erbt]))).toHaveLength(1);
	});
	it('meldet «uses» in Anführungszeichen im Job ausliefern', () => {
		const ausliefern = `${AUSLIEFERN}\n      - "uses": actions/checkout@abc`;
		expect(pruefeWorkflow(W, workflow([ausliefern]))).toHaveLength(1);
	});
	it('meldet Flow-Stil bei permissions (nicht lesbar)', () => {
		const job = `  pruefen:\n    permissions: {contents: read}\n    steps: []`;
		expect(pruefeWorkflow(W, workflow([job]))).toHaveLength(1);
	});
	it('akzeptiert ausliefern mit if und concurrency', () => {
		const ausliefern = `  ausliefern:\n    if: always() && github.ref == 'refs/heads/main'\n    concurrency:\n      group: ausliefern\n${perm('packages: read')}\n    steps:\n      - run: ssh host\n        env:\n          K: \${{ secrets.SSH_SCHLUESSEL_TEST }}`;
		expect(pruefeWorkflow(W, workflow([ausliefern]))).toEqual([]);
	});
	it('wendet Sonderjobs nur auf check.yml an', () => {
		const andere = '.github/workflows/anderes.yml';
		expect(pruefeWorkflow(andere, workflow([AUSLIEFERN]))).toHaveLength(2);
		const bauen = `  bauen:\n${perm('contents: read, packages: write')}\n    steps: []`;
		expect(pruefeWorkflow(andere, workflow([bauen]))).toHaveLength(1);
		expect(pruefeWorkflow(andere, workflow([PRUEFEN]))).toEqual([]);
	});
});
