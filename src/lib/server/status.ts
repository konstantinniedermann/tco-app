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
	} catch {
		status = 'fehler';
		console.error('Datenbank nicht erreichbar');
	}
	return { status, version: APP_VERSION, mindestversion: MINDESTVERSION };
}
