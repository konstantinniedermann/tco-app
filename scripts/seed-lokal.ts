// Nur lokal: legt erfundene Mitglieder an und gibt Brief-Codes für Erika (Admin) und Kurt aus.
// Aufruf über `make seed` (lädt .env). Bricht ab, wenn die Datenbank nicht lokal ist.
import { eq } from 'drizzle-orm';
import { machAdmin } from '../src/lib/server/admin/erster-admin.ts';
import { erstelleDb } from '../src/lib/server/db/index.ts';
import { konto } from '../src/lib/server/db/schema.ts';
import { leseEinstellungen } from '../src/lib/server/einstellungen.ts';
import { erstelleBremsen } from '../src/lib/server/login/bremse.ts';
import { formatiereBriefCode } from '../src/lib/server/login/codes.ts';
import { erstelleLoginDienst } from '../src/lib/server/login/dienst.ts';
import { legeBeispielAnlassAn } from './beispiel-anlass.ts';
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
		// Eine Beispiel-GV, damit Startseite und Verwaltung etwas zeigen (A-ANLASS-01).
		const [erika] = await db
			.select({ id: konto.mitgliedId })
			.from(konto)
			.where(eq(konto.id, kontoIds[0]));
		await legeBeispielAnlassAn(db, erika.id, new Date());
		const dienst = erstelleLoginDienst({
			db,
			schluessel: einstellungen.codeSchluessel,
			kontakt: einstellungen.kontakt,
			mailer: async () => {},
			bremsen: erstelleBremsen()
		});
		console.log(`Erfundene Mitglieder: ${ERFUNDENE_MITGLIEDER.map((m) => m.email).join(', ')}`);
		console.log('Brief-Codes (nur lokal, 90 Tage gültig, je einmal verwendbar):');
		// Zwei Personas: Erika sieht die Verwaltung, Kurt nur, was jedes Mitglied sieht.
		for (const [index, rolle] of ['Admin', 'Mitglied'].entries()) {
			const { code } = await dienst.stelleBriefCodeAus(kontoIds[index]);
			const { vorname, nachname } = ERFUNDENE_MITGLIEDER[index];
			console.log(`  ${vorname} ${nachname} (${rolle}): ${formatiereBriefCode(code)}`);
		}
	} finally {
		await db.$client.end();
	}
}

if (import.meta.main) await seed();
