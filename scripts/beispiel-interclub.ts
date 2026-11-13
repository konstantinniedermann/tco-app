// Beispieldaten für den Interclub-Import: Antworten von Swiss Tennis (Saison 2026) aus Dateien,
// ohne Netz. Gilt für jedes angefragte Jahr; nur Wettbewerbe der Liste antworten wie «Spielplan noch nicht da».
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { erstelleDb, type Db } from '../src/lib/server/db/index.ts';
import { importiereSaison } from '../src/lib/server/interclub/import.ts';
import type { Wettbewerb } from '../src/lib/server/interclub/swiss-tennis.ts';

const ORDNER = join(dirname(fileURLToPath(import.meta.url)), 'beispiel-interclub', '2026');

const antwort = (status: number, koerper: string) =>
	new Response(koerper, { status, headers: { 'content-type': 'application/json' } });

// Nummern der Auf-/Abstiegsspiele: Für sie antwortet `encounter-results` mit null, der Bericht
// kommt über `tableau-results` (wie bei Swiss Tennis).
async function tableauNummern(): Promise<Set<number>> {
	const nummern = new Set<number>();
	for (const name of await readdir(ORDNER)) {
		if (!name.startsWith('team-results-')) continue;
		const j = JSON.parse(await readFile(join(ORDNER, name), 'utf-8'));
		for (const r of j.tableau?.results ?? []) nummern.add(r.encounterId);
	}
	return nummern;
}

/**
 * Antworten von Swiss Tennis aus den Dateien. `ohneBericht`: Für diese Begegnungen gibt es noch
 * keinen Bericht (beide Abfragen null); `berichtKaputt`: Der Bericht hat eine fremde Form.
 */
export function beispielAbruf(
	o: {
		nichtFreigeschaltet?: { jahr: number; wettbewerb: Wettbewerb }[];
		ohneBericht?: number[];
		berichtKaputt?: number[];
	} = {}
): (url: string) => Promise<Response> {
	let tableau: Promise<Set<number>> | undefined;
	return async (url) => {
		const u = new URL(url);
		const pfad = u.pathname.split('/').pop();
		if (pfad === 'club-teams') {
			const wettbewerb = u.searchParams.get('competition');
			const jahr = Number(u.searchParams.get('year'));
			if (o.nichtFreigeschaltet?.some((n) => n.jahr === jahr && n.wettbewerb === wettbewerb))
				return antwort(500, '{"error":"Java API error: Upstream responded with HTTP 404"}');
			if (wettbewerb !== 'ic' && wettbewerb !== 'jic') return antwort(400, '{}');
			return antwort(200, await readFile(join(ORDNER, `club-teams-${wettbewerb}.json`), 'utf-8'));
		}
		if (pfad === 'team-results') {
			const id = u.searchParams.get('teamId') ?? '';
			if (!/^\d+$/.test(id)) return antwort(400, '{}');
			try {
				return antwort(200, await readFile(join(ORDNER, `team-results-${id}.json`), 'utf-8'));
			} catch {
				return antwort(404, '{}');
			}
		}
		if (pfad === 'encounter-results' || pfad === 'tableau-results') {
			const id = Number(u.searchParams.get('encounterId'));
			if (!Number.isSafeInteger(id) || id <= 0) return antwort(400, '{}');
			if (o.berichtKaputt?.includes(id)) return antwort(200, '{}');
			tableau ??= tableauNummern();
			const imTableau = (await tableau).has(id);
			if (o.ohneBericht?.includes(id) || imTableau !== (pfad === 'tableau-results'))
				return antwort(200, 'null');
			try {
				return antwort(200, await readFile(join(ORDNER, `bericht-${id}.json`), 'utf-8'));
			} catch {
				return antwort(200, 'null');
			}
		}
		return antwort(404, '{}');
	};
}

/**
 * Legt die Saison 2026 des Vereins 2202 aus den Dateien an; ein zweiter Lauf ersetzt sie vollständig.
 * Scheitert mit festem Text, wenn eine Antwort fehlt oder fehlerhaft ist (damit `make seed` und E2E laut abbrechen).
 */
export async function legeBeispielInterclubAn(
	db: Db,
	jetzt: Date,
	holen: (url: string) => Promise<Response> = beispielAbruf()
): Promise<void> {
	const worte = await importiereSaison(
		{ db, holen, jetzt: () => jetzt, pause: async () => {} },
		2026,
		2202
	);
	if (worte.ic !== 'ok' || worte.jic !== 'ok')
		throw new Error('Interclub-Beispieldaten fehlerhaft');
}

if (import.meta.main) {
	const url = process.env.DATABASE_URL;
	if (!url) {
		console.error('DATABASE_URL fehlt');
		process.exit(1);
	}
	const db = erstelleDb(url);
	try {
		await legeBeispielInterclubAn(db, new Date());
	} finally {
		await db.$client.end();
	}
}
