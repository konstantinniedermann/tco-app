// Nur lokal (make seed): eine erfundene Clubmeisterschaft 2027 mit Kategorien, damit die
// Verwaltung beim Vorzeigen nicht leer ist (DS-08).
import { and, eq, isNull } from 'drizzle-orm';
import {
	beantrageWildcard,
	istAktiv,
	meldeAn,
	spielerDer
} from '../src/lib/server/cm/anmeldungen.ts';
import type { Db } from '../src/lib/server/db/index.ts';
import {
	anmeldung,
	anmeldungSpieler,
	kategorie,
	konto,
	mitglied,
	partnerAnfrage,
	turnier
} from '../src/lib/server/db/schema.ts';
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

// Erfundene Spielerinnen und Spieler (DS-08); je Kategorie 1–2 Anmeldungen. Max hat den Rufnamen
// «Maxi», Lena «lena» (gleich dem Vornamen in anderer Schreibweise: wird angezeigt wie ohne
// Rufname); die anderen haben keinen. Nico hat keine Klassierung: In der Partnersuche trägt er
// den Vermerk *Klassierung fehlt*, anmelden kann er sich nicht (FR-37). Alle haben ein Konto mit
// Login: Nur solche Mitglieder findet die Partnersuche (FR-48), sonst liesse sich keiner der
// Suchenden anfragen.
const SPIELER = [
	{
		vorname: 'Max',
		rufname: 'Maxi',
		nachname: 'Vorbild',
		geschlecht: 'm',
		jahrgang: 1990,
		klassierung: 'R4'
	},
	{ vorname: 'Paul', nachname: 'Beispielmann', geschlecht: 'm', jahrgang: 1978, klassierung: 'R6' },
	{ vorname: 'Urs', nachname: 'Probe', geschlecht: 'm', jahrgang: 1985, klassierung: 'R8' },
	{
		vorname: 'Lena',
		rufname: 'lena',
		nachname: 'Vorzeige',
		geschlecht: 'w',
		jahrgang: 1995,
		klassierung: 'R5'
	},
	{ vorname: 'Sara', nachname: 'Erdacht', geschlecht: 'w', jahrgang: 1988, klassierung: 'R9' },
	{ vorname: 'Nico', nachname: 'Musterli', geschlecht: 'm', jahrgang: 1999, klassierung: null }
] as const;
const ANMELDUNGEN: [string, string[]][] = [
	['Herren R1–R6', ['Max', 'Paul']],
	['Herren R7–R9', ['Urs']],
	['Damen R4–R9', ['Lena', 'Sara']]
];
// FR-08: ein offener Wildcard-Antrag, damit die Verwaltung beim Vorzeigen einen zeigt.
const ANTRAG = {
	kategorie: 'Herren R1–R6',
	vorname: 'Urs',
	kommentar: 'Möchte mich mit Stärkeren messen.'
};

// A-ANMELDUNG-04, FR-48, FR-49: im Doppel ein Paar, zwei suchen allein (eine mit Kommentar), und
// eine offene Anfrage. Die Anfrage steht direkt in der Datenbank, ohne Mitteilung an Paul.
const PAAR = { kategorie: 'Mixed Doppel', vornamen: ['Max', 'Lena'] } as const;
const ALLEIN: [string, string, string | null][] = [
	['Damen Doppel', 'Sara', 'Suche jemanden auf R5–R7-Niveau, eher abends.'],
	['Herren Doppel', 'Paul', null]
];
const ANFRAGE = { kategorie: 'Herren Doppel', von: 'Urs', an: 'Paul' } as const;

type Spieler = { vorname: string; nachname: string; rufname?: string };
const mailVon = (s: Spieler) => `${s.vorname}.${s.nachname}@example.org`.toLowerCase();

async function kategorieNamens(
	db: Db,
	turnierId: number,
	name: string
): Promise<number | undefined> {
	const [k] = await db
		.select({ id: kategorie.id })
		.from(kategorie)
		.where(and(eq(kategorie.turnierId, turnierId), eq(kategorie.name, name)));
	return k?.id;
}

/** Die aktive Anmeldung des Mitglieds in dieser Kategorie mit der Zahl ihrer Spieler. */
async function aktiveAnmeldung(db: Db, kategorieId: number, mitgliedId: number) {
	const [a] = await db
		.select({ id: anmeldung.id })
		.from(anmeldung)
		.innerJoin(anmeldungSpieler, eq(anmeldungSpieler.anmeldungId, anmeldung.id))
		.where(
			and(
				eq(anmeldung.kategorieId, kategorieId),
				eq(anmeldungSpieler.mitgliedId, mitgliedId),
				istAktiv
			)
		);
	return a ? { id: a.id, spieler: (await spielerDer(db, a.id)).length } : null;
}

/** Doppel: Paar, allein Suchende und die offene Anfrage; wiederholbar wie die Anmeldungen. */
async function legeBeispielDoppelAn(
	db: Db,
	turnierId: number,
	ids: Map<string, number>,
	jetzt: Date
): Promise<void> {
	const id = (vorname: string) => ids.get(vorname) as number;
	const paar = await kategorieNamens(db, turnierId, PAAR.kategorie);
	if (paar) {
		const [a, b] = PAAR.vornamen.map(id);
		// Der Erste meldet sich allein an, der Zweite kommt dazu (wie nach einer angenommenen
		// Anfrage); 'schon-angemeldet' beim zweiten Lauf ist gewollt.
		await meldeAn(db, paar, a, jetzt);
		const eigene = await aktiveAnmeldung(db, paar, a);
		if (eigene?.spieler === 1 && !(await aktiveAnmeldung(db, paar, b))) {
			await db.insert(anmeldungSpieler).values({ anmeldungId: eigene.id, mitgliedId: b });
		}
	}
	for (const [name, vorname, suchtext] of ALLEIN) {
		const k = await kategorieNamens(db, turnierId, name);
		if (k) await meldeAn(db, k, id(vorname), jetzt, suchtext);
	}
	const k = await kategorieNamens(db, turnierId, ANFRAGE.kategorie);
	// Nur solange der Angefragte dort noch allein sucht.
	if (k && (await aktiveAnmeldung(db, k, id(ANFRAGE.an)))?.spieler === 1) {
		await db
			.insert(partnerAnfrage)
			.values({ kategorieId: k, vonId: id(ANFRAGE.von), anId: id(ANFRAGE.an), gestelltAm: jetzt })
			.onConflictDoNothing();
	}
}

/** Legt erfundene Anmeldungen und einen Antrag an; wiederholbar, ein zweiter Lauf ändert nichts. */
async function legeBeispielAnmeldungenAn(db: Db, turnierId: number, jetzt: Date): Promise<void> {
	const ids = new Map<string, number>();
	for (const s of SPIELER) {
		const angaben = { geschlecht: s.geschlecht, jahrgang: s.jahrgang, klassierung: s.klassierung };
		await db
			.insert(mitglied)
			.values({
				vorname: s.vorname,
				rufname: 'rufname' in s ? s.rufname : null,
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
		// Login wie nach eingelöstem Brief-Code; ein vorhandenes Konto bleibt, wie es ist.
		await db
			.insert(konto)
			.values({ mitgliedId: m.id, briefCodeBenutztAm: jetzt })
			.onConflictDoNothing({ target: konto.mitgliedId });
		ids.set(s.vorname, m.id);
	}
	for (const [name, vornamen] of ANMELDUNGEN) {
		const k = await kategorieNamens(db, turnierId, name);
		if (!k) continue;
		// 'schon-angemeldet' beim zweiten Lauf ist gewollt.
		for (const v of vornamen) await meldeAn(db, k, ids.get(v) as number, jetzt);
	}
	const k = await kategorieNamens(db, turnierId, ANTRAG.kategorie);
	// Auch hier: 'schon-angemeldet' beim zweiten Lauf ist gewollt.
	if (k) await beantrageWildcard(db, k, ids.get(ANTRAG.vorname) as number, ANTRAG.kommentar, jetzt);
	await legeBeispielDoppelAn(db, turnierId, ids, jetzt);
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

/** Kontaktperson des Beispielturniers (CM-Admin der Seed-Personas), nur solange keine gewählt ist. */
export async function setzeBeispielKontakt(db: Db, mitgliedId: number): Promise<void> {
	await db
		.update(turnier)
		.set({ kontaktMitgliedId: mitgliedId })
		.where(and(eq(turnier.jahr, JAHR), isNull(turnier.kontaktMitgliedId)));
}
