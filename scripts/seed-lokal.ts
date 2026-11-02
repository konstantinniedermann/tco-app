// Nur lokal: legt erfundene Mitglieder an und gibt für das erste einmal einen Brief-Code aus.
// Aufruf über `make seed` (lädt .env). Bricht ab, wenn die Datenbank nicht lokal ist.
import { eq } from 'drizzle-orm';
import { erstelleDb } from '../src/lib/server/db/index.ts';
import { konto, mitglied } from '../src/lib/server/db/schema.ts';
import { leseEinstellungen } from '../src/lib/server/einstellungen.ts';
import { erstelleBremsen } from '../src/lib/server/login/bremse.ts';
import { formatiereBriefCode } from '../src/lib/server/login/codes.ts';
import { erstelleLoginDienst } from '../src/lib/server/login/dienst.ts';

// Erfundene Personen; die Adressen gehen nur an Mailpit.
const MITGLIEDER = [
	{ vorname: 'Erika', nachname: 'Beispiel', email: 'erika.beispiel@example.org' },
	{ vorname: 'Kurt', nachname: 'Erfunden', email: 'kurt.erfunden@example.org' }
];

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
		const kontoIds: number[] = [];
		for (const m of MITGLIEDER) {
			// Mehrfach ausführbar: vorhandene Mitglieder und Konten bleiben, wie sie sind.
			await db
				.insert(mitglied)
				.values({ ...m, strasse: 'Erfundenweg 1', plz: '4600', ort: 'Olten' })
				.onConflictDoNothing({ target: mitglied.email });
			const [{ id: mitgliedId }] = await db
				.select({ id: mitglied.id })
				.from(mitglied)
				.where(eq(mitglied.email, m.email));
			await db
				.insert(konto)
				.values({ mitgliedId })
				.onConflictDoNothing({ target: konto.mitgliedId });
			const [{ id }] = await db
				.select({ id: konto.id })
				.from(konto)
				.where(eq(konto.mitgliedId, mitgliedId));
			kontoIds.push(id);
		}
		const dienst = erstelleLoginDienst({
			db,
			schluessel: einstellungen.codeSchluessel,
			kontakt: einstellungen.kontakt,
			mailer: async () => {},
			bremsen: erstelleBremsen()
		});
		const { code } = await dienst.stelleBriefCodeAus(kontoIds[0]);
		console.log(`Erfundene Mitglieder: ${MITGLIEDER.map((m) => m.email).join(', ')}`);
		console.log(`Brief-Code für ${MITGLIEDER[0].vorname} (nur lokal, 90 Tage gültig):`);
		console.log(formatiereBriefCode(code));
	} finally {
		await db.$client.end();
	}
}

if (import.meta.main) await seed();
