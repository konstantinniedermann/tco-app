// Nur lokal (make seed): füllt das Beispielturnier 2027 auf, damit jede Kategorie 10–16 aktive
// Anmeldungen hat und Listen, Paare und Partnersuche wie bei einer echten Clubmeisterschaft
// aussehen. 80 erfundene Spieler mit Konto und Login (DS-08: feste Vornamen mit erkennbar
// erfundenen Nachnamen, ohne Zufall, Adressen nur unter example.org). Die Beispielspieler aus
// beispiel-turnier.ts bleiben unberührt. Alles läuft über die Fachfunktionen wie in der App; jedes
// Ergebnis ausser 'ok' bricht ab. Gibt es die Spieler schon, ändert ein Lauf nichts; passt der
// Plan nicht mehr zu den Kategorien (lokal geändert oder abgesagt), bleibt das Turnier, wie es ist.
import { and, eq, inArray, or } from 'drizzle-orm';
import { GRENZE, meldeAn } from '../src/lib/server/cm/anmeldungen.ts';
import { nimmAnfrageAn, stelleAnfrage } from '../src/lib/server/cm/doppel.ts';
import type { Db } from '../src/lib/server/db/index.ts';
import {
	kategorie,
	konto,
	mitglied,
	partnerAnfrage,
	turnier
} from '../src/lib/server/db/schema.ts';
import { punkte, type Klassierung } from '../src/lib/turnier/klassierung.ts';
import { passtAlsPaar, passtEinzel, type KategorieRegel } from '../src/lib/turnier/passung.ts';
import { wirksamerStatus } from '../src/lib/turnier/status.ts';

type G = 'm' | 'w';
type Werte = typeof mitglied.$inferInsert & {
	geschlecht: G;
	jahrgang: number;
	klassierung: Klassierung;
};
type Spieler = { werte: Werte; anzahl: number };

// Je Einzel-Kategorie: wie viele dazukommen und wie die Spieler aussehen (passend zur Regel).
const EINZEL: {
	name: string;
	n: number;
	g: G | 'mw';
	klass: Klassierung[];
	jahr: [number, number];
}[] = [
	{
		name: 'Herren R1–R6',
		n: 13,
		g: 'm',
		klass: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'],
		jahr: [1984, 2006]
	},
	{ name: 'Herren R7–R9', n: 11, g: 'm', klass: ['R7', 'R8', 'R9'], jahr: [1984, 2006] },
	{
		name: 'Damen R4–R9',
		n: 12,
		g: 'w',
		klass: ['R4', 'R5', 'R6', 'R7', 'R8', 'R9'],
		jahr: [1989, 2006]
	},
	{ name: 'Damen R1–R3', n: 11, g: 'w', klass: ['R1', 'R2', 'R3'], jahr: [1989, 2006] },
	{
		name: 'Junioren U18',
		n: 10,
		g: 'mw',
		klass: ['R5', 'R6', 'R7', 'R8', 'R9', 'keine'],
		jahr: [2009, 2013]
	},
	{
		name: 'Senioren 45+',
		n: 13,
		g: 'm',
		klass: ['R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'],
		jahr: [1952, 1982]
	},
	{
		name: 'Seniorinnen 40+',
		n: 10,
		g: 'w',
		klass: ['R4', 'R5', 'R6', 'R7', 'R8', 'R9'],
		jahr: [1958, 1987]
	}
];
// Je Doppel-Kategorie: Paare und allein Suchende (der erste mit Suchtext).
const DOPPEL: { name: string; paare: number; suchende: G[] }[] = [
	{ name: 'Herren Doppel', paare: 10, suchende: ['m'] },
	{ name: 'Damen Doppel', paare: 8, suchende: ['w'] },
	{ name: 'Mixed Doppel', paare: 10, suchende: ['m', 'w'] }
];
const SUCHTEXT = 'Gerne mit jemandem auf ähnlichem Niveau, eher abends.';

// Keiner wie bei den Personas, den Beispielspielern oder dem Testbestand.
const VORNAMEN: Record<G, string[]> = {
	m: [
		'Adrian',
		'Bruno',
		'Cedric',
		'Dominik',
		'Emil',
		'Felix',
		'Gian',
		'Hannes',
		'Ivo',
		'Jonas',
		'Kilian',
		'Lars',
		'Marco',
		'Noah',
		'Oskar',
		'Patrick',
		'Raphael',
		'Simon',
		'Timo',
		'Ueli',
		'Valentin',
		'Werner',
		'Yannick',
		'Zeno',
		'Andri',
		'Beni',
		'Claudio',
		'Elias',
		'Florian',
		'Reto'
	],
	w: [
		'Alina',
		'Bea',
		'Chiara',
		'Doris',
		'Eva',
		'Fiona',
		'Greta',
		'Heidi',
		'Iris',
		'Julia',
		'Karin',
		'Laura',
		'Mia',
		'Nora',
		'Petra',
		'Regula',
		'Selina',
		'Silvia',
		'Ursula',
		'Vera',
		'Yvonne',
		'Zoe',
		'Lea',
		'Nina',
		'Sabine',
		'Martina',
		'Jana',
		'Lisa',
		'Ruth',
		'Anja'
	]
};
const NACHNAMEN = [
	'Satzball',
	'Netzroller',
	'Grundlinger',
	'Aufschlag',
	'Volleyhofer',
	'Topspinner',
	'Returnli',
	'Slicer',
	'Lobmatt',
	'Breakpunkt',
	'Tiebreaker',
	'Doppelfehler',
	'Ballwechsli',
	'Vorhandner',
	'Rückhandli',
	'Filzball',
	'Sandplätzli',
	'Linienrichter',
	'Matchball',
	'Smashberger',
	'Stoppballer',
	'Spielstandli',
	'Netzkante',
	'Seitenwechsler',
	'Einstandli'
];
const ORTE: [string, string][] = [
	['4600', 'Olten'],
	['4632', 'Trimbach'],
	['4657', 'Dulliken'],
	['4614', 'Hägendorf'],
	['4652', 'Winznau']
];
// Nach dem Testbestand (2001–2185).
const NUMMER_AB = 3001;
const ohneUmlaut = (s: string) =>
	s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');

/** Die Spieler je Einzel-Kategorie, ohne Blick auf die Kategorien; bei jedem Aufruf gleich. */
function erzeugeSpieler() {
	const alle: Spieler[] = [];
	const zaehler = { m: 0, w: 0 };
	const neu = (g: G, klassierung: Klassierung, jahrgang: number): Spieler => {
		const i = zaehler[g]++;
		const vorname = VORNAMEN[g][i % VORNAMEN[g].length];
		// Über (i mod 30, 11·i mod 25) eindeutig für weniger als 150 Spieler je Geschlecht.
		const nachname = NACHNAMEN[(i * 11 + (g === 'w' ? 5 : 0)) % NACHNAMEN.length];
		const j = alle.length;
		const [plz, ort] = ORTE[j % ORTE.length];
		const s: Spieler = {
			werte: {
				vorname,
				nachname,
				email: `${ohneUmlaut(vorname)}.${ohneUmlaut(nachname)}@example.org`,
				strasse: `Erfundenweg ${j + 300}`,
				plz,
				ort,
				mitgliedernummer: String(NUMMER_AB + j),
				geschlecht: g,
				jahrgang,
				klassierung,
				// Format +41 00 …, das es nicht gibt (Testkonzept, Testdaten).
				telefon: j % 3 === 2 ? null : `+41 00 ${500 + j} ${10 + ((j * 7) % 90)}`
			},
			anzahl: 0
		};
		alle.push(s);
		return s;
	};

	const einzel = EINZEL.map((e) => {
		const leute = Array.from({ length: e.n }, (_, j) => {
			const g: G = e.g === 'mw' ? (j % 2 === 0 ? 'm' : 'w') : e.g;
			const [von, bis] = e.jahr;
			return neu(g, e.klass[j % e.klass.length], von + ((j * 5) % (bis - von + 1)));
		});
		return { name: e.name, leute };
	});
	return { alle, einzel };
}

/** Der Plan: prüft die Einzel gegen ihre Kategorie und bildet Paare und Suchende je Doppel. */
function plane(
	regeln: Map<string, KategorieRegel>,
	{ alle, einzel }: ReturnType<typeof erzeugeSpieler>
) {
	const regel = (name: string) => regeln.get(name) ?? fehler(`Kategorie fehlt: ${name}`);
	for (const e of einzel) {
		const k = regel(e.name);
		for (const s of e.leute) {
			if (!passtEinzel(k, s.werte)) fehler(`Plan passt nicht in ${e.name}`);
			s.anzahl++;
		}
	}

	// Doppel nur mit Erwachsenen; höchstens GRENZE Anmeldungen je Person.
	const frei = (g: G, belegt: Set<Spieler>) =>
		alle
			.filter((s) => s.werte.jahrgang < 2009 && s.werte.geschlecht === g)
			.filter((s) => s.anzahl < GRENZE && !belegt.has(s))
			.sort((a, b) => punkte(a.werte.klassierung) - punkte(b.werte.klassierung));
	const doppel = DOPPEL.map((d) => {
		const k = regel(d.name);
		const belegt = new Set<Spieler>();
		const [ga, gb]: [G, G] =
			k.geschlecht === 'herren' ? ['m', 'm'] : k.geschlecht === 'damen' ? ['w', 'w'] : ['m', 'w'];
		const paare: [Spieler, Spieler][] = [];
		// Die Stärksten mit den Schwächsten, solange die Mindestsumme reicht.
		for (const a of frei(ga, belegt)) {
			if (paare.length === d.paare) break;
			if (belegt.has(a)) continue;
			const b = frei(gb, belegt)
				.reverse()
				.find((x) => x !== a && passtAlsPaar(k, a.werte, x.werte, true));
			if (!b) continue;
			belegt.add(a).add(b);
			a.anzahl++;
			b.anzahl++;
			paare.push([a, b]);
		}
		if (paare.length < d.paare) fehler(`Plan: zu wenige Paare in ${d.name}`);
		const suchende = d.suchende.map((g) => {
			const s = frei(g, belegt).at(-1) ?? fehler(`Plan: niemand sucht in ${d.name}`);
			belegt.add(s);
			s.anzahl++;
			return s;
		});
		return { name: d.name, paare, suchende };
	});
	return { alle, einzel, doppel };
}

function fehler(text: string): never {
	throw new Error(`Beispielturnier auffüllen: ${text}`);
}
function pruefe(was: string, r: string | { ergebnis: string }): void {
	const wort = typeof r === 'string' ? r : r.ergebnis;
	if (wort !== 'ok') fehler(`${was} ergab ${wort}`);
}

/** Füllt das Turnier auf; tut nichts, wenn es nicht offen ist oder die Spieler schon da sind. */
export async function fuelleBeispielTurnierAuf(
	db: Db,
	turnierId: number,
	jetzt: Date
): Promise<void> {
	const [t] = await db.select().from(turnier).where(eq(turnier.id, turnierId));
	if (!t || wirksamerStatus(t.status, t.anmeldeschluss, jetzt) !== 'offen') return;
	const kategorien = await db
		.select()
		.from(kategorie)
		.where(and(eq(kategorie.turnierId, turnierId), eq(kategorie.status, 'aktiv')));
	const spieler = erzeugeSpieler();
	const emails = spieler.alle.map((s) => s.werte.email as string);
	const nummern = spieler.alle.map((s) => s.werte.mitgliedernummer as string);
	const [vorhanden] = await db
		.select({ id: mitglied.id })
		.from(mitglied)
		.where(or(inArray(mitglied.email, emails), inArray(mitglied.mitgliedernummer, nummern)))
		.limit(1);
	if (vorhanden) return;

	const regeln = new Map(kategorien.map((k) => [k.name, k]));
	const ids = new Map(kategorien.map((k) => [k.name, k.id]));
	// Der ganze Plan steht vor dem ersten Eintrag; die Fachfunktionen prüfen mit denselben Regeln.
	let plan: ReturnType<typeof plane>;
	try {
		plan = plane(regeln, spieler);
	} catch {
		console.log('Beispielturnier: Kategorien lokal geändert, nicht aufgefüllt');
		return;
	}

	const mitgliedId = new Map<Spieler, number>();
	for (const s of plan.alle) {
		const [m] = await db.insert(mitglied).values(s.werte).returning({ id: mitglied.id });
		// Login wie nach eingelöstem Brief-Code: Nur solche findet die Partnersuche (FR-48).
		await db.insert(konto).values({ mitgliedId: m.id, briefCodeBenutztAm: jetzt });
		mitgliedId.set(s, m.id);
	}
	const id = (s: Spieler) => mitgliedId.get(s) as number;
	const kat = (name: string) => ids.get(name) as number;

	for (const e of plan.einzel) {
		for (const s of e.leute)
			pruefe(`Anmeldung ${e.name}`, await meldeAn(db, kat(e.name), id(s), jetzt));
	}
	for (const d of plan.doppel) {
		for (const [a, b] of d.paare) {
			// Wie in der App: a fragt b an, b nimmt an; das Paar ist eine neue Anmeldung.
			pruefe(`Anfrage ${d.name}`, await stelleAnfrage(db, kat(d.name), id(a), id(b), jetzt));
			const [anfrage] = await db
				.select({ id: partnerAnfrage.id })
				.from(partnerAnfrage)
				.where(and(eq(partnerAnfrage.kategorieId, kat(d.name)), eq(partnerAnfrage.vonId, id(a))));
			pruefe(`Annahme ${d.name}`, await nimmAnfrageAn(db, anfrage.id, id(b), jetzt));
		}
		for (const [i, s] of d.suchende.entries()) {
			pruefe(
				`Suche ${d.name}`,
				await meldeAn(db, kat(d.name), id(s), jetzt, i === 0 ? SUCHTEXT : null)
			);
		}
	}
}
