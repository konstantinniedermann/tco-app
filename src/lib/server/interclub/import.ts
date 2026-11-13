// Import der Interclub-Daten von Swiss Tennis: je Wettbewerb erst alles holen und prüfen, dann in
// einer Transaktion ersetzen. Bei jeder Abweichung bleibt der alte Stand unverändert.
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { icBegegnung, icEntscheid, icRang, icStand, icTeam } from '../db/schema.ts';
import {
	istNochNichtFreigeschaltet,
	pruefeClubTeams,
	pruefeTeamResultate,
	WETTBEWERBE,
	type StTeam,
	type StTeamResultate,
	type Wettbewerb
} from './swiss-tennis.ts';

export type ImportDienste = {
	db: Db;
	holen: (url: string) => Promise<Response>;
	jetzt: () => Date;
	pause: () => Promise<void>;
};
export type ImportWort = 'ok' | 'keine-teams' | 'form' | 'stoerung';

export const SWISS_TENNIS = 'https://low-scalability.microservices.swisstennis.ch/interclub';

type Abruf = { status: number; json: unknown } | null;

const eindeutig = (ids: number[]) => new Set(ids).size === ids.length;

export async function importiereSaison(
	d: ImportDienste,
	jahr: number,
	verein: number
): Promise<Record<Wettbewerb, ImportWort>> {
	let erste = true;
	// Zwischen zwei Abfragen an Swiss Tennis eine Pause, vor der ersten keine.
	async function abrufen(url: string): Promise<Abruf> {
		if (!erste) await d.pause();
		erste = false;
		try {
			const r = await d.holen(url);
			let json: unknown = null;
			try {
				json = await r.json();
			} catch {
				json = null;
			}
			return { status: r.status, json };
		} catch {
			return null;
		}
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

		const ergebnisse: { team: StTeam; daten: StTeamResultate }[] = [];
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
			ergebnisse.push({ team, daten });
		}

		try {
			await d.db.transaction(async (tx) => {
				await tx.delete(icTeam).where(and(eq(icTeam.saison, jahr), eq(icTeam.wettbewerb, w)));
				for (const { team, daten } of ergebnisse) {
					const schluessel = { saison: jahr, teamId: team.teamId };
					await tx.insert(icTeam).values({
						...schluessel,
						wettbewerb: w,
						teamName: daten.teamName,
						liga: team.liga,
						gruppe: team.gruppe,
						reihenfolge: team.reihenfolge
					});
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

	const wort = {} as Record<Wettbewerb, ImportWort>;
	for (const w of WETTBEWERBE) wort[w] = await wettbewerb(w);
	return wort;
}
