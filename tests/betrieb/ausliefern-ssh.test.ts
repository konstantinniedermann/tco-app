import {
	chmodSync,
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { fuehreAus, type Ergebnis } from './hilfe.ts';

const DIGEST = 'sha256:' + 'a1'.repeat(32);
const REPO = 'ghcr.io/konstantinniedermann/tco-app';
const TOKEN = 'ghp_GEHEIMES-TOKEN-123';

// Temp-Basis mit von Hand eingerichtetem bin/ (Türsteher und lib.sh), wie auf dem Server.
function baue(): string {
	const basis = mkdtempSync(join(tmpdir(), 'mytco-basis-'));
	mkdirSync(join(basis, 'bin'));
	copyFileSync('betrieb/bin/ausliefern-ssh', join(basis, 'bin', 'ausliefern-ssh'));
	copyFileSync('betrieb/bin/lib.sh', join(basis, 'bin', 'lib.sh'));
	return basis;
}

type Anfrage = {
	args: string[];
	// undefined = nicht gesetzt
	ssh?: string;
	stdin?: string;
	stub?: Record<string, string>;
	env?: Record<string, string>;
};

function tuersteher(a: Anfrage, basis = baue()): Ergebnis {
	// Eine von aussen geerbte Variable darf den Test nicht färben.
	delete process.env.SSH_ORIGINAL_COMMAND;
	const env: Record<string, string> = { ...a.env };
	if (a.ssh !== undefined) env.SSH_ORIGINAL_COMMAND = a.ssh;
	const lauf = fuehreAus(join(basis, 'bin', 'ausliefern-ssh'), a.args, {
		basis,
		stdin: a.stdin,
		stub: a.stub,
		env
	});
	for (const zeile of lauf.stdout.split('\n').filter(Boolean)) {
		expect(zeile).toMatch(/^(schritt: [a-z -]+|ok|fehler)$/);
	}
	expect(lauf.stdout).not.toContain('STUB-GEHEIM-LOG');
	expect(lauf.stderr).not.toContain('STUB-GEHEIM-LOG');
	expect(lauf.stdout + lauf.stderr).not.toContain(TOKEN);
	return lauf;
}

const verboten = (lauf: Ergebnis) => {
	expect(lauf.status).toBe(1);
	expect(lauf.stdout.trim()).toBe('fehler');
	expect(lauf.aufrufe).toEqual([]);
};

describe('ausliefern-ssh: Eingaben', () => {
	test.each([['prod'], ['']])('Umgebung "%s" -> fehler, kein docker', (umgebung) => {
		verboten(tuersteher({ args: [umgebung], ssh: DIGEST }));
	});

	test('Umgebung fehlt -> fehler, kein docker', () => {
		verboten(tuersteher({ args: [], ssh: DIGEST }));
	});

	test.each([
		['zweites Wort', `${DIGEST} extra`],
		['Strichpunkt', `${DIGEST};id`],
		['Befehlsersetzung', '$(id)'],
		['Grossbuchstaben', 'sha256:' + 'A1'.repeat(32)],
		['Zeilenumbruch hinten', `${DIGEST}\n`],
		['Zeilenumbruch mitten', `${DIGEST}\nid`],
		['Leerzeichen hinten', `${DIGEST} `],
		['Umgebung in der Anfrage', `live ${DIGEST}`],
		['leer', ''],
		['zu kurz', 'sha256:' + 'a1'.repeat(31)]
	])('SSH_ORIGINAL_COMMAND (%s) -> fehler, kein docker', (_name, ssh) => {
		verboten(tuersteher({ args: ['test'], ssh, stdin: TOKEN }));
	});

	test('Umgebung kommt nie aus der Anfrage', () => {
		verboten(tuersteher({ args: ['test'], ssh: `live ${DIGEST}` }));
	});

	test('mit SSH_ORIGINAL_COMMAND ist ein zweites Argument ein Fehler', () => {
		verboten(tuersteher({ args: ['test', DIGEST], ssh: DIGEST }));
	});

	test('Handbetrieb: überzählige Argumente -> fehler', () => {
		verboten(tuersteher({ args: ['test', DIGEST, 'extra'] }));
	});

	test('Handbetrieb: ungültiger Digest -> fehler', () => {
		verboten(tuersteher({ args: ['test', 'sha256:xyz'] }));
	});

	test('Handbetrieb ohne Digest -> fehler', () => {
		verboten(tuersteher({ args: ['test'] }));
	});
});

describe('ausliefern-ssh: Ablauf', () => {
	test('gültiger Digest mit Token: login, pull, create, cp, rm, dann ausliefern', () => {
		const basis = baue();
		const lauf = tuersteher({ args: ['test'], ssh: DIGEST, stdin: TOKEN }, basis);
		expect(lauf.status).toBe(0);
		expect(lauf.stdout.trim().split('\n').pop()).toBe('ok');
		expect(lauf.aufrufe).toEqual([
			'login ghcr.io -u mytco --password-stdin',
			`pull ${REPO}@${DIGEST}`,
			`create ${REPO}@${DIGEST}`,
			expect.stringMatching(
				new RegExp(`^cp 0123456789ab:/app/betrieb ${basis}/fassungen/\\.neu\\.\\d+/$`)
			),
			'rm 0123456789ab'
		]);
		// Das entnommene ausliefern lief mit Umgebung und Digest
		expect(readFileSync(join(basis, 'stub-protokoll.exec'), 'utf-8').trim()).toBe(`test ${DIGEST}`);
		// Docker-Ausgabe steht im Protokoll, nicht auf der Ausgabe
		expect(readFileSync(join(basis, 'test', 'protokoll.log'), 'utf-8')).toContain(
			'STUB-GEHEIM-LOG'
		);
	});

	test('Token nie in einer Argumentzeile; Temp-DOCKER_CONFIG danach weg', () => {
		const tmp = mkdtempSync(join(tmpdir(), 'mytco-tmpdir-'));
		const lauf = tuersteher({ args: ['live'], ssh: DIGEST, stdin: TOKEN, env: { TMPDIR: tmp } });
		expect(lauf.status).toBe(0);
		expect(lauf.aufrufe.join('\n')).not.toContain(TOKEN);
		expect(readdirSync(tmp)).toEqual([]);
	});

	test('Registry-Host aus MYTCO_REPO', () => {
		const lauf = tuersteher({
			args: ['test'],
			ssh: DIGEST,
			stdin: TOKEN,
			env: { MYTCO_REPO: 'registry.example:5000/x/y' }
		});
		expect(lauf.aufrufe[0]).toBe('login registry.example:5000 -u mytco --password-stdin');
		expect(lauf.aufrufe[1]).toBe(`pull registry.example:5000/x/y@${DIGEST}`);
	});

	test('ohne Token: kein login', () => {
		const lauf = tuersteher({ args: ['test'], ssh: DIGEST, stdin: '' });
		expect(lauf.status).toBe(0);
		expect(lauf.aufrufe.some((a) => a.startsWith('login'))).toBe(false);
		expect(lauf.aufrufe[0]).toBe(`pull ${REPO}@${DIGEST}`);
	});

	test('Handbetrieb: Digest als zweites Argument', () => {
		const lauf = tuersteher({ args: ['test', DIGEST] });
		expect(lauf.status).toBe(0);
		expect(lauf.aufrufe).toContain(`pull ${REPO}@${DIGEST}`);
	});

	test('vollständige Fassung desselben Digests wird wiederverwendet, nicht gelöscht', () => {
		const basis = baue();
		const ausl = join(basis, 'fassungen', DIGEST, 'betrieb', 'bin', 'ausliefern');
		mkdirSync(join(basis, 'fassungen', DIGEST, 'betrieb', 'bin'), { recursive: true });
		writeFileSync(ausl, '#!/usr/bin/env bash\necho BESTEHEND >"$MYTCO_BASIS/marke"\necho ok\n');
		chmodSync(ausl, 0o755);
		const lauf = tuersteher({ args: ['test'], ssh: DIGEST }, basis);
		expect(lauf.status).toBe(0);
		expect(readFileSync(join(basis, 'marke'), 'utf-8').trim()).toBe('BESTEHEND');
		expect(existsSync(join(basis, 'stub-protokoll.exec'))).toBe(false);
		expect(readdirSync(join(basis, 'fassungen'))).toEqual([DIGEST]);
	});

	test('Image ohne ausliefern -> fehler, Zielort unberührt, kein Temp-Ordner', () => {
		const basis = baue();
		const lauf = tuersteher({ args: ['test'], ssh: DIGEST, stub: { STUB_CP_LEER: '1' } }, basis);
		expect(lauf.status).toBe(1);
		expect(lauf.stdout.trim().split('\n').pop()).toBe('fehler');
		expect(readdirSync(join(basis, 'fassungen'))).toEqual([]);
	});

	test('bestehender Zielort wird nie gelöscht, auch nicht unvollständig', () => {
		const basis = baue();
		mkdirSync(join(basis, 'fassungen', DIGEST), { recursive: true });
		const altlast = join(basis, 'fassungen', DIGEST, 'altlast');
		copyFileSync('betrieb/bin/lib.sh', altlast);
		const lauf = tuersteher({ args: ['test'], ssh: DIGEST }, basis);
		expect(lauf.status).toBe(1);
		expect(lauf.stdout.trim().split('\n').pop()).toBe('fehler');
		expect(existsSync(altlast)).toBe(true);
		expect(readdirSync(join(basis, 'fassungen'))).toEqual([DIGEST]);
		expect(readdirSync(join(basis, 'fassungen', DIGEST))).toEqual(['altlast']);
	});

	test.each([['pull'], ['create'], ['cp ']])(
		'%s scheitert -> kein Temp-Ordner, keine Fassung',
		(s) => {
			const basis = baue();
			tuersteher({ args: ['test'], ssh: DIGEST, stub: { STUB_FEHLER_BEI: s } }, basis);
			const dir = join(basis, 'fassungen');
			expect(existsSync(dir) ? readdirSync(dir) : []).toEqual([]);
		}
	);

	test('fehlschlagendes ausliefern: Exit 1 und fehler wird durchgereicht', () => {
		const lauf = tuersteher({
			args: ['test'],
			ssh: DIGEST,
			stub: { STUB_AUSLIEFERN_FEHLER: '1' }
		});
		expect(lauf.status).toBe(1);
		expect(lauf.stdout.trim().split('\n').pop()).toBe('fehler');
	});

	test('login und pull laufen mit dem Temp-DOCKER_CONFIG, das danach weg ist', () => {
		const tmp = mkdtempSync(join(tmpdir(), 'mytco-tmpdir-'));
		const lauf = tuersteher({ args: ['test'], ssh: DIGEST, stdin: TOKEN, env: { TMPDIR: tmp } });
		expect(lauf.status).toBe(0);
		const [login, pull, , cp] = lauf.dockerConfig;
		expect(login.startsWith(tmp)).toBe(true);
		expect(pull).toBe(login);
		expect(cp).toBe(login);
		expect(existsSync(login)).toBe(false);
		expect(readdirSync(tmp)).toEqual([]);
	});

	test.each([['pull'], ['create'], ['cp ']])('%s scheitert -> fehler, kein exec', (schritt) => {
		const basis = baue();
		const lauf = tuersteher(
			{ args: ['test'], ssh: DIGEST, stub: { STUB_FEHLER_BEI: schritt } },
			basis
		);
		expect(lauf.status).toBe(1);
		expect(lauf.stdout.trim().split('\n').pop()).toBe('fehler');
		expect(existsSync(join(basis, 'stub-protokoll.exec'))).toBe(false);
	});

	test('cp scheitert -> Container wird trotzdem entfernt', () => {
		const lauf = tuersteher({ args: ['test'], ssh: DIGEST, stub: { STUB_FEHLER_BEI: 'cp ' } });
		expect(lauf.aufrufe[lauf.aufrufe.length - 1]).toBe('rm 0123456789ab');
	});

	test('login scheitert -> fehler, kein pull, Temp-DOCKER_CONFIG weg', () => {
		const tmp = mkdtempSync(join(tmpdir(), 'mytco-tmpdir-'));
		const lauf = tuersteher({
			args: ['test'],
			ssh: DIGEST,
			stdin: TOKEN,
			stub: { STUB_FEHLER_BEI: 'login' },
			env: { TMPDIR: tmp }
		});
		expect(lauf.stdout.trim().split('\n').pop()).toBe('fehler');
		expect(lauf.aufrufe.some((a) => a.startsWith('pull'))).toBe(false);
		expect(readdirSync(tmp)).toEqual([]);
	});
});
