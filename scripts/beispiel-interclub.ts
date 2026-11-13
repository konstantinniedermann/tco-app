// Beispieldaten für den Interclub-Import: Antworten von Swiss Tennis (Saison 2026) aus Dateien,
// ohne Netz. Gilt für jedes angefragte Jahr; nur Wettbewerbe der Liste antworten wie «Spielplan noch nicht da».
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { erstelleDb, type Db } from '../src/lib/server/db/index.ts';
import { importiereSaison } from '../src/lib/server/interclub/import.ts';
import type { Wettbewerb } from '../src/lib/server/interclub/swiss-tennis.ts';

const ORDNER = join(dirname(fileURLToPath(import.meta.url)), 'beispiel-interclub', '2026');

const antwort = (status: number, koerper: string) =>
	new Response(koerper, { status, headers: { 'content-type': 'application/json' } });

export function beispielAbruf(
	o: { nichtFreigeschaltet?: { jahr: number; wettbewerb: Wettbewerb }[] } = {}
): (url: string) => Promise<Response> {
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
		return antwort(404, '{}');
	};
}

/** Legt die Saison 2026 des Vereins 2202 aus den Dateien an; ein zweiter Lauf ersetzt sie vollständig. */
export async function legeBeispielInterclubAn(db: Db, jetzt: Date): Promise<void> {
	await importiereSaison(
		{ db, holen: beispielAbruf(), jetzt: () => jetzt, pause: async () => {} },
		2026,
		2202
	);
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
