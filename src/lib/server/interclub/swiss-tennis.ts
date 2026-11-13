// Antworten von Swiss Tennis (Interclub) von Hand auf ihre Form prüfen, ohne Netz und Datenbank.
// Jede Prüfung gibt bei der kleinsten Abweichung null zurück, damit der Import nichts Halbes speichert.

export type Wettbewerb = 'ic' | 'jic';
export const WETTBEWERBE: readonly Wettbewerb[] = ['ic', 'jic'];

export type StTeam = { teamId: number; liga: string; gruppe: number; reihenfolge: number };
export type StBegegnung = {
	begegnungId: number;
	runde: number;
	datum: string; // 'YYYY-MM-DD'
	heim: string;
	gast: string;
	heimPunkte: number | null;
	gastPunkte: number | null;
};
export type StRang = {
	rang: number;
	teamName: string;
	stTeamId: number;
	punkte: number;
	saetze: string;
};
export type StSeite = { stTeamId: number; name: string; punkte: number | null; markiert: boolean };
export type StEntscheid = {
	begegnungId: number;
	art: 'aufstieg' | 'abstieg';
	runde: number;
	datum: string;
	zeit: string | null;
	heim: StSeite;
	gast: StSeite;
};
export type StTeamResultate = {
	teamName: string;
	begegnungen: StBegegnung[];
	rangliste: StRang[];
	entscheide: StEntscheid[];
};

type Objekt = Record<string, unknown>;

const istObjekt = (v: unknown): v is Objekt =>
	typeof v === 'object' && v !== null && !Array.isArray(v);
const istZahl = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const istText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

// Endstand: fehlt oder null heisst «noch offen», alles andere muss eine Zahl sein.
function endstand(v: unknown): number | null | undefined {
	if (v === undefined || v === null) return null;
	return istZahl(v) ? v : undefined;
}

// «DD.MM» bzw. «DD.MM - HH:MM» mit dem Jahr der Saison.
function datumZeit(roh: unknown, jahr: number): { datum: string; zeit: string | null } | null {
	if (typeof roh !== 'string') return null;
	const m = /^(\d{2})\.(\d{2})(?: - (\d{2}:\d{2}))?$/.exec(roh);
	if (!m) return null;
	const tag = Number(m[1]);
	const monat = Number(m[2]);
	if (monat < 1 || monat > 12 || tag < 1 || tag > 31) return null;
	return { datum: `${jahr}-${m[2]}-${m[1]}`, zeit: m[3] ?? null };
}

// Rundenzahl als Zahl oder als Zahl in Textform («3»).
function runde(v: unknown): number | null {
	const n = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
	return istZahl(n) && Number.isInteger(n) ? n : null;
}

export function pruefeClubTeams(json: unknown): StTeam[] | null {
	if (!istObjekt(json) || !Array.isArray(json.teams)) return null;
	const teams: StTeam[] = [];
	for (const t of json.teams) {
		if (!istObjekt(t) || !istObjekt(t.ligue) || !istObjekt(t.ligue.name)) return null;
		const liga = t.ligue.name.de;
		if (!istZahl(t.id) || !istText(liga) || !istZahl(t.group) || !istZahl(t.order)) return null;
		teams.push({ teamId: t.id, liga, gruppe: t.group, reihenfolge: t.order });
	}
	return teams;
}

function pruefeBegegnungen(roh: unknown, jahr: number): StBegegnung[] | null {
	if (!Array.isArray(roh)) return null;
	const liste: StBegegnung[] = [];
	for (const r of roh) {
		if (!istObjekt(r)) return null;
		const wann = datumZeit(r.date, jahr);
		const nr = runde(r.round);
		const heimPunkte = endstand(r.homeTeamScore);
		const gastPunkte = endstand(r.visitTeamScore);
		if (
			!wann ||
			nr === null ||
			!istZahl(r.encounterId) ||
			!istText(r.homeTeamName) ||
			!istText(r.visitTeamName) ||
			heimPunkte === undefined ||
			gastPunkte === undefined
		)
			return null;
		liste.push({
			begegnungId: r.encounterId,
			runde: nr,
			datum: wann.datum,
			heim: r.homeTeamName,
			gast: r.visitTeamName,
			heimPunkte,
			gastPunkte
		});
	}
	return liste;
}

function pruefeRangliste(roh: unknown): StRang[] | null {
	if (!Array.isArray(roh)) return null;
	const liste: StRang[] = [];
	for (const r of roh) {
		if (!istObjekt(r)) return null;
		if (
			!istZahl(r.rank) ||
			!istText(r.teamName) ||
			!istZahl(r.teamId) ||
			!istZahl(r.points) ||
			!istText(r.sets)
		)
			return null;
		liste.push({
			rang: r.rank,
			teamName: r.teamName,
			stTeamId: r.teamId,
			punkte: r.points,
			saetze: r.sets
		});
	}
	return liste;
}

// Ein führendes «* » ist eine Markierung von Swiss Tennis, nicht der Sieger: als eigenes Feld ablegen.
function pruefeSeite(roh: unknown): StSeite | null {
	if (!istObjekt(roh) || !istZahl(roh.id) || !istText(roh.name)) return null;
	const punkte = endstand(roh.score);
	if (punkte === undefined) return null;
	const markiert = roh.name.startsWith('* ');
	return {
		stTeamId: roh.id,
		name: markiert ? roh.name.slice(2).trim() : roh.name,
		punkte,
		markiert
	};
}

function pruefeEntscheide(roh: unknown, jahr: number): StEntscheid[] | null {
	if (roh === undefined || roh === null) return [];
	if (!istObjekt(roh) || typeof roh.isPromotion !== 'boolean' || !Array.isArray(roh.results))
		return null;
	const art = roh.isPromotion ? 'aufstieg' : 'abstieg';
	const liste: StEntscheid[] = [];
	for (const r of roh.results) {
		if (!istObjekt(r) || !istObjekt(r.team)) return null;
		const wann = datumZeit(r.date, jahr);
		const nr = runde(r.round);
		const heim = pruefeSeite(r.team.home);
		const gast = pruefeSeite(r.team.visitor);
		if (!wann || nr === null || !istZahl(r.encounterId) || !heim || !gast) return null;
		liste.push({
			begegnungId: r.encounterId,
			art,
			runde: nr,
			datum: wann.datum,
			zeit: wann.zeit,
			heim,
			gast
		});
	}
	return liste;
}

export function pruefeTeamResultate(json: unknown, jahr: number): StTeamResultate | null {
	if (!istObjekt(json) || !istObjekt(json.title) || !istText(json.title.de)) return null;
	const begegnungen = pruefeBegegnungen(json.results, jahr);
	const rangliste = pruefeRangliste(json.ranking);
	const entscheide = pruefeEntscheide(json.tableau, jahr);
	if (!begegnungen || !rangliste || !entscheide) return null;
	return { teamName: json.title.de, begegnungen, rangliste, entscheide };
}

// Für ein Jahr ohne Spielplan antwortet Swiss Tennis mit HTTP 500 und dem durchgereichten 404.
export function istNochNichtFreigeschaltet(status: number, json: unknown): boolean {
	return (
		status === 500 &&
		istObjekt(json) &&
		json.error === 'Java API error: Upstream responded with HTTP 404'
	);
}
