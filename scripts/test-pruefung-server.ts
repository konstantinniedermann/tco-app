// Nur Test: Server-Teil von `make test-pruefung` (scripts/test-pruefung.ts). Läuft im
// Laufzeit-Image mit `node scripts/test-pruefung-server.ts`, gestartet per SSH und docker exec.
// Legt zwei erfundene Prüfkonten an, falls sie fehlen, und meldet die Punkte der Checkliste, die
// nur der Server zeigt. Ausgabe nur feste Texte (DS-06): nie Adresse, Code oder Werte.
// Kein Teil von testdaten.ts: Neue Testdaten dort setzen Test neu auf (betrieb/test-neu-aufsetzen).
import { and, count, eq, gt, inArray, isNull } from 'drizzle-orm';
import { ladeRollen, setzeRollen } from '../src/lib/server/admin/rollen.ts';
import { jahrInZuerich } from '../src/lib/server/datum.ts';
import { erstelleDb, type Db } from '../src/lib/server/db/index.ts';
import { icAbruf, konto, kontoRolle, mitglied } from '../src/lib/server/db/schema.ts';
import { legeErfundeneMitgliederAn } from './erfundene-mitglieder.ts';
import { PRUEFKONTEN } from './pruefkonten.ts';

export { PRUEFKONTEN };

export type Punkt = 'zeitgeber' | 'ic-abruf' | 'admin';
export type Befund = { punkt: Punkt; ok: boolean; text: string };

// Der Abruf läuft täglich, aber nicht von 23 bis 7 Uhr (interclub/faellig.ts): 24 h wären an
// manchen Morgen knapp überschritten, ohne dass etwas fehlt.
const ABRUF_FRISCH_MS = 26 * 60 * 60 * 1000;

/** Mehrfach ausführbar: Paul als Spieler mit Login, Pia zusätzlich mit der Rolle Mitglieder-Admin. */
export async function legePruefkontenAn(db: Db, jetzt: Date): Promise<void> {
	const [, piaKonto] = await legeErfundeneMitgliederAn(db, PRUEFKONTEN);
	await db
		.update(konto)
		.set({ briefCodeBenutztAm: jetzt })
		.where(
			and(
				isNull(konto.briefCodeBenutztAm),
				inArray(
					konto.mitgliedId,
					db
						.select({ id: mitglied.id })
						.from(mitglied)
						.where(
							inArray(
								mitglied.email,
								PRUEFKONTEN.map((k) => k.email)
							)
						)
				)
			)
		);
	const rollen = await ladeRollen(db, piaKonto);
	if (rollen.includes('mitglieder')) return;
	const r = await setzeRollen(
		db,
		{ art: 'automatisch' },
		piaKonto,
		[...rollen, 'mitglieder'],
		rollen,
		jetzt
	);
	if (r !== 'ok') throw new Error('Rolle des Prüfkontos nicht vergeben');
}

export async function pruefeServer(
	db: Db,
	env: Record<string, string | undefined>,
	jetzt: Date
): Promise<Befund[]> {
	const zeitgeberAn = env.ZEITGEBER !== 'aus' && env.IC_ABRUF === 'an';

	const [{ n: abrufe }] = await db
		.select({ n: count() })
		.from(icAbruf)
		.where(
			and(
				eq(icAbruf.saison, jahrInZuerich(jetzt)),
				gt(icAbruf.versuchtAm, new Date(jetzt.getTime() - ABRUF_FRISCH_MS))
			)
		);

	const [{ n: admins }] = await db
		.select({ n: count() })
		.from(kontoRolle)
		.innerJoin(konto, eq(konto.id, kontoRolle.kontoId))
		.innerJoin(mitglied, eq(mitglied.id, konto.mitgliedId))
		.where(
			and(eq(kontoRolle.rolle, 'mytco'), eq(konto.gesperrt, false), eq(mitglied.status, 'aktiv'))
		);

	return [
		{
			punkt: 'zeitgeber',
			ok: zeitgeberAn,
			text: zeitgeberAn
				? 'ZEITGEBER nicht aus, IC_ABRUF an'
				: 'ZEITGEBER aus oder IC_ABRUF nicht an'
		},
		{
			punkt: 'ic-abruf',
			ok: abrufe > 0,
			text:
				abrufe > 0
					? 'Abruf der laufenden Saison in den letzten 26 h'
					: 'kein Abruf der laufenden Saison in den letzten 26 h'
		},
		{
			punkt: 'admin',
			ok: admins > 0,
			text: admins > 0 ? 'MyTCO-Admin festgelegt' : 'kein aktiver MyTCO-Admin'
		}
	];
}

/** Sperre: Das Image läuft auch auf Live. Ohne MAIL_NUR_AN (= nicht Test) nie. */
export function pruefungVerweigert(env: Record<string, string | undefined>): string | null {
	if (!env.MAIL_NUR_AN?.trim()) return 'verweigert (nur Test)';
	if (!env.DATABASE_URL) return 'abgebrochen';
	return null;
}

export function zeile(b: Befund): string {
	return `pruefung: ${b.punkt} ${b.ok ? 'ok' : 'rot'} ${b.text}`;
}

async function starte(env: Record<string, string | undefined>): Promise<void> {
	const verweigert = pruefungVerweigert(env);
	if (verweigert !== null || !env.DATABASE_URL) {
		console.log(`pruefung: ${verweigert ?? 'abgebrochen'}`);
		process.exitCode = 1;
		return;
	}
	const db = erstelleDb(env.DATABASE_URL);
	try {
		const jetzt = new Date();
		await legePruefkontenAn(db, jetzt);
		for (const b of await pruefeServer(db, env, jetzt)) console.log(zeile(b));
	} catch {
		// Fehler aus der Datenbank nennen Parameter (= Werte): nichts davon ausgeben.
		console.log('pruefung: abgebrochen');
		process.exitCode = 1;
	} finally {
		await db.$client.end();
	}
}

if (import.meta.main) await starte(process.env);
