// Fachlogik der Interclub-Ansicht: liest die eingespielten Daten und bereitet sie für Übersicht und
// Team-Seite auf. Kennt kein HTTP; die Zeit kommt als Parameter.
import { and, asc, desc, eq, inArray, max } from 'drizzle-orm';
import { utcZuZuerich } from '../../anlass/zeit.ts';
import type { Db } from '../db/index.ts';
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

export type IcErgebnis = 'sieg' | 'niederlage' | 'unentschieden' | null; // null = noch offen
export type IcArt = 'gruppe' | 'aufstieg' | 'abstieg';
export type IcSpiel = {
	teamId: number;
	begegnungId: number;
	liga: string;
	art: IcArt;
	runde: number;
	datum: string;
	zeit: string | null;
	heim: string;
	gast: string;
	heimPunkte: number | null;
	gastPunkte: number | null;
	eigen: boolean;
	tcoHeim: boolean;
	ergebnis: IcErgebnis;
};
export type IcKachel = {
	teamId: number;
	liga: string;
	teamName: string;
	rang: number | null;
	von: number;
	entscheid: 'aufstieg' | 'abstieg' | null;
};
export type IcUebersicht = {
	saison: number;
	stand: Date;
	abgeschlossen: boolean;
	letzte: IcSpiel[];
	naechste: IcSpiel[];
	aktive: IcKachel[] | null; // null = «Spielplan <Jahr> noch nicht da»
	junioren: IcKachel[] | null;
};
export type IcRangZeile = {
	rang: number;
	teamName: string;
	partienGewonnen: number;
	partienVerloren: number;
	saetze: string; // '31:27'
	eigen: boolean;
};
export type IcTeam = {
	saison: number;
	teamId: number;
	liga: string;
	teamName: string;
	gruppe: number;
	stand: Date;
	spiele: IcSpiel[];
	rangliste: IcRangZeile[];
	entscheide: { art: 'aufstieg' | 'abstieg'; spiele: IcSpiel[] } | null;
};

type TeamZeile = typeof icTeam.$inferSelect;

export async function hatInterclub(db: Db): Promise<boolean> {
	const z = await db.select({ saison: icTeam.saison }).from(icTeam).limit(1);
	return z.length > 0;
}

function ergebnisAusSicht(
	eigen: boolean,
	tcoHeim: boolean,
	heim: number | null,
	gast: number | null
): IcErgebnis {
	if (!eigen || heim === null || gast === null) return null;
	const wir = tcoHeim ? heim : gast;
	const sie = tcoHeim ? gast : heim;
	return wir > sie ? 'sieg' : wir < sie ? 'niederlage' : 'unentschieden';
}

function gruppenSpiel(
	team: TeamZeile,
	b: {
		begegnungId: number;
		runde: number;
		datum: string;
		heim: string;
		gast: string;
		heimPunkte: number | null;
		gastPunkte: number | null;
	}
): IcSpiel {
	// Eigen heisst: der Name dieses Teams steht in der Begegnung, nie «beginnt mit Olten».
	const tcoHeim = b.heim === team.teamName;
	const eigen = tcoHeim || b.gast === team.teamName;
	return {
		teamId: team.teamId,
		begegnungId: b.begegnungId,
		liga: team.liga,
		art: 'gruppe',
		runde: b.runde,
		datum: b.datum,
		zeit: null,
		heim: b.heim,
		gast: b.gast,
		heimPunkte: b.heimPunkte,
		gastPunkte: b.gastPunkte,
		eigen,
		tcoHeim,
		ergebnis: ergebnisAusSicht(eigen, tcoHeim, b.heimPunkte, b.gastPunkte)
	};
}

function entscheidSpiel(team: TeamZeile, e: typeof icEntscheid.$inferSelect): IcSpiel {
	const tcoHeim = e.heimId === team.teamId;
	const eigen = tcoHeim || e.gastId === team.teamId;
	return {
		teamId: team.teamId,
		begegnungId: e.begegnungId,
		liga: team.liga,
		art: e.art,
		runde: e.runde,
		datum: e.datum,
		zeit: e.zeit,
		heim: e.heimName,
		gast: e.gastName,
		heimPunkte: e.heimPunkte,
		gastPunkte: e.gastPunkte,
		eigen,
		tcoHeim,
		ergebnis: ergebnisAusSicht(eigen, tcoHeim, e.heimPunkte, e.gastPunkte)
	};
}

const reihenfolge = (a: IcSpiel, b: IcSpiel) =>
	a.datum.localeCompare(b.datum) ||
	(a.zeit ?? '').localeCompare(b.zeit ?? '') ||
	a.teamId - b.teamId ||
	a.runde - b.runde;

function plusTage(iso: string, tage: number): string {
	const [j, m, t] = iso.split('-').map(Number);
	return new Date(Date.UTC(j, m - 1, t + tage)).toISOString().slice(0, 10);
}

async function standVon(db: Db, saison: number, wettbewerbe?: ('ic' | 'jic')[]): Promise<Date> {
	const wo = wettbewerbe
		? and(eq(icStand.saison, saison), inArray(icStand.wettbewerb, wettbewerbe))
		: eq(icStand.saison, saison);
	const [z] = await db
		.select({ am: max(icStand.abgerufenAm) })
		.from(icStand)
		.where(wo);
	return z?.am ?? new Date(0);
}

export async function ladeUebersicht(db: Db, jetzt: Date): Promise<IcUebersicht | null> {
	const [neueste] = await db.select({ saison: max(icTeam.saison) }).from(icTeam);
	const saison = neueste?.saison;
	if (saison === null || saison === undefined) return null;

	const teams = await db
		.select()
		.from(icTeam)
		.where(eq(icTeam.saison, saison))
		.orderBy(asc(icTeam.reihenfolge), asc(icTeam.teamId));
	const begegnungen = await db.select().from(icBegegnung).where(eq(icBegegnung.saison, saison));
	const entscheide = await db.select().from(icEntscheid).where(eq(icEntscheid.saison, saison));
	const raenge = await db
		.select({ teamId: icRang.teamId, stTeamId: icRang.stTeamId, rang: icRang.rang })
		.from(icRang)
		.where(eq(icRang.saison, saison));

	const spiele: IcSpiel[] = [];
	for (const team of teams) {
		for (const b of begegnungen) if (b.teamId === team.teamId) spiele.push(gruppenSpiel(team, b));
		for (const e of entscheide) if (e.teamId === team.teamId) spiele.push(entscheidSpiel(team, e));
	}
	const eigene = spiele.filter((s) => s.eigen);

	const heute = utcZuZuerich(jetzt).slice(0, 10);
	const vor = plusTage(heute, -6);
	const bis = plusTage(heute, 6);
	const letzte = eigene
		.filter((s) => s.ergebnis !== null && s.datum >= vor && s.datum <= heute)
		.sort((a, b) => reihenfolge(b, a));
	const naechste = eigene
		.filter((s) => s.ergebnis === null && s.datum >= heute && s.datum <= bis)
		.sort(reihenfolge);
	const abgeschlossen =
		eigene.length > 0 &&
		letzte.length === 0 &&
		naechste.length === 0 &&
		eigene.every((s) => s.ergebnis !== null);

	const kachel = (team: TeamZeile): IcKachel => {
		const gruppe = raenge.filter((r) => r.teamId === team.teamId);
		return {
			teamId: team.teamId,
			liga: team.liga,
			teamName: team.teamName,
			rang: gruppe.find((r) => r.stTeamId === team.teamId)?.rang ?? null,
			von: gruppe.length,
			entscheid: entscheide.find((e) => e.teamId === team.teamId)?.art ?? null
		};
	};
	const kacheln = (w: 'ic' | 'jic') => {
		const t = teams.filter((x) => x.wettbewerb === w);
		return t.length ? t.map(kachel) : null;
	};

	return {
		saison,
		stand: await standVon(db, saison),
		abgeschlossen,
		letzte,
		naechste,
		aktive: kacheln('ic'),
		junioren: kacheln('jic')
	};
}

export async function ladeTeam(db: Db, teamId: number): Promise<IcTeam | null> {
	// Die neueste Saison, in der es dieses Team gibt.
	const [team] = await db
		.select()
		.from(icTeam)
		.where(eq(icTeam.teamId, teamId))
		.orderBy(desc(icTeam.saison))
		.limit(1);
	if (!team) return null;
	const schluessel = and(eq(icBegegnung.saison, team.saison), eq(icBegegnung.teamId, teamId));

	const begegnungen = await db.select().from(icBegegnung).where(schluessel);
	const entscheide = await db
		.select()
		.from(icEntscheid)
		.where(and(eq(icEntscheid.saison, team.saison), eq(icEntscheid.teamId, teamId)));
	const raenge = await db
		.select()
		.from(icRang)
		.where(and(eq(icRang.saison, team.saison), eq(icRang.teamId, teamId)))
		.orderBy(asc(icRang.rang));

	// Partien: gewonnene und verlorene Einzelpartien aus den Endständen der Gruppenbegegnungen.
	const partien = new Map<string, { gewonnen: number; verloren: number }>();
	const zaehle = (name: string, fuer: number, gegen: number) => {
		const p = partien.get(name) ?? { gewonnen: 0, verloren: 0 };
		p.gewonnen += fuer;
		p.verloren += gegen;
		partien.set(name, p);
	};
	for (const b of begegnungen) {
		if (b.heimPunkte === null || b.gastPunkte === null) continue;
		zaehle(b.heim, b.heimPunkte, b.gastPunkte);
		zaehle(b.gast, b.gastPunkte, b.heimPunkte);
	}

	const spiele = begegnungen
		.map((b) => gruppenSpiel(team, b))
		.sort((a, b) => a.runde - b.runde || reihenfolge(a, b));
	const entscheidSpiele = entscheide
		.map((e) => entscheidSpiel(team, e))
		.sort((a, b) => a.runde - b.runde || reihenfolge(a, b));

	return {
		saison: team.saison,
		teamId,
		liga: team.liga,
		teamName: team.teamName,
		gruppe: team.gruppe,
		stand: await standVon(db, team.saison, [team.wettbewerb]),
		spiele,
		rangliste: raenge.map((r) => ({
			rang: r.rang,
			teamName: r.teamName,
			partienGewonnen: partien.get(r.teamName)?.gewonnen ?? 0,
			partienVerloren: partien.get(r.teamName)?.verloren ?? 0,
			saetze: r.saetze.replace(/\s*-\s*/, ':'),
			eigen: r.stTeamId === teamId
		})),
		entscheide: entscheide.length ? { art: entscheide[0].art, spiele: entscheidSpiele } : null
	};
}

export type IcPartie = {
	position: number;
	spieler: { name: string; klassierung: string }[]; // nur TCO-Spieler
	saetze: string[]; // aus Sicht des TCO
	ergebnis: 'sieg' | 'niederlage' | null; // null = weder Aufgabe noch Satzmehrheit
	aufgabe: 'tco' | 'gegner' | null;
};
export type IcBegegnung = {
	saison: number;
	teamId: number;
	liga: string;
	spiel: IcSpiel;
	gegner: string;
	saetze: { tco: number; gegner: number } | null; // null = kein Bericht
	partien: { einzel: IcPartie[]; doppel: IcPartie[] } | null; // null = noch keine Einzelpartien
};

// Wer gewonnen hat: Bei einer Aufgabe die andere Seite, sonst die Mehrheit der Sätze.
function partieErgebnis(saetze: string[], aufgabe: 'tco' | 'gegner' | null): IcPartie['ergebnis'] {
	if (aufgabe) return aufgabe === 'gegner' ? 'sieg' : 'niederlage';
	let wir = 0;
	let sie = 0;
	for (const s of saetze) {
		const [a, b] = s.split(':').map(Number);
		if (a > b) wir++;
		else if (b > a) sie++;
	}
	return wir > sie ? 'sieg' : sie > wir ? 'niederlage' : null;
}

/** Eine eigene Begegnung (Gruppe oder Auf-/Abstieg) der neuesten Saison des Teams; sonst null. */
export async function ladeBegegnung(
	db: Db,
	teamId: number,
	begegnungId: number
): Promise<IcBegegnung | null> {
	const [team] = await db
		.select()
		.from(icTeam)
		.where(eq(icTeam.teamId, teamId))
		.orderBy(desc(icTeam.saison))
		.limit(1);
	if (!team) return null;
	const saison = team.saison;

	const [gruppe] = await db
		.select()
		.from(icBegegnung)
		.where(
			and(
				eq(icBegegnung.saison, saison),
				eq(icBegegnung.teamId, teamId),
				eq(icBegegnung.begegnungId, begegnungId)
			)
		);
	const [entscheid] = gruppe
		? []
		: await db
				.select()
				.from(icEntscheid)
				.where(
					and(
						eq(icEntscheid.saison, saison),
						eq(icEntscheid.teamId, teamId),
						eq(icEntscheid.begegnungId, begegnungId)
					)
				);
	const spiel = gruppe
		? gruppenSpiel(team, gruppe)
		: entscheid
			? entscheidSpiel(team, entscheid)
			: null;
	if (!spiel || !spiel.eigen) return null;

	const schluessel = { saison, teamId, begegnungId };
	const wo = <T extends typeof icBericht | typeof icPartie | typeof icSpieler>(t: T) =>
		and(
			eq(t.saison, schluessel.saison),
			eq(t.teamId, schluessel.teamId),
			eq(t.begegnungId, schluessel.begegnungId)
		);
	const [bericht] = await db.select().from(icBericht).where(wo(icBericht));
	const kopf = {
		saison,
		teamId,
		liga: team.liga,
		spiel,
		gegner: spiel.tcoHeim ? spiel.gast : spiel.heim
	};
	if (!bericht) return { ...kopf, saetze: null, partien: null };

	const partien = await db
		.select()
		.from(icPartie)
		.where(wo(icPartie))
		.orderBy(asc(icPartie.position));
	const spieler = await db
		.select({
			art: icSpieler.art,
			position: icSpieler.position,
			name: icSpieler.name,
			klassierung: icSpieler.klassierung
		})
		.from(icSpieler)
		.where(wo(icSpieler))
		.orderBy(asc(icSpieler.nr));
	const partie = (p: typeof icPartie.$inferSelect): IcPartie => ({
		position: p.position,
		spieler: spieler
			.filter((s) => s.art === p.art && s.position === p.position)
			.map((s) => ({ name: s.name, klassierung: s.klassierung })),
		saetze: p.saetze,
		ergebnis: partieErgebnis(p.saetze, p.aufgabe),
		aufgabe: p.aufgabe
	});
	return {
		...kopf,
		saetze: { tco: bericht.tcoSaetze, gegner: bericht.gegnerSaetze },
		partien: {
			einzel: partien.filter((p) => p.art === 'einzel').map(partie),
			doppel: partien.filter((p) => p.art === 'doppel').map(partie)
		}
	};
}
