// Nur lokal (make seed): eine erfundene Generalversammlung mit einigen Antworten erfundener
// Mitglieder und einer verschickten Erinnerung im Verlauf der Mitteilungen, damit Startseite und
// Verwaltung beim Vorzeigen nicht leer sind (DS-08).
import { eq } from 'drizzle-orm';
import { utcZuZuerich, zuerichZuUtc } from '../src/lib/anlass/zeit.ts';
import { legeAnlassAn, melde } from '../src/lib/server/anlass/anlaesse.ts';
import { vorlagenAnlass } from '../src/lib/mitteilung/vorlagen.ts';
import type { Db } from '../src/lib/server/db/index.ts';
import { speichereMitteilung } from '../src/lib/server/mitteilung/verlauf.ts';
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

const CLUBABEND = 'Clubabend mit Grill';
const TAG_MS = 24 * 60 * 60 * 1000;

/**
 * Ein zweiter Anlass rund einen Monat nach dem ersten `make seed`, damit die Startseite zwei
 * Anlässe zeigt; gibt es ihn schon (gleicher Titel), passiert nichts. Gibt die ID zurück.
 */
export async function legeBeispielClubabendAn(
	db: Db,
	erstelltVon: number,
	jetzt: Date
): Promise<number> {
	const [vorhanden] = await db
		.select({ id: anlass.id })
		.from(anlass)
		.where(eq(anlass.titel, CLUBABEND));
	if (vorhanden) return vorhanden.id;
	const tag = (versatz: number) =>
		utcZuZuerich(new Date(jetzt.getTime() + versatz * TAG_MS)).slice(0, 10);
	return legeAnlassAn(db, erstelltVon, {
		titel: CLUBABEND,
		beginn: zuerichZuUtc(`${tag(30)}T18:30`)!,
		ort: 'Clubhaus, Musterweg 1, Olten',
		einladung: [
			'Zum Saisonstart grillieren wir zusammen auf der Terrasse.',
			'Fleisch und Getränke offeriert der Verein, Salate sind willkommen.'
		].join('\n'),
		anmeldeschluss: zuerichZuUtc(`${tag(27)}T23:59`)!
	});
}

/**
 * Gemischte Antworten des Testbestands auf einen Anlass: etwa jedes dritte Mitglied kommt, jedes
 * zehnte nicht (teils mit Bemerkung), der Rest hat noch nicht geantwortet. `versatz` verschiebt
 * das Muster, damit die zwei Anlässe nicht dieselben Antworten haben. Ausgetretene und Anlässe
 * nach dem Anmeldeschluss lässt `melde` aus.
 */
export async function meldeBeispielAntworten(
	db: Db,
	anlassId: number,
	mitgliedIds: number[],
	jetzt: Date,
	versatz: number
): Promise<void> {
	for (const [i, mitgliedId] of mitgliedIds.entries()) {
		const n = i + versatz;
		if (n % 3 === 0) {
			await melde(db, anlassId, mitgliedId, { antwort: 'kommt', bemerkung: null }, jetzt);
		} else if (n % 10 === 1) {
			const bemerkung = n % 20 === 1 ? 'Bin an dem Abend leider verhindert.' : null;
			await melde(db, anlassId, mitgliedId, { antwort: 'kommt-nicht', bemerkung }, jetzt);
		}
	}
}

/** Legt die Beispiel-GV an und gibt ihre ID; gibt es sie schon (gleicher Titel), passiert nichts. */
export async function legeBeispielAnlassAn(
	db: Db,
	erstelltVon: number,
	jetzt: Date
): Promise<number> {
	const [vorhanden] = await db
		.select({ id: anlass.id })
		.from(anlass)
		.where(eq(anlass.titel, TITEL));
	if (vorhanden) return vorhanden.id;
	const beginn = zuerichZuUtc('2027-03-19T19:30')!;
	const anmeldeschluss = zuerichZuUtc('2027-03-16T23:59')!;
	const id = await legeAnlassAn(db, erstelltVon, {
		titel: TITEL,
		beginn,
		ort: 'Clubhaus, Musterweg 1, Olten',
		einladung: EINLADUNG,
		anmeldeschluss
	});
	for (const a of ANTWORTEN) {
		const mitgliedId = await erfundenesMitglied(db, a.vorname, a.nachname);
		await melde(db, id, mitgliedId, { antwort: a.antwort, bemerkung: a.bemerkung ?? null }, jetzt);
	}
	await erfundenesMitglied(db, OHNE_ANTWORT.vorname, OHNE_ANTWORT.nachname);
	// Eine erfundene Erinnerung im Verlauf (nur Zahlen, nie Empfängernamen); verschickt wird nichts.
	const erinnerung = vorlagenAnlass({ titel: TITEL, beginn, anmeldeschluss })[0];
	await speichereMitteilung(
		db,
		{ art: 'anlass', anlassId: id },
		{
			absenderId: erstelltVon,
			titel: erinnerung.titel,
			text: erinnerung.text,
			auswahl: 'keine-antwort',
			weg: 'push-sonst-mail',
			push: 1,
			mails: 1,
			ersatzMails: 0,
			nichtErreichbar: 0
		},
		jetzt
	);
	return id;
}
