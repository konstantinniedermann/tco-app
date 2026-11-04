// Nur lokal: legt erfundene Mitglieder an und gibt für das erste einmal einen Brief-Code aus.
// Aufruf über `make seed` (lädt .env). Bricht ab, wenn die Datenbank nicht lokal ist.
import { machAdmin } from '../src/lib/server/admin/erster-admin.ts';
import { erstelleDb } from '../src/lib/server/db/index.ts';
import { leseEinstellungen } from '../src/lib/server/einstellungen.ts';
import { erstelleBremsen } from '../src/lib/server/login/bremse.ts';
import { formatiereBriefCode } from '../src/lib/server/login/codes.ts';
import { erstelleLoginDienst } from '../src/lib/server/login/dienst.ts';
import { ERFUNDENE_MITGLIEDER, legeErfundeneMitgliederAn } from './erfundene-mitglieder.ts';

export function istLokaleDatenbank(url: string | undefined): boolean {
	if (!url) return false;
	try {
		return ['localhost', '127.0.0.1'].includes(new URL(url).hostname);
	} catch {
		return false;
	}
}

async function seed(): Promise<void> {
	const url = process.env.DATABASE_URL;
	if (!istLokaleDatenbank(url)) {
		console.error('Abbruch: DATABASE_URL zeigt nicht auf localhost oder 127.0.0.1.');
		process.exitCode = 1;
		return;
	}
	const einstellungen = leseEinstellungen();
	const db = erstelleDb(url as string);
	try {
		// Die Adressen gehen nur an Mailpit.
		const kontoIds = await legeErfundeneMitgliederAn(db);
		await machAdmin(db, kontoIds[0], new Date());
		const dienst = erstelleLoginDienst({
			db,
			schluessel: einstellungen.codeSchluessel,
			kontakt: einstellungen.kontakt,
			mailer: async () => {},
			bremsen: erstelleBremsen()
		});
		const { code } = await dienst.stelleBriefCodeAus(kontoIds[0]);
		console.log(`Erfundene Mitglieder: ${ERFUNDENE_MITGLIEDER.map((m) => m.email).join(', ')}`);
		console.log(`Brief-Code für ${ERFUNDENE_MITGLIEDER[0].vorname} (nur lokal, 90 Tage gültig):`);
		console.log(formatiereBriefCode(code));
	} finally {
		await db.$client.end();
	}
}

if (import.meta.main) await seed();
