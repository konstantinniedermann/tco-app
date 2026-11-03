import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll } from 'vitest';

// Temp-Ordner der Testdatei; nach dem letzten Test der Datei wieder gelöscht. Der Hook hängt an
// der Testdatei, die dieses Modul importiert (jede Datei lädt es neu).
const tempOrdnerListe: string[] = [];
afterAll(() => {
	for (const ordner of tempOrdnerListe.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

export function tempOrdner(praefix: string): string {
	const ordner = mkdtempSync(join(tmpdir(), praefix));
	tempOrdnerListe.push(ordner);
	return ordner;
}

export type Optionen = {
	stdin?: string;
	env?: Record<string, string>;
	// Umgebungsvariablen für den Ersatz-docker (STUB_FEHLER_BEI, STUB_AUSGABE_<NAME>)
	stub?: Record<string, string>;
	// vorhandenes MYTCO_BASIS statt eines neuen Temp-Ordners
	basis?: string;
};

export type Ergebnis = {
	status: number;
	stdout: string;
	stderr: string;
	// Argumentzeilen, die der Ersatz-docker protokolliert hat
	aufrufe: string[];
	// Pro Aufruf die geerbten Werte von MYTCO_IMAGE, MYTCO_UMGEBUNG (gleicher Index wie aufrufe)
	umwelt: { image: string; umgebung: string }[];
	// Pro Aufruf der geerbte Wert von DOCKER_CONFIG (gleicher Index wie aufrufe)
	dockerConfig: string[];
	// Temp-Ordner, der als MYTCO_BASIS diente
	basis: string;
};

const STUBS = resolve(import.meta.dirname, 'stubs');

function umwelt(basis: string, optionen: Optionen): NodeJS.ProcessEnv {
	return {
		...process.env,
		PATH: `${STUBS}:${process.env.PATH ?? ''}`,
		MYTCO_BASIS: basis,
		STUB_PROTOKOLL: join(basis, 'stub-protokoll'),
		...optionen.stub,
		...optionen.env
	};
}

// Liest die Protokolle des Ersatz-docker nach einem Lauf.
function ergebnis(basis: string, status: number, stdout: string, stderr: string): Ergebnis {
	const protokoll = join(basis, 'stub-protokoll');
	let aufrufe: string[] = [];
	try {
		aufrufe = readFileSync(protokoll, 'utf-8').split('\n').filter(Boolean);
	} catch {
		// Ersatz-docker wurde nie aufgerufen
	}
	let umwelt: { image: string; umgebung: string }[] = [];
	const dockerConfig: string[] = [];
	try {
		umwelt = readFileSync(`${protokoll}.umwelt`, 'utf-8')
			.split('\n')
			.filter(Boolean)
			.map((zeile) => {
				const [image, umgebung, config = ''] = zeile.split('|');
				dockerConfig.push(config);
				return { image, umgebung };
			});
	} catch {
		// Ersatz-docker wurde nie aufgerufen
	}
	return { status, stdout, stderr, aufrufe, umwelt, dockerConfig, basis };
}

// Führt ein Bash-Skript mit Ersatz-docker vor dem PATH und eigenem MYTCO_BASIS aus.
export function fuehreAus(skript: string, args: string[], optionen: Optionen = {}): Ergebnis {
	const basis = optionen.basis ?? tempOrdner('mytco-basis-');
	const lauf = spawnSync('bash', [resolve(skript), ...args], {
		input: optionen.stdin,
		encoding: 'utf-8',
		env: umwelt(basis, optionen)
	});
	return ergebnis(basis, lauf.status ?? -1, lauf.stdout, lauf.stderr);
}

// Wie fuehreAus, aber niemand liest die Standardausgabe: das Leseende der Pipe wird sofort
// geschlossen, jede Ausgabe trifft auf eine abgebrochene Verbindung (SIGPIPE/EPIPE).
export function fuehreAusOhneLeser(
	skript: string,
	args: string[],
	optionen: Optionen = {}
): Promise<Ergebnis> {
	const basis = optionen.basis ?? tempOrdner('mytco-basis-');
	return new Promise((fertig, scheitern) => {
		const kind = spawn('bash', [resolve(skript), ...args], {
			env: umwelt(basis, optionen),
			stdio: ['pipe', 'pipe', 'pipe']
		});
		kind.stdout.destroy();
		let stderr = '';
		kind.stderr.setEncoding('utf-8');
		kind.stderr.on('data', (teil: string) => (stderr += teil));
		kind.on('error', scheitern);
		kind.on('close', (status) => fertig(ergebnis(basis, status ?? -1, '', stderr)));
		kind.stdin.end(optionen.stdin ?? '');
	});
}
