// Nur lokal (make seed): eine erfundene Generalversammlung mit einigen Antworten erfundener
// Mitglieder, damit Startseite und Verwaltung beim Vorzeigen nicht leer sind (DS-08).
import { eq } from 'drizzle-orm';
import { zuerichZuUtc } from '../src/lib/anlass/zeit.ts';
import { legeAnlassAn, melde } from '../src/lib/server/anlass/anlaesse.ts';
import type { Db } from '../src/lib/server/db/index.ts';
import { anlass, mitglied, type Antwort } from '../src/lib/server/db/schema.ts';

const TITEL = 'Generalversammlung 2027';

const EINLADUNG = [
	'Liebe Mitglieder, wir laden euch herzlich zur Generalversammlung ein.',
	'',
	'Traktanden',
	'1. Protokoll der letzten GV',
	'2. Jahresbericht und Jahresrechnung',
	'3. Budget und Mitgliederbeiträge',
	'4. Wahlen',
	'5. Anträge',
	'6. Verschiedenes',
	'',
	'Anschliessend Apéro im Clubhaus.'
].join('\n');

// Erfundene Mitglieder ohne Konto, nur für die Antworten.
const ANTWORTEN: { vorname: string; nachname: string; antwort: Antwort; bemerkung?: string }[] = [
	{ vorname: 'Lea', nachname: 'Probe', antwort: 'kommt' },
	{ vorname: 'Nino', nachname: 'Versuch', antwort: 'kommt' },
	{ vorname: 'Mia', nachname: 'Vorlage', antwort: 'kommt' },
	{
		vorname: 'Sara',
		nachname: 'Entwurf',
		antwort: 'kommt-nicht',
		bemerkung: 'Bin leider in den Ferien.'
	}
];
// Ein weiteres Mitglied ohne Antwort: zählt in der Verwaltung bei «noch keine Antwort».
const OHNE_ANTWORT = { vorname: 'Jonas', nachname: 'Skizze' };

async function erfundenesMitglied(db: Db, vorname: string, nachname: string): Promise<number> {
	const email = `${vorname}.${nachname}@example.org`.toLowerCase();
	await db
		.insert(mitglied)
		.values({ vorname, nachname, email, strasse: 'Erfundenweg 1', plz: '4600', ort: 'Olten' })
		.onConflictDoNothing({ target: mitglied.email });
	const [{ id }] = await db
		.select({ id: mitglied.id })
		.from(mitglied)
		.where(eq(mitglied.email, email));
	return id;
}

/** Legt die Beispiel-GV an; gibt es sie schon (gleicher Titel), passiert nichts. */
export async function legeBeispielAnlassAn(
	db: Db,
	erstelltVon: number,
	jetzt: Date
): Promise<void> {
	const [vorhanden] = await db
		.select({ id: anlass.id })
		.from(anlass)
		.where(eq(anlass.titel, TITEL));
	if (vorhanden) return;
	const id = await legeAnlassAn(db, erstelltVon, {
		titel: TITEL,
		beginn: zuerichZuUtc('2027-03-19T19:30')!,
		ort: 'Clubhaus, Musterweg 1, Olten',
		einladung: EINLADUNG,
		anmeldeschluss: zuerichZuUtc('2027-03-16T23:59')!
	});
	for (const a of ANTWORTEN) {
		const mitgliedId = await erfundenesMitglied(db, a.vorname, a.nachname);
		await melde(db, id, mitgliedId, { antwort: a.antwort, bemerkung: a.bemerkung ?? null }, jetzt);
	}
	await erfundenesMitglied(db, OHNE_ANTWORT.vorname, OHNE_ANTWORT.nachname);
}
