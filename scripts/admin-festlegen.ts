// Serverbefehl für den ersten Admin: legt das Mitglied an und gibt ihm die Rollen MyTCO-Admin und
// Mitglieder-Admin.
// Auf Live: `docker compose exec app node scripts/admin-festlegen.ts --mitgliedernummer … --vorname …`
// (siehe betrieb/README.md); lokal über `make admin ARGS='…'`.
// Ausgabe: nur das Ergebnis, bei Fehlern Feldnamen mit Grund, nie Werte (DS-06, SI-05).
import { parseArgs } from 'node:util';
import { legeAdminFest } from '../src/lib/server/admin/erster-admin.ts';
import { FELDER } from '../src/lib/server/admin/angaben.ts';
import { erstelleDb, type Db } from '../src/lib/server/db/index.ts';

const TEXT: Record<'angelegt' | 'rolle-vergeben' | 'schon-admin', string> = {
	angelegt: 'admin: Mitglied angelegt, Rollen MyTCO-Admin und Mitglieder-Admin vergeben',
	'rolle-vergeben':
		'admin: Mitglied war schon da, Rollen MyTCO-Admin und Mitglieder-Admin vergeben',
	'schon-admin': 'admin: Mitglied war schon MyTCO-Admin, nichts geändert'
};

export async function festlegen(args: string[], db: Db): Promise<void> {
	let roh: Record<string, string | undefined>;
	try {
		const optionen = Object.fromEntries(FELDER.map((f) => [f, { type: 'string' as const }]));
		roh = parseArgs({ args, options: optionen, strict: true }).values as typeof roh;
	} catch {
		// Die Meldung von parseArgs könnte den übergebenen Wert enthalten: nur Namen ausgeben.
		console.error(`admin: ungültige Angaben; erlaubt: ${FELDER.map((f) => `--${f}`).join(' ')}`);
		process.exitCode = 1;
		return;
	}
	try {
		const r = await legeAdminFest(db, roh, new Date());
		if (r.ergebnis === 'fehler') {
			console.error('admin: Angaben abgelehnt, nichts geändert');
			for (const [feld, grund] of Object.entries(r.fehler)) console.error(`  ${feld}: ${grund}`);
			process.exitCode = 1;
			return;
		}
		console.log(TEXT[r.ergebnis]);
	} catch {
		// Fehler aus der Datenbank nennen in der Meldung Parameter (= Werte): nichts davon ausgeben.
		console.error('admin: abgebrochen');
		process.exitCode = 1;
	}
}

export async function starte(args: string[], env: Record<string, string | undefined>) {
	if (!env.DATABASE_URL) {
		console.error('admin: DATABASE_URL fehlt');
		process.exitCode = 1;
		return;
	}
	const db = erstelleDb(env.DATABASE_URL);
	try {
		await festlegen(args, db);
	} finally {
		await db.$client.end();
	}
}

if (import.meta.main) await starte(process.argv.slice(2), process.env);
