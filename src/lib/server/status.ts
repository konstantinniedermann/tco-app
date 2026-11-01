import { sql } from 'drizzle-orm';
import { APP_VERSION } from '../version.ts';
import type { Db } from './db/index.ts';
import { MINDESTVERSION } from './version.ts';

export type StatusAntwort = {
	status: 'ok' | 'fehler';
	version: string;
	mindestversion: string;
};

/** `holeDb` läuft in der Fehlerbehandlung: Auch ohne gültige DATABASE_URL gilt `fehler`. */
export async function ermittleStatus(holeDb: () => Db): Promise<StatusAntwort> {
	let status: StatusAntwort['status'] = 'ok';
	try {
		await holeDb().execute(sql`select 1`);
	} catch (fehler) {
		status = 'fehler';
		// Nur der Fehlercode (z. B. ECONNREFUSED), keine Meldung mit Details (SI-05).
		const code = fehlercode(fehler);
		console.error(code ? `Datenbank nicht erreichbar (${code})` : 'Datenbank nicht erreichbar');
	}
	return { status, version: APP_VERSION, mindestversion: MINDESTVERSION };
}

function fehlercode(fehler: unknown): string | undefined {
	const ursache = fehler instanceof Error && fehler.cause instanceof Error ? fehler.cause : fehler;
	const code = ursache instanceof Error ? (ursache as { code?: unknown }).code : undefined;
	return typeof code === 'string' && /^[A-Z0-9_]{1,32}$/.test(code) ? code : undefined;
}
