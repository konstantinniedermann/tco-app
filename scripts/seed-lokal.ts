// Nur lokal: legt einen Testbestand an (rund 200 erfundene Mitglieder, zwei Anlässe, ein
// Beispielturnier) und gibt Brief-Codes für die Personas aus: Erika (MyTCO-Admin und
// Mitglieder-Admin), Kurt (Mitglied), Hanna Muster (CM-Admin), Mona Vorlage (nur
// Mitglieder-Admin) und Theo Platzhalter (nur MyTCO-Admin). Mehrfach ausführbar: Vorhandenes
// bleibt, Logins bleiben gültig, nur die Brief-Codes der Personas sind neu.
// Aufruf über `make seed` (lädt .env). Bricht ab, wenn die Datenbank nicht lokal ist.
import { eq } from 'drizzle-orm';
import { machAdmin } from '../src/lib/server/admin/erster-admin.ts';
import { erstelleDb } from '../src/lib/server/db/index.ts';
import type { Rolle } from '../src/lib/server/admin/rollen.ts';
import { konto, kontoRolle } from '../src/lib/server/db/schema.ts';
import { leseEinstellungen } from '../src/lib/server/einstellungen.ts';
import { erstelleBremsen } from '../src/lib/server/login/bremse.ts';
import { formatiereBriefCode } from '../src/lib/server/login/codes.ts';
import { erstelleLoginDienst } from '../src/lib/server/login/dienst.ts';
import {
	legeBeispielAnlassAn,
	legeBeispielClubabendAn,
	meldeBeispielAntworten
} from './beispiel-anlass.ts';
import { legeBeispielMitgliederAn } from './beispiel-mitglieder.ts';
import { legeBeispielTurnierAn } from './beispiel-turnier.ts';
import { ERFUNDENE_MITGLIEDER, legeErfundeneMitgliederAn } from './erfundene-mitglieder.ts';

// Nur lokal, nicht auf Test (testdaten.ts legt nur ERFUNDENE_MITGLIEDER an).
const NUR_LOKAL = [
	{ vorname: 'Mona', nachname: 'Vorlage', email: 'mona.vorlage@example.org' },
	{ vorname: 'Theo', nachname: 'Platzhalter', email: 'theo.platzhalter@example.org' }
] as const;
const PERSONAS = [...ERFUNDENE_MITGLIEDER, ...NUR_LOKAL];

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
		const kontoIds = await legeErfundeneMitgliederAn(db, PERSONAS);
		await machAdmin(db, kontoIds[0], new Date());
		// Eine Beispiel-GV, damit Startseite und Verwaltung etwas zeigen (A-ANLASS-01).
		const [erika] = await db
			.select({ id: konto.mitgliedId })
			.from(konto)
			.where(eq(konto.id, kontoIds[0]));
		const jetzt = new Date();
		const gv = await legeBeispielAnlassAn(db, erika.id, jetzt);
		// Eine Beispiel-Clubmeisterschaft und Hanna als CM-Admin.
		await legeBeispielTurnierAn(db, jetzt);
		// Testbestand: rund 200 Mitglieder, ein zweiter Anlass, gemischte Antworten auf beide.
		const bestand = await legeBeispielMitgliederAn(db, jetzt);
		const clubabend = await legeBeispielClubabendAn(db, erika.id, jetzt);
		await meldeBeispielAntworten(db, gv, bestand, jetzt, 0);
		await meldeBeispielAntworten(db, clubabend, bestand, jetzt, 1);
		// Je eine Persona mit nur einer Admin-Rolle, damit sich die Bereiche einzeln ausprobieren lassen.
		const einzelrollen: [number, Rolle][] = [
			[2, 'cm'],
			[3, 'mitglieder'],
			[4, 'mytco']
		];
		for (const [index, rolle] of einzelrollen) {
			await db.insert(kontoRolle).values({ kontoId: kontoIds[index], rolle }).onConflictDoNothing();
		}
		const dienst = erstelleLoginDienst({
			db,
			schluessel: einstellungen.codeSchluessel,
			kontakt: einstellungen.kontakt,
			mailer: async () => {},
			bremsen: erstelleBremsen()
		});
		console.log(`Erfundene Mitglieder: ${PERSONAS.map((m) => m.email).join(', ')}`);
		console.log('Brief-Codes (nur lokal, 90 Tage gültig, je einmal verwendbar):');
		// Fünf Personas: Erika hat MyTCO-Admin und Mitglieder-Admin, Kurt sieht nur, was jedes Mitglied
		// sieht, Hanna die Clubmeisterschaft, Mona und Theo je eine Admin-Rolle.
		const personas = [
			'MyTCO-Admin und Mitglieder-Admin',
			'Mitglied',
			'CM-Admin',
			'Mitglieder-Admin',
			'MyTCO-Admin'
		];
		for (const [index, rolle] of personas.entries()) {
			const { code } = await dienst.stelleBriefCodeAus(kontoIds[index]);
			const { vorname, nachname } = PERSONAS[index];
			console.log(`  ${vorname} ${nachname} (${rolle}): ${formatiereBriefCode(code)}`);
		}
	} finally {
		await db.$client.end();
	}
}

if (import.meta.main) await seed();
