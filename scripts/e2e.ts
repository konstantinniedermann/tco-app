// `npm run e2e` (auch über `make e2e`, `make check`, den Pre-Push-Hook und die CI): Playwright auf
// einer eigenen, frisch angelegten Datenbank. Sonst sammelten sich die Testkonten jedes Laufs in
// der gemeinsamen lokalen Datenbank `mytco`, und Listen über alle Mitglieder liefen in Timeouts.
// Die Datenbank entsteht auf dem Server aus DATABASE_URL (sonst die lokale aus .env.example) und
// wird nach dem Lauf gelöscht; der Webserver aus playwright.config.ts migriert sie. Reste
// abgebrochener Läufe, die älter als ein Tag sind, räumt der nächste Lauf weg.
// Nur abtrennbare TS-Syntax (läuft mit `node scripts/e2e.ts`).
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import pg from 'pg';

const STANDARD_URL = 'postgres://mytco:mytco_lokal@localhost:55432/mytco';
export const PRAEFIX = 'mytco_e2e_';
const EIN_TAG_MS = 24 * 60 * 60 * 1000;

function zweistellig(n: number): string {
	return String(n).padStart(2, '0');
}

/** `mytco_e2e_JJJJMMTTHHMM_<zufall>` in UTC; die Zeit im Namen erlaubt das Aufräumen alter Reste. */
export function e2eDatenbankName(jetzt: Date, zufall: string): string {
	const zeit =
		`${jetzt.getUTCFullYear()}${zweistellig(jetzt.getUTCMonth() + 1)}` +
		`${zweistellig(jetzt.getUTCDate())}${zweistellig(jetzt.getUTCHours())}` +
		`${zweistellig(jetzt.getUTCMinutes())}`;
	return `${PRAEFIX}${zeit}_${zufall}`;
}

/** Eine E2E-Datenbank, die länger als ein Tag besteht, gehört zu keinem laufenden Lauf mehr. */
export function istVeralteteE2eDatenbank(name: string, jetzt: Date): boolean {
	const treffer = /^mytco_e2e_(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})_[0-9a-f]+$/.exec(name);
	if (!treffer) return false;
	const [, jahr, monat, tag, stunde, minute] = treffer.map(Number);
	const angelegt = Date.UTC(jahr, monat - 1, tag, stunde, minute);
	return jetzt.getTime() - angelegt > EIN_TAG_MS;
}

/** Zeigt die URL auf eine Datenbank dieses Skripts? playwright.config.ts bricht sonst ab. */
export function istE2eDatenbank(url: string): boolean {
	try {
		return new URL(url).pathname.startsWith(`/${PRAEFIX}`);
	} catch {
		return false;
	}
}

export function urlMitDatenbank(basis: string, name: string): string {
	const url = new URL(basis);
	url.pathname = `/${name}`;
	return url.toString();
}

async function mitVerbindung(url: string, fn: (c: pg.Client) => Promise<void>): Promise<void> {
	const client = new pg.Client({ connectionString: url });
	await client.connect();
	try {
		await fn(client);
	} finally {
		await client.end();
	}
}

async function raeumeAlteAuf(basis: string, jetzt: Date): Promise<void> {
	await mitVerbindung(basis, async (c) => {
		const { rows } = await c.query<{ datname: string }>(
			'SELECT datname FROM pg_database WHERE starts_with(datname, $1)',
			[PRAEFIX]
		);
		for (const { datname } of rows) {
			if (!istVeralteteE2eDatenbank(datname, jetzt)) continue;
			await c.query(`DROP DATABASE IF EXISTS ${c.escapeIdentifier(datname)} WITH (FORCE)`);
			console.log(`Alte E2E-Datenbank gelöscht: ${datname}`);
		}
	});
}

function playwright(args: string[], datenbankUrl: string): Promise<number> {
	const kind = spawn(join('node_modules', '.bin', 'playwright'), ['test', ...args], {
		stdio: 'inherit',
		env: { ...process.env, DATABASE_URL: datenbankUrl }
	});
	// Signale an Playwright weiterreichen und selbst nicht vorzeitig enden, damit die Datenbank
	// danach noch gelöscht wird (Ctrl-C trifft ohnehin die ganze Prozessgruppe).
	for (const signal of ['SIGINT', 'SIGTERM'] as const) {
		process.on(signal, () => kind.kill(signal));
	}
	return new Promise((fertig) => {
		kind.on('exit', (code, signal) => fertig(code ?? (signal ? 1 : 0)));
		kind.on('error', (fehler) => {
			console.error(`Playwright liess sich nicht starten: ${fehler.message}`);
			fertig(1);
		});
	});
}

async function main(): Promise<void> {
	const basis = process.env.DATABASE_URL || STANDARD_URL;
	const jetzt = new Date();
	await raeumeAlteAuf(basis, jetzt);
	const name = e2eDatenbankName(jetzt, randomBytes(4).toString('hex'));
	await mitVerbindung(basis, (c) =>
		c.query(`CREATE DATABASE ${c.escapeIdentifier(name)}`).then(() => {})
	);
	console.log(`E2E auf eigener Datenbank ${name}`);
	try {
		process.exitCode = await playwright(process.argv.slice(2), urlMitDatenbank(basis, name));
	} finally {
		await mitVerbindung(basis, (c) =>
			c.query(`DROP DATABASE IF EXISTS ${c.escapeIdentifier(name)} WITH (FORCE)`).then(() => {})
		);
	}
}

if (import.meta.main) await main();
