import { randomBytes } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { erstelleDb, type Db } from '../../src/lib/server/db/index.ts';

export type EigeneDatenbank = { db: Db; abbauen: () => Promise<void> };

async function mitAdminVerbindung(fn: (c: pg.Client) => Promise<unknown>): Promise<void> {
	const admin = new pg.Client({ connectionString: process.env.DATABASE_URL! });
	await admin.connect();
	try {
		await fn(admin);
	} finally {
		await admin.end();
	}
}

type Journal = { entries: { tag: string }[] };

// Migrationen bis und mit `tag` in einem eigenen Ordner, damit ein Test den Stand vor einer
// Migration aufbauen und die Migration danach selbst einspielen kann.
async function migriereBis(db: Db, tag: string): Promise<void> {
	const journal = JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf-8')) as Journal;
	const ende = journal.entries.findIndex((e) => e.tag === tag);
	if (ende < 0) throw new Error(`Migration ${tag} fehlt`);
	const eintraege = journal.entries.slice(0, ende + 1);
	const ordner = await mkdtemp(join(tmpdir(), 'mytco-migrationen-'));
	try {
		await mkdir(join(ordner, 'meta'));
		await writeFile(
			join(ordner, 'meta', '_journal.json'),
			JSON.stringify({ ...journal, entries: eintraege })
		);
		for (const e of eintraege) {
			await copyFile(join('drizzle', `${e.tag}.sql`), join(ordner, `${e.tag}.sql`));
		}
		await migrate(drizzle(db.$client), { migrationsFolder: ordner });
	} finally {
		await rm(ordner, { recursive: true, force: true });
	}
}

// Für Tests, deren Aussage global ist (z. B. «letzter Admin»): Die gemeinsame Test-Datenbank
// teilen sich mehrere Dateien parallel. `abbauen` löscht die Datenbank auch dann, wenn das
// Schliessen des Clients fehlschlägt; schlägt schon das Anlegen fehl, bleibt nichts zurück.
// Mit `bis` endet die Datenbank auf dem Stand dieser Migration (Test einer Migration).
export async function legeEigeneDatenbankAn(
	praefix: string,
	optionen: { bis?: string } = {}
): Promise<EigeneDatenbank> {
	const name = `mytco_${praefix}_${randomBytes(4).toString('hex')}`;
	const loesche = () =>
		mitAdminVerbindung((c) => c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`));
	let db: Db | undefined;
	try {
		await mitAdminVerbindung((c) => c.query(`CREATE DATABASE ${name}`));
		const url = new URL(process.env.DATABASE_URL!);
		url.pathname = `/${name}`;
		db = erstelleDb(url.toString());
		if (optionen.bis === undefined) {
			await migrate(drizzle(db.$client), { migrationsFolder: 'drizzle' });
		} else {
			await migriereBis(db, optionen.bis);
		}
	} catch (fehler) {
		try {
			await db?.$client.end();
		} finally {
			await loesche();
		}
		throw fehler;
	}
	const offen = db;
	return {
		db: offen,
		abbauen: async () => {
			try {
				await offen.$client.end();
			} finally {
				await loesche();
			}
		}
	};
}
