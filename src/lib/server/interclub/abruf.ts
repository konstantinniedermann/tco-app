// Regelmässiger Interclub-Abruf (#81 Teil 3a): Der Zeitgeber ruft `fuehreAbrufAus` jede Stunde;
// welche Paare aus Saison und Wettbewerb dran sind, entscheidet `istFaellig`. Jeder Versuch wird
// in `ic_abruf` gemerkt. Logs nur mit festen Texten (DS-06).
import { and, between, eq } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { heuteInZuerich, jahrInZuerich, plusTage } from '../datum.ts';
import { icAbruf, icBegegnung, icBericht, icEntscheid, icStand, icTeam } from '../db/schema.ts';
import { ERSTE_SAISON, istFaellig, type Lage } from './faellig.ts';
import { importiereSaison, type ImportDienste } from './import.ts';
import type { Wettbewerb } from './swiss-tennis.ts';

const FRISCH_TAGE = 7;

/** Lage für `istFaellig`: Versuche, gelungene Importe und die Wettbewerbe mit frischem Spiel. */
export async function ladeLage(db: Db, jetzt: Date, ab = ERSTE_SAISON): Promise<Lage> {
	const jahr = jahrInZuerich(jetzt);
	const heute = heuteInZuerich(jetzt);
	const von = plusTage(heute, -FRISCH_TAGE);

	const versuche = await db.select().from(icAbruf);
	const vorhanden = await db
		.select({ saison: icStand.saison, wettbewerb: icStand.wettbewerb })
		.from(icStand);

	const teams = await db.select().from(icTeam).where(eq(icTeam.saison, jahr));
	const begegnungen = await db
		.select()
		.from(icBegegnung)
		.where(and(eq(icBegegnung.saison, jahr), between(icBegegnung.datum, von, heute)));
	const entscheide = await db
		.select()
		.from(icEntscheid)
		.where(and(eq(icEntscheid.saison, jahr), between(icEntscheid.datum, von, heute)));
	const berichte = new Set(
		(
			await db
				.select({ teamId: icBericht.teamId, begegnungId: icBericht.begegnungId })
				.from(icBericht)
				.where(eq(icBericht.saison, jahr))
		).map((b) => `${b.teamId}-${b.begegnungId}`)
	);
	const offen = (teamId: number, begegnungId: number, a: number | null, b: number | null) =>
		a === null || b === null || !berichte.has(`${teamId}-${begegnungId}`);

	const frisch = new Set<Wettbewerb>();
	for (const t of teams) {
		const eigeneGruppe = begegnungen.some(
			(b) =>
				b.teamId === t.teamId &&
				(b.heim === t.teamName || b.gast === t.teamName) &&
				offen(t.teamId, b.begegnungId, b.heimPunkte, b.gastPunkte)
		);
		const eigenerEntscheid = entscheide.some(
			(e) =>
				e.teamId === t.teamId &&
				(e.heimId === t.teamId || e.gastId === t.teamId) &&
				offen(t.teamId, e.begegnungId, e.heimPunkte, e.gastPunkte)
		);
		if (eigeneGruppe || eigenerEntscheid) frisch.add(t.wettbewerb);
	}

	return { jetzt, versuche, vorhanden, frisch: [...frisch].sort(), ab };
}

// Ein Lauf zur Zeit in diesem Prozess: Ein Schlag, der einen laufenden Abruf trifft, tut nichts.
let laeuft = false;

/** Holt, was fällig ist, und merkt jeden Versuch. Wirft nicht wegen Störungen bei Swiss Tennis. */
export async function fuehreAbrufAus(
	d: ImportDienste,
	verein: number,
	o: { ab?: number } = {}
): Promise<void> {
	if (laeuft) return;
	laeuft = true;
	try {
		const auftraege = istFaellig(await ladeLage(d.db, d.jetzt(), o.ab));
		for (const a of auftraege) {
			const worte = await importiereSaison(d, a.saison, verein, {
				nur: a.wettbewerb,
				berichte: a.berichte
			});
			const wort = worte[a.wettbewerb] ?? 'stoerung';
			const versuchtAm = d.jetzt();
			await d.db
				.insert(icAbruf)
				.values({ saison: a.saison, wettbewerb: a.wettbewerb, versuchtAm, wort })
				.onConflictDoUpdate({
					target: [icAbruf.saison, icAbruf.wettbewerb],
					set: { versuchtAm, wort }
				});
			if (wort === 'stoerung') console.error('Interclub-Abruf gestört');
			if (wort === 'form') console.error('Interclub-Abruf: Form unerwartet');
		}
	} finally {
		laeuft = false;
	}
}
