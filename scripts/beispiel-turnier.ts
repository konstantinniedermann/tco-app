// Nur lokal (make seed): eine erfundene Clubmeisterschaft 2027 mit Kategorien, damit die
// Verwaltung beim Vorzeigen nicht leer ist (DS-08).
import { and, eq } from 'drizzle-orm';
import { meldeAn } from '../src/lib/server/cm/anmeldungen.ts';
import type { Db } from '../src/lib/server/db/index.ts';
import { kategorie, mitglied, turnier } from '../src/lib/server/db/schema.ts';
import type { KategorieWerte } from '../src/lib/server/turnier/angaben.ts';
import { legeKategorieAn, legeTurnierAn, setzeStatus } from '../src/lib/server/turnier/turniere.ts';

const JAHR = 2027;

const OHNE = { jahrgangVon: null, jahrgangBis: null, klassierungVon: null, klassierungBis: null };
const KATEGORIEN: KategorieWerte[] = [
	{
		...OHNE,
		name: 'Herren R1–R6',
		geschlecht: 'herren',
		art: 'einzel',
		klassierungVon: 'R1',
		klassierungBis: 'R6',
		mindestsumme: null
	},
	{
		...OHNE,
		name: 'Herren R7–R9',
		geschlecht: 'herren',
		art: 'einzel',
		klassierungVon: 'R7',
		klassierungBis: 'R9',
		mindestsumme: null
	},
	{
		...OHNE,
		name: 'Damen R4–R9',
		geschlecht: 'damen',
		art: 'einzel',
		klassierungVon: 'R4',
		klassierungBis: 'R9',
		mindestsumme: null
	},
	{
		...OHNE,
		name: 'Junioren U18',
		geschlecht: 'offen',
		art: 'einzel',
		jahrgangVon: 2009,
		klassierungVon: 'R1',
		klassierungBis: 'R9',
		mindestsumme: null
	},
	{
		...OHNE,
		name: 'Senioren 45+',
		geschlecht: 'herren',
		art: 'einzel',
		jahrgangBis: 1982,
		klassierungVon: 'R1',
		klassierungBis: 'R9',
		mindestsumme: null
	},
	{ ...OHNE, name: 'Herren Doppel', geschlecht: 'herren', art: 'doppel', mindestsumme: 9 },
	{ ...OHNE, name: 'Damen Doppel', geschlecht: 'damen', art: 'doppel', mindestsumme: 9 },
	{ ...OHNE, name: 'Mixed Doppel', geschlecht: 'mixed', art: 'doppel', mindestsumme: 9 }
];

// Erfundene Spielerinnen und Spieler mit Klassierung (DS-08); je Kategorie 1–2 Anmeldungen.
const SPIELER = [
	{ vorname: 'Max', nachname: 'Vorbild', geschlecht: 'm', jahrgang: 1990, klassierung: 'R4' },
	{ vorname: 'Paul', nachname: 'Beispielmann', geschlecht: 'm', jahrgang: 1978, klassierung: 'R6' },
	{ vorname: 'Urs', nachname: 'Probe', geschlecht: 'm', jahrgang: 1985, klassierung: 'R8' },
	{ vorname: 'Lena', nachname: 'Vorzeige', geschlecht: 'w', jahrgang: 1995, klassierung: 'R5' },
	{ vorname: 'Sara', nachname: 'Erdacht', geschlecht: 'w', jahrgang: 1988, klassierung: 'R9' }
] as const;
const ANMELDUNGEN: [string, string[]][] = [
	['Herren R1–R6', ['Max', 'Paul']],
	['Herren R7–R9', ['Urs']],
	['Damen R4–R9', ['Lena', 'Sara']]
];

const mailVon = (s: (typeof SPIELER)[number]) =>
	`${s.vorname}.${s.nachname}@example.org`.toLowerCase();

/** Legt erfundene Anmeldungen an; wiederholbar, ein zweiter Lauf ändert nichts. */
async function legeBeispielAnmeldungenAn(db: Db, turnierId: number, jetzt: Date): Promise<void> {
	const ids = new Map<string, number>();
	for (const s of SPIELER) {
		const angaben = { geschlecht: s.geschlecht, jahrgang: s.jahrgang, klassierung: s.klassierung };
		await db
			.insert(mitglied)
			.values({
				vorname: s.vorname,
				nachname: s.nachname,
				email: mailVon(s),
				strasse: 'Erfundenweg 1',
				plz: '4600',
				ort: 'Olten',
				...angaben
			})
			.onConflictDoNothing({ target: mitglied.email });
		const [m] = await db
			.select({ id: mitglied.id })
			.from(mitglied)
			.where(eq(mitglied.email, mailVon(s)));
		ids.set(s.vorname, m.id);
	}
	for (const [name, vornamen] of ANMELDUNGEN) {
		const [k] = await db
			.select({ id: kategorie.id })
			.from(kategorie)
			.where(and(eq(kategorie.turnierId, turnierId), eq(kategorie.name, name)));
		if (!k) continue;
		// 'schon-angemeldet' beim zweiten Lauf ist gewollt.
		for (const v of vornamen) await meldeAn(db, k.id, ids.get(v) as number, jetzt);
	}
}

/** Legt die Beispiel-Clubmeisterschaft samt Anmeldungen an; vorhandene Daten bleiben unverändert. */
export async function legeBeispielTurnierAn(db: Db, jetzt: Date): Promise<void> {
	const [vorhanden] = await db
		.select({ id: turnier.id })
		.from(turnier)
		.where(eq(turnier.jahr, JAHR));
	if (vorhanden) {
		await legeBeispielAnmeldungenAn(db, vorhanden.id, jetzt);
		return;
	}
	const t = await legeTurnierAn(db, {
		jahr: JAHR,
		name: `Clubmeisterschaft ${JAHR}`,
		anmeldeschluss: `${JAHR}-05-31`,
		nummern: [
			{ bezeichnung: 'Gruppenphase', nummer: '123456' },
			{ bezeichnung: 'Finalwochenende', nummer: '123457' }
		]
	});
	if (t.ergebnis !== 'ok') return;
	for (const k of KATEGORIEN) await legeKategorieAn(db, t.id, k);
	// Nach dem Anmeldeschluss bleibt das Turnier in Vorbereitung ('schluss-vorbei').
	await setzeStatus(db, t.id, 'offen', jetzt);
	await legeBeispielAnmeldungenAn(db, t.id, jetzt);
}
