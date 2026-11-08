// Nur lokal (make seed): ein Testbestand von 185 erfundenen Mitgliedern, zusammen mit den Personas
// und den Mitgliedern der Beispiele rund 200, damit Listen, Suche und Verwaltung wie in einem
// kleinen Verein aussehen. Ohne Zufall und ohne Bibliothek: feste Vornamen, kombiniert mit
// erkennbar erfundenen Nachnamen. Die Angaben sind gemischt (Rufname, Klassierung, Telefon, Jahrgang,
// einige ausgetreten) und bei jedem Lauf gleich; vorhandene Mitglieder bleiben, wie sie sind
// (DS-08: alles erfunden, Adressen nur unter example.org).
import { inArray } from 'drizzle-orm';
import type { Db } from '../src/lib/server/db/index.ts';
import { konto, mitglied } from '../src/lib/server/db/schema.ts';

type Werte = typeof mitglied.$inferInsert;

const VORNAMEN: [string, 'w' | 'm'][] = [
	['Anna', 'w'],
	['Beat', 'm'],
	['Carla', 'w'],
	['Dario', 'm'],
	['Elena', 'w'],
	['Fabio', 'm'],
	['Gina', 'w'],
	['Hugo', 'm'],
	['Ines', 'w'],
	['Jan', 'm'],
	['Kim', 'w'],
	['Luca', 'm'],
	['Mara', 'w'],
	['Nils', 'm'],
	['Olivia', 'w'],
	['Pius', 'm'],
	['Rita', 'w'],
	['Sven', 'm'],
	['Tanja', 'w'],
	['Viktor', 'm']
];
// Erkennbar erfunden, keiner wie bei den Personas und den Beispielen.
const NACHNAMEN = [
	'Fiktiv',
	'Ausgedacht',
	'Musterli',
	'Testfeld',
	'Probehof',
	'Skizzenberg',
	'Vorlagner',
	'Erdachtli',
	'Traumweg',
	'Beispielhof'
];
const RUFNAMEN = ['Housi', 'Mäxu', 'Sile', 'Röbi', 'Gabu', 'Lulu', 'Fritzli', 'Nici'];
const KLASSIERUNGEN = ['R9', 'R8', 'R7', 'R6', 'R5', 'R4', 'R3', 'R2', 'R1', 'N4', 'keine', null];
const ORTE: [string, string][] = [
	['4600', 'Olten'],
	['4632', 'Trimbach'],
	['4657', 'Dulliken'],
	['4614', 'Hägendorf'],
	['4652', 'Winznau']
];
export const ANZAHL_BEISPIEL_MITGLIEDER = 185;
const TAG_MS = 24 * 60 * 60 * 1000;

/** Die erfundenen Mitglieder des Testbestands; `jetzt` setzt das Austrittsdatum der Ausgetretenen. */
export function beispielMitglieder(jetzt: Date): Werte[] {
	return Array.from({ length: ANZAHL_BEISPIEL_MITGLIEDER }, (_, i) => {
		const [vorname, geschlecht] = VORNAMEN[i % VORNAMEN.length];
		const nachname = NACHNAMEN[Math.floor(i / VORNAMEN.length)];
		const [plz, ort] = ORTE[i % ORTE.length];
		const klassierung = KLASSIERUNGEN[i % KLASSIERUNGEN.length];
		const lizenziert = klassierung !== null && klassierung !== 'keine';
		// Jedes 23. ist ausgetreten (zählt in Listen nicht mehr als aktiv).
		const ausgetreten = i % 23 === 22;
		return {
			vorname,
			nachname,
			rufname: i % 15 === 7 ? RUFNAMEN[((i / 15) | 0) % RUFNAMEN.length] : null,
			email: `${vorname}.${nachname}@example.org`.toLowerCase(),
			strasse: `Erfundenweg ${i + 2}`,
			plz,
			ort,
			mitgliedernummer: String(2001 + i),
			geschlecht,
			jahrgang: 1946 + ((i * 7) % 64),
			klassierung,
			lizenznummer: lizenziert ? String(900001 + i) : null,
			// Format +41 00 …, das es nicht gibt (Testkonzept, Testdaten).
			telefon: i % 3 === 2 ? null : `+41 00 ${String(100 + i)} ${String(10 + ((i * 3) % 90))}`,
			...(ausgetreten
				? { status: 'ausgetreten' as const, austrittAm: new Date(jetzt.getTime() - 30 * TAG_MS) }
				: {})
		};
	});
}

/** Legt den Testbestand samt Konto an und gibt die Mitglied-IDs in derselben Reihenfolge. */
export async function legeBeispielMitgliederAn(db: Db, jetzt: Date): Promise<number[]> {
	const werte = beispielMitglieder(jetzt);
	// Wiedererkannt an der Mitgliedernummer: Sie bleibt, auch wenn jemand lokal die E-Mail ändert.
	// Ohne Ziel deckt das Auslassen beide eindeutigen Spalten ab (Nummer und E-Mail).
	await db.insert(mitglied).values(werte).onConflictDoNothing();
	const nummern = werte.map((w) => w.mitgliedernummer as string);
	const vorhanden = await db
		.select({ id: mitglied.id, nummer: mitglied.mitgliedernummer })
		.from(mitglied)
		.where(inArray(mitglied.mitgliedernummer, nummern));
	const idVon = new Map(vorhanden.map((m) => [m.nummer, m.id]));
	const ids = nummern.map((n) => {
		const id = idVon.get(n);
		if (id === undefined) throw new Error(`Testbestand: Mitgliedernummer ${n} ist schon vergeben`);
		return id;
	});
	await db
		.insert(konto)
		.values(ids.map((mitgliedId) => ({ mitgliedId })))
		.onConflictDoNothing({ target: konto.mitgliedId });
	return ids;
}
