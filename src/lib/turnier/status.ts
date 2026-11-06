// Status eines Turniers nach Anmeldeschluss. Läuft im Browser und auf dem Server.
import { zuerichZuUtc } from '../anlass/zeit.ts';
import type { TurnierStatus } from '../server/db/schema.ts';

const MINUTE_MS = 60 * 1000;

/** 23:59 Schweizer Zeit am Tag `datum` (`YYYY-MM-DD`); bei ungültigem Datum ein ungültiges Date. */
export function schlussZeitpunkt(datum: string): Date {
	return zuerichZuUtc(`${datum}T23:59`) ?? new Date(NaN);
}

/** FR-33: offen bis und mit der Minute 23:59 des Anmeldeschluss-Tages. */
export const vorSchluss = (datum: string, jetzt: Date): boolean =>
	jetzt.getTime() < schlussZeitpunkt(datum).getTime() + MINUTE_MS;

/** FR-33: gespeichert `offen` wirkt nach dem Anmeldeschluss als `geschlossen`. */
export const wirksamerStatus = (
	gespeichert: TurnierStatus,
	datum: string,
	jetzt: Date
): TurnierStatus =>
	gespeichert === 'offen' && !vorSchluss(datum, jetzt) ? 'geschlossen' : gespeichert;
