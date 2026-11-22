// Import der Interclub-Daten von Swiss Tennis: je Wettbewerb erst alles holen und prüfen, dann in
// einer Transaktion ersetzen. Bei jeder Abweichung bleibt der alte Stand unverändert. Gespeicherte
// Spielberichte bleiben, wenn sie nicht neu geholt werden (regelmässiger Abruf, #81 Teil 3a).
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { heuteInZuerich, plusTage } from '../datum.ts';
import {
	icBegegnung,
	icBericht,
	icEntscheid,
	icPartie,
	icRang,
	icSpieler,
	icStand,
	icTeam
} from '../db/schema.ts';
import {
	istNochNichtFreigeschaltet,
	pruefeBericht,
	pruefeClubTeams,
	pruefeTeamResultate,
	WETTBEWERBE,
	type StBericht,
	type StTeam,
	type StTeamResultate,
	type Wettbewerb
} from './swiss-tennis.ts';

export type ImportDienste = {
	db: Db;
	holen: (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;
	jetzt: () => Date;
	pause: () => Promise<void>;
	/** Zeitgrenze je Abfrage in ms (Vorgabe `ZEITGRENZE`). */
	zeitgrenze?: number;
};
export type ImportWort = 'ok' | 'keine-teams' | 'form' | 'stoerung';

/**
 * Welche Spielberichte geholt werden: `alle` (volle Neuladung, `make ic-import`), `fehlende` (nur
 * Begegnungen ohne gespeicherten Bericht), `frische` (fehlende der letzten 7 Tage, Stundenlauf).
 */
export type Berichte = 'alle' | 'fehlende' | 'frische';

export const ZEITGRENZE = 15_000;
const FRISCH_TAGE = 7;
// Sperrschloss der Schreib-Transaktion: Zeitgeber und `make ic-import` schreiben nie zugleich.
const SPERRE_INTERCLUB = 4303;

const SWISS_TENNIS = 'https://low-scalability.microservices.swisstennis.ch/interclub';

type Abruf = { status: number; json: unknown } | null;
type Gespeichert = {
	bericht: typeof icBericht.$inferSelect;
	partien: (typeof icPartie.$inferSelect)[];
	spieler: (typeof icSpieler.$inferSelect)[];
};

const eindeutig = (ids: number[]) => new Set(ids).size === ids.length;
const schluessel = (teamId: number, begegnungId: number) => `${teamId}-${begegnungId}`;

export async function importiereSaison(
	d: ImportDienste,
	jahr: number,
	verein: number,
	o: { nur?: Wettbewerb; berichte?: Berichte } = {}
): Promise<Partial<Record<Wettbewerb, ImportWort>>> {
	const modus = o.berichte ?? 'alle';
	const heute = heuteInZuerich(d.jetzt());
	const frischAb = plusTage(heute, -FRISCH_TAGE);
	let erste = true;
	// Zwischen zwei Abfragen an Swiss Tennis eine Pause, vor der ersten keine.
	async function abrufen(url: string): Promise<Abruf> {
		if (!erste) await d.pause();
		erste = false;
		try {
			const r = await d.holen(url, {
				signal: AbortSignal.timeout(d.zeitgrenze ?? ZEITGRENZE)
			});
			// Unlesbarer Körper: undefined, nie null. `null` heisst bei einem Spielbericht «fehlt noch»;
			// eine HTML-Fehlerseite darf keinen gespeicherten Bericht still löschen.
			let json: unknown = undefined;
			try {
				json = await r.json();
			} catch {
				json = undefined;
			}
			return { status: r.status, json };
		} catch {
			return null;
		}
	}

	// Schlüssel (Team, Begegnung) der gespeicherten Berichte dieser Saison.
	async function gespeicherteSchluessel(teamIds: number[]): Promise<Set<string>> {
		if (teamIds.length === 0) return new Set();
		const z = await d.db
			.select({ teamId: icBericht.teamId, begegnungId: icBericht.begegnungId })
			.from(icBericht)
			.where(and(eq(icBericht.saison, jahr), inArray(icBericht.teamId, teamIds)));
		return new Set(z.map((r) => schluessel(r.teamId, r.begegnungId)));
	}

	async function wettbewerb(w: Wettbewerb): Promise<ImportWort> {
		const liste = await abrufen(
			`${SWISS_TENNIS}/club-teams?clubId=${verein}&competition=${w}&year=${jahr}&lang=de`
		);
		if (!liste) return 'stoerung';
		if (istNochNichtFreigeschaltet(liste.status, liste.json)) return 'keine-teams';
		if (liste.status !== 200) return 'stoerung';
		const teams = pruefeClubTeams(liste.json);
		if (!teams || !eindeutig(teams.map((t) => t.teamId))) return 'form';
		if (teams.length === 0) return 'keine-teams';

		const vorhanden = await gespeicherteSchluessel(teams.map((t) => t.teamId));
		const ergebnisse: {
			team: StTeam;
			daten: StTeamResultate;
			berichte: { begegnungId: number; bericht: StBericht }[];
		}[] = [];
		for (const team of teams) {
			const a = await abrufen(
				`${SWISS_TENNIS}/team-results?teamId=${team.teamId}&competition=${w}&year=${jahr}&lang=de`
			);
			if (!a || a.status !== 200) return 'stoerung';
			const daten = pruefeTeamResultate(a.json, jahr);
			if (
				!daten ||
				!eindeutig(daten.begegnungen.map((b) => b.begegnungId)) ||
				!eindeutig(daten.rangliste.map((r) => r.stTeamId)) ||
				!eindeutig(daten.entscheide.map((e) => e.begegnungId))
			)
				return 'form';

			// Spielberichte der eigenen, gespielten Begegnungen: Gruppe über `encounter-results`,
			// Auf-/Abstieg über `tableau-results`. Ohne Bericht (null) bleibt die Begegnung ohne Partien.
			const gespielt = (a: number | null, b: number | null) => a !== null && b !== null;
			const holen = (begegnungId: number, datum: string) => {
				if (modus === 'alle') return true;
				if (vorhanden.has(schluessel(team.teamId, begegnungId))) return false;
				return modus === 'fehlende' || (datum >= frischAb && datum <= heute);
			};
			const abfragen = [
				...daten.begegnungen
					.filter(
						(b) =>
							(b.heim === daten.teamName || b.gast === daten.teamName) &&
							gespielt(b.heimPunkte, b.gastPunkte) &&
							holen(b.begegnungId, b.datum)
					)
					.map((b) => ({ begegnungId: b.begegnungId, pfad: 'encounter-results' })),
				...daten.entscheide
					.filter(
						(e) =>
							(e.heim.stTeamId === team.teamId || e.gast.stTeamId === team.teamId) &&
							gespielt(e.heim.punkte, e.gast.punkte) &&
							holen(e.begegnungId, e.datum)
					)
					.map((e) => ({ begegnungId: e.begegnungId, pfad: 'tableau-results' }))
			];
			const berichte: { begegnungId: number; bericht: StBericht }[] = [];
			for (const { begegnungId, pfad } of abfragen) {
				const b = await abrufen(
					`${SWISS_TENNIS}/${pfad}?encounterId=${begegnungId}&competition=${w}&year=${jahr}&lang=de`
				);
				if (!b || b.status !== 200) return 'stoerung';
				const bericht = pruefeBericht(b.json, verein);
				if (bericht === null) return 'form';
				if (bericht !== 'fehlt') berichte.push({ begegnungId, bericht });
			}
			ergebnisse.push({ team, daten, berichte });
		}

		try {
			await d.db.transaction(async (tx) => {
				await tx.execute(sql`select pg_advisory_xact_lock(${SPERRE_INTERCLUB})`);
				const behalten = await alteBerichte(tx, jahr, ergebnisse);
				await tx.delete(icTeam).where(and(eq(icTeam.saison, jahr), eq(icTeam.wettbewerb, w)));
				for (const { team, daten, berichte } of ergebnisse) {
					const schluessel = { saison: jahr, teamId: team.teamId };
					await tx.insert(icTeam).values({
						...schluessel,
						wettbewerb: w,
						teamName: daten.teamName,
						liga: team.liga,
						gruppe: team.gruppe,
						reihenfolge: team.reihenfolge
					});
					for (const { begegnungId, bericht } of berichte) {
						const b = { ...schluessel, begegnungId };
						await tx.insert(icBericht).values({
							...b,
							tcoHeim: bericht.tcoHeim,
							tcoSaetze: bericht.saetze.tco,
							gegnerSaetze: bericht.saetze.gegner,
							tcoGames: bericht.games.tco,
							gegnerGames: bericht.games.gegner
						});
						if (!bericht.partien.length) continue;
						await tx.insert(icPartie).values(
							bericht.partien.map((p) => ({
								...b,
								art: p.art,
								position: p.position,
								saetze: p.saetze,
								aufgabe: p.aufgabe
							}))
						);
						const spieler = bericht.partien.flatMap((p) => [
							...p.spieler.map((s, i) => ({
								...b,
								art: p.art,
								position: p.position,
								seite: 'tco' as const,
								nr: i + 1,
								...s
							})),
							...p.gegner.map((s, i) => ({
								...b,
								art: p.art,
								position: p.position,
								seite: 'gegner' as const,
								nr: i + 1,
								...s
							}))
						]);
						if (spieler.length) await tx.insert(icSpieler).values(spieler);
					}
					if (daten.begegnungen.length)
						await tx
							.insert(icBegegnung)
							.values(daten.begegnungen.map((b) => ({ ...schluessel, ...b })));
					if (daten.rangliste.length)
						await tx.insert(icRang).values(daten.rangliste.map((r) => ({ ...schluessel, ...r })));
					if (daten.entscheide.length)
						await tx.insert(icEntscheid).values(
							daten.entscheide.map((e) => ({
								...schluessel,
								begegnungId: e.begegnungId,
								art: e.art,
								runde: e.runde,
								datum: e.datum,
								zeit: e.zeit,
								heimId: e.heim.stTeamId,
								heimName: e.heim.name,
								heimPunkte: e.heim.punkte,
								heimMarkiert: e.heim.markiert,
								gastId: e.gast.stTeamId,
								gastName: e.gast.name,
								gastPunkte: e.gast.punkte,
								gastMarkiert: e.gast.markiert
							}))
						);
				}
				await setzeAlteBerichteEin(tx, behalten);
				const abgerufenAm = d.jetzt();
				await tx
					.insert(icStand)
					.values({ saison: jahr, wettbewerb: w, abgerufenAm })
					.onConflictDoUpdate({
						target: [icStand.saison, icStand.wettbewerb],
						set: { abgerufenAm }
					});
			});
		} catch {
			return 'stoerung';
		}
		return 'ok';
	}

	const wort: Partial<Record<Wettbewerb, ImportWort>> = {};
	for (const w of WETTBEWERBE) if (!o.nur || o.nur === w) wort[w] = await wettbewerb(w);
	return wort;
}

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

// Gespeicherte Berichte, die nicht neu geholt wurden und deren Begegnung im neuen Stand noch beim
// selben Team vorkommt: vor dem Löschen lesen, danach wieder einsetzen.
async function alteBerichte(
	tx: Tx,
	jahr: number,
	ergebnisse: {
		team: StTeam;
		daten: StTeamResultate;
		berichte: { begegnungId: number }[];
	}[]
): Promise<Gespeichert[]> {
	const bleiben = new Set<string>();
	for (const { team, daten, berichte } of ergebnisse) {
		const neu = new Set(berichte.map((b) => b.begegnungId));
		for (const id of [
			...daten.begegnungen.map((b) => b.begegnungId),
			...daten.entscheide.map((e) => e.begegnungId)
		])
			if (!neu.has(id)) bleiben.add(schluessel(team.teamId, id));
	}
	const teamIds = ergebnisse.map((e) => e.team.teamId);
	if (bleiben.size === 0 || teamIds.length === 0) return [];
	const wo = <T extends typeof icBericht | typeof icPartie | typeof icSpieler>(t: T) =>
		and(eq(t.saison, jahr), inArray(t.teamId, teamIds));
	const berichte = (await tx.select().from(icBericht).where(wo(icBericht))).filter((b) =>
		bleiben.has(schluessel(b.teamId, b.begegnungId))
	);
	if (berichte.length === 0) return [];
	const partien = await tx.select().from(icPartie).where(wo(icPartie));
	const spieler = await tx.select().from(icSpieler).where(wo(icSpieler));
	const gleich = (a: { teamId: number; begegnungId: number }, b: typeof a) =>
		a.teamId === b.teamId && a.begegnungId === b.begegnungId;
	return berichte.map((bericht) => ({
		bericht,
		partien: partien.filter((p) => gleich(p, bericht)),
		spieler: spieler.filter((s) => gleich(s, bericht))
	}));
}

async function setzeAlteBerichteEin(tx: Tx, alte: Gespeichert[]): Promise<void> {
	for (const { bericht, partien, spieler } of alte) {
		await tx.insert(icBericht).values(bericht);
		if (partien.length) await tx.insert(icPartie).values(partien);
		if (spieler.length) await tx.insert(icSpieler).values(spieler);
	}
}
