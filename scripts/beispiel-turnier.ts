// Nur lokal (make seed): eine erfundene Clubmeisterschaft 2027 mit Kategorien, damit die
// Verwaltung beim Vorzeigen nicht leer ist (DS-08).
import { eq } from 'drizzle-orm';
import type { Db } from '../src/lib/server/db/index.ts';
import { turnier } from '../src/lib/server/db/schema.ts';
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

/** Legt die Beispiel-Clubmeisterschaft an; gibt es das Jahr 2027 schon, passiert nichts. */
export async function legeBeispielTurnierAn(db: Db, jetzt: Date): Promise<void> {
	const [vorhanden] = await db
		.select({ id: turnier.id })
		.from(turnier)
		.where(eq(turnier.jahr, JAHR));
	if (vorhanden) return;
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
}
