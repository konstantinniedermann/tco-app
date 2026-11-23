// Melden nach dem Abruf (#81 Teil 3b): Nach jedem Abruf bekommen Konten, die einem beteiligten
// TCO-Team folgen, einen Push je neuem Endstand mit Spielbericht. Erst eintragen, dann senden:
// scheitert der Versand, gibt es keinen zweiten Versuch. Der Text enthält keine Spielernamen
// (DS-05, DS-08). Die Funktion wirft nie und loggt nichts (DS-06).
import { and, asc, between, eq, inArray, isNotNull } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { heuteInZuerich, jahrInZuerich, plusTage } from '../datum.ts';
import {
	icBegegnung,
	icBericht,
	icEntscheid,
	icFolgen,
	icGemeldet,
	icTeam,
	konto,
	mitglied,
	pushAbo
} from '../db/schema.ts';
import { sendePush, type PushSender } from '../mitteilung/versand.ts';

const FRISCH_TAGE = 7;

export type MeldeDienste = { db: Db; push: PushSender | null; adresse: string; jetzt: () => Date };

type Kandidat = {
	begegnungId: number;
	datum: string;
	teamId: number;
	heim: string;
	gast: string;
	heimPunkte: number;
	gastPunkte: number;
};

/** Eine Begegnung kann in den Zeilen mehrerer TCO-Teams stehen (TCO gegen TCO). */
type Endstand = {
	begegnungId: number;
	datum: string;
	text: string;
	teamIds: number[];
};

async function ladeKandidaten(db: Db, saison: number, von: string, bis: string) {
	const gruppe = await db
		.select({
			begegnungId: icBegegnung.begegnungId,
			datum: icBegegnung.datum,
			teamId: icBegegnung.teamId,
			heim: icBegegnung.heim,
			gast: icBegegnung.gast,
			heimPunkte: icBegegnung.heimPunkte,
			gastPunkte: icBegegnung.gastPunkte
		})
		.from(icBegegnung)
		.innerJoin(
			icTeam,
			and(eq(icTeam.saison, icBegegnung.saison), eq(icTeam.teamId, icBegegnung.teamId))
		)
		.innerJoin(
			icBericht,
			and(
				eq(icBericht.saison, icBegegnung.saison),
				eq(icBericht.teamId, icBegegnung.teamId),
				eq(icBericht.begegnungId, icBegegnung.begegnungId)
			)
		)
		.where(
			and(
				eq(icBegegnung.saison, saison),
				between(icBegegnung.datum, von, bis),
				isNotNull(icBegegnung.heimPunkte),
				isNotNull(icBegegnung.gastPunkte)
			)
		);
	// Nur Zeilen, in denen das eigene Team spielt (Name wie bei Swiss Tennis).
	const teams = await db.select().from(icTeam).where(eq(icTeam.saison, saison));
	const name = new Map(teams.map((t) => [t.teamId, t.teamName]));
	const eigene = gruppe.filter(
		(b) => b.heim === name.get(b.teamId) || b.gast === name.get(b.teamId)
	);

	const entscheide = await db
		.select({
			begegnungId: icEntscheid.begegnungId,
			datum: icEntscheid.datum,
			teamId: icEntscheid.teamId,
			heimId: icEntscheid.heimId,
			gastId: icEntscheid.gastId,
			heim: icEntscheid.heimName,
			gast: icEntscheid.gastName,
			heimPunkte: icEntscheid.heimPunkte,
			gastPunkte: icEntscheid.gastPunkte
		})
		.from(icEntscheid)
		.innerJoin(
			icBericht,
			and(
				eq(icBericht.saison, icEntscheid.saison),
				eq(icBericht.teamId, icEntscheid.teamId),
				eq(icBericht.begegnungId, icEntscheid.begegnungId)
			)
		)
		.where(
			and(
				eq(icEntscheid.saison, saison),
				between(icEntscheid.datum, von, bis),
				isNotNull(icEntscheid.heimPunkte),
				isNotNull(icEntscheid.gastPunkte)
			)
		);
	const eigeneEntscheide = entscheide.filter((x) => x.heimId === x.teamId || x.gastId === x.teamId);

	const alle = [...eigene, ...eigeneEntscheide] as Kandidat[];
	const nachId = new Map<number, Endstand>();
	for (const k of alle) {
		const vorhanden = nachId.get(k.begegnungId);
		if (vorhanden) {
			if (!vorhanden.teamIds.includes(k.teamId)) vorhanden.teamIds.push(k.teamId);
			continue;
		}
		nachId.set(k.begegnungId, {
			begegnungId: k.begegnungId,
			datum: k.datum,
			text: `${k.heim} – ${k.gast} ${k.heimPunkte}:${k.gastPunkte}`,
			teamIds: [k.teamId]
		});
	}
	return { endstaende: [...nachId.values()], teams };
}

/**
 * Meldet neue Endstände der letzten 7 Tage an die Konten, die einem beteiligten Team folgen.
 * Gibt die Zahl der neu eingetragenen Begegnungen zurück (0 bei einem Fehler).
 */
export async function meldeEndstaende(d: MeldeDienste): Promise<number> {
	try {
		const jetzt = d.jetzt();
		const saison = jahrInZuerich(jetzt);
		const heute = heuteInZuerich(jetzt);
		const { endstaende, teams } = await ladeKandidaten(
			d.db,
			saison,
			plusTage(heute, -FRISCH_TAGE),
			heute
		);
		if (endstaende.length === 0) return 0;

		// Erst eintragen (eine Anweisung), nur die tatsächlich eingetragenen gelten als neu.
		const eingetragen = await d.db
			.insert(icGemeldet)
			.values(endstaende.map((s) => ({ saison, begegnungId: s.begegnungId, gemeldetAm: jetzt })))
			.onConflictDoNothing()
			.returning({ begegnungId: icGemeldet.begegnungId });
		const neu = new Set(eingetragen.map((g) => g.begegnungId));
		const neue = endstaende.filter((s) => neu.has(s.begegnungId));
		if (neue.length === 0 || d.push === null) return neu.size;

		const reihenfolge = new Map(teams.map((t) => [t.teamId, t.reihenfolge]));
		const liga = new Map(teams.map((t) => [t.teamId, t.liga]));
		const beteiligt = [...new Set(neue.flatMap((s) => s.teamIds))];
		const folgende = await d.db
			.select({ kontoId: icFolgen.kontoId, teamId: icFolgen.teamId })
			.from(icFolgen)
			.innerJoin(konto, eq(konto.id, icFolgen.kontoId))
			.innerJoin(mitglied, eq(mitglied.id, konto.mitgliedId))
			.where(
				and(
					inArray(icFolgen.teamId, beteiligt),
					eq(mitglied.status, 'aktiv'),
					eq(konto.gesperrt, false)
				)
			);
		const kontoIds = [...new Set(folgende.map((f) => f.kontoId))];
		if (kontoIds.length === 0) return neu.size;
		const abos = await d.db
			.select({
				kontoId: pushAbo.kontoId,
				endpunkt: pushAbo.endpunkt,
				p256dh: pushAbo.p256dh,
				auth: pushAbo.auth
			})
			.from(pushAbo)
			.where(inArray(pushAbo.kontoId, kontoIds))
			.orderBy(asc(pushAbo.endpunkt));

		const basis = d.adresse.replace(/\/+$/, '');
		const nachReihenfolge = (a: number, b: number) =>
			(reihenfolge.get(a) ?? 0) - (reihenfolge.get(b) ?? 0);
		const push = d.push;
		for (const kontoId of kontoIds) {
			const meineAbos = abos.filter((a) => a.kontoId === kontoId);
			if (meineAbos.length === 0) continue;
			const gefolgt = new Set(folgende.filter((f) => f.kontoId === kontoId).map((f) => f.teamId));
			// Je Endstand das gefolgte Team, das in der Übersicht zuerst kommt.
			const zeilen = neue
				.flatMap((s) => {
					const t = s.teamIds.filter((id) => gefolgt.has(id)).sort(nachReihenfolge)[0];
					return t === undefined ? [] : [{ s, teamId: t }];
				})
				.sort((a, b) => a.s.datum.localeCompare(b.s.datum) || nachReihenfolge(a.teamId, b.teamId));
			if (zeilen.length === 0) continue;
			const text = zeilen.map((z) => `${liga.get(z.teamId)}: ${z.s.text}`).join('\n');
			const pfad =
				zeilen.length === 1
					? `/interclub/${zeilen[0].teamId}/${zeilen[0].s.begegnungId}`
					: '/interclub';
			const nutzlast = JSON.stringify({ titel: 'Interclub', text, link: basis + pfad });
			await Promise.all(
				meineAbos.map((a) =>
					sendePush(d.db, push, { endpunkt: a.endpunkt, p256dh: a.p256dh, auth: a.auth }, nutzlast)
				)
			);
		}
		return neu.size;
	} catch {
		return 0;
	}
}
