import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

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
	// Pro Aufruf die geerbten Werte von MYTCO_IMAGE und MYTCO_UMGEBUNG (gleicher Index wie aufrufe)
	umwelt: { image: string; umgebung: string }[];
	// Temp-Ordner, der als MYTCO_BASIS diente
	basis: string;
};

const STUBS = resolve(import.meta.dirname, 'stubs');

// Führt ein Bash-Skript mit Ersatz-docker vor dem PATH und eigenem MYTCO_BASIS aus.
export function fuehreAus(skript: string, args: string[], optionen: Optionen = {}): Ergebnis {
	const basis = optionen.basis ?? mkdtempSync(join(tmpdir(), 'mytco-basis-'));
	const protokoll = join(basis, 'stub-protokoll');
	const lauf = spawnSync('bash', [resolve(skript), ...args], {
		input: optionen.stdin,
		encoding: 'utf-8',
		env: {
			...process.env,
			PATH: `${STUBS}:${process.env.PATH ?? ''}`,
			MYTCO_BASIS: basis,
			STUB_PROTOKOLL: protokoll,
			...optionen.stub,
			...optionen.env
		}
	});
	let aufrufe: string[] = [];
	try {
		aufrufe = readFileSync(protokoll, 'utf-8').split('\n').filter(Boolean);
	} catch {
		// Ersatz-docker wurde nie aufgerufen
	}
	let umwelt: { image: string; umgebung: string }[] = [];
	try {
		umwelt = readFileSync(`${protokoll}.umwelt`, 'utf-8')
			.split('\n')
			.filter(Boolean)
			.map((zeile) => {
				const [image, umgebung] = zeile.split('|');
				return { image, umgebung };
			});
	} catch {
		// Ersatz-docker wurde nie aufgerufen
	}
	return {
		status: lauf.status ?? -1,
		stdout: lauf.stdout,
		stderr: lauf.stderr,
		aufrufe,
		umwelt,
		basis
	};
}
