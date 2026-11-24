// Hilfen der E2E-Tests für Interclub: ein Konto folgt einem Team, direkt in der Datenbank (ohne
// Push und ohne Team in `ic_team`, wie ein Team, das in der neuesten Saison fehlt).
import { icFolgen } from '../../../src/lib/server/db/schema.ts';
import { hole } from './verbindung.ts';

/** Das Konto folgt dem Team mit dieser Team-Nummer von Swiss Tennis, seit `seit`. */
export async function folgeTeam(kontoId: number, teamId: number, seit: Date): Promise<void> {
	await hole().db.insert(icFolgen).values({ kontoId, teamId, seit });
}
